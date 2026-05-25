import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'

export default async function AdminDashboardPage() {
  const user = await requireAuth()
  const orgs = await customersService.listForUser(user.id)

  return (
    <div>
      <h1 className="text-2xl font-medium">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">Welcome back, {user.email}.</p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-500">Your organizations</h2>
        {orgs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No organizations yet. Create one in{' '}
            <a href="/admin/settings" className="underline">
              settings
            </a>
            .
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {orgs.map((org) => (
              <li key={org.id} className="text-sm">
                <strong>{org.name}</strong> — {org.slug}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
