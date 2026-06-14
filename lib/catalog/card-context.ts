import { auth } from '@/lib/auth/config'
import { getCustomerState } from '@/lib/auth/customer'
import { type Locale, getLocale, t } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'

export type ProductCardContext = {
  locale: Locale
  currency: string
  orgId: string | null
  showPrice: boolean
  canAddToCart: boolean
  disabledReason?: string
  signInLinkLabel: string
}

/**
 * Contexto de gating B2B compartido por todas las superficies que pintan el card
 * único (catálogo, home-featured, PDP-related, /search). Misma regla que el
 * catálogo: solo orgs VERIFIED ven precio/compra; el resto ve el listado con CTA
 * de "iniciá sesión". Centralizar evita que las superficies diverjan otra vez.
 */
export async function getProductCardContext(): Promise<ProductCardContext> {
  const session = await auth()
  const customerState = await getCustomerState()
  const orgId = customerState.kind === 'verified' ? customerState.orgId : null
  const isImpersonating = customerState.kind === 'verified' ? customerState.isImpersonating : false
  const locale = await getLocale({ userId: session?.user?.id ?? null })
  const showPrice = customerState.kind === 'verified'
  const canAddToCart = showPrice && !isImpersonating

  const disabledReason = isImpersonating
    ? t(locale, 'catalog.disabled.impersonating')
    : customerState.kind === 'anonymous'
      ? t(locale, 'catalog.disabled.anon')
      : customerState.kind === 'no-org'
        ? t(locale, 'catalog.disabled.noOrg')
        : customerState.kind === 'pending'
          ? t(locale, 'catalog.disabled.pending')
          : customerState.kind === 'rejected'
            ? t(locale, 'catalog.disabled.rejected')
            : undefined

  return {
    locale,
    currency: getStoreConfig().currency.base,
    orgId,
    showPrice,
    canAddToCart,
    disabledReason,
    signInLinkLabel: `${t(locale, 'catalog.loginForPrice')} →`,
  }
}
