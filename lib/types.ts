export type Heat = "hot" | "rising" | "cooling"

export interface BriefCard {
  trend_name: string
  heat: Heat
  why_now: string
  creative_angle: string
  hook: string
  audience_tension: string
  ad_formats: string[]
  do_dont: { do: string; dont: string }
  example_brands: Array<{ name: string; approach: string }>
  copy_directions: string[]
  source: string
  source_url: string
  signal: string
}

export interface GenerateResponse {
  cards: BriefCard[]
  liveSearch: boolean
  platform: string
  objective: string
  competitor: string
  market: string
}
