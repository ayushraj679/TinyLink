import { useState } from 'react'

export interface ShortenResultCardProps {
  shortUrl: string
  shortCode: string
  onCreateAnother: () => void
}

export default function ShortenResultCard({
  shortUrl,
  shortCode,
  onCreateAnother,
}: ShortenResultCardProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium text-indigo-600">Link created</p>
      <h2 className="mt-1 text-xl font-semibold text-gray-900">
        Your short URL is ready
      </h2>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
        >
          {shortUrl}
        </a>
        <button
          type="button"
          onClick={() => void copyToClipboard()}
          className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          {copied ? 'Copied' : 'Copy to Clipboard'}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400">Code: {shortCode}</p>

      <button
        type="button"
        onClick={onCreateAnother}
        className="mt-6 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        Shorten another link
      </button>
    </div>
  )
}
