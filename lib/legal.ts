/**
 * Versión de los términos de venta que el comprador acepta en el checkout.
 * Se persiste en `Order.termsVersion` junto a `Order.termsAcceptedAt` como
 * prueba de aceptación (defensa ante disputa). Bumpear cuando el texto legal
 * vinculante de `docs/legal/*` cambie (lo confirma Herney/abogado al publicar).
 */
export const TERMS_VERSION = '2026-06-26'
