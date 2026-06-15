import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import {
  searchCategoryTrends,
  searchBrandChatter,
  searchCompetitorSignals,
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
        heat: z.enum(["hot", "rising", "cooling"]),
        why_now: z.string().describe("2 sentences grounded in the search findings"),
        creative_angle: z.string().describe("A specific ad angle native to the given platform"),
        hook: z.string().describe("An ad headline, max 15 words"),
        source: z.string().describe("The publication or site the signal came from"),
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
        `[${i + 1}] ${s.title} (${s.source}${s.published ? `, ${s.published.slice(0, 10)}` : ""})\n${s.snippet}`,
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
          // Phase 2: category trends (platform + market aware)
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: 2,
              label: `Scanning ${platform} trends in ${category}${mkt ? ` · ${mkt}` : ""}…`,
            }),
          )
          const trends = await searchCategoryTrends(category, platform, mkt)

          // Phase 3: brand chatter
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: 3,
              label: `Scanning brand conversations for ${brand}…`,
              count: trends.length,
            }),
          )
          const brandChatter = await searchBrandChatter(brand, category, platform, mkt)
          signals = mergeSignals(trends, brandChatter)
          liveSearch = signals.length > 0

          // Phase 4 (conditional): competitor signals
          if (comp) {
            controller.enqueue(
              sseEvent({
                type: "step",
                phase: 4,
                label: `Scanning ${comp} creative signals…`,
                count: signals.length,
              }),
            )
            const competitorSignals = await searchCompetitorSignals(comp, category, platform)
            signals = mergeSignals(signals, competitorSignals)
          }

          // Final synthesis phase (phase 4 or 5 depending on competitor)
          const synthesisPhase = comp ? 5 : 4
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

        const system = `You are a creative intelligence analyst for ad agencies.
Your job is to turn raw market signals into sharp, actionable creative brief cards.
Platform: ${platform}
Campaign objective: ${objective}
${mkt ? `Market: ${mkt}` : ""}
${comp ? `Key competitor: ${comp}` : ""}
${
  liveSearch
    ? "Base every card on the REAL search findings provided. Cite the actual source domain for each card."
    : "No live search results are available. Use your knowledge of current cultural and category trends. Use a realistic publication name for each source."
}
Rules:
- Return exactly 3 brief cards.
- heat must be one of: hot (trending now), rising (building fast), cooling (losing steam).
- Every creative angle must be native to ${platform} — reference specific formats (e.g. for TikTok: trending sounds, duets, text overlays; for Meta: Reels, Stories, carousels; for YouTube: 60s+ storytelling, thumbnails; for LinkedIn: thought leadership, document posts; for Pinterest: visual discovery, idea pins).
- Objective is ${objective}: ${objectiveGuidance}
${comp ? `- At least one card should include a competitive angle against ${comp}.` : ""}`

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
