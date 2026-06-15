// Thin wrapper around the Exa search API. Runs server-side only so the
// EXA_API_KEY never reaches the client bundle.

interface ExaResult {
  title?: string
  url?: string
  publishedDate?: string
  author?: string
  text?: string
  highlights?: string[]
}

export interface ExaSignal {
  title: string
  url: string
  source: string
  published?: string
  snippet: string
}

export function hasExaKey(): boolean {
  return Boolean(process.env.EXA_API_KEY)
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - 1000 * 60 * 60 * 24 * days).toISOString()
}

// Domains that consistently produce high-quality marketing/trend signals.
const TREND_INCLUDE_DOMAINS = [
  "adweek.com",
  "marketingweek.com",
  "trendwatching.com",
  "wwd.com",
  "voguebusiness.com",
  "glossy.co",
  "businessoffashion.com",
  "emarketer.com",
  "digiday.com",
  "theverge.com",
  "fastcompany.com",
  "wired.com",
  "thedrum.com",
  "campaignlive.com",
]

// Domains that produce noisy or low-signal results for marketing research.
const NOISE_EXCLUDE_DOMAINS = [
  "wikipedia.org",
  "linkedin.com",
  "glassdoor.com",
  "indeed.com",
  "reddit.com",
  "quora.com",
]

// Domains useful for competitor ad/campaign research.
const COMPETITOR_INCLUDE_DOMAINS = [
  "adweek.com",
  "campaignlive.com",
  "thedrum.com",
  "marketingweek.com",
  "digiday.com",
  "businesswire.com",
  "prnewswire.com",
  "mediapost.com",
]

interface ExaSearchOptions {
  query: string
  numResults?: number
  /** ISO date string — only return results published after this date */
  startPublishedDate?: string
  /** Steer the highlight extraction LLM with a focused sub-query */
  highlightQuery?: string
  /** Limit results to these domains */
  includeDomains?: string[]
  /** Exclude results from these domains */
  excludeDomains?: string[]
}

async function exaSearch(opts: ExaSearchOptions): Promise<ExaSignal[]> {
  const key = process.env.EXA_API_KEY
  if (!key) return []

  const {
    query,
    numResults = 5,
    startPublishedDate,
    highlightQuery,
    includeDomains,
    excludeDomains,
  } = opts

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      query,
      numResults,
      // Neural (semantic) search is better than keyword for trend/culture queries.
      type: "neural",
      ...(startPublishedDate && { startPublishedDate }),
      ...(includeDomains?.length && { includeDomains }),
      ...(excludeDomains?.length && { excludeDomains }),
      contents: {
        text: { maxCharacters: 600 },
        highlights: {
          // maxCharacters replaces the deprecated numSentences/highlightsPerUrl.
          maxCharacters: 800,
          // Custom sub-query steers the LLM toward the snippets we actually want.
          ...(highlightQuery && { query: highlightQuery }),
        },
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Exa search failed (${res.status})`)
  }

  const data = (await res.json()) as { results?: ExaResult[] }
  return (data.results ?? []).map((r) => ({
    title: r.title ?? "Untitled",
    url: r.url ?? "",
    source: r.url ? domainOf(r.url) : "unknown",
    published: r.publishedDate,
    snippet: (r.highlights?.join(" ") || r.text || "").trim().slice(0, 500),
  }))
}

function buildTrendsQuery(category: string, platform?: string, market?: string): string {
  const platformStr = platform && platform !== "Meta" ? `${platform} ` : ""
  const marketStr = market ? ` ${market}` : ""
  if (platformStr) {
    return `trending ${platformStr}content ${category.toLowerCase()}${marketStr} this month`
  }
  return `emerging trends and cultural moments in ${category}${marketStr} this month`
}

function buildChatterQuery(brand: string, category: string, platform?: string, market?: string): string {
  const platformStr = platform && platform !== "Meta" ? ` ${platform}` : ""
  const marketStr = market ? ` ${market}` : ""
  return `${brand} ${category.toLowerCase()} consumer conversations${platformStr}${marketStr} recent`
}

export async function searchCategoryTrends(
  category: string,
  platform?: string,
  market?: string,
): Promise<ExaSignal[]> {
  return exaSearch({
    query: buildTrendsQuery(category, platform, market),
    numResults: 7,
    // Trends go stale fast — tighten to last 14 days.
    startPublishedDate: daysAgoISO(14),
    highlightQuery: "emerging consumer trend, cultural moment, or viral behavior",
    includeDomains: TREND_INCLUDE_DOMAINS,
    excludeDomains: NOISE_EXCLUDE_DOMAINS,
  })
}

export async function searchBrandChatter(
  brand: string,
  category: string,
  platform?: string,
  market?: string,
): Promise<ExaSignal[]> {
  return exaSearch({
    query: buildChatterQuery(brand, category, platform, market),
    numResults: 5,
    // Brand chatter window is wider — 60 days to catch recent campaigns.
    startPublishedDate: daysAgoISO(60),
    highlightQuery: "consumer sentiment, brand perception, or audience reaction",
    excludeDomains: NOISE_EXCLUDE_DOMAINS,
  })
}

export async function searchCompetitorSignals(
  competitor: string,
  category: string,
  platform: string,
): Promise<ExaSignal[]> {
  return exaSearch({
    query: `${competitor} ${category.toLowerCase()} advertising campaign creative ${platform} recent`,
    numResults: 4,
    startPublishedDate: daysAgoISO(90),
    highlightQuery: "advertising creative, campaign strategy, or marketing angle",
    includeDomains: COMPETITOR_INCLUDE_DOMAINS,
    excludeDomains: NOISE_EXCLUDE_DOMAINS,
  })
}

export function mergeSignals(a: ExaSignal[], b: ExaSignal[]): ExaSignal[] {
  const seen = new Set<string>()
  return [...a, ...b].filter((s) => {
    if (!s.url || seen.has(s.url)) return false
    seen.add(s.url)
    return true
  })
}
