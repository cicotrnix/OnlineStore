'use server'

import { switchActiveOrg } from '@/lib/auth/actions'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { toastUrl } from '@/lib/feedback/action-result'
import { customersService } from '@/modules/customers'
import { submitBusinessForVerification, uploadCertificate } from '@/modules/verification'
import type { TaxDocumentType } from '@prisma/client'
import { redirect } from 'next/navigation'

/**
 * Onboarding self-service: crea Organization PENDING + member OWNER + default
 * address + declara tax ID (sin subir archivo; el admin sube la evidencia al
 * aprobar). Tras submit, redirige a /onboarding/pending +
 * toast. Errores de validación: redirect a /onboarding con toast=error.
 */
export async function submitOnboardingAction(formData: FormData): Promise<void> {
  const user = await requireAuth()

  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (existingMember) {
    redirect(toastUrl('/onboarding/pending', 'info', 'onboarding.toast.alreadyHasOrg'))
  }

  const name = String(formData.get('name')).trim()
  const countryRaw = String(formData.get('country')).trim().toUpperCase()
  if (countryRaw.length !== 2) {
    redirect(toastUrl('/onboarding', 'error', 'onboarding.toast.invalidCountry'))
  }
  const country = countryRaw
  const addressLine1 = String(formData.get('addressLine1')).trim()
  const addressLine2 = String(formData.get('addressLine2') ?? '').trim() || undefined
  const city = String(formData.get('city')).trim()
  const state = String(formData.get('state') ?? '').trim() || undefined
  const postalCode = String(formData.get('postalCode')).trim()

  const docNumber = String(formData.get('number')).trim()

  if (!name || !addressLine1 || !city || !postalCode || !docNumber) {
    redirect(toastUrl('/onboarding', 'error', 'common.toast.error.unexpected'))
  }

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

  await submitBusinessForVerification({
    organizationId: org.id,
    taxId: docNumber,
    taxIdCountry: country,
  })

  // Setea la org recién creada como activa para que el usuario quede
  // listo sin pasar por /select-org cuando vuelva a navegar.
  await switchActiveOrg(org.id)

  redirect(toastUrl('/onboarding/pending', 'success', 'onboarding.toast.submitted'))
}

/**
 * Re-upload del certificado para una org REJECTED. La org vuelve a PENDING.
 */
export async function resubmitCertificateAction(formData: FormData): Promise<void> {
  const user = await requireAuth()
  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: { in: ['OWNER', 'ADMIN'] } },
    select: { organizationId: true },
  })
  if (!member) {
    redirect(toastUrl('/onboarding', 'error', 'common.toast.error.unexpected'))
  }

  const docType = String(formData.get('type')) as TaxDocumentType
  const docNumber = String(formData.get('number')).trim()
  const jurisdiction = String(formData.get('jurisdiction')).trim()
  const file = formData.get('file') as File | null
  if (!docNumber || !jurisdiction) {
    redirect(toastUrl('/onboarding/pending', 'error', 'common.toast.error.unexpected'))
  }
  if (!file || file.size === 0) {
    redirect(toastUrl('/onboarding/pending', 'error', 'onboarding.toast.fileMissing'))
  }
  if (file.size > 10 * 1024 * 1024) {
    redirect(toastUrl('/onboarding/pending', 'error', 'common.toast.error.unexpected'))
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer())
  await uploadCertificate({
    organizationId: member!.organizationId,
    type: docType,
    number: docNumber,
    jurisdiction,
    fileName: file.name,
    fileBytes,
  })

  redirect(toastUrl('/onboarding/pending', 'success', 'onboarding.toast.resubmitted'))
}
