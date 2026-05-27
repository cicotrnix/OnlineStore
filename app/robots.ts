import type { MetadataRoute } from 'next'

function getBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/catalog', '/search', '/products'],
        disallow: [
          '/admin/',
          '/api/',
          '/orders/',
          '/cart',
          '/checkout',
          '/sign-in',
          '/login',
          '/quotes/',
          '/invoices/',
          '/approvals/',
          '/notifications',
          '/select-org',
          '/invite/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
