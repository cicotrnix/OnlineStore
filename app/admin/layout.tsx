import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/categories', label: 'Categorías' },
  { href: '/admin/orders', label: 'Órdenes' },
  { href: '/admin/customers', label: 'Clientes' },
  { href: '/admin/settings', label: 'Settings' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  })

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3">Admin</h2>
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
              Platform admin
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-x-auto">{children}</main>
    </div>
  )
}
