import { SearchBar } from '@/components/commerce/SearchBar'
import { FeaturedGrid } from '@/components/storefront/FeaturedGrid'
import { auth } from '@/lib/auth/config'
import storeConfig from '@/store.config'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            {storeConfig.identity.name}
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/catalog" className="text-gray-700 hover:text-gray-900">
              Catálogo
            </Link>
            {session?.user ? (
              <Link href="/orders" className="text-gray-700 hover:text-gray-900">
                Mi cuenta
              </Link>
            ) : (
              <Link href="/sign-in" className="text-gray-700 hover:text-gray-900">
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-16">
        <section className="text-center">
          <h1
            className="text-4xl md:text-5xl font-medium tracking-tight"
            style={{ color: 'var(--color-primary)' }}
          >
            {storeConfig.identity.name}
          </h1>
          {storeConfig.identity.tagline && (
            <p className="mt-3 text-lg text-gray-600">{storeConfig.identity.tagline}</p>
          )}
          <div className="mt-8 flex justify-center">
            <SearchBar size="lg" placeholder="Buscá productos por SKU, nombre o descripción" />
          </div>
        </section>

        <FeaturedGrid limit={8} />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-gray-500 flex flex-wrap gap-4 justify-between">
          <span>
            © {new Date().getFullYear()} {storeConfig.identity.name}
          </span>
          <div className="flex gap-4">
            <Link href="/catalog" className="hover:text-gray-700">
              Catálogo
            </Link>
            <Link href="/sign-in" className="hover:text-gray-700">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
