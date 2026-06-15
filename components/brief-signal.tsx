"use client"

import { useEffect, useRef, useState } from "react"
import type { BriefCard, GenerateResponse, Heat } from "@/lib/types"

const CATEGORIES = [
  "Beauty & Skincare",
  "CPG & FMCG",
  "Fashion & Apparel",
  "Food & Beverage",
  "Health & Wellness",
  "Sports & Fitness",
  "Entertainment & Media",
  "Home & Lifestyle",
]

const LOADING_MESSAGES = [
  "Scanning Reddit for consumer conversations\u2026",
  "Checking trade publications for trend signals\u2026",
  "Searching creator blogs and brand newsrooms\u2026",
  "Detecting cultural moments across the open web\u2026",
  "Building your brief cards\u2026",
]

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
  const [category, setCategory] = useState(CATEGORIES[0])
  const [audience, setAudience] = useState("")
  const [loading, setLoading] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [cards, setCards] = useState<BriefCard[]>([])
  const [liveSearch, setLiveSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (loading) {
      setMsgIdx(0)
      timerRef.current = setInterval(
        () => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length),
        2200,
      )
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loading])

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

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, category, audience }),
      })
      const data = (await res.json()) as GenerateResponse & { error?: string }
      if (!res.ok || data.error) {
        throw new Error(data.error || "Something went wrong. Try again.")
      }
      setCards(data.cards)
      setLiveSearch(data.liveSearch)
      setGeneratedAt(new Date().toLocaleTimeString())
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setCards([])
    setError(null)
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
        <span>Exa scans Reddit, trade press, brand newsrooms</span>
        <span className="text-primary">{"\u2192"}</span>
        <span>Claude synthesizes trend signals</span>
        <span className="text-primary">{"\u2192"}</span>
        <span>Brief cards ready for your creative team</span>
      </div>

      {/* Form */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Brand</span>
            <input
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              placeholder="Nike, Glossier, Oatly..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</span>
            <select
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
      {loading && (
        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
          <span>{LOADING_MESSAGES[msgIdx]}</span>
        </div>
      )}

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
        <span>Exa real-time web search {"\u00b7"} Claude synthesis</span>
      </footer>
    </div>
  )
}
