import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// Catálogo real Pi-Power (baterías iPhone). No destructivo: upsert por SKU.
const CATEGORY = { slug: 'battery', name: 'Battery', sortOrder: 1 }

type ProductAttrs = Record<string, string | number | boolean>

interface Item {
  sku: string
  name: string
  model: string
  modelSlug: string
  price: string
  stock: number
  attributes: ProductAttrs
  compatibleModels: string[]
}

const COMMON: ProductAttrs = {
  voltage_v: '3.85',
  cycles_rated: 800,
  requires_soldering: false,
  professional_installation_recommended: true,
  warranty_months: 12,
  hazmat_class: '9',
  requires_ground_shipping: true,
}

const items: Item[] = [
  {
    sku: 'PI-200450',
    name: 'Battery Cell Pi-Power for iPhone 13 - Extended Capacity',
    model: 'iPhone 13',
    modelSlug: '13',
    price: '6.45',
    stock: 86,
    compatibleModels: ['iPhone 13'],
    attributes: { ...COMMON, capacity_mah: 3279, apple_model_code: 'A2482', flex_included: false },
  },
  {
    sku: 'PI-200451',
    name: 'Battery Cell Pi-Power for iPhone 13 Pro - Extended Capacity',
    model: 'iPhone 13 Pro',
    modelSlug: '13-pro',
    price: '8.98',
    stock: 220,
    compatibleModels: ['iPhone 13 Pro'],
    attributes: { ...COMMON, capacity_mah: 3095, apple_model_code: 'A2483', flex_included: false },
  },
  {
    sku: 'PI-200452',
    name: 'Battery Cell Pi-Power for iPhone 13 Pro Max - Extended Capacity',
    model: 'iPhone 13 Pro Max',
    modelSlug: '13-pro-max',
    price: '11.24',
    stock: 70,
    compatibleModels: ['iPhone 13 Pro Max'],
    attributes: { ...COMMON, capacity_mah: 4352, apple_model_code: 'A2484', flex_included: false },
  },
  {
    sku: 'PI-200453',
    name: 'Battery Cell Pi-Power for iPhone 14 - Extended Capacity',
    model: 'iPhone 14',
    modelSlug: '14',
    price: '7.20',
    stock: 57,
    compatibleModels: ['iPhone 14'],
    attributes: { ...COMMON, capacity_mah: 3279, apple_model_code: 'A2649', flex_included: false },
  },
  {
    sku: 'PI-200454',
    name: 'Battery Cell Pi-Power for iPhone 14 Pro - Extended Capacity',
    model: 'iPhone 14 Pro',
    modelSlug: '14-pro',
    price: '9.16',
    stock: 182,
    compatibleModels: ['iPhone 14 Pro'],
    attributes: { ...COMMON, capacity_mah: 3200, apple_model_code: 'A2650', flex_included: false },
  },
  {
    sku: 'PI-200455',
    name: 'Battery Cell Pi-Power for iPhone 14 Pro Max - Extended Capacity',
    model: 'iPhone 14 Pro Max',
    modelSlug: '14-pro-max',
    price: '11.50',
    stock: 66,
    compatibleModels: ['iPhone 14 Pro Max'],
    attributes: { ...COMMON, capacity_mah: 4323, apple_model_code: 'A2651', flex_included: false },
  },
  {
    sku: 'PI-200456',
    name: 'Battery Cell Pi-Power for iPhone 15 - Extended Capacity',
    model: 'iPhone 15',
    modelSlug: '15',
    price: '8.46',
    stock: 20,
    compatibleModels: ['iPhone 15'],
    attributes: { ...COMMON, capacity_mah: 3349, apple_model_code: 'A2846', flex_included: false },
  },
  {
    sku: 'PI-200459',
    name: 'Battery Cell Pi-Power for iPhone 15 - Extended Capacity + Tag-On Flex',
    model: 'iPhone 15',
    modelSlug: '15',
    price: '7.30',
    stock: 130,
    compatibleModels: ['iPhone 15'],
    attributes: {
      ...COMMON,
      capacity_mah: 3349,
      apple_model_code: 'A2846',
      flex_included: 'tag-on',
      pre_programmed_flex_included: true,
    },
  },
  {
    sku: 'PI-200457',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro - Extended Capacity',
    model: 'iPhone 15 Pro',
    modelSlug: '15-pro',
    price: '10.67',
    stock: 23,
    compatibleModels: ['iPhone 15 Pro'],
    attributes: { ...COMMON, capacity_mah: 3274, apple_model_code: 'A2847', flex_included: false },
  },
  {
    sku: 'PI-200460',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro - Extended Capacity + Tag-On Flex',
    model: 'iPhone 15 Pro',
    modelSlug: '15-pro',
    price: '9.00',
    stock: 110,
    compatibleModels: ['iPhone 15 Pro'],
    attributes: {
      ...COMMON,
      capacity_mah: 3274,
      apple_model_code: 'A2847',
      flex_included: 'tag-on',
      pre_programmed_flex_included: true,
    },
  },
  {
    sku: 'PI-200458',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro Max - Extended Capacity',
    model: 'iPhone 15 Pro Max',
    modelSlug: '15-pro-max',
    price: '12.57',
    stock: 30,
    compatibleModels: ['iPhone 15 Pro Max'],
    attributes: { ...COMMON, capacity_mah: 4422, apple_model_code: 'A2848', flex_included: false },
  },
  {
    sku: 'PI-200461',
    name: 'Battery Cell Pi-Power for iPhone 15 Pro Max - Extended Capacity + Tag-On Flex',
    model: 'iPhone 15 Pro Max',
    modelSlug: '15-pro-max',
    price: '10.40',
    stock: 110,
    compatibleModels: ['iPhone 15 Pro Max'],
    attributes: {
      ...COMMON,
      capacity_mah: 4422,
      apple_model_code: 'A2848',
      flex_included: 'tag-on',
      pre_programmed_flex_included: true,
    },
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
    const imageUrl = `/products/iphone-${it.modelSlug}.png`
    await prisma.product.upsert({
      where: { sku: it.sku },
      update: {
        name: it.name,
        description,
        basePrice: new Decimal(it.price),
        stockQuantity: it.stock,
        categoryId: category.id,
        isActive: true,
        imageUrl,
        attributes: it.attributes,
        compatibleModels: it.compatibleModels,
      },
      create: {
        sku: it.sku,
        slug: slugify(it.name),
        name: it.name,
        description,
        basePrice: new Decimal(it.price),
        stockQuantity: it.stock,
        categoryId: category.id,
        imageUrl,
        attributes: it.attributes,
        compatibleModels: it.compatibleModels,
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
