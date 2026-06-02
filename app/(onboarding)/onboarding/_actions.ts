'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { customersService } from '@/modules/customers'
import { uploadCertificate } from '@/modules/verification'
import type { TaxDocumentType } from '@prisma/client'
import { redirect } from 'next/navigation'

/**
 * Onboarding self-service: crea Organization PENDING + member OWNER + default
 * address + sube certificado. Tras submit, redirige a /onboarding/pending.
 *
 * Si el user ya pertenece a una org → throw ALREADY_HAS_ORG (la UI no debería
 * mostrar el form; defensa en profundidad).
 */
export async function submitOnboardingAction(formData: FormData): Promise<void> {
  const user = await requireAuth()

  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (existingMember) throw new Error('ALREADY_HAS_ORG')

  const name = String(formData.get('name')).trim()
  const countryRaw = String(formData.get('country')).trim().toUpperCase()
  if (countryRaw.length !== 2) throw new Error('country debe ser ISO-2')
  const country = countryRaw
  const addressLine1 = String(formData.get('addressLine1')).trim()
  const addressLine2 = String(formData.get('addressLine2') ?? '').trim() || undefined
  const city = String(formData.get('city')).trim()
  const state = String(formData.get('state') ?? '').trim() || undefined
  const postalCode = String(formData.get('postalCode')).trim()

  const docType = String(formData.get('type')) as TaxDocumentType
  const docNumber = String(formData.get('number')).trim()
  const jurisdiction = String(formData.get('jurisdiction')).trim()
  const file = formData.get('file') as File | null

  if (!name) throw new Error('name obligatorio')
  if (country.length !== 2) throw new Error('country debe ser ISO-2')
  if (!addressLine1 || !city || !postalCode) throw new Error('dirección incompleta')
  if (!docNumber || !jurisdiction) throw new Error('certificado: número y jurisdicción obligatorios')
  if (!file || file.size === 0) throw new Error('archivo del certificado obligatorio')
  if (file.size > 10 * 1024 * 1024) throw new Error('archivo > 10 MB')

  const org = await customersService.createOrganizationWithOwner({
    userId: user.id,
    name,
    country,
    address: {
      recipient: name,
      line1: addressLine1,
      line2: addressLine2,
      city,
      state,
      postalCode,
    },
  })

  const fileBytes = new Uint8Array(await file.arrayBuffer())
  await uploadCertificate({
    organizationId: org.id,
    type: docType,
    number: docNumber,
    jurisdiction,
    fileName: file.name,
    fileBytes,
    country,
  })

  redirect('/onboarding/pending')
}

/**
 * Re-upload del certificado para una org REJECTED. La org vuelve a PENDING
 * y el rejectionReason se limpia. (Implementado dentro de uploadCertificate.)
 */
export async function resubmitCertificateAction(formData: FormData): Promise<void> {
  const user = await requireAuth()
  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: { in: ['OWNER', 'ADMIN'] } },
    select: { organizationId: true },
  })
  if (!member) throw new Error('NO_ORG')

  const docType = String(formData.get('type')) as TaxDocumentType
  const docNumber = String(formData.get('number')).trim()
  const jurisdiction = String(formData.get('jurisdiction')).trim()
  const file = formData.get('file') as File | null
  if (!docNumber || !jurisdiction) throw new Error('número y jurisdicción obligatorios')
  if (!file || file.size === 0) throw new Error('archivo obligatorio')
  if (file.size > 10 * 1024 * 1024) throw new Error('archivo > 10 MB')

  const fileBytes = new Uint8Array(await file.arrayBuffer())
  await uploadCertificate({
    organizationId: member.organizationId,
    type: docType,
    number: docNumber,
    jurisdiction,
    fileName: file.name,
    fileBytes,
  })

  redirect('/onboarding/pending')
}
