import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { requireAuth } from '@/lib/auth/helpers'
import { maintainCurrentSession } from '@/lib/auth/maintain'
import { prisma } from '@/lib/db/client'
import { type Locale, getLocale, t } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'
import { redirect } from 'next/navigation'
import { AdminMobileBar } from './AdminMobileBar'
import { AdminNav, type AdminNavItem } from './AdminNav'

export const dynamic = 'force-dynamic'

function buildNav(locale: Locale): AdminNavItem[] {
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
  const brand = getStoreConfig().identity.name

  const foot = (
    <div className="text-xs text-white/50">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{user.email}</span>
        <LocaleSwitch current={locale} />
      </div>
      <span className="mt-2 inline-block rounded-button bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
        {t(locale, 'admin.platformAdmin')}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface lg:flex">
      {/* Sidebar slate (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-neutral-900 p-4 lg:flex">
        <div className="px-3 py-2">
          <span className="text-lg font-bold tracking-tight text-white">{brand}</span>
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-white/40">
            {t(locale, 'admin.label')}
          </span>
        </div>
        <div className="mt-4 flex-1">
          <AdminNav items={navItems} />
        </div>
        <div className="mt-6 border-t border-white/10 pt-4">{foot}</div>
      </aside>

      {/* Barra + drawer (mobile) */}
      <AdminMobileBar items={navItems} locale={locale} brand={brand} foot={foot} />

      <main className="min-w-0 flex-1 overflow-x-auto p-6 lg:p-8">{children}</main>
    </div>
  )
}
