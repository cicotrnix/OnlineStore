import { prisma } from '@/lib/db/client'
import { acceptInvitationAction } from './actions'

type Props = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  })

  if (!invitation) {
    return (
      <div>
        <h1 className="text-xl font-medium">Invitation not found</h1>
        <p className="mt-2 text-sm text-gray-600">The link may be invalid or removed.</p>
      </div>
    )
  }

  if (invitation.acceptedAt) {
    return (
      <div>
        <h1 className="text-xl font-medium">Already accepted</h1>
        <p className="mt-2 text-sm text-gray-600">This invitation has already been used.</p>
      </div>
    )
  }

  if (invitation.expiresAt < new Date()) {
    return (
      <div>
        <h1 className="text-xl font-medium">Invitation expired</h1>
        <p className="mt-2 text-sm text-gray-600">Ask the inviter to send a new one.</p>
      </div>
    )
  }

  async function accept() {
    'use server'
    await acceptInvitationAction(token)
  }

  return (
    <div>
      <h1 className="text-xl font-medium">Join {invitation.organization.name}</h1>
      <p className="mt-2 text-sm text-gray-600">
        You were invited to join as <strong>{invitation.role}</strong>.
      </p>
      <form action={accept} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Accept invitation
        </button>
      </form>
    </div>
  )
}
