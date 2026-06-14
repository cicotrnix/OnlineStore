import { Header } from '@/components/commerce/Header'
import { ImpersonationBanner } from '@/components/commerce/ImpersonationBanner'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { getLocale } from '@/lib/i18n'
import { cartService } from '@/modules/cart'
import type { JSX } from 'react'

/**
 * Wrapper server del header único: resuelve datos (sesión, cart, flags, locale,
 * impersonation) y delega el render en el `Header` presentacional. Reemplaza el
 * fetch que hoy hace `StoreHeader`. Lo consumen los tres shells (storefront,
 * account, home) con la `variant` correspondiente.
 */
export async function HeaderContainer({
  variant,
  initialTheme,
}: {
  variant: 'home' | 'inner'
  initialTheme?: 'dark' | 'light'
}): Promise<JSX.Element> {
  const session = await auth()
  const userId = session?.user?.id ?? null
  const isSignedIn = Boolean(userId)

  const cart = userId ? await cartService.get(userId) : null
  const cartCount = cart?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0

  const locale = await getLocale({ userId })

  const flags = {
    rfq: isFeatureEnabled('rfq') && isSignedIn,
    credit: isFeatureEnabled('credit') && isSignedIn,
    approvals: isFeatureEnabled('approvals') && isSignedIn,
  }

  let impersonatingName: string | null = null
  if (session?.impersonatingOrgId) {
    const org = await prisma.organization.findUnique({
      where: { id: session.impersonatingOrgId },
      select: { name: true },
    })
    impersonatingName = org?.name ?? null
  }

  return (
    <>
      {impersonatingName && <ImpersonationBanner orgName={impersonatingName} />}
      <Header
        variant={variant}
        initialTheme={initialTheme}
        locale={locale}
        isSignedIn={isSignedIn}
        cartCount={cartCount}
        flags={flags}
      />
    </>
  )
}
