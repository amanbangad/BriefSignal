import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import {
  searchCategoryTrends,
  searchBrandChatter,
  searchCompetitorSignals,
  searchSocialSignals,
  mergeSignals,
  hasExaKey,
  type ExaSignal,
} from "@/lib/exa"

// Do NOT use the edge runtime with the AI SDK.
export const maxDuration = 60

const cardSchema = z.object({
  cards: z
    .array(
      z.object({
        trend_name: z.string().describe("3-5 word name for the trend"),
        heat: z.enum(["hot", "rising", "cooling"]).describe("hot = published ≤7 days ago with active momentum language; rising = published ≤30 days ago or building momentum language; cooling = published >30 days ago or plateau/decline language"),
        why_now: z.string().describe("Exactly 2 sentences. First sentence must cite the article publication date and what it reported. Second sentence states the urgency for the creative team."),
        creative_angle: z.string().describe("A specific ad format native to the given platform — not a generic idea."),
        hook: z.string().describe("A single finished ad headline, max 15 words. Must feel like final copy, not a brief."),
        audience_tension: z.string().describe("1-2 sentences describing the specific consumer tension, unmet need, or cultural anxiety this trend is responding to."),
        ad_formats: z.array(z.string()).min(2).max(3).describe("2-3 specific ad format recommendations for the chosen platform, e.g. 'TikTok Spark Ad, 15s sound-on' or 'Meta Reels, UGC-style, 9:16'."),
        do_dont: z.object({
          do: z.string().describe("One concrete creative direction to pursue for this signal."),
          dont: z.string().describe("One creative mistake to avoid that would kill the signal."),
        }),
        example_brands: z.array(
          z.object({
            name: z.string().describe("Brand name"),
            approach: z.string().describe("1 sentence on how this brand is executing on this trend."),
          })
        ).min(1).max(2).describe("1-2 real brands already executing on this trend. Must be real, verifiable examples."),
        copy_directions: z.array(z.string()).min(2).max(3).describe("2-3 short copy angles beyond the hook — different tones or framings of the same signal."),
        source: z.string().describe("The publication or site name the signal came from"),
        source_url: z.string().describe("The full URL of the source article. Must be a real URL from the search results context. If no URL is available, use an empty string."),
        signal: z.string().describe("1 sentence describing what was found"),
      }),
    )
    .length(3),
})

const OBJECTIVE_GUIDANCE: Record<string, string> = {
  Awareness:
    "prioritize emotional resonance and brand recall over CTA. Hook should stop the scroll.",
  Consideration:
    "prioritize education and social proof. Hook should create curiosity or answer a question.",
  Conversion:
    "prioritize urgency and direct response. Hook should create immediate desire to act.",
  Retention:
    "prioritize community and loyalty. Hook should make existing customers feel seen.",
}

function buildContext(signals: ExaSignal[]): string {
  if (signals.length === 0) return ""
  return signals
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title} (${s.source}${s.published ? `, ${s.published.slice(0, 10)}` : ""})\nURL: ${s.url}\n${s.snippet}`,
    )
    .join("\n\n")
}

function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    brand?: string
    audience?: string
    platform?: string
    objective?: string
    competitor?: string
    market?: string
  }

  const { brand, audience, platform = "Meta", objective = "Awareness", competitor = "", market = "" } = body

  if (!brand || !brand.trim()) {
    return Response.json({ error: "A brand is required." }, { status: 400 })
  }

  const aud = audience?.trim() || "general consumers"
  const comp = competitor.trim()
  const mkt = market.trim()
  const objectiveGuidance = OBJECTIVE_GUIDANCE[objective] ?? OBJECTIVE_GUIDANCE.Awareness

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let signals: ExaSignal[] = []
        let liveSearch = false

        // Phase 1: Infer category
        controller.enqueue(
          sseEvent({ type: "step", phase: 1, label: `Identifying category for ${brand}…` }),
        )

        const { text: rawCategory } = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `What product category does the brand "${brand}" belong to? Reply with 2-5 words only, no punctuation. Examples: "Athletic footwear and apparel", "Beauty and skincare", "Plant-based food and beverage".`,
          maxOutputTokens: 20,
        })
        const category = rawCategory.trim()

        controller.enqueue(sseEvent({ type: "category", value: category }))

        if (hasExaKey()) {
          // Phase 2: run category trends + brand chatter + social proxy in parallel.
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: 2,
              label: `Scanning ${platform} trends, brand chatter & social signals…`,
            }),
          )
          const [trends, brandChatter, socialSignals] = await Promise.all([
            searchCategoryTrends(category, platform, mkt),
            searchBrandChatter(brand, category, platform, mkt),
            searchSocialSignals(category, platform, mkt),
          ])
          signals = mergeSignals(mergeSignals(trends, brandChatter), socialSignals)
          liveSearch = signals.length > 0

          // Phase 3: competitor signals (conditional)
          if (comp) {
            controller.enqueue(
              sseEvent({
                type: "step",
                phase: 3,
                label: `Scanning ${comp} creative signals…`,
                count: signals.length,
              }),
            )
            const competitorSignals = await searchCompetitorSignals(comp, category, platform)
            signals = mergeSignals(signals, competitorSignals)
          }

          // Final synthesis phase (3 or 4 depending on competitor)
          const synthesisPhase = comp ? 4 : 3
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: synthesisPhase,
              label: `Synthesizing ${signals.length} signals with OpenAI…`,
              count: signals.length,
            }),
          )
        } else {
          // No Exa key — skip search phases, go straight to synthesis
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: 4,
              label: "Generating brief cards from model knowledge…",
              count: 0,
            }),
          )
        }

        const context = buildContext(signals)

        const today = new Date().toISOString().slice(0, 10)

        const system = `You are a senior creative strategist embedded in a top-tier ad agency. \
