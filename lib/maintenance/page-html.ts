/**
 * HTML inline para la respuesta 503 de mantenimiento. Edge-safe (sin
 * importar componentes React). Marca PiPower + verde #88D810 + noindex.
 *
 * Bilingüe: default inglés. Detección por query `?lang=es|en`, cookie
 * `locale`, o Accept-Language. Link al alternate language en el footer.
 */

type Lang = 'en' | 'es'

const COPY = {
  en: {
    title: 'PiPower — Coming soon',
    heading: 'We are getting the wholesale store ready',
    body: 'Check back soon. If you have an early-access link, open it to enter.',
    altLink: 'Español',
    altUrl: '/?lang=es',
    langCode: 'en',
  },
  es: {
    title: 'PiPower — Próximamente',
    heading: 'Estamos preparando la tienda mayorista',
    body: 'Volvé pronto. Si tenés un link de acceso anticipado, abrilo para entrar.',
    altLink: 'English',
    altUrl: '/?lang=en',
    langCode: 'es',
  },
} as const

export function buildMaintenanceHtml(lang: Lang): string {
  const c = COPY[lang]
  return `<!DOCTYPE html>
<html lang="${c.langCode}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${c.title}</title>
  <style>
    :root { --accent: #88D810; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #111827; }
    .wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 480px; width: 100%; background: #fff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; }
    .logo { display: inline-flex; align-items: center; justify-content: center; }
    .logo img { height: 80px; width: auto; }
    .accent { display: block; width: 64px; height: 4px; border-radius: 999px; background: var(--accent); margin: 20px auto; }
    h1 { font-size: 22px; font-weight: 500; margin: 16px 0 8px; letter-spacing: -0.01em; }
    p { font-size: 14px; color: #4b5563; line-height: 1.55; margin: 0; }
    .lang { margin-top: 20px; font-size: 12px; }
    .lang a { color: #4b5563; text-decoration: underline; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card" role="status" aria-live="polite">
      <div class="logo">
        <img src="/logo-pipower.png" alt="PiPower" />
      </div>
      <span class="accent" aria-hidden="true"></span>
      <h1>${c.heading}</h1>
      <p>${c.body}</p>
      <div class="lang"><a href="${c.altUrl}">${c.altLink}</a></div>
    </section>
  </main>
</body>
</html>`
}

/** Locale detection edge-safe. Cookie `locale=es-419` o query `?lang=es`. */
export function resolveMaintenanceLang(req: Request): Lang {
  try {
    const url = new URL(req.url)
    const queryLang = url.searchParams.get('lang')
    if (queryLang === 'es' || queryLang === 'en') return queryLang
    const cookie = req.headers.get('cookie') ?? ''
    if (/(?:^|;\s*)locale=es-419/.test(cookie)) return 'es'
    if (/(?:^|;\s*)locale=en-US/.test(cookie)) return 'en'
    const accept = req.headers.get('accept-language') ?? ''
    if (accept.toLowerCase().startsWith('es')) return 'es'
  } catch {
    /* fall through */
  }
  return 'en'
}

/** @deprecated retro-compat con tests previos. */
export const MAINTENANCE_HTML = buildMaintenanceHtml('en')
