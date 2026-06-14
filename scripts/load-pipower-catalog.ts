import { LEGACY_SKUS, PIPOWER_CATEGORIES, PIPOWER_PRODUCTS } from '@/lib/catalog/pipower-catalog'
import { Prisma, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Loader prod-safe del catálogo Pi-Power. Consume la fuente ÚNICA
 * (lib/catalog/pipower-catalog.ts), la MISMA que el seed. NO destructivo:
 * upsert por SKU; no toca usuarios, órdenes ni precios de cliente. Idempotente.
 * Desactiva (isActive=false) el catálogo viejo Fase 3 (PI-2004xx) para que prod
 * no quede con duplicados old+new — sin borrar, preservando FKs de órdenes.
 */
const prisma = new PrismaClient()

async function main() {
  // 1. Categorías (upsert por slug).
  const categoryBySlug = new Map<string, string>()
  for (const c of PIPOWER_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: { slug: c.slug, name: c.name, sortOrder: c.sortOrder },
    })
    categoryBySlug.set(c.slug, cat.id)
  }

  // 2. Productos (upsert por SKU). El slug solo se setea al crear (no se pisa).
  let upserted = 0
  for (const p of PIPOWER_PRODUCTS) {
    const categoryId = categoryBySlug.get(p.categorySlug)
    if (!categoryId) throw new Error(`loader: categoría ${p.categorySlug} no creada`)
    const attributes =
      p.attributes === null ? Prisma.JsonNull : (p.attributes as Prisma.InputJsonObject)
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        description: p.description,
        basePrice: new Decimal(p.basePrice),
        stockQuantity: p.stockQuantity,
        imageUrl: p.imageUrl,
        categoryId,
        isActive: true,
        attributes,
      },
      create: {
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        basePrice: new Decimal(p.basePrice),
        stockQuantity: p.stockQuantity,
        imageUrl: p.imageUrl,
        categoryId,
        attributes,
      },
    })
    upserted++
  }

  // 3. Desactivar el catálogo viejo (Fase 3). Idempotente: solo afecta los activos.
  const deactivated = await prisma.product.updateMany({
    where: { sku: { in: LEGACY_SKUS }, isActive: true },
    data: { isActive: false },
  })

  console.log(
    `catalog loaded: upserted=${upserted} categorías=${PIPOWER_CATEGORIES.length} legacy_deactivated=${deactivated.count}`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
