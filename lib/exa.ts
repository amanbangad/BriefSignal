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

// Trade press and cultural editorial — what creative directors actually read.
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
  "creativebrief.com",
  "morningbrew.com",
]

// Brand chatter: brand newsrooms, trade press, and creator-adjacent media.
// reddit.com, businessinsider.com, and forbes.com are blocked on this Exa plan.
const BRAND_CHATTER_INCLUDE_DOMAINS = [
  "prnewswire.com",
  "businesswire.com",
  "techcrunch.com",
  "glossy.co",
  "digiday.com",
  "adweek.com",
  "substack.com",
  "morningbrew.com",
  "thedrum.com",
  "marketingweek.com",
]

// Low-signal domains across all search types.
const NOISE_EXCLUDE_DOMAINS = [
  "wikipedia.org",
  "linkedin.com",
  "glassdoor.com",
  "indeed.com",
  "quora.com",
]

// Competitor intelligence: campaign reporting and brand PR outlets.
const COMPETITOR_INCLUDE_DOMAINS = [
  "adweek.com",
  "campaignlive.com",
  "thedrum.com",
  "marketingweek.com",
  "digiday.com",
  "businesswire.com",
  "prnewswire.com",
  "mediapost.com",
  "creativebrief.com",
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
    // Platform-specific framing surfaces creator and native content trends.
    return `${platformStr}creator trend ${category.toLowerCase()} content${marketStr} this week`
  }
  return `cultural moment or emerging consumer trend ${category.toLowerCase()}${marketStr} advertising`
}

function buildChatterQuery(brand: string, category: string, platform?: string, market?: string): string {
  const platformStr = platform && platform !== "Meta" ? ` ${platform}` : ""
  const marketStr = market ? ` ${market}` : ""
  // Reddit + brand newsrooms are the signal sources the positioning doc calls out explicitly.
  return `${brand} ${category.toLowerCase()} consumer reaction Reddit discussion${platformStr}${marketStr}`
}

export async function searchCategoryTrends(
  category: string,
  platform?: string,
  market?: string,
): Promise<ExaSignal[]> {
  return exaSearch({
    query: buildTrendsQuery(category, platform, market),
    numResults: 7,
    // Trend windows are short (Publicis: ~5 days). 21 days captures the editorial
    // reaction wave that appears after a trend peaks on social.
    startPublishedDate: daysAgoISO(21),
    highlightQuery:
      "creative trend, cultural moment, consumer behavior shift, or viral content pattern relevant to advertisers",
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
    numResults: 6,
    // 60 days captures recent campaigns and community reactions.
    startPublishedDate: daysAgoISO(60),
    highlightQuery:
      "consumer sentiment, audience reaction, brand perception, or community discussion a strategist would find relevant",
    // Brand newsrooms (PR wire) and Reddit are the open-web sources that
    // social listening tools miss — include them explicitly here.
    includeDomains: BRAND_CHATTER_INCLUDE_DOMAINS,
    excludeDomains: NOISE_EXCLUDE_DOMAINS,
  })
}

export async function searchCompetitorSignals(
  competitor: string,
  category: string,
  platform: string,
): Promise<ExaSignal[]> {
  return exaSearch({
    query: `${competitor} ${category.toLowerCase()} ad campaign creative strategy ${platform} 2025`,
    numResults: 4,
    // Competitor campaign cycles run 60-90 days — widen window accordingly.
    startPublishedDate: daysAgoISO(90),
    highlightQuery:
      "campaign creative angle, ad strategy, messaging approach, or audience targeting insight",
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
