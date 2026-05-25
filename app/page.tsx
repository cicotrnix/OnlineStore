import storeConfig from '@/store.config'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-xl">
        <h1
          className="text-4xl font-medium tracking-tight"
          style={{ color: 'var(--color-primary)' }}
        >
          {storeConfig.identity.name}
        </h1>
        <p className="mt-4 text-gray-600">Wholesale store · Coming soon</p>
        <p className="mt-8 text-xs text-gray-400">Phase 0 · Foundation</p>
      </div>
    </main>
  )
}
