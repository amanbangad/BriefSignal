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

async function exaSearch(query: string, numResults = 5): Promise<ExaSignal[]> {
  const key = process.env.EXA_API_KEY
  if (!key) return []

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      query,
      numResults,
      type: "auto",
      // Bias toward fresh signals from the last ~30 days.
      startPublishedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      contents: {
        text: { maxCharacters: 600 },
        highlights: { numSentences: 2, highlightsPerUrl: 2 },
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

export async function searchCategoryTrends(category: string): Promise<ExaSignal[]> {
  return exaSearch(`emerging trends and cultural moments in ${category} this month`, 5)
}

export async function searchBrandChatter(brand: string, category: string): Promise<ExaSignal[]> {
  return exaSearch(`recent consumer conversations and news about ${brand} ${category}`, 5)
}

export function mergeSignals(a: ExaSignal[], b: ExaSignal[]): ExaSignal[] {
  const seen = new Set<string>()
  return [...a, ...b].filter((s) => {
    if (!s.url || seen.has(s.url)) return false
    seen.add(s.url)
    return true
  })
}
