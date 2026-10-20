import { apiClient } from './client'
import type { ShortenRequest, ShortenResponse, UrlStatsResponse } from './types'

function encodeShortCode(shortCode: string): string {
  return encodeURIComponent(shortCode)
}

export async function shortenUrl(
  payload: ShortenRequest,
): Promise<ShortenResponse> {
  const body: ShortenRequest = {
    originalUrl: payload.originalUrl,
    ...(payload.customAlias?.trim()
      ? { customAlias: payload.customAlias.trim() }
      : {}),
    ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
  }

  const { data } = await apiClient.post<ShortenResponse>('/shorten', body)
  return data
}

export async function getStats(shortCode: string): Promise<UrlStatsResponse> {
  const { data } = await apiClient.get<UrlStatsResponse>(
    `/stats/${encodeShortCode(shortCode)}`,
  )
  return data
}

export async function deleteUrl(shortCode: string): Promise<void> {
  await apiClient.delete(`/${encodeShortCode(shortCode)}`)
}
