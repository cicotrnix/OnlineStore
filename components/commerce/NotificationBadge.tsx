import { auth } from '@/lib/auth/config'
import { countUnread } from '@/modules/notifications'
import Link from 'next/link'

export async function NotificationBadge() {
  const session = await auth()
  if (!session?.user?.id) return null
  const count = await countUnread(session.user.id)
  return (
    <Link
      href="/notifications"
      aria-label={`Notificaciones${count > 0 ? ` (${count} sin leer)` : ''}`}
      className="relative inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
    >
      Avisos
      {count > 0 && (
        <span
          className="ml-1 inline-flex items-center justify-center rounded-full text-[10px] font-medium px-1.5 min-w-[1.1rem] h-4 text-white"
          style={{ background: 'var(--color-primary)' }}
          aria-hidden
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
