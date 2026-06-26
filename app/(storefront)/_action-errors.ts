import type { MessageKey } from '@/lib/i18n'
import { EmptyCartError, InsufficientStockError, ProductInactiveError } from '@/modules/orders'

// CAL-1: mapea errores de dominio (tipados) y el sentinel ORG_NOT_VERIFIED a
// message keys específicas. Sin match → el genérico *.failed.
function isOrgNotVerified(err: unknown): boolean {
  return err instanceof Error && err.message === 'ORG_NOT_VERIFIED'
}

function isTermsNotAccepted(err: unknown): boolean {
  return err instanceof Error && err.message === 'TERMS_NOT_ACCEPTED'
}

export function checkoutErrorKey(err: unknown): MessageKey {
  if (err instanceof InsufficientStockError) return 'checkout.toast.insufficientStock'
  if (err instanceof ProductInactiveError) return 'checkout.toast.inactive'
  if (err instanceof EmptyCartError) return 'checkout.toast.empty'
  if (isTermsNotAccepted(err)) return 'checkout.toast.termsRequired'
  if (isOrgNotVerified(err)) return 'checkout.toast.notVerified'
  return 'checkout.toast.failed'
}

export function cartErrorKey(err: unknown): MessageKey {
  if (err instanceof InsufficientStockError) return 'cart.toast.insufficientStock'
  if (isOrgNotVerified(err)) return 'cart.toast.notVerified'
  return 'cart.toast.failed'
}
