import { Outlet, Link, NavLink } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <header className="border-b border-gray-200 px-6 py-4">
        <nav className="max-w-5xl mx-auto flex items-center gap-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            TinyLink
          </Link>
          <NavLink
            to="/links"
            className={({ isActive }) =>
              isActive ? 'text-indigo-600 font-medium' : 'text-gray-600 hover:text-gray-900'
            }
          >
            My Links
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 px-6 py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} TinyLink
      </footer>
    </div>
  )
}
