import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteUrl } from '../api/urls'
import { useMyLinks } from './useMyLinks'

/**
 * Mutation hook that deletes a short URL from the server and then
 * synchronises local state:
 *  1. Removes the entry from the `my-links` localStorage / query cache via
 *     `removeLink` (provided by `useMyLinks`).
 *  2. Clears the `['url-stats', shortCode]` query cache so stale click-count
 *     data is not shown if the same code is ever re-used.
 *
 * Usage:
 *   const remove = useDeleteUrl()
 *   remove.mutate(shortCode)
 */
export function useDeleteUrl() {
  const queryClient = useQueryClient()
  const { removeLink } = useMyLinks()

  return useMutation<void, Error, string>({
    mutationFn: (shortCode: string) => deleteUrl(shortCode),

    onSuccess: (_data, shortCode) => {
      // Remove from the persisted list and invalidate the list cache.
      removeLink(shortCode)

      // Belt-and-suspenders: also nuke the per-link stats cache so nothing
      // stale lingers after deletion (removeLink already does this, but being
      // explicit here makes the contract obvious to future readers).
      queryClient.removeQueries({ queryKey: ['url-stats', shortCode] })
    },
  })
}
