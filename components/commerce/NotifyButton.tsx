import { getStoreConfig } from '@/stores'

/**
 * Stub de "Notify me" para productos no ordenables (incoming / coming soon). El
 * mecanismo real (waitlist + email al reponer) es net-new → diferido como FU.
 * Por ahora, mailto al soporte con el producto en el asunto.
 */
export function NotifyButton({ productName, label }: { productName: string; label: string }) {
  const email = getStoreConfig().identity.supportEmail
  const href = `mailto:${email}?subject=${encodeURIComponent(`Notify me: ${productName}`)}`
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
    >
      {label}
    </a>
  )
}