Your output goes directly into the hands of a creative director or VP of Strategy who needs \
to brief a creative team today — not in two weeks after the cultural moment has passed.

Today's date: ${today}

Context:
- Platform: ${platform}
- Campaign objective: ${objective}
- Market: ${mkt || "Global"}
${comp ? `- Key competitor: ${comp}` : ""}

${
  liveSearch
    ? `Signal source: real-time open-web intelligence gathered this week from trade press, \
brand newsrooms, and creator coverage. \
Every card MUST be grounded in these findings. Use the exact URL provided in the search results for source_url. \
A creative director will click the link — do not invent a URL.`
    : `Signal source: model knowledge of current cultural and category trends (no live search available). \
Use your knowledge of what is genuinely resonating right now. \
Use a realistic publication name for source and an empty string for source_url.`
}

Heat assignment rules (apply these in order — this is the most important instruction):
1. Look at the published date of the source article. Calculate how many days ago it was relative to today (${today}).
2. Look at the language in the snippet: words like "surge", "viral", "exploding", "just launched", "this week" signal hot; "growing", "gaining", "emerging", "brands are starting to" signal rising; "declining", "slowing", "peaked", "was" signal cooling.
3. Combine date recency and language signal to assign heat:
   - "hot": published within the last 7 days AND language signals active momentum. Act this week.
   - "rising": published within the last 30 days OR language signals building momentum. Act this month.
   - "cooling": published more than 30 days ago AND language signals plateau or decline, OR the trend is widely adopted (no longer differentiated). Use with caution or subvert.
4. The first sentence of why_now MUST state the publication date and what the source reported. The second sentence must state the urgency for the creative team specifically.

Output rules:
- Return exactly 3 brief cards.
- creative_angle: concrete platform-native format only. \
  Meta → Reels, Stories carousel, UGC-style, or static with bold text overlay. \
  TikTok → trending sound, duet, POV, or text-overlay hook. \
  YouTube → 15s bumper, 60s story, or thumbnail curiosity gap. \
  LinkedIn → thought-leadership post, document carousel, or event coverage. \
  Pinterest → idea pin, visual search-optimised static, or seasonal board.
- hook: single finished ad headline, max 15 words. Copywriter voice, not strategist voice.
- audience_tension: name the specific unmet need or cultural anxiety driving this trend. Be precise.
- ad_formats: 2-3 specific placements with aspect ratio and length where relevant (e.g. "Meta Reels 9:16, 15s, sound-on").
- do_dont: do = a concrete creative direction that will land. dont = the specific mistake that would make this feel generic or tone-deaf.
- example_brands: 1-2 real brands with a one-sentence description of their execution. Must be verifiable — do not invent examples.
- copy_directions: 2-3 alternative headlines or copy angles for the same signal in different tones (e.g. bold/provocative, warm/relatable, witty/ironic).
- Vague why_now observations ("consumers want authenticity") are not acceptable.
- Objective is ${objective}: ${objectiveGuidance}
${comp ? `- One card must contain a direct competitive angle against ${comp}. Name the tension clearly.` : ""}`

        const prompt = `Brand: ${brand}
Category: ${category}
Target audience: ${aud}
Platform: ${platform}
Objective: ${objective}
  Market: ${mkt || "Global"}
  ${comp ? `Competitor: ${comp}` : ""}

${context ? `Live web signals from this month:\n\n${context}` : "Generate three timely brief cards for this brand and category."}`

        const { output } = await generateText({
          model: openai("gpt-4o"),
          system,
          prompt,
          output: Output.object({ schema: cardSchema }),
        })

        controller.enqueue(
          sseEvent({
            type: "done",
            cards: output.cards,
            liveSearch,
            platform,
            objective,
            competitor: comp,
            market: mkt,
          }),
        )
      } catch (err) {
        const message = (err as Error).message || "Could not generate brief cards. Please try again."
        console.log("[v0] generate route error:", message)
        controller.enqueue(sseEvent({ type: "error", message }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
