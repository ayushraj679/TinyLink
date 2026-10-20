import { useState } from 'react'

import ShortenForm from '../components/ShortenForm'
import ShortenResultCard from '../components/ShortenResultCard'

export default function HomePage() {
  const [result, setResult] = useState<{
    shortCode: string
    shortUrl: string
  } | null>(null)

  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-16">
      <header className="mb-10 text-center">
        <p className="text-sm font-medium tracking-wide text-indigo-600 uppercase">
          TinyLink
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Simplify your links
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-gray-500">
          Turn long URLs into clean, shareable short links in seconds.
        </p>
      </header>

      {result ? (
        <ShortenResultCard
          shortCode={result.shortCode}
          shortUrl={result.shortUrl}
          onCreateAnother={() => setResult(null)}
        />
      ) : (
        <ShortenForm onSuccess={setResult} />
      )}
    </div>
  )
}