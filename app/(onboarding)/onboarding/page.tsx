import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { redirect } from 'next/navigation'
import { submitOnboardingAction } from './_actions'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireAuth()
  // Si ya tiene una org → /onboarding/pending o /catalog según status.
  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: {
      organization: { select: { id: true, verificationStatus: true } },
    },
  })
  if (member?.organization) {
    if (member.organization.verificationStatus === 'VERIFIED') redirect('/catalog')
    redirect('/onboarding/pending')
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-medium tracking-tight">Registrá tu negocio</h1>
      <p className="mt-2 text-sm text-gray-600">
        Para acceder a precios mayoristas y comprar, necesitamos los datos básicos de tu
        negocio y el certificado de reventa (o equivalente extranjero). Lo revisamos
        manualmente y te avisamos por email en cuanto esté aprobado.
      </p>

      <form action={submitOnboardingAction} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-medium">Datos del negocio</h2>
          </CardHeader>
          <CardBody className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-xs text-gray-500 mb-1">
                Razón social
              </label>
              <Input id="name" name="name" required placeholder="Acme Repair Shop" />
            </div>
            <div>
              <label htmlFor="country" className="block text-xs text-gray-500 mb-1">
                País (ISO-2)
              </label>
              <Input
                id="country"
                name="country"
                required
                maxLength={2}
                defaultValue="US"
                placeholder="US"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine1" className="block text-xs text-gray-500 mb-1">
                Dirección (calle y número)
              </label>
              <Input id="addressLine1" name="addressLine1" required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine2" className="block text-xs text-gray-500 mb-1">
                Dirección (línea 2, opcional)
              </label>
              <Input id="addressLine2" name="addressLine2" />
            </div>
            <div>
              <label htmlFor="city" className="block text-xs text-gray-500 mb-1">
                Ciudad
              </label>
              <Input id="city" name="city" required />
            </div>
            <div>
              <label htmlFor="state" className="block text-xs text-gray-500 mb-1">
                Estado / provincia (opcional)
              </label>
              <Input id="state" name="state" placeholder="TX" />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-xs text-gray-500 mb-1">
                Código postal
              </label>
              <Input id="postalCode" name="postalCode" required />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium">Certificado de reventa</h2>
            <p className="mt-1 text-xs text-gray-500">
              Resale Certificate (USA) o documento equivalente del país. PDF o imagen, ≤
              10 MB.
            </p>
          </CardHeader>
          <CardBody className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-xs text-gray-500 mb-1">
                Tipo
              </label>
              <select
                id="type"
                name="type"
                required
                className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="US_RESALE_CERT">US Resale Certificate</option>
                <option value="FOREIGN_EQUIV">Equivalente extranjero</option>
              </select>
            </div>
            <div>
              <label htmlFor="jurisdiction" className="block text-xs text-gray-500 mb-1">
                Jurisdicción
              </label>
              <Input id="jurisdiction" name="jurisdiction" required placeholder="TX, FL, …" />
            </div>
            <div>
              <label htmlFor="number" className="block text-xs text-gray-500 mb-1">
                Número del certificado
              </label>
              <Input id="number" name="number" required />
            </div>
            <div>
              <label htmlFor="file" className="block text-xs text-gray-500 mb-1">
                Archivo
              </label>
              <input
                id="file"
                name="file"
                type="file"
                required
                accept="application/pdf,image/*"
                className="block w-full text-sm"
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Enviar para revisión</Button>
        </div>
      </form>
    </div>
  )
}
