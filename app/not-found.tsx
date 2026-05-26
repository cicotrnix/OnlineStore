import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-medium">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
