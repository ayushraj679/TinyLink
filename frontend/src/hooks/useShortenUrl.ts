import { useMutation } from '@tanstack/react-query'

import type { ShortenRequest, ShortenResponse } from '../api/types'
import { shortenUrl } from '../api/urls'

export function useShortenUrl() {
  return useMutation<ShortenResponse, Error, ShortenRequest>({
    mutationFn: shortenUrl,
  })
}
