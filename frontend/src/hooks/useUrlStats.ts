import { useQuery } from '@tanstack/react-query'

import { getStats } from '../api/urls'
import type { UrlStatsResponse } from '../api/types'

export const urlStatsQueryKey = (shortCode: string) =>
  ['url-stats', shortCode] as const

export function useUrlStats(shortCode: string | undefined) {
  return useQuery<UrlStatsResponse, Error>({
    queryKey: urlStatsQueryKey(shortCode ?? ''),
    queryFn: () => getStats(shortCode!),
    enabled: Boolean(shortCode),
  })
}
