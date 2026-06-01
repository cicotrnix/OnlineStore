import { signOut } from '@/lib/auth'

interface Props {
  className?: string
  label?: string
}

export function SignOutButton({ className, label = 'Salir' }: Props) {
  async function action() {
    'use server'
    await signOut({ redirectTo: '/' })
  }
  return (
    <form action={action}>
      <button type="submit" className={className ?? 'text-gray-700 hover:text-gray-900'}>
        {label}
      </button>
    </form>
  )
}
