import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, type Locale, isSupportedLocale } from './messages'

export const LOCALE_COOKIE = 'locale'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

interface GetLocaleInput {
  userId: string | null
}

export async function getLocale(input: GetLocaleInput): Promise<Locale> {
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { preferredLocale: true },
    })
    if (isSupportedLocale(user?.preferredLocale)) return user.preferredLocale
  }

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value
  if (isSupportedLocale(cookieValue)) return cookieValue

  return DEFAULT_LOCALE
}
