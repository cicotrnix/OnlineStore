import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resubmitCertificateAction } from '../_actions'

export const dynamic = 'force-dynamic'

export default async function OnboardingPendingPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
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
              <p>{t(locale, 'onboarding.pending.body')}</p>
              {org.verificationSubmittedAt && (
                <p className="text-xs text-gray-500">
                  {t(locale, 'onboarding.pending.submittedOn', {
                    date: org.verificationSubmittedAt.toLocaleString(),
                  })}
                </p>
              )}
            </>
          )}

          {org.verificationStatus === 'REJECTED' && (
            <>
              <p>{t(locale, 'onboarding.rejected.intro')}</p>
              <p className="rounded border border-red-200 bg-red-50 p-3 text-red-800">
                {org.rejectionReason ?? '—'}
              </p>
              <p>{t(locale, 'onboarding.rejected.resubmitNote')}</p>
              <form
                action={resubmitCertificateAction}
                className="space-y-3 border-t border-gray-200 pt-4 mt-4"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="type" className="block text-xs text-gray-500 mb-1">
                      {t(locale, 'onboarding.cert.type')}
                    </label>
                    <select
                      id="type"
                      name="type"
                      required
                      className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="US_RESALE_CERT">{t(locale, 'onboarding.cert.type.us')}</option>
                      <option value="FOREIGN_EQUIV">
                        {t(locale, 'onboarding.cert.type.foreign')}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="jurisdiction" className="block text-xs text-gray-500 mb-1">
                      {t(locale, 'onboarding.cert.jurisdiction')}
                    </label>
                    <Input
                      id="jurisdiction"
                      name="jurisdiction"
                      required
                      placeholder={t(locale, 'onboarding.cert.jurisdictionPlaceholder')}
                    />
                  </div>
                  <div>
                    <label htmlFor="number" className="block text-xs text-gray-500 mb-1">
                      {t(locale, 'onboarding.cert.number')}
                    </label>
                    <Input id="number" name="number" required />
                  </div>
                  <div>
                    <label htmlFor="file" className="block text-xs text-gray-500 mb-1">
                      {t(locale, 'onboarding.cert.file')} ({t(locale, 'onboarding.cert.fileHint')})
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
                <Button type="submit">{t(locale, 'onboarding.rejected.submit')}</Button>
              </form>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link href="/catalog" className="text-blue-700 hover:underline">
              {t(locale, 'onboarding.pending.exploreLink')}
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
