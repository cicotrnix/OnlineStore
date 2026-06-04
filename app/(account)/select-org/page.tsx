import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { switchActiveOrg } from '@/lib/auth/actions'
import { requireAuth } from '@/lib/auth/helpers'
import { getLocale, t } from '@/lib/i18n'
import { customersService } from '@/modules/customers'
import { redirect } from 'next/navigation'

export default async function SelectOrgPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const orgs = await customersService.listForUser(user.id)

  if (orgs.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 text-center">
        <h1 className="text-xl font-medium">{t(locale, 'selectOrg.empty.title')}</h1>
        <p className="mt-2 text-sm text-gray-600">{t(locale, 'selectOrg.empty.body')}</p>
      </div>
    )
  }

  if (orgs.length === 1 && orgs[0]) {
    await switchActiveOrg(orgs[0].id)
    redirect('/catalog')
  }

  async function chooseOrg(formData: FormData) {
    'use server'
    const orgId = String(formData.get('orgId'))
    await switchActiveOrg(orgId)
    redirect('/catalog')
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <h1 className="text-xl font-medium">{t(locale, 'selectOrg.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t(locale, 'selectOrg.subtitle')}</p>
      <div className="mt-6 space-y-3">
        {orgs.map((org) => (
          <Card key={org.id}>
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{org.name}</div>
                <div className="text-xs text-gray-500">{org.slug}</div>
              </div>
              <form action={chooseOrg}>
                <input type="hidden" name="orgId" value={org.id} />
                <Button type="submit" size="sm">
                  {t(locale, 'selectOrg.select')}
                </Button>
              </form>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
