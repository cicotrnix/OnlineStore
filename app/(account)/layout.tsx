import { StoreHeader } from '@/components/commerce/StoreHeader'
import { maintainCurrentSession } from '@/lib/auth/maintain'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await maintainCurrentSession()
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <StoreHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}
