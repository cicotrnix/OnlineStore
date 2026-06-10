import { ChatWidget } from '@/components/commerce/ChatWidget'
import { StoreHeader } from '@/components/commerce/StoreHeader'
import { getCustomerState } from '@/lib/auth/customer'
import { maintainCurrentSession } from '@/lib/auth/maintain'
import { getStoreConfig } from '@/stores'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await maintainCurrentSession()
  // User logueado sin organizaciones → onboarding. Anónimos siguen navegando
  // el catálogo público (ADR 0034). /onboarding está fuera de (storefront),
  // así que no hay loop.
  const customer = await getCustomerState()
  if (customer.kind === 'no-org') {
    redirect('/onboarding')
  }
  const storeConfig = getStoreConfig()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-gray-500">
          © {new Date().getFullYear()} {storeConfig.identity.name}
        </div>
      </footer>
      {storeConfig.ai.chat && <ChatWidget />}
    </div>
  )
}
