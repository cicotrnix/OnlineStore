import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resubmitCertificateAction } from '../_actions'

export const dynamic = 'force-dynamic'

export default async function OnboardingPendingPage() {
  const user = await requireAuth()
  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          verificationStatus: true,
          rejectionReason: true,
          verificationSubmittedAt: true,
        },
      },
    },
  })
  if (!member?.organization) redirect('/onboarding')
  const org = member.organization
  if (org.verificationStatus === 'VERIFIED') redirect('/catalog')

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-medium">{org.name}</h1>
            <Badge variant={org.verificationStatus === 'REJECTED' ? 'danger' : 'warning'}>
              {org.verificationStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4 text-sm text-gray-700">
          {org.verificationStatus === 'PENDING' && (
            <>
              <p>
                Tu cuenta está en revisión. Te enviamos un email cuando esté aprobada.
                Esto suele tardar 1 día hábil.
              </p>
              {org.verificationSubmittedAt && (
                <p className="text-xs text-gray-500">
                  Enviada el {org.verificationSubmittedAt.toLocaleString()}.
                </p>
              )}
            </>
          )}

          {org.verificationStatus === 'REJECTED' && (
            <>
              <p>Tu solicitud fue rechazada con el siguiente motivo:</p>
              <p className="rounded border border-red-200 bg-red-50 p-3 text-red-800">
                {org.rejectionReason ?? 'Sin motivo especificado'}
              </p>
              <p>
                Podés volver a enviar el certificado actualizado. La cuenta volverá a
                estado <strong>PENDING</strong> hasta nueva revisión.
              </p>
              <form
                action={resubmitCertificateAction}
                className="space-y-3 border-t border-gray-200 pt-4 mt-4"
              >
                <div className="grid sm:grid-cols-2 gap-3">
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
                    <Input
                      id="jurisdiction"
                      name="jurisdiction"
                      required
                      placeholder="TX, FL, …"
                    />
                  </div>
                  <div>
                    <label htmlFor="number" className="block text-xs text-gray-500 mb-1">
                      Número del certificado
                    </label>
                    <Input id="number" name="number" required />
                  </div>
                  <div>
                    <label htmlFor="file" className="block text-xs text-gray-500 mb-1">
                      Archivo (PDF / imagen, ≤ 10 MB)
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
                </div>
                <Button type="submit">Re-enviar para revisión</Button>
              </form>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link href="/catalog" className="text-blue-700 hover:underline">
              Mientras tanto, explorá el catálogo →
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
