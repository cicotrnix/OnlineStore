import { redirect } from 'next/navigation'
import { auth } from './config'

export type AuthUser = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth()
  return session?.user ?? null
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  return user
}
