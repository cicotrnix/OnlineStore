import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// Catálogo real Pi-Power (baterías iPhone). No destructivo: upsert por SKU.
const CATEGORY = { slug: 'battery', name: 'Battery', sortOrder: 1 }

const items: Array<{ sku: string; name: string; model: string; price: string; stock: number }> = [
  {
    sku: 'PI-200450',
    name: 'Battery Cell Pi-Power for iPhone 13 - Extended Capacity',
    model: 'iPhone 13',
    price: '6.45',
    stock: 86,
  },
  {
    sku: 'PI-200451',
    name: 'Battery Cell Pi-Power for iPhone 13 Pro - Extended Capacity',
    model: 'iPhone 13 Pro',
    price: '8.98',
    stock: 220,
  },
  {
    sku: 'PI-200452',
    name: 'Battery Cell Pi-Power for iPhone 13 Pro Max - Extended Capacity',
    model: 'iPhone 13 Pro Max',
    price: '11.24',
    stock: 70,
  },
  {
    sku: 'PI-200453',
    name: 'Battery Cell Pi-Power for iPhone 14 - Extended Capacity',
    model: 'iPhone 14',
    price: '7.20',
    stock: 57,
  },
  {
    sku: 'PI-200454',
    name: 'Battery Cell Pi-Power for iPhone 14 Pro - Extended Capacity',
    model: 'iPhone 14 Pro',
    price: '9.16',
    stock: 182,
  },
  {
    sku: 'PI-200455',
    name: 'Battery Cell Pi-Power for iPhone 14 Pro Max - Extended Capacity',
    model: 'iPhone 14 Pro Max',
    price: '11.50',
    stock: 66,
  },
  {
    sku: 'PI-200456',
    name: 'Battery Cell Pi-Power for iPhone 15 - Extended Capacity',
    model: 'iPhone 15',
    price: '8.46',
    stock: 20,
  },
  {
    sku: 'PI-200459',
    name: 'Battery Cell Pi-Power for iPhone 15 - Extended Capacity + Tag-On Flex',
    model: 'iPhone 15',
    price: '7.30',
    stock: 130,
  },
  {
    sku: 'PI-200457',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro - Extended Capacity',
    model: 'iPhone 15 Pro',
    price: '10.67',
    stock: 23,
  },
  {
    sku: 'PI-200460',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro - Extended Capacity + Tag-On Flex',
    model: 'iPhone 15 Pro',
    price: '9.00',
    stock: 110,
  },
  {
    sku: 'PI-200458',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro Max - Extended Capacity',
    model: 'iPhone 15 Pro Max',
    price: '12.57',
    stock: 30,
  },
  {
    sku: 'PI-200461',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro Max - Extended Capacity + Tag-On Flex',
    model: 'iPhone 15 Pro Max',
    price: '10.40',
    stock: 110,
  },
]

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: CATEGORY.slug },
    update: { name: CATEGORY.name },
    create: CATEGORY,
  })

  let count = 0
  for (const it of items) {
    const description = `Pi-Power extended-capacity replacement battery cell for ${it.model}. Wholesale.`
    await prisma.product.upsert({
      where: { sku: it.sku },
      update: {
        name: it.name,
        description,
        basePrice: new Decimal(it.price),
        stockQuantity: it.stock,
        categoryId: category.id,
        isActive: true,
      },
      create: {
        sku: it.sku,
        slug: slugify(it.name),
        name: it.name,
        description,
        basePrice: new Decimal(it.price),
        stockQuantity: it.stock,
        categoryId: category.id,
      },
    })
    count++
  }

  console.log(`catalog loaded: category=${category.name}, products=${count}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
