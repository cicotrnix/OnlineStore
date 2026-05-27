import { prisma } from '@/lib/db/client'
import type { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

function getBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
  ]

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isPrivate: false,
      category: { isPrivate: false },
    },
    select: { slug: true, updatedAt: true },
  })

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...productRoutes]
}
