export interface ShortenRequest {
  originalUrl: string
  customAlias?: string
  expiresAt?: string
}

export interface ShortenResponse {
  shortCode: string
  shortUrl: string
}

export interface UrlStatsResponse {
  originalUrl: string
  clickCount: number
  createdAt: string
  expiresAt?: string
}

export interface ApiErrorBody {
  error?: string
  remainingRequest?: number
  timeUntilReset?: number
}

export interface StoredLink {
  shortCode: string
  createdAt: string
}
