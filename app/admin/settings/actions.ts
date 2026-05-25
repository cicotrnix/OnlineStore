'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { customersService } from '@/modules/customers'
import { revalidatePath } from 'next/cache'

export async function createOrganizationAction(formData: FormData) {
  const user = await requireAuth()
  const name = String(formData.get('name'))
  const slug = String(formData.get('slug'))
  await customersService.createOrganization({ name, slug, ownerUserId: user.id })
  revalidatePath('/admin/settings')
}

export async function inviteMemberAction(formData: FormData) {
  await requireAuth()
  const organizationId = String(formData.get('organizationId'))
  const email = String(formData.get('email'))
  await customersService.inviteMember({ organizationId, email })
  revalidatePath('/admin/settings')
}
