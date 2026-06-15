export type Heat = "hot" | "rising" | "cooling"

export interface BriefCard {
  trend_name: string
  heat: Heat
  why_now: string
  creative_angle: string
  hook: string
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
