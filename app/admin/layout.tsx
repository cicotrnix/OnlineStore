import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { requireAuth } from '@/lib/auth/helpers'
import { maintainCurrentSession } from '@/lib/auth/maintain'
import { prisma } from '@/lib/db/client'
import { type Locale, getLocale, t } from '@/lib/i18n'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

function buildNav(locale: Locale) {
  return [
    { href: '/admin', label: t(locale, 'admin.nav.dashboard') },
    { href: '/admin/products', label: t(locale, 'admin.nav.products') },
    { href: '/admin/categories', label: t(locale, 'admin.nav.categories') },
    { href: '/admin/orders', label: t(locale, 'admin.nav.orders') },
    { href: '/admin/quotes', label: t(locale, 'admin.nav.quotes') },
    { href: '/admin/invoices', label: t(locale, 'admin.nav.invoices') },
    { href: '/admin/approvals', label: t(locale, 'admin.nav.approvals') },
    { href: '/admin/customers', label: t(locale, 'admin.nav.customers') },
    { href: '/admin/search', label: t(locale, 'admin.nav.search') },
    { href: '/admin/settings', label: t(locale, 'admin.nav.settings') },
  ]
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await maintainCurrentSession()
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) redirect('/')

  const navItems = buildNav(locale)

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center justify-between px-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t(locale, 'admin.label')}
          </h2>
          <LocaleSwitch current={locale} />
        </div>
        <nav className="mt-4 space-y-0.5">
          {navItems.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 px-3 text-xs text-gray-500">
          <div>{user.email}</div>
          {u?.isPlatformAdmin && (
            <div className="mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              {t(locale, 'admin.platformAdmin')}
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-x-auto">{children}</main>
    </div>
  )
}
