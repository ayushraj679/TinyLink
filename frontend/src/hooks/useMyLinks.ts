import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { deleteUrl } from '../api/urls'
import type { StoredLink } from '../api/types'

export const MY_LINKS_QUERY_KEY = ['my-links'] as const
export const MY_LINKS_STORAGE_KEY = 'tinylink.myLinks'

function isStoredLink(value: unknown): value is StoredLink {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<StoredLink>
  return (
    typeof candidate.shortCode === 'string' &&
    candidate.shortCode.length > 0 &&
    typeof candidate.createdAt === 'string' &&
    candidate.createdAt.length > 0
  )
}

export function readStoredLinks(): StoredLink[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(MY_LINKS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isStoredLink)
  } catch {
    return []
  }
}

export function persistLinks(links: StoredLink[]): StoredLink[] {
  const unique = Array.from(
    new Map(links.map((link) => [link.shortCode, link])).values(),
  ).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  window.localStorage.setItem(MY_LINKS_STORAGE_KEY, JSON.stringify(unique))
  return unique
}

export function persistLink(link: StoredLink): StoredLink[] {
  const existing = readStoredLinks().filter(
    (item) => item.shortCode !== link.shortCode,
  )
  return persistLinks([link, ...existing])
}

function removeStoredLink(shortCode: string): StoredLink[] {
  return persistLinks(
    readStoredLinks().filter((link) => link.shortCode !== shortCode),
  )
}

export function useMyLinks() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: MY_LINKS_QUERY_KEY,
    queryFn: readStoredLinks,
    initialData: readStoredLinks,
    staleTime: Infinity,
  })

  const syncFromStorage = useCallback(() => {
    queryClient.setQueryData(MY_LINKS_QUERY_KEY, readStoredLinks())
  }, [queryClient])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === MY_LINKS_STORAGE_KEY) {
        syncFromStorage()
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [syncFromStorage])

  const addLink = useCallback(
    (link: StoredLink) => {
      const next = persistLink(link)
      queryClient.setQueryData(MY_LINKS_QUERY_KEY, next)
      return next
    },
    [queryClient],
  )

  const removeLink = useCallback(
    (shortCode: string) => {
      const next = removeStoredLink(shortCode)
      queryClient.setQueryData(MY_LINKS_QUERY_KEY, next)
      queryClient.removeQueries({ queryKey: ['url-stats', shortCode] })
      return next
    },
    [queryClient],
  )

  const deleteMutation = useMutation({
    mutationFn: deleteUrl,
    onSuccess: (_data, shortCode) => {
      removeLink(shortCode)
    },
  })

  return {
    links: query.data ?? [],
    isLoading: query.isLoading,
    addLink,
    removeLink,
    deleteLink: deleteMutation.mutate,
    deleteLinkAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  }
}
