import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { auth } from '@/lib/auth/config'
import { getLocale } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'
import Image from 'next/image'
import Link from 'next/link'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label={getStoreConfig().identity.name} className="block">
            <Image
              src={getStoreConfig().identity.logo}
              alt={getStoreConfig().identity.name}
              width={1600}
              height={998}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <LocaleSwitch current={locale} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
