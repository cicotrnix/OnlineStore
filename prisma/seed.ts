import { PIPOWER_CATEGORIES, PIPOWER_PRODUCTS } from '@/lib/catalog/pipower-catalog'
import { Prisma, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('seeding...')

  // Clean (order matters for FKs)
  await prisma.notification.deleteMany()
  await prisma.approvalRequest.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.quoteAuditLog.deleteMany()
  await prisma.quoteLine.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.productPriceTier.deleteMany()
  await prisma.organizationCatalogAccess.deleteMany()
  await prisma.orderLine.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.impersonationLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.organizationAddress.deleteMany()
  await prisma.customerPrice.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()

  // Platform admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Platform Admin',
      isPlatformAdmin: true,
    },
  })

  // Buyer users
  const buyer1 = await prisma.user.create({
    data: { email: 'buyer1@repairhub.com', name: 'Ana Buyer' },
  })
  const buyer2 = await prisma.user.create({
    data: { email: 'buyer2@repairhub.com', name: 'Bruno Buyer' },
  })

  // Customer organization (demo B2B customer of PiPower)
  const acme = await prisma.organization.create({
    data: {
      name: 'RepairHub Co',
      slug: 'repairhub-co',
      creditLimit: new Decimal('5000.00'),
      paymentTerms: 'PREPAID',
      approvalThreshold: new Decimal('1000.00'),
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      country: 'US',
      taxExempt: true,
      members: {
        create: [
          { userId: buyer1.id, role: 'OWNER' },
          { userId: buyer2.id, role: 'BUYER' },
        ],
      },
      addresses: {
        create: [
          {
            label: 'Bodega principal',
            recipient: 'RepairHub Receiving',
            line1: '123 Wholesale Ave',
            city: 'Miami',
            state: 'FL',
            postalCode: '33101',
            country: 'US',
            phone: '+1-305-555-0100',
            isDefaultBilling: true,
            isDefaultShipping: true,
          },
          {
            label: 'Oficina admin',
            recipient: 'RepairHub Office',
            line1: '500 Business Blvd, Suite 200',
            city: 'Miami',
            state: 'FL',
            postalCode: '33131',
            country: 'US',
            phone: '+1-305-555-0200',
            isDefaultBilling: false,
            isDefaultShipping: false,
          },
        ],
      },
    },
  })

  // Catálogo Pi-Power desde la fuente ÚNICA (DRY con scripts/load-pipower-catalog.ts).
  // El seed crea todo limpio (tras el wipe); el loader prod hace upsert por SKU.
  const categoryBySlug = new Map<string, { id: string }>()
  for (const c of PIPOWER_CATEGORIES) {
    const cat = await prisma.category.create({
      data: { slug: c.slug, name: c.name, sortOrder: c.sortOrder },
    })
    categoryBySlug.set(c.slug, cat)
  }

  const productBySku = new Map<string, Awaited<ReturnType<typeof prisma.product.create>>>()
  for (const p of PIPOWER_PRODUCTS) {
    const cat = categoryBySlug.get(p.categorySlug)
    if (!cat) throw new Error(`seed: categoría ${p.categorySlug} no creada`)
    const created = await prisma.product.create({
      data: {
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        basePrice: new Decimal(p.basePrice),
        stockQuantity: p.stockQuantity,
        imageUrl: p.imageUrl,
        categoryId: cat.id,
        attributes:
          p.attributes === null ? Prisma.JsonNull : (p.attributes as Prisma.InputJsonObject),
      },
    })
    productBySku.set(p.sku, created)
  }
  const products = [...productBySku.values()]
  const bySku = (sku: string) => {
    const p = productBySku.get(sku)
    if (!p) throw new Error(`seed: producto ${sku} no encontrado`)
    return p
  }

  // Aliases para las fixtures demo (Fase 2) — referencian productos por SKU.
  const iphone13 = bySku('PP-BC-13')
  const iphone14 = bySku('PP-BC-14')
  const iphone14Pro = bySku('PP-BC-14P')
  const iphone12ProMax = bySku('PP-BC-12PM')

  // CustomerPrice override: RepairHub negocia mejor precio en iPhone 13 y 14
  await prisma.customerPrice.create({
    data: {
      organizationId: acme.id,
      productId: iphone13.id,
      price: new Decimal('8.50'),
      notes: 'Precio negociado contrato 2026',
    },
  })
  await prisma.customerPrice.create({
    data: {
      organizationId: acme.id,
      productId: iphone14.id,
      price: new Decimal('8.60'),
    },
  })

  // Fase 2: volume discount tiers en iPhone 13
  await prisma.productPriceTier.createMany({
    data: [
      { productId: iphone13.id, minQty: 12, unitPrice: new Decimal('8.50') },
      { productId: iphone13.id, minQty: 48, unitPrice: new Decimal('8.00') },
    ],
  })

  // Fase 2: producto privado (catalog access) — iPhone 12 Pro Max solo para
  // orgs con acceso explícito. Demo: RepairHub tiene acceso, anónimo no lo ve.
  await prisma.product.update({
    where: { id: iphone12ProMax.id },
    data: { isPrivate: true },
  })
  await prisma.organizationCatalogAccess.create({
    data: {
      organizationId: acme.id,
      productId: iphone12ProMax.id,
      grantedById: admin.id,
    },
  })

  // Fase 2: demo Quote (QUOTED, ready to accept)
  const quote = await prisma.quote.create({
    data: {
      number: 'Q-2026-00001',
      organizationId: acme.id,
      requestedById: buyer1.id,
      status: 'QUOTED',
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      quotedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      quotedById: admin.id,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      currency: 'USD',
      adminNotes: 'Confirmado stock para envío inmediato.',
    },
  })
  await prisma.quoteLine.createMany({
    data: [
      {
        quoteId: quote.id,
        productId: iphone13.id,
        sku: iphone13.sku,
        name: iphone13.name,
        qty: 24,
        unitPriceBase: iphone13.basePrice,
        unitPriceQuoted: new Decimal('8.50'),
        lineTotal: new Decimal('204.00'),
        order: 0,
      },
      {
        quoteId: quote.id,
        productId: iphone14Pro.id,
        sku: iphone14Pro.sku,
        name: iphone14Pro.name,
        qty: 12,
        unitPriceBase: iphone14Pro.basePrice,
        unitPriceQuoted: new Decimal('11.50'),
        lineTotal: new Decimal('138.00'),
        order: 1,
      },
    ],
  })
  const quoteSubtotal = new Decimal('342.00')
  await prisma.quote.update({
    where: { id: quote.id },
    data: { subtotal: quoteSubtotal, total: quoteSubtotal },
  })

  // Fase 2: demo open invoice (requires a synthetic Order)
  const acmeAddress = await prisma.organizationAddress.findFirst({
    where: { organizationId: acme.id, isDefaultBilling: true },
  })
  if (!acmeAddress) throw new Error('RepairHub default address missing')
  const demoOrder = await prisma.order.create({
    data: {
      orderNumber: 'ORD-DEMO-INV-001',
      organizationId: acme.id,
      placedByUserId: buyer1.id,
      status: 'CONFIRMED',
      paymentMethod: 'NET_TERMS',
      billingAddressId: acmeAddress.id,
      shippingAddressId: acmeAddress.id,
      currency: 'USD',
      subtotal: new Decimal('500.00'),
      total: new Decimal('500.00'),
      confirmedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  })
  const invoice = await prisma.invoice.create({
    data: {
      number: 'INV-2026-00001',
      organizationId: acme.id,
      orderId: demoOrder.id,
      status: 'PENDING',
      amount: new Decimal('500.00'),
      currency: 'USD',
      issuedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.organization.update({
    where: { id: acme.id },
    data: { creditUsed: new Decimal('500.00') },
  })

  // Fase 2: demo pending approval (above threshold $1000)
  await prisma.approvalRequest.create({
    data: {
      subjectType: 'ORDER',
      subjectId: demoOrder.id,
      organizationId: acme.id,
      requestedById: buyer1.id,
      status: 'PENDING',
      reason: 'Order total exceeds organization approval threshold',
      threshold: new Decimal('1000.00'),
      amount: new Decimal('1450.00'),
    },
  })

  // Fase 2: demo notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: buyer1.id,
        type: 'QUOTE_QUOTED',
        subjectType: 'QUOTE',
        subjectId: quote.id,
        title: 'Tu cotización está lista',
        body: `${quote.number} fue cotizada por el equipo. Revísala y acepta.`,
        link: `/quotes/${quote.id}`,
      },
      {
        userId: buyer1.id,
        type: 'INVOICE_DUE_SOON',
        subjectType: 'INVOICE',
        subjectId: invoice.id,
        title: 'Factura próxima a vencer',
        body: `${invoice.number} por $500.00 USD. Vence en 20 días.`,
        link: `/invoices/${invoice.id}`,
      },
    ],
  })

  // Fase 3: enqueue all products for search indexing (noop locally without Meilisearch/Voyage envs)
  const { enqueueIndex } = await import('@/modules/search')
  for (const p of products) {
    await enqueueIndex(p.id, 'UPSERT')
  }

  // Fase 5 Corte 3: siembra plan de cuentas (upsert, idempotente)
  const { seedChartOfAccounts } = await import('@/modules/accounting')
  await seedChartOfAccounts()

  console.log('seed complete:')
  console.log(`  - admin user: ${admin.email}`)
  console.log('  - buyer users: buyer1@repairhub.com, buyer2@repairhub.com')
  console.log(`  - org: ${acme.slug}`)
  console.log(`  - ${products.length} products, 2 customer prices`)
  console.log(`  - search index queue: ${products.length} UPSERT enqueued`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
