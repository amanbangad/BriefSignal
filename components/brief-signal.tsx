"use client"

import { useState } from "react"
import type { BriefCard, Heat } from "@/lib/types"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3.5 w-0.5 rounded-full bg-primary/50" />
      <span className="text-xs font-semibold uppercase tracking-widest text-foreground/60">
        {children}
      </span>
    </div>
  )
}

interface Step {
  label: string
  status: "pending" | "active" | "done"
  count?: number
}

const DEFAULT_STEPS: Step[] = [
  { label: "Identifying category…", status: "pending" },
  { label: "Scanning trends, chatter & social signals…", status: "pending" },
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
                <path
                  d="M5 8l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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

const PLATFORMS = ["Meta", "TikTok", "YouTube Shorts", "LinkedIn", "Pinterest"] as const

const inputCls =
  "rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"

const BLOCKED_DOMAINS: Array<{ domain: string; what: string; why: string; errorCode: "SOURCE_NOT_AVAILABLE" | "ROBOTS_FILTER_FAILED" }> = [
  { domain: "nytimes.com", what: "General news & culture", why: "Paywalled — content requires login", errorCode: "SOURCE_NOT_AVAILABLE" },
  { domain: "theatlantic.com", what: "Long-form culture & ideas", why: "Paywalled — content requires login", errorCode: "SOURCE_NOT_AVAILABLE" },
  { domain: "businessinsider.com", what: "Business & marketing news", why: "Paywalled — content requires login", errorCode: "SOURCE_NOT_AVAILABLE" },
  { domain: "forbes.com", what: "Business & brand coverage", why: "Paywalled — content requires login", errorCode: "SOURCE_NOT_AVAILABLE" },
  { domain: "reddit.com", what: "Community & consumer sentiment", why: "Disallows crawlers in robots.txt — would be the best brand chatter source if accessible", errorCode: "ROBOTS_FILTER_FAILED" },
  { domain: "creators.instagram.com", what: "Weekly Instagram Reels trend reports (trend-report-MMDDYY pattern)", why: "Disallows crawlers in robots.txt — about.fb.com used as proxy", errorCode: "ROBOTS_FILTER_FAILED" },
  { domain: "about.instagram.com", what: "Instagram product & feature news", why: "Disallows crawlers in robots.txt", errorCode: "ROBOTS_FILTER_FAILED" },
  { domain: "business.instagram.com", what: "Instagram advertiser guidance", why: "Disallows crawlers in robots.txt", errorCode: "ROBOTS_FILTER_FAILED" },
]

const WORKING_DOMAINS = [
  // Trade press & editorial
  "adweek.com",
  "digiday.com",
  "thedrum.com",
  "marketingweek.com",
  "campaignlive.com",
  "voguebusiness.com",
  "glossy.co",
  "businessoffashion.com",
  "wwd.com",
  "fastcompany.com",
  "wired.com",
  "trendwatching.com",
  "emarketer.com",
  "creativebrief.com",
  "morningbrew.com",
  // Brand newsrooms & PR
  "prnewswire.com",
  "businesswire.com",
  "techcrunch.com",
  "substack.com",
  "mediapost.com",
  // Social proxy domains (platform newsrooms + creator press)
  "newsroom.tiktok.com",
  "blog.youtube.com",
  "about.fb.com",
  "later.com",
  "tubefilter.com",
  "sproutsocial.com",
  "socialmediaexaminer.com",
  "hootsuite.com",
  "buffer.com",
  "creatoriq.com",
  "influencermarketinghub.com",
  "socialinsider.io",
]

function DemoNotes() {
  return (
    <div className="mt-8 flex flex-col gap-6">

      {/* What works / limitations — two-column on md+ */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">What works</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-card-foreground/90">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
              <span>
                <span className="font-medium text-foreground">3 parallel Exa searches</span> — category
                trends (21 days), brand chatter (60 days), and social proxy (14 days) run simultaneously.
                A fourth runs when a competitor is added.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
              <span>
                <span className="font-medium text-foreground">Category inference</span> — gpt-4o-mini
                identifies the brand category first, so Exa queries are always domain-specific.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
              <span>
                <span className="font-medium text-foreground">Heat scoring</span> — Hot / Rising /
                Cooling is derived from article publish date + momentum language in the snippet, not
                a static label.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
              <span>
                <span className="font-medium text-foreground">Platform-native output</span> — platform
                selection shapes Exa query framing, creative angle, and ad format recommendations.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
              <span>
                <span className="font-medium text-foreground">Source links</span> — each card cites
                the exact Exa article URL. Falls back to model knowledge if the key is missing.
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Known limitations</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-card-foreground/90">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
              <span>
                <span className="font-medium text-foreground">No direct social indexing</span> — TikTok,
                Instagram, X, and YouTube are not crawlable by Exa. Social signals come from platform
                newsrooms and analytics blogs with a 1–7 day lag. See inaccessible domains below.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
              <span>
                <span className="font-medium text-foreground">No quantitative metrics</span> — signals
                are qualitative only. No engagement numbers, search volume, or share-of-voice.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
              <span>
                <span className="font-medium text-foreground">Source URL reliability</span> — OpenAI
                occasionally omits or hallucinates a URL. Verify before sharing externally.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
              <span>
                <span className="font-medium text-foreground">No saved briefs</span> — results are
                ephemeral. Refreshing clears everything.
              </span>
            </li>
          </ul>
        </section>
      </div>

      {/* Blocked domains */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Inaccessible domains
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          All return 403 regardless of Exa plan.{" "}
          <span className="font-mono text-[11px] text-foreground/60">SOURCE_NOT_AVAILABLE</span> = paywalled.{" "}
          <span className="font-mono text-[11px] text-foreground/60">ROBOTS_FILTER_FAILED</span> = blocked by{" "}
          <span className="font-mono text-[11px] text-foreground/60">robots.txt</span>.
          Including either causes the entire search request to fail.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[180px_1fr_1fr] border-b border-border bg-input px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Domain</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Covers</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</span>
          </div>
          {BLOCKED_DOMAINS.map((d, i) => (
            <div
              key={d.domain}
              className={`grid grid-cols-[180px_1fr_1fr] gap-x-4 px-4 py-3 ${i < BLOCKED_DOMAINS.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="font-mono text-xs text-hot">{d.domain}</span>
              <span className="text-xs leading-relaxed text-card-foreground/80">{d.what}</span>
              <div className="flex flex-col gap-1.5">
                <span className="w-fit rounded border border-border bg-input px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {d.errorCode}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">{d.why}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

interface ResultMeta {
  inferredCategory: string
  platform: string
  liveSearch: boolean
}

export function BriefSignal() {
  const [brand, setBrand] = useState("")
  const [audience, setAudience] = useState("")
  const [platform, setPlatform] = useState<string>("Meta")
  const [competitor, setCompetitor] = useState("")

  const [activeTab, setActiveTab] = useState<"app" | "notes">("app")
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS)
  const [inferredCategory, setInferredCategory] = useState<string | null>(null)
  const [cards, setCards] = useState<BriefCard[]>([])
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null)
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
    setResultMeta(null)
    setSteps(DEFAULT_STEPS)

    // Bug 1 fix: track inferred category in a local variable so the done
    // handler can read the latest value without depending on stale React state.
    let localCategory = ""

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, audience, platform, competitor }),
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
            localCategory = payload.value
            setInferredCategory(payload.value)
          } else if (payload.type === "step") {
            const phase: number = payload.phase
            setSteps((prev) => {
              // Bug 2 fix: extend whenever a phase arrives beyond the current
              // step count — works for both competitor (phase 3→4) and future
              // changes, not just the hardcoded phase === 5 case.
              const extended = phase > prev.length
                ? [...prev, { label: "", status: "pending" as const }]
                : prev
              return extended.map((s, i) => {
                if (i === phase - 1) return { ...s, label: payload.label, status: "active" }
                if (i === phase - 2) return { ...s, status: "done", count: payload.count }
                return s
              })
            })
          } else if (payload.type === "done") {
            setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })))
            setCards(payload.cards)
            setResultMeta({
              inferredCategory: localCategory,
              platform: payload.platform,
              liveSearch: payload.liveSearch,
            })
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
    setResultMeta(null)
  }

  const canGenerate = !loading && brand.trim().length > 0

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 md:py-14">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold tracking-tight">BriefSignal</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              powered by Exa
            </span>
          </div>
          {/* Tab switcher */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setActiveTab("app")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "app"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              App
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "notes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Demo notes
            </button>
          </div>
        </div>
        <p className="text-pretty text-muted-foreground">
          Real-time creative intelligence for advertising teams.
        </p>
      </header>

      {activeTab === "notes" && <DemoNotes />}

      {activeTab === "app" && <>

      {/* Framing: who, problem, Exa's role */}
      <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
        <div className="flex flex-col gap-1.5 bg-card px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Who it&apos;s for</span>
          <p className="text-sm leading-relaxed text-foreground/80">
            Brand strategists and creative directors who need to brief ad campaigns quickly — typically working across multiple brands, platforms, and weekly sprint cycles.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 bg-card px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">The problem</span>
          <p className="text-sm leading-relaxed text-foreground/80">
            Trend research before a brief is slow, scattered across Slack, trade press, and social tabs. Most briefs are written from memory and gut feel rather than live signals.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 bg-card px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How Exa helps</span>
          <p className="text-sm leading-relaxed text-foreground/80">
            Exa&apos;s neural search retrieves semantically relevant articles from trade press, platform newsrooms, and analytics blogs in seconds — giving every brief a live evidence base instead of stale assumptions.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <span>OpenAI identifies brand category</span>
        <span className="text-primary">{"\u2192"}</span>
        <span>Exa scans {platform} signals</span>
        <span className="text-primary">{"\u2192"}</span>
        <span>OpenAI synthesizes brief cards</span>
      </div>

      {/* Form */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Row 1: Brand + Audience */}
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Brand
            </span>
            <input
              className={inputCls}
              placeholder="Nike, Glossier, Oatly..."
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setInferredCategory(null) }}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
            {inferredCategory && cards.length === 0 && (
              <span className="text-xs text-muted-foreground">
                {"\u21b3"} {inferredCategory}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Target audience
            </span>
            <input
              className={inputCls}
              placeholder="Gen Z women 18-24..."
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </label>

          {/* Row 2: Platform + Objective */}
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Platform
            </span>
            <select
              className={inputCls}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Competitor{" "}
              <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
            </span>
            <input
              className={inputCls}
              placeholder="e.g. Adidas, CeraVe..."
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
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
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>{cards.length} signals detected</span>
              {generatedAt && <span>{"\u00b7"} {generatedAt}</span>}
              {resultMeta?.inferredCategory && (
                <>
                  <span>{"\u00b7"}</span>
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs">
                    {resultMeta.inferredCategory}
                  </span>
                </>
              )}
              {resultMeta?.platform && (
                <>
                  <span>{"\u00b7"}</span>
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs">
                    {resultMeta.platform}
                  </span>
                </>
              )}

              <span>{"\u00b7"}</span>
              <span>{resultMeta?.liveSearch ? "live Exa search" : "model knowledge"}</span>
            </div>
            <button
              onClick={reset}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
            >
              New search
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-6">
            {cards.map((card, i) => {
              const heat = HEAT_CONFIG[card.heat] ?? HEAT_CONFIG.rising
              return (
                <article
                  key={i}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${heat.className}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${heat.dot}`} />
                        {heat.label}
                      </span>
                      <h3 className="text-balance text-base font-semibold leading-snug">
                        {card.trend_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {card.source_url ? (
                        <a
                          href={card.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                        >
                          {card.source}
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">{card.source}</span>
                      )}
                    </div>
                  </div>

                  {/* Two-column body */}
                  <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">

                    {/* Left column */}
                    <div className="flex flex-col divide-y divide-border">

                      {/* Why now */}
                      <div className="px-5 py-4">
                        <SectionLabel>Why now</SectionLabel>
                        <p className="mt-2 text-sm leading-relaxed text-card-foreground/90">
                          {card.why_now}
                        </p>
                      </div>

                      {/* Audience tension */}
                      <div className="px-5 py-4">
                        <SectionLabel>Audience tension</SectionLabel>
                        <p className="mt-2 text-sm leading-relaxed text-card-foreground/90">
                          {card.audience_tension}
                        </p>
                      </div>

                      {/* Do / Don't */}
                      <div className="px-5 py-4">
                        <SectionLabel>Do / Don&apos;t</SectionLabel>
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex items-start gap-3 rounded-lg border border-rising/20 bg-rising/5 px-3.5 py-3">
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-rising" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-sm leading-relaxed text-card-foreground/90">{card.do_dont.do}</span>
                          </div>
                          <div className="flex items-start gap-3 rounded-lg border border-hot/20 bg-hot/5 px-3.5 py-3">
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-hot" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M5.5 10.5l5-5M10.5 10.5l-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span className="text-sm leading-relaxed text-card-foreground/90">{card.do_dont.dont}</span>
                          </div>
                        </div>
                      </div>

                      {/* Example brands — only rendered when the model returned verifiable examples */}
                      {card.example_brands && card.example_brands.length > 0 && (
                        <div className="px-5 py-4">
                          <SectionLabel>Brands doing it</SectionLabel>
                          <div className="mt-2 flex flex-col gap-2">
                            {card.example_brands.map((b, j) => (
                              <div key={j} className="text-sm leading-relaxed">
                                <span className="font-medium text-foreground">{b.name}</span>
                                <span className="text-card-foreground/70"> — {b.approach}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col divide-y divide-border">

                      {/* Ad hook */}
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between">
                          <SectionLabel>Ad hook</SectionLabel>
                          <button
                            onClick={() => copyHook(card.hook, i)}
                            className="text-xs font-medium text-primary transition hover:opacity-80"
                          >
                            {copied === i ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <p className="mt-2 text-base font-semibold leading-snug text-foreground">
                          {`\u201c${card.hook}\u201d`}
                        </p>
                      </div>

                      {/* Copy directions */}
                      <div className="px-5 py-4">
                        <SectionLabel>Copy directions</SectionLabel>
                        <ul className="mt-2 flex flex-col gap-2">
                          {card.copy_directions?.map((dir, j) => (
                            <li key={j} className="flex gap-2 text-sm leading-relaxed text-card-foreground/90">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                              {dir}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Creative angle */}
                      <div className="px-5 py-4">
                        <SectionLabel>Creative angle</SectionLabel>
                        <p className="mt-2 text-sm leading-relaxed text-card-foreground/90">
                          {card.creative_angle}
                        </p>
                      </div>

                      {/* Ad formats */}
                      <div className="px-5 py-4">
                        <SectionLabel>Ad formats</SectionLabel>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {card.ad_formats?.map((fmt, j) => (
                            <span
                              key={j}
                              className="rounded-md border border-border bg-input px-2.5 py-1 font-mono text-xs text-foreground/80"
                            >
                              {fmt}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Signal */}
                      <div className="px-5 py-4">
                        <SectionLabel>Signal</SectionLabel>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {card.signal}
                        </p>
                      </div>

                    </div>
                  </div>
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

      </>}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
        <span>BriefSignal</span>
        <span>Exa real-time web search {"\u00b7"} OpenAI synthesis</span>
      </footer>
    </div>
  )
}
