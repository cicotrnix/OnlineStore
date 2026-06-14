import { PrismaClient } from '@prisma/client'
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

  // Categories — Pi-Power: 3 líneas de producto
  const batteryCell = await prisma.category.create({
    data: { slug: 'battery-cell', name: 'Battery Cell', sortOrder: 1 },
  })
  const plugAndPlay = await prisma.category.create({
    data: { slug: 'plug-and-play', name: 'Plug & Play', sortOrder: 2 },
  })
  const tagOnFlex = await prisma.category.create({
    data: { slug: 'tag-on-flex', name: 'Tag-on Flex', sortOrder: 3 },
  })

  // Battery Cell (11). Sello 0-cycle·100% es constante (lo pinta el card, no es
  // data). Capacidad +X%: NO se muestra hasta fuente formal del fabricante
  // (FU-010) → nombre "High Capacity" SIN número. Las iPhone 12 están 'incoming'
  // (las tenemos pero agotadas, llegando). Imágenes locales reales en
  // public/products/ (FU-011 resuelto, sin remotePatterns). El 12 Pro Max reusa
  // la imagen del combinado 12/12-pro por ahora.
  const img = (f: string) => `/products/${f}`
  const SPOT = { spot_welding_required: true }
  const cellDesc = (model: string) =>
    `Celda de alta capacidad para ${model}. 0 ciclos, 100% de salud de fábrica. Requiere soldadura por puntos (spot welding).`

  const iphone1212pro = await prisma.product.create({
    data: {
      sku: 'PP-BC-1212P',
      slug: 'iphone-12-12-pro',
      name: 'iPhone 12 / 12 Pro High Capacity Battery',
      description: cellDesc('iPhone 12 / 12 Pro'),
      basePrice: new Decimal('9.24'),
      stockQuantity: 0,
      imageUrl: img('iphone-12-12-pro.png'),
      categoryId: batteryCell.id,
      attributes: { ...SPOT, incoming: true },
    },
  })
  const iphone12ProMax = await prisma.product.create({
    data: {
      sku: 'PP-BC-12PM',
      slug: 'iphone-12-pro-max',
      name: 'iPhone 12 Pro Max High Capacity Battery',
      description: cellDesc('iPhone 12 Pro Max'),
      basePrice: new Decimal('13.01'),
      stockQuantity: 0,
      imageUrl: img('iphone-12-12-pro.png'),
      categoryId: batteryCell.id,
      attributes: { ...SPOT, incoming: true },
    },
  })
  const iphone13 = await prisma.product.create({
    data: {
      sku: 'PP-BC-13',
      slug: 'iphone-13',
      name: 'iPhone 13 High Capacity Battery',
      description: cellDesc('iPhone 13'),
      basePrice: new Decimal('9.00'),
      stockQuantity: 120,
      imageUrl: img('iphone-13.png'),
      categoryId: batteryCell.id,
      attributes: SPOT,
    },
  })
  const iphone13Pro = await prisma.product.create({
    data: {
      sku: 'PP-BC-13P',
      slug: 'iphone-13-pro',
      name: 'iPhone 13 Pro High Capacity Battery',
      description: cellDesc('iPhone 13 Pro'),
      basePrice: new Decimal('11.34'),
      stockQuantity: 100,
      imageUrl: img('iphone-13-pro.png'),
      categoryId: batteryCell.id,
      attributes: SPOT,
    },
  })
  const iphone13ProMax = await prisma.product.create({
    data: {
      sku: 'PP-BC-13PM',
      slug: 'iphone-13-pro-max',
      name: 'iPhone 13 Pro Max High Capacity Battery',
      description: cellDesc('iPhone 13 Pro Max'),
      basePrice: new Decimal('15.25'),
      stockQuantity: 100,
      imageUrl: img('iphone-13-pro-max.png'),
      categoryId: batteryCell.id,
      attributes: SPOT,
    },
  })
  const iphone14 = await prisma.product.create({
    data: {
      sku: 'PP-BC-14',
      slug: 'iphone-14',
      name: 'iPhone 14 High Capacity Battery',
      description: cellDesc('iPhone 14'),
      basePrice: new Decimal('9.03'),
      stockQuantity: 110,
      imageUrl: img('iphone-14.png'),
      categoryId: batteryCell.id,
      attributes: SPOT,
    },
  })
  const iphone14Pro = await prisma.product.create({
    data: {
      sku: 'PP-BC-14P',
      slug: 'iphone-14-pro',
      name: 'iPhone 14 Pro High Capacity Battery',
      description: cellDesc('iPhone 14 Pro'),
      basePrice: new Decimal('12.17'),
      stockQuantity: 90,
      imageUrl: img('iphone-14-pro.png'),
      categoryId: batteryCell.id,
      attributes: SPOT,
    },
  })
  const iphone14ProMax = await prisma.product.create({
    data: {
      sku: 'PP-BC-14PM',
      slug: 'iphone-14-pro-max',
      name: 'iPhone 14 Pro Max High Capacity Battery',
      description: cellDesc('iPhone 14 Pro Max'),
      basePrice: new Decimal('14.40'),
      stockQuantity: 90,
      imageUrl: img('iphone-14-pro-max.png'),
      categoryId: batteryCell.id,
      attributes: SPOT,
    },
  })
  const iphone15 = await prisma.product.create({
    data: {
      sku: 'PP-BC-15',
      slug: 'iphone-15',
      name: 'iPhone 15 High Capacity Battery (Flex Programmed)',
      description: `${cellDesc('iPhone 15')} Incluye flex programado.`,
      basePrice: new Decimal('11.20'),
      stockQuantity: 80,
      imageUrl: img('iphone-15-flex.png'),
      categoryId: batteryCell.id,
      attributes: { ...SPOT, flex_programmed: true },
    },
  })
  const iphone15Pro = await prisma.product.create({
    data: {
      sku: 'PP-BC-15P',
      slug: 'iphone-15-pro',
      name: 'iPhone 15 Pro High Capacity Battery (Flex Programmed)',
      description: `${cellDesc('iPhone 15 Pro')} Incluye flex programado.`,
      basePrice: new Decimal('14.07'),
      stockQuantity: 70,
      imageUrl: img('iphone-15-pro-flex.png'),
      categoryId: batteryCell.id,
      attributes: { ...SPOT, flex_programmed: true },
    },
  })
  const iphone15ProMax = await prisma.product.create({
    data: {
      sku: 'PP-BC-15PM',
      slug: 'iphone-15-pro-max',
      name: 'iPhone 15 Pro Max High Capacity Battery (Flex Programmed)',
      description: `${cellDesc('iPhone 15 Pro Max')} Incluye flex programado.`,
      basePrice: new Decimal('17.12'),
      stockQuantity: 60,
      imageUrl: img('iphone-15-pro-max-flex.png'),
      categoryId: batteryCell.id,
      attributes: { ...SPOT, flex_programmed: true },
    },
  })

  // Plug & Play (coming soon) — sin soldadura. Precios PENDIENTES (Herney):
  // basePrice 0.00 es placeholder INERTE — coming_soon nunca muestra precio ni
  // permite ordenar. Subset representativo (13/14/15) para poblar la categoría y
  // probar el filtro; el rango completo 13→15 Pro Max queda pendiente de precios.
  // Imagen: placeholder (glyph) hasta tener arte propio de la línea.
  const PNP = { plug_and_play: true, coming_soon: true }
  const pnp13 = await prisma.product.create({
    data: {
      sku: 'PP-PP-13',
      slug: 'iphone-13-plug-and-play',
      name: 'iPhone 13 Plug & Play Battery',
      description: 'Reemplazo sin soldadura. Próximamente.',
      basePrice: new Decimal('0.00'),
      stockQuantity: 0,
      categoryId: plugAndPlay.id,
      attributes: PNP,
    },
  })
  const pnp14 = await prisma.product.create({
    data: {
      sku: 'PP-PP-14',
      slug: 'iphone-14-plug-and-play',
      name: 'iPhone 14 Plug & Play Battery',
      description: 'Reemplazo sin soldadura. Próximamente.',
      basePrice: new Decimal('0.00'),
      stockQuantity: 0,
      categoryId: plugAndPlay.id,
      attributes: PNP,
    },
  })
  const pnp15 = await prisma.product.create({
    data: {
      sku: 'PP-PP-15',
      slug: 'iphone-15-plug-and-play',
      name: 'iPhone 15 Plug & Play Battery',
      description: 'Reemplazo sin soldadura. Próximamente.',
      basePrice: new Decimal('0.00'),
      stockQuantity: 0,
      categoryId: plugAndPlay.id,
      attributes: PNP,
    },
  })

  // Tag-on Flex — accesorio flex para TODOS los modelos. $3.50, in stock.
  // (Las celdas 15 ya lo incluyen; este es el extra suelto.) Imagen: placeholder.
  const tagOn = await prisma.product.create({
    data: {
      sku: 'PP-TO-1',
      slug: 'tag-on-flex-cable',
      name: 'Tag-on Flex (todos los modelos)',
      description:
        'Flex tag-on universal para celdas que no lo incluyen. Compatible con todos los modelos.',
      basePrice: new Decimal('3.50'),
      stockQuantity: 200,
      categoryId: tagOnFlex.id,
    },
  })

  const products = [
    iphone1212pro,
    iphone12ProMax,
    iphone13,
    iphone13Pro,
    iphone13ProMax,
    iphone14,
    iphone14Pro,
    iphone14ProMax,
    iphone15,
    iphone15Pro,
    iphone15ProMax,
    pnp13,
    pnp14,
    pnp15,
    tagOn,
  ]

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
