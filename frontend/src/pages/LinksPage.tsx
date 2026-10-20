import { Link } from 'react-router-dom'

export default function LinksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Links</h1>
      <p className="text-gray-500 mb-4">Your shortened links will appear here.</p>
      {/* TODO: fetch links from API and render list */}
      <div className="border border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400">
        <p>No links yet.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
          Create your first link
        </Link>
      </div>
    </div>
  )
}
