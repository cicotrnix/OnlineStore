import { AuthField } from '@/app/(auth)/AuthField'
import { createCategoryAction } from '@/app/admin/_actions'
import { AdminPageHeader, DataTable, StatusBadge, adminBtn } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { getLocale, t } from '@/lib/i18n'
import { catalogService } from '@/modules/catalog'

export default async function AdminCategoriesPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const categories = await catalogService.listCategories(false)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t(locale, 'admin.categories.title')}
        subtitle={t(locale, 'admin.categories.count', { count: categories.length })}
      />

      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.categories.newCategory')}
        </h2>
        <form action={createCategoryAction} className="mt-3 grid gap-3 sm:grid-cols-3">
          <AuthField
            name="slug"
            label={t(locale, 'admin.categories.f.slug')}
            required
            placeholder="cosmeticos"
          />
          <AuthField name="name" label={t(locale, 'admin.categories.f.name')} required />
          <AuthField
            name="sortOrder"
            label={t(locale, 'admin.categories.f.sortOrder')}
            type="number"
            min={0}
            defaultValue={0}
          />
          <div className="flex justify-end sm:col-span-3">
            <SubmitButton
              pendingLabel={t(locale, 'admin.action.creating')}
              className={adminBtn.primary}
            >
              {t(locale, 'admin.action.create')}
            </SubmitButton>
          </div>
        </form>
      </section>

      <DataTable
        columns={[
          {
            key: 'order',
            header: t(locale, 'admin.categories.col.order'),
            align: 'right',
            className: 'tabular-nums',
            cell: (c) => c.sortOrder,
          },
          {
            key: 'slug',
            header: t(locale, 'admin.categories.col.slug'),
            className: 'font-mono text-xs',
            cell: (c) => c.slug,
          },
          { key: 'name', header: t(locale, 'admin.categories.col.name'), cell: (c) => c.name },
          {
            key: 'status',
            header: t(locale, 'admin.categories.col.status'),
            cell: (c) => (
              <StatusBadge tone={c.isActive ? 'success' : 'neutral'}>
                {c.isActive
                  ? t(locale, 'admin.categories.active')
                  : t(locale, 'admin.categories.inactive')}
              </StatusBadge>
            ),
          },
        ]}
        rows={categories}
        getRowKey={(c) => c.id}
        empty="—"
      />
    </div>
  )
}
