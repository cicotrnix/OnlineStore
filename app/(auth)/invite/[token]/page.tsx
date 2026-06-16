import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { acceptInvitationAction } from './actions'

type Props = {
  params: Promise<{ token: string }>
}

const titleCls = 'text-2xl font-semibold tracking-tight text-ink-950'
const bodyCls = 'mt-2 text-sm text-ink-500'

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const locale = await getLocale({ userId: null })
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  })

  if (!invitation) {
    return (
      <div>
        <h1 className={titleCls}>{t(locale, 'auth.invite.notFound.title')}</h1>
        <p className={bodyCls}>{t(locale, 'auth.invite.notFound.body')}</p>
      </div>
    )
  }

  if (invitation.acceptedAt) {
    return (
      <div>
        <h1 className={titleCls}>{t(locale, 'auth.invite.accepted.title')}</h1>
        <p className={bodyCls}>{t(locale, 'auth.invite.accepted.body')}</p>
      </div>
    )
  }

  if (invitation.expiresAt < new Date()) {
    return (
      <div>
        <h1 className={titleCls}>{t(locale, 'auth.invite.expired.title')}</h1>
        <p className={bodyCls}>{t(locale, 'auth.invite.expired.body')}</p>
      </div>
    )
  }

  async function accept() {
    'use server'
    await acceptInvitationAction(token)
  }

  return (
    <div>
      <h1 className={titleCls}>
        {t(locale, 'auth.invite.join', { org: invitation.organization.name })}
      </h1>
      <p className={bodyCls}>{t(locale, 'auth.invite.roleHint', { role: invitation.role })}</p>
      <form action={accept} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-button bg-accent px-3 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
        >
          {t(locale, 'auth.invite.accept')}
        </button>
      </form>
    </div>
  )
}
