"use client"

import { useState } from "react"
import type { BriefCard, Heat } from "@/lib/types"

interface Step {
  label: string
  status: "pending" | "active" | "done"
  count?: number
}

const DEFAULT_STEPS: Step[] = [
  { label: "Identifying category…", status: "pending" },
  { label: "Scanning for category trends…", status: "pending" },
  { label: "Scanning brand conversations…", status: "pending" },
  { label: "Synthesizing brief cards…", status: "pending" },
]

function SearchProgress({ steps }: { steps: Step[] }) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            {step.status === "done" ? (
              <svg className="h-4 w-4 text-rising" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : step.status === "active" ? (
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground">
                {i + 1}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-sm ${
                step.status === "pending"
                  ? "text-muted-foreground/50"
                  : step.status === "active"
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {step.status === "done" && step.count !== undefined && (
              <span className="text-xs text-muted-foreground/60">{step.count} sources found</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const HEAT_CONFIG: Record<Heat, { label: string; className: string; dot: string }> = {
  hot: {
    label: "Trending now",
    className: "bg-hot/15 text-hot border-hot/30",
    dot: "bg-hot",
  },
  rising: {
    label: "Building fast",
    className: "bg-rising/15 text-rising border-rising/30",
    dot: "bg-rising",
  },
  cooling: {
    label: "Losing steam",
    className: "bg-cooling/15 text-cooling border-cooling/30",
    dot: "bg-cooling",
  },
}

export function BriefSignal() {
  const [brand, setBrand] = useState("")
  const [audience, setAudience] = useState("")
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS)
  const [inferredCategory, setInferredCategory] = useState<string | null>(null)
  const [cards, setCards] = useState<BriefCard[]>([])
  const [liveSearch, setLiveSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const copyHook = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const generate = async () => {
    if (!brand.trim() || loading) return
    setLoading(true)
    setCards([])
    setError(null)
    setInferredCategory(null)
    setSteps(DEFAULT_STEPS)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, audience }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || "Something went wrong. Try again.")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""

        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith("data: ")) continue
          const payload = JSON.parse(line.slice(6))

          if (payload.type === "category") {
            setInferredCategory(payload.value)
          } else if (payload.type === "step") {
            const phase: number = payload.phase
            setSteps((prev) =>
              prev.map((s, i) => {
                if (i === phase - 1) return { ...s, label: payload.label, status: "active" }
                if (i === phase - 2) return { ...s, status: "done", count: payload.count }
                return s
              }),
            )
          } else if (payload.type === "done") {
            setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })))
            setCards(payload.cards)
            setLiveSearch(payload.liveSearch)
            setGeneratedAt(new Date().toLocaleTimeString())
          } else if (payload.type === "error") {
            throw new Error(payload.message)
          }
        }
      }
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setCards([])
    setError(null)
    setInferredCategory(null)
  }

  const canGenerate = !loading && brand.trim().length > 0

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 md:py-14">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold tracking-tight">BriefSignal</span>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            powered by Exa
          </span>
        </div>
        <p className="text-pretty text-muted-foreground">
          Real-time creative intelligence for Meta advertising teams.
        </p>
      </header>

      {/* How it works */}
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <span>OpenAI identifies brand category</span>
        <span className="text-primary">{"\u2192"}</span>
        <span>Exa scans Reddit, trade press, brand newsrooms</span>
        <span className="text-primary">{"\u2192"}</span>
        <span>OpenAI synthesizes trend signals</span>
        <span className="text-primary">{"\u2192"}</span>
        <span>Brief cards ready for your creative team</span>
      </div>

      {/* Form */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Brand</span>
            <input
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              placeholder="Nike, Glossier, Oatly..."
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setInferredCategory(null) }}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
            {inferredCategory && (
              <span className="text-xs text-muted-foreground">
                {"\u21b3"} {inferredCategory}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target audience</span>
            <input
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              placeholder="Gen Z women 18-24..."
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </label>
        </div>
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Searching\u2026" : "Generate brief cards \u2192"}
        </button>
      </div>

      {/* Loading */}
      {loading && <SearchProgress steps={steps} />}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-lg border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">
          {error}
        </div>
      )}

      {/* Results */}
      {cards.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {cards.length} signals detected
              {generatedAt ? ` \u00b7 ${generatedAt}` : ""}
              {liveSearch ? " \u00b7 live Exa search" : " \u00b7 model knowledge"}
            </span>
            <button
              onClick={reset}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
            >
              New search
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {cards.map((card, i) => {
              const heat = HEAT_CONFIG[card.heat] ?? HEAT_CONFIG.rising
              return (
                <article
                  key={i}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${heat.className}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${heat.dot}`} />
                      {heat.label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="text-balance text-lg font-semibold leading-snug">
                    {card.trend_name}
                  </h3>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Why now
                    </span>
                    <p className="text-sm leading-relaxed text-card-foreground/90">{card.why_now}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Creative angle
                    </span>
                    <p className="text-sm leading-relaxed text-card-foreground/90">
                      {card.creative_angle}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-input p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Ad hook
                      </span>
                      <button
                        onClick={() => copyHook(card.hook, i)}
                        className="text-xs font-medium text-primary transition hover:opacity-80"
                      >
                        {copied === i ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
                      {`\u201c${card.hook}\u201d`}
                    </p>
                  </div>

                  <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground/70">Signal</span> {"\u00b7"}{" "}
                    {card.source} {"\u2014"} {card.signal}
                  </p>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && !error && cards.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-base font-medium">Waiting for a signal</p>
          <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Enter a brand to scan Reddit, trade press, creator blogs, and brand newsrooms for what is
            moving right now {"\u2014"} not last month&apos;s listicles. Exa searches the open web in
            real time.
          </p>
        </div>
      )}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
        <span>BriefSignal</span>
        <span>OpenAI category inference {"\u00b7"} Exa web search {"\u00b7"} OpenAI synthesis</span>
      </footer>
    </div>
  )
}
