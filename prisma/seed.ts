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

  // Categories
  const cosmeticos = await prisma.category.create({
    data: { slug: 'cosmeticos', name: 'Cosméticos', sortOrder: 1 },
  })
  const limpieza = await prisma.category.create({
    data: { slug: 'limpieza', name: 'Limpieza', sortOrder: 2 },
  })

  // Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'COS-001',
        slug: 'crema-facial-hidratante',
        name: 'Crema facial hidratante 50ml',
        description: 'Hidratante diaria con ácido hialurónico y vitamina E. Caja de 12 unidades.',
        basePrice: new Decimal('15.50'),
        stockQuantity: 200,
        imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600',
        categoryId: cosmeticos.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'COS-002',
        slug: 'protector-solar-spf50',
        name: 'Protector solar SPF 50+ 150ml',
        description: 'Resistente al agua. Display de 24 unidades.',
        basePrice: new Decimal('22.00'),
        stockQuantity: 150,
        imageUrl: 'https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=600',
        categoryId: cosmeticos.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'COS-003',
        slug: 'serum-vitamina-c',
        name: 'Serum vitamina C 30ml',
        description: 'Iluminador y antioxidante. Caja de 6 unidades.',
        basePrice: new Decimal('28.75'),
        stockQuantity: 90,
        imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',
        categoryId: cosmeticos.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'LMP-001',
        slug: 'jabon-liquido-galon',
        name: 'Jabón líquido neutro 3.78L',
        description: 'Para manos y superficies. Galón.',
        basePrice: new Decimal('9.99'),
        stockQuantity: 300,
        imageUrl: 'https://images.unsplash.com/photo-1585820114365-839e3a30c587?w=600',
        categoryId: limpieza.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'LMP-002',
        slug: 'desinfectante-spray',
        name: 'Desinfectante multiuso 750ml',
        description: 'Caja de 24 botellas con atomizador.',
        basePrice: new Decimal('5.25'),
        stockQuantity: 500,
        imageUrl: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=600',
        categoryId: limpieza.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'LMP-003',
        slug: 'papel-toalla-rollo',
        name: 'Papel toalla industrial 2 capas',
        description: 'Paca de 6 rollos premium.',
        basePrice: new Decimal('18.00'),
        stockQuantity: 250,
        imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600',
        categoryId: limpieza.id,
      },
    }),
  ])

  // CustomerPrice override: RepairHub has cheaper crema facial
  await prisma.customerPrice.create({
    data: {
      organizationId: acme.id,
      productId: products[0]?.id ?? '',
      price: new Decimal('12.00'),
      notes: 'Precio negociado contrato 2026',
    },
  })

  // CustomerPrice override: papel toalla mejor para RepairHub
  await prisma.customerPrice.create({
    data: {
      organizationId: acme.id,
      productId: products[5]?.id ?? '',
      price: new Decimal('15.50'),
    },
  })

  // Fase 2: volume discount tiers
  if (products[1]) {
    await prisma.productPriceTier.createMany({
      data: [
        { productId: products[1].id, minQty: 12, unitPrice: new Decimal('20.00') },
        { productId: products[1].id, minQty: 48, unitPrice: new Decimal('18.50') },
      ],
    })
  }
  if (products[4]) {
    await prisma.productPriceTier.createMany({
      data: [
        { productId: products[4].id, minQty: 24, unitPrice: new Decimal('4.75') },
        { productId: products[4].id, minQty: 120, unitPrice: new Decimal('4.25') },
      ],
    })
  }

  // Fase 2: private product (catalog access example)
  if (products[2]) {
    await prisma.product.update({
      where: { id: products[2].id },
      data: { isPrivate: true },
    })
    await prisma.organizationCatalogAccess.create({
      data: {
        organizationId: acme.id,
        productId: products[2].id,
        grantedById: admin.id,
      },
    })
  }

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
  if (products[0] && products[3]) {
    await prisma.quoteLine.createMany({
      data: [
        {
          quoteId: quote.id,
          productId: products[0].id,
          sku: products[0].sku,
          name: products[0].name,
          qty: 24,
          unitPriceBase: products[0].basePrice,
          unitPriceQuoted: new Decimal('11.50'),
          lineTotal: new Decimal('276.00'),
          order: 0,
        },
        {
          quoteId: quote.id,
          productId: products[3].id,
          sku: products[3].sku,
          name: products[3].name,
          qty: 12,
          unitPriceBase: products[3].basePrice,
          unitPriceQuoted: new Decimal('9.00'),
          lineTotal: new Decimal('108.00'),
          order: 1,
        },
      ],
    })
    const subtotal = new Decimal('384.00')
    await prisma.quote.update({
      where: { id: quote.id },
      data: { subtotal, total: subtotal },
    })
  }

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
