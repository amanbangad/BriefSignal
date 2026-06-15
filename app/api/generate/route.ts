import { generateText, Output } from "ai"
import { z } from "zod"
import { gatherSignals, hasExaKey, type ExaSignal } from "@/lib/exa"
import type { GenerateResponse } from "@/lib/types"

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

export async function POST(req: Request) {
  try {
    const { brand, category, audience } = (await req.json()) as {
      brand?: string
      category?: string
      audience?: string
    }

    if (!brand || !brand.trim()) {
      return Response.json({ error: "A brand is required." }, { status: 400 })
    }

    const cat = category?.trim() || "general consumer goods"
    const aud = audience?.trim() || "general consumers"

    // 1. Pull real, recent signals from the open web via Exa (if configured).
    let signals: ExaSignal[] = []
    let liveSearch = false
    if (hasExaKey()) {
      try {
        signals = await gatherSignals(brand, cat)
        liveSearch = signals.length > 0
      } catch (err) {
        console.log("[v0] Exa search error:", (err as Error).message)
      }
    }

    const context = buildContext(signals)

    // 2. Have Claude synthesize the signals into structured brief cards.
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
Category: ${cat}
Target audience: ${aud}

${context ? `Live web signals from this month:\n\n${context}` : "Generate three timely brief cards for this brand and category."}`

    const { experimental_output } = await generateText({
      model: "anthropic/claude-sonnet-4.6",
      system,
      prompt,
      experimental_output: Output.object({ schema: cardSchema }),
    })

    const response: GenerateResponse = {
      cards: experimental_output.cards,
      liveSearch,
    }
    return Response.json(response)
  } catch (err) {
    const message = (err as Error).message || ""
    console.log("[v0] generate route error:", message)

    if (/credit card|AI Gateway/i.test(message)) {
      return Response.json(
        {
          error:
            "AI Gateway needs a credit card on file to unlock free credits. Add one in your Vercel dashboard, then try again.",
        },
        { status: 402 },
      )
    }

    return Response.json(
      { error: "Could not generate brief cards. Please try again." },
      { status: 500 },
    )
  }
}
