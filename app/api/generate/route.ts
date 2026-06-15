import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { searchCategoryTrends, searchBrandChatter, mergeSignals, hasExaKey, type ExaSignal } from "@/lib/exa"

// Do NOT use the edge runtime with the AI SDK.
export const maxDuration = 60

const cardSchema = z.object({
  cards: z
    .array(
      z.object({
        trend_name: z.string().describe("3-5 word name for the trend"),
        heat: z.enum(["hot", "rising", "cooling"]),
        why_now: z.string().describe("2 sentences grounded in the search findings"),
        creative_angle: z.string().describe("A specific Meta (Instagram/Facebook) ad angle"),
        hook: z.string().describe("An ad headline, max 15 words"),
        source: z.string().describe("The publication or site the signal came from"),
        signal: z.string().describe("1 sentence describing what was found"),
      }),
    )
    .length(3),
})

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
  const { brand, audience } = (await req.json()) as {
    brand?: string
    audience?: string
  }

  if (!brand || !brand.trim()) {
    return Response.json({ error: "A brand is required." }, { status: 400 })
  }

  const aud = audience?.trim() || "general consumers"

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

        // Emit the inferred category so the frontend can display it
        controller.enqueue(sseEvent({ type: "category", value: category }))

        if (hasExaKey()) {
          // Phase 2: category trends
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: 2,
              label: `Scanning for trending topics in ${category}…`,
              count: undefined,
            }),
          )
          const trends = await searchCategoryTrends(category)

          // Phase 3: brand chatter
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: 3,
              label: `Scanning brand conversations for ${brand}…`,
              count: trends.length,
            }),
          )
          const brandChatter = await searchBrandChatter(brand, category)

          signals = mergeSignals(trends, brandChatter)
          liveSearch = signals.length > 0

          // Phase 4: synthesis
          controller.enqueue(
            sseEvent({
              type: "step",
              phase: 4,
              label: `Synthesizing ${signals.length} signals with OpenAI…`,
              count: signals.length,
            }),
          )
        } else {
          // No Exa key — skip phases 2 & 3, go straight to synthesis
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

        const system = `You are a creative intelligence analyst for ad agencies building Meta (Instagram/Facebook) campaigns.
Your job is to turn raw market signals into sharp, actionable creative brief cards.
${
  liveSearch
    ? "Base every card on the REAL search findings provided. Cite the actual source domain for each card."
    : "No live search results are available, so use your knowledge of current cultural and category trends. Use a realistic publication name for each source."
}
Rules:
- Return exactly 3 brief cards.
- "heat" must be exactly one of: hot (trending now), rising (building fast), cooling (losing steam).
- Make every angle specific to Meta ad formats (Reels, Stories, carousels) and the target audience.`

        const prompt = `Brand: ${brand}
Category: ${category}
Target audience: ${aud}

${context ? `Live web signals from this month:\n\n${context}` : "Generate three timely brief cards for this brand and category."}`

        const { output } = await generateText({
          model: openai("gpt-4o"),
          system,
          prompt,
          output: Output.object({ schema: cardSchema }),
        })

        controller.enqueue(
          sseEvent({ type: "done", cards: output.cards, liveSearch }),
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
