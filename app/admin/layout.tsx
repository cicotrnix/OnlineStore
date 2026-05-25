import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  const orgs = await customersService.listForUser(user.id)

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-50 border-r p-4">
        <h2 className="text-sm font-medium text-gray-500">Admin</h2>
        <nav className="mt-4 space-y-1">
          <Link href="/admin" className="block px-3 py-2 rounded text-sm hover:bg-gray-100">
            Dashboard
          </Link>
          <Link
            href="/admin/settings"
            className="block px-3 py-2 rounded text-sm hover:bg-gray-100"
          >
            Settings
          </Link>
        </nav>
        <div className="mt-8 text-xs text-gray-500">
          Signed in as <strong>{user.email}</strong>
          <div className="mt-1">{orgs.length} organization(s)</div>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
