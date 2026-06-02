import storeConfig from '@/store.config'
import Image from 'next/image'
import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" aria-label={storeConfig.identity.name} className="block">
            <Image
              src={storeConfig.identity.logo}
              alt={storeConfig.identity.name}
              width={1600}
              height={998}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
