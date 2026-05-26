import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { switchActiveOrg } from '@/lib/auth/actions'
import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'
import { redirect } from 'next/navigation'

export default async function SelectOrgPage() {
  const user = await requireAuth()
  const orgs = await customersService.listForUser(user.id)

  if (orgs.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 text-center">
        <h1 className="text-xl font-medium">Sin organizaciones</h1>
        <p className="mt-2 text-sm text-gray-600">
          No perteneces a ninguna organización. Pide a un admin que te invite.
        </p>
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
      <h1 className="text-xl font-medium">Elige tu organización</h1>
      <p className="mt-1 text-sm text-gray-500">
        Cambiar de organización en el futuro vaciará tu carrito.
      </p>
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
                  Seleccionar
                </Button>
              </form>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
