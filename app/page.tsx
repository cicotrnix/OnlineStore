import { SearchBar } from '@/components/commerce/SearchBar'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { FeaturedGrid } from '@/components/storefront/FeaturedGrid'
import { auth } from '@/lib/auth/config'
import storeConfig from '@/store.config'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto pl-2 pr-6 h-20 flex items-center justify-between">
          <Link href="/" aria-label={storeConfig.identity.name} className="-my-2 block shrink-0">
            <Image
              src={storeConfig.identity.logo}
              alt={storeConfig.identity.name}
              width={1600}
              height={998}
              priority
              className="h-16 md:h-20 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/catalog" className="text-gray-700 hover:text-gray-900">
              Catálogo
            </Link>
            {session?.user ? (
              <>
                <Link href="/orders" className="text-gray-700 hover:text-gray-900">
                  Mi cuenta
                </Link>
                <SignOutButton />
              </>
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
          <h1 className="sr-only">{storeConfig.identity.name}</h1>
          <div className="flex justify-center">
            <Image
              src={storeConfig.identity.logo}
              alt={storeConfig.identity.name}
              width={1600}
              height={998}
              priority
              className="h-32 md:h-40 w-auto"
            />
          </div>
          {storeConfig.identity.tagline && (
            <p
              className="mt-4 text-lg text-gray-600"
              // Motif π: acento de marca debajo del tagline.
              style={{ borderColor: 'var(--color-accent)' }}
            >
              {storeConfig.identity.tagline}
            </p>
          )}
          <div
            aria-hidden
            className="mt-4 mx-auto h-1 w-16 rounded-full"
            style={{ background: 'var(--color-accent)' }}
          />
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
            {session?.user ? (
              <SignOutButton label="Salir" className="hover:text-gray-700" />
            ) : (
              <Link href="/sign-in" className="hover:text-gray-700">
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
