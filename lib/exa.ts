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

// Brand chatter: third-party sources that reflect external audience perception.
// Deliberately excludes trade press (adweek, thedrum, marketingweek) because they
// primarily publish brand-authored campaign coverage, not consumer reactions.
// reddit.com, businessinsider.com, and forbes.com are blocked on this Exa plan.
const BRAND_CHATTER_INCLUDE_DOMAINS = [
  "prnewswire.com",   // third-party analyst and industry reaction
  "businesswire.com", // third-party research and market commentary
  "techcrunch.com",   // product/market reception from a tech audience lens
  "glossy.co",        // consumer fashion/beauty community perspective
  "substack.com",     // independent analyst and consumer commentary
  "morningbrew.com",  // consumer-facing business narrative
]

// Low-signal domains across all search types.
const NOISE_EXCLUDE_DOMAINS = [
  "wikipedia.org",
  "linkedin.com",
  "glassdoor.com",
  "indeed.com",
  "quora.com",
]

// Social proxy domains: platform newsrooms, creator economy press, and social
// analytics blogs that publish weekly trend roundups. These are the closest
// open-web proxy for what is actually trending on TikTok, Instagram, YouTube, and X
// since Exa cannot index those platforms directly.
// Blocked on this Exa plan: creators.instagram.com, about.instagram.com, business.instagram.com
// about.fb.com is the best available Instagram/Meta newsroom proxy (verified 200, fresh 2025 content).
const SOCIAL_PROXY_DOMAINS = [
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
  // Frame around external audience perception — NOT brand campaigns or self-published content.
  // "customers think" / "audience reaction" / "consumer sentiment" biases neural search
  // toward third-party commentary rather than the brand's own press releases.
  return `what consumers and audiences think about ${brand} ${category.toLowerCase()}${platformStr}${marketStr} perception criticism praise`
}

/** Derive likely owned/PR domains to exclude from brand chatter so the brand's
 *  own content doesn't dominate results. e.g. "Nike" → ["nike.com", "news.nike.com"] */
function brandOwnedDomains(brand: string): string[] {
  const slug = brand.toLowerCase().replace(/[^a-z0-9]/g, "")
  return [`${slug}.com`, `news.${slug}.com`, `press.${slug}.com`, `newsroom.${slug}.com`]
}

export async function searchCategoryTrends(
  category: string,
  platform?: string,
  market?: string,
  brand?: string,
): Promise<ExaSignal[]> {
  return exaSearch({
    query: buildTrendsQuery(category, platform, market),
    numResults: 7,
    startPublishedDate: daysAgoISO(21),
    highlightQuery:
      "creative trend, cultural moment, consumer behavior shift, or viral content pattern relevant to advertisers",
    includeDomains: TREND_INCLUDE_DOMAINS,
    excludeDomains: [
      ...NOISE_EXCLUDE_DOMAINS,
      ...(brand ? brandOwnedDomains(brand) : []),
    ],
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
    // 60 days captures recent community reactions and market commentary.
    startPublishedDate: daysAgoISO(60),
    highlightQuery:
      "consumer sentiment, audience perception, public reaction, criticism, or external commentary about the brand — NOT the brand's own campaign announcements",
    includeDomains: BRAND_CHATTER_INCLUDE_DOMAINS,
    // Exclude noise + the brand's own web properties so self-published
    // campaign content doesn't surface as "consumer chatter".
    excludeDomains: [...NOISE_EXCLUDE_DOMAINS, ...brandOwnedDomains(brand)],
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

// Build a platform-aware query targeting the social proxy domains.
function buildSocialProxyQuery(category: string, platform: string, market?: string): string {
  const marketStr = market ? ` ${market}` : ""
  // Map platform names to the vocabulary used in trend roundup articles.
  const platformKeyword: Record<string, string> = {
    TikTok: "TikTok trending",
    "YouTube Shorts": "YouTube Shorts creators",
    Meta: "Instagram Reels trending",
    LinkedIn: "LinkedIn content trends",
    Pinterest: "Pinterest trending",
  }
  const kw = platformKeyword[platform] ?? `${platform} trending`
  return `${kw} ${category.toLowerCase()} content creator${marketStr} this week`
}

export async function searchSocialSignals(
  category: string,
  platform: string,
  market?: string,
  brand?: string,
): Promise<ExaSignal[]> {
  return exaSearch({
    query: buildSocialProxyQuery(category, platform, market),
    numResults: 5,
    startPublishedDate: daysAgoISO(14),
    highlightQuery:
      "trending content format, viral creator pattern, or platform-native behavior relevant to brand advertisers",
    includeDomains: SOCIAL_PROXY_DOMAINS,
    excludeDomains: [
      ...NOISE_EXCLUDE_DOMAINS,
      ...(brand ? brandOwnedDomains(brand) : []),
    ],
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

// Words that indicate an article is about a brand's own strategy/campaign rather
// than an external trend, consumer reaction, or category signal.
const BRAND_STRATEGY_WORDS = [
  "campaign", "activation", "activat", "strategy", "strateg",
  "launch", "unveil", "reveal", "debut", "release", "drop",
  "partner", "collaborat", "sponsorship", "sponsor",
  "ad spot", "commercial", "world cup", "world-cup",
  "marketing push", "marketing effort", "marketing strategy",
  "brand film", "brand video", "brand spot",
  "focuses on", "focus on", "bets on", "leans into", "doubles down",
  "leverag", "harnessing", "capitaliz",
  "introduces", "taps", "signs", "enlists", "features",
]

/**
 * Remove signals that are primarily about the brand's own campaigns, strategy,
 * or activations. Works by scoring both title and snippet for brand-strategy
 * co-occurrence — a signal is dropped if the brand name appears AND two or more
 * strategy words appear in the same text block.
 */
export function filterBrandOwnCampaigns(signals: ExaSignal[], brand: string): ExaSignal[] {
  if (!brand.trim()) return signals
  const b = brand.toLowerCase()

  return signals.filter((s) => {
    const title = s.title.toLowerCase()
    const snippet = s.snippet.toLowerCase()

    // Check title: if brand appears AND 1+ strategy word appears, drop it.
    // Title is short so a single co-occurrence is a strong signal.
    if (title.includes(b)) {
      const titleHits = BRAND_STRATEGY_WORDS.filter((w) => title.includes(w))
      if (titleHits.length >= 1) return false
    }

    // Check snippet: brand + 2+ strategy words = article is about the brand's own work.
    if (snippet.includes(b)) {
      const snippetHits = BRAND_STRATEGY_WORDS.filter((w) => snippet.includes(w))
      if (snippetHits.length >= 2) return false
    }

    return true
  })
}
