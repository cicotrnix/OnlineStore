import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import { submitOnboardingAction } from './_actions'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
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
      <h1 className="text-2xl font-medium tracking-tight">{t(locale, 'onboarding.title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t(locale, 'onboarding.taxid.intro')}</p>

      <form action={submitOnboardingAction} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-medium">{t(locale, 'onboarding.section.business')}</h2>
          </CardHeader>
          <CardBody className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-xs text-gray-500 mb-1">
                {t(locale, 'onboarding.business.name')}
              </label>
              <Input
                id="name"
                name="name"
                required
                placeholder={t(locale, 'onboarding.business.namePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-xs text-gray-500 mb-1">
                {t(locale, 'onboarding.business.country')}
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
                {t(locale, 'onboarding.business.addressLine1')}
              </label>
              <Input id="addressLine1" name="addressLine1" required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine2" className="block text-xs text-gray-500 mb-1">
                {t(locale, 'onboarding.business.addressLine2')}
              </label>
              <Input id="addressLine2" name="addressLine2" />
            </div>
            <div>
              <label htmlFor="city" className="block text-xs text-gray-500 mb-1">
                {t(locale, 'onboarding.business.city')}
              </label>
              <Input id="city" name="city" required />
            </div>
            <div>
              <label htmlFor="state" className="block text-xs text-gray-500 mb-1">
                {t(locale, 'onboarding.business.state')}
              </label>
              <Input id="state" name="state" placeholder="TX" />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-xs text-gray-500 mb-1">
                {t(locale, 'onboarding.business.postalCode')}
              </label>
              <Input id="postalCode" name="postalCode" required />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium">{t(locale, 'onboarding.taxid.section')}</h2>
            <p className="mt-1 text-xs text-gray-500">{t(locale, 'onboarding.taxid.subtitle')}</p>
          </CardHeader>
          <CardBody className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="number" className="block text-xs text-gray-500 mb-1">
                {t(locale, 'onboarding.taxid.number')}
              </label>
              <Input
                id="number"
                name="number"
                required
                placeholder={t(locale, 'onboarding.taxid.numberPlaceholder')}
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pendingLabel={t(locale, 'onboarding.sending')}>
            {t(locale, 'onboarding.submit')}
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
