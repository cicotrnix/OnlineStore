import { type Locale, t } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'
import Image from 'next/image'
import { AuthGauge } from './AuthGauge'

/**
 * Panel de marca de auth (columna izquierda en desktop, barra superior en mobile).
 * Estático y server-rendered: logo, gauge SVG fijo al 100%, headline "Back to
 * 100%", tagline y chip mono. Decorativo → aria-hidden (la columna del form tiene
 * el contenido real). Sin chip "+10% capacity" hasta la cita formal del fabricante
 * (FU-010). Sin GSAP.
 */
export function AuthBrandPanel({ locale }: { locale: Locale }) {
  const store = getStoreConfig()
  const logo = store.identity.logoLight ?? store.identity.logo
  return (
    <aside
      aria-hidden="true"
      className="flex items-center gap-4 bg-neutral-900 px-6 py-4 lg:flex-col lg:items-start lg:justify-center lg:gap-8 lg:px-12 lg:py-0"
    >
      <Image src={logo} alt="" width={132} height={32} className="h-8 w-auto" priority />
      <p className="text-sm text-white/60 lg:hidden">{store.identity.tagline}</p>

      <div className="hidden lg:flex lg:flex-col lg:gap-6">
        <AuthGauge />
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Back to 100%</h2>
          <p className="mt-2 max-w-xs text-sm text-white/60">{store.identity.tagline}</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center rounded-button border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs text-accent">
            {t(locale, 'auth.brand.cycles')}
          </span>
        </div>
      </div>
    </aside>
  )
}
