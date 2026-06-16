import { HeaderContainer } from '@/components/commerce/HeaderContainer'
import { maintainCurrentSession } from '@/lib/auth/maintain'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await maintainCurrentSession()
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <HeaderContainer variant="inner" />
      <main className="flex-1">{children}</main>
    </div>
  )
}
