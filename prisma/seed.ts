import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('seeding...')

  // Clean (order matters for FKs)
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
    data: { email: 'buyer1@acme.com', name: 'Ana Buyer' },
  })
  const buyer2 = await prisma.user.create({
    data: { email: 'buyer2@acme.com', name: 'Bruno Buyer' },
  })

  // Customer organization
  const acme = await prisma.organization.create({
    data: {
      name: 'Acme Wholesale',
      slug: 'acme-wholesale',
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
            recipient: 'Acme Receiving',
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
            recipient: 'Acme Office',
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

  // CustomerPrice override: Acme has cheaper crema facial
  await prisma.customerPrice.create({
    data: {
      organizationId: acme.id,
      productId: products[0]?.id ?? '',
      price: new Decimal('12.00'),
      notes: 'Precio negociado contrato 2026',
    },
  })

  // CustomerPrice override: papel toalla mejor para Acme
  await prisma.customerPrice.create({
    data: {
      organizationId: acme.id,
      productId: products[5]?.id ?? '',
      price: new Decimal('15.50'),
    },
  })

  console.log('seed complete:')
  console.log(`  - admin user: ${admin.email}`)
  console.log('  - buyer users: buyer1@acme.com, buyer2@acme.com')
  console.log(`  - org: ${acme.slug}`)
  console.log(`  - ${products.length} products, 2 customer prices`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
