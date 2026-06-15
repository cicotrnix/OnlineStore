import {
  LEGACY_CATEGORY_SLUGS,
  LEGACY_SKUS,
  PIPOWER_CATEGORIES,
  PIPOWER_PRODUCTS,
} from '@/lib/catalog/pipower-catalog'
import { enqueueIndex } from '@/modules/search'
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
    const up = await prisma.product.upsert({
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
    // Reindexar el producto nuevo/actualizado (idempotente, noop sin Meili/Voyage).
    await enqueueIndex(up.id, 'UPSERT')
    upserted++
  }

  // 3. Desactivar el catálogo viejo (Fase 3). Idempotente: solo afecta los activos.
  const deactivated = await prisma.product.updateMany({
    where: { sku: { in: LEGACY_SKUS }, isActive: true },
    data: { isActive: false },
  })

  // 4. Reindexar los legacy: el processor convierte UPSERT→DELETE para inactivos,
  //    así Meilisearch/embeddings dejan de servir el catálogo viejo.
  const legacy = await prisma.product.findMany({
    where: { sku: { in: LEGACY_SKUS } },
    select: { id: true },
  })
  for (const l of legacy) {
    await enqueueIndex(l.id, 'UPSERT')
  }

  // 5. Desactivar las categorías viejas (Fase 3) → no aparecen como tabs vacíos
  //    en /catalog (listCategories filtra por Category.isActive). Idempotente.
  const deactivatedCats = await prisma.category.updateMany({
    where: { slug: { in: LEGACY_CATEGORY_SLUGS }, isActive: true },
    data: { isActive: false },
  })

  console.log(
    `catalog loaded: upserted=${upserted} categorías=${PIPOWER_CATEGORIES.length} legacy_deactivated=${deactivated.count} legacy_cats_deactivated=${deactivatedCats.count} reindex_enqueued=${upserted + legacy.length}`
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
