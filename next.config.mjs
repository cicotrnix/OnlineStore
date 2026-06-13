/** @type {import('next').NextConfig} */

// SEC-1 (auditoría 2026-06-12): headers de seguridad.
// CSP: como los headers de next.config son estáticos (sin nonce por request),
// los scripts inline de hidratación de Next 14 exigen 'unsafe-inline' en
// script-src. El resto se mantiene acotado ('self'). Upgrade futuro a CSP por
// nonce vía middleware. style-src incluye 'unsafe-inline' (estilos inyectados
// por Next/componentes). Stripe Checkout es un redirect full-page, no embebido,
// así que no necesita directivas de frame/script externas.
// En desarrollo, Next/React Fast Refresh (react-refresh.js) usa eval → requiere
// 'unsafe-eval'. En PRODUCCIÓN no existe, así que la CSP de prod queda estricta
// (sin unsafe-eval). NODE_ENV: 'development' en `next dev`, 'production' en build/start.
const isProd = process.env.NODE_ENV === 'production'
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // stripe + aws-sdk se cargan dinámicamente con require interno; quedan
  // como externos para evitar bundling de tree-shake mal-comportado.
  experimental: {
    serverComponentsExternalPackages: ['stripe', '@aws-sdk/client-s3'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
