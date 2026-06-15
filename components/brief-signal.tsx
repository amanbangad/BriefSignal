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
const OBJECTIVES = ["Awareness", "Consideration", "Conversion", "Retention"] as const

const inputCls =
  "rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"

const BLOCKED_DOMAINS = [
  "nytimes.com",
  "theatlantic.com",
  "reddit.com",
  "businessinsider.com",
  "forbes.com",
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
      {/* What works */}
      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          What works
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm text-card-foreground/90">
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Category inference</span> — OpenAI
              (gpt-4o-mini) identifies the brand&apos;s product category before searching, so Exa
              queries are always domain-specific.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Live Exa search</span> — two parallel
              searches (category trends + brand chatter) run in real time, scoped to the last 21–60
              days depending on search type.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Date-grounded heat signals</span> —
              heat is assigned by OpenAI using two signals: (1) the published date of the source
              article relative to today, and (2) momentum language in the snippet. Hot = published
              within 7 days with active language. Rising = within 30 days or building language.
              Cooling = older than 30 days or plateau/decline language. The first sentence of
              why_now is required to cite the article date and what was reported.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Social signal proxy</span> — a third
              parallel search targets platform newsrooms (newsroom.tiktok.com, blog.youtube.com),
              creator economy press (tubefilter.com, creatoriq.com), and social analytics blogs
              (sproutsocial.com, later.com) to surface what is actually trending on the selected
              platform. Runs in parallel with the other two searches, adding no extra latency.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Competitor phase</span> — adding a
              competitor triggers a third Exa search (campaign creative signals) and a
              system-prompt rule requiring one card to name the competitive tension directly.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Platform-native output</span> — Platform
              and Objective fields shape both the Exa queries and the OpenAI synthesis prompt,
              producing format-specific creative angles (e.g. TikTok POV vs. Meta carousel).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Source links</span> — each card cites
              the exact article URL from Exa, clickable to verify the signal. Falls back to plain
              domain name when running in model-knowledge mode.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-rising">&#10003;</span>
            <span>
              <span className="font-medium text-foreground">Graceful degradation</span> — if
              EXA_API_KEY is missing or a search fails, synthesis still runs using OpenAI model
              knowledge, with the results bar indicating which mode was used.
            </span>
          </li>
        </ul>
      </section>

      {/* What does not work */}
      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Known limitations
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm text-card-foreground/90">
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
            <span>
              <span className="font-medium text-foreground">No direct social platform indexing</span>{" "}
              — TikTok, Instagram, X, and YouTube are not crawlable by Exa. Social signals are
              proxied via platform newsrooms (newsroom.tiktok.com, blog.youtube.com), creator
              economy press (tubefilter.com, creatoriq.com), and social analytics blogs
              (sproutsocial.com, later.com, hootsuite.com). These cover what is trending on each
              platform but with a reporting lag of 1–7 days.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
            <span>
              <span className="font-medium text-foreground">No quantitative metrics</span> — there
              are no engagement numbers, search volume, or share-of-voice figures. Signals are
              qualitative editorial and community signals only.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
            <span>
              <span className="font-medium text-foreground">Source URL reliability</span> — OpenAI
              is instructed to use URLs verbatim from the Exa context, but occasionally hallucinates
              or omits a URL. Always verify before sharing externally.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-hot">&#10007;</span>
            <span>
              <span className="font-medium text-foreground">No history or saved briefs</span> —
              results are ephemeral. There is no database; refreshing the page clears everything.
            </span>
          </li>
        </ul>
      </section>

      {/* Blocked domains */}
      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Blocked domains (Exa free plan)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The following domains return 403 on the current Exa plan and have been removed from all
          include lists. Adding them causes the entire search to fail.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BLOCKED_DOMAINS.map((d) => (
            <span
              key={d}
              className="rounded-md border border-hot/30 bg-hot/10 px-2.5 py-1 font-mono text-xs text-hot"
            >
              {d}
            </span>
          ))}
        </div>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-foreground">
          Active domains (verified 200)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These domains are confirmed accessible on the current plan and are used across the three
          search functions.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {WORKING_DOMAINS.map((d) => (
            <span
              key={d}
              className="rounded-md border border-rising/30 bg-rising/10 px-2.5 py-1 font-mono text-xs text-rising"
            >
              {d}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

interface ResultMeta {
  inferredCategory: string
  platform: string
  objective: string
  liveSearch: boolean
}

export function BriefSignal() {
  const [brand, setBrand] = useState("")
  const [audience, setAudience] = useState("")
  const [platform, setPlatform] = useState<string>("Meta")
  const [objective, setObjective] = useState<string>("Awareness")
  const [competitor, setCompetitor] = useState("")
  const [market, setMarket] = useState("")

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

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, audience, platform, objective, competitor, market }),
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
            setSteps((prev) => {
              // Dynamically append a 5th step if the competitor phase arrives
              const extended =
                phase === 5 && prev.length === 4
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
              inferredCategory: inferredCategory ?? "",
              platform: payload.platform,
              objective: payload.objective,
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
              Objective
            </span>
            <select
              className={inputCls}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>

          {/* Row 3: Competitor + Market */}
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

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Market{" "}
              <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
            </span>
            <input
              className={inputCls}
              placeholder="e.g. US, UK, Southeast Asia..."
              value={market}
              onChange={(e) => setMarket(e.target.value)}
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
              {resultMeta?.objective && (
                <>
                  <span>{"\u00b7"}</span>
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs">
                    {resultMeta.objective}
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

                      {/* Example brands */}
                      <div className="px-5 py-4">
                        <SectionLabel>Brands doing it</SectionLabel>
                        <div className="mt-2 flex flex-col gap-2">
                          {card.example_brands?.map((b, j) => (
                            <div key={j} className="text-sm leading-relaxed">
                              <span className="font-medium text-foreground">{b.name}</span>
                              <span className="text-card-foreground/70"> — {b.approach}</span>
                            </div>
                          ))}
                        </div>
                      </div>
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
