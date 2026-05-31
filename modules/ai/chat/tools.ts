import { prisma } from '@/lib/db/client'
import type { Locale } from '@/lib/i18n'
import { filterForOrg } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import storeConfig from '@/store.config'
import type { Category, Product } from '@prisma/client'

export interface ToolContext {
  orgId: string | null
  locale: Locale
}

export type ToolName = 'searchProducts' | 'getProductDetail' | 'checkCompatibility'

export type ToolResult = { ok: true; data: Record<string, unknown> } | { ok: false; hint: string }

const SUPPORT_HINT = `If you can't find a product, please contact ${storeConfig.identity.supportEmail}.`

export const TOOL_SCHEMAS = [
  {
    name: 'searchProducts',
    description:
      'Search the wholesale product catalog by free-text query (name, SKU, description). Returns up to 8 accessible hits.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Free-text query' } },
      required: ['query'],
    },
  },
  {
    name: 'getProductDetail',
    description: 'Get full attributes + resolved price + stock for one product by id.',
    input_schema: {
      type: 'object',
      properties: { productId: { type: 'string' } },
      required: ['productId'],
    },
  },
  {
    name: 'checkCompatibility',
    description:
      'List products compatible with a given iPhone model name (uses Product.compatibleModels).',
    input_schema: {
      type: 'object',
      properties: { model: { type: 'string', description: 'e.g. "iPhone 14 Pro"' } },
      required: ['model'],
    },
  },
] as const

async function resolveForOrgSafe(orgId: string | null, productId: string): Promise<string> {
  if (!orgId) {
    const p = await prisma.product.findUnique({
      where: { id: productId },
      select: { basePrice: true },
    })
    return p?.basePrice.toString() ?? '0'
  }
  const price = await pricingService.resolveForOrg(orgId, productId)
  return price.toString()
}

async function searchProducts(args: { query: string }, ctx: ToolContext): Promise<ToolResult> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: args.query, mode: 'insensitive' } },
        { sku: { contains: args.query, mode: 'insensitive' } },
        { description: { contains: args.query, mode: 'insensitive' } },
      ],
    },
    include: { category: true },
    take: 24,
  })
  const visible = await filterForOrg(ctx.orgId, products as (Product & { category: Category })[])
  const top = visible.slice(0, 8)
  if (top.length === 0) return { ok: false, hint: SUPPORT_HINT }
  const results = await Promise.all(
    top.map(async (p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stockQuantity,
      priceResolved: await resolveForOrgSafe(ctx.orgId, p.id),
      compatibleModels: p.compatibleModels,
    }))
  )
  return { ok: true, data: { results } }
}

async function getProductDetail(
  args: { productId: string },
  ctx: ToolContext
): Promise<ToolResult> {
  const product = await prisma.product.findUnique({
    where: { id: args.productId },
    include: { category: true },
  })
  if (!product || !product.isActive) return { ok: false, hint: SUPPORT_HINT }
  const visible = await filterForOrg(ctx.orgId, [product as Product & { category: Category }])
  if (visible.length === 0) return { ok: false, hint: SUPPORT_HINT }
  return {
    ok: true,
    data: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      basePrice: product.basePrice.toString(),
      priceResolved: await resolveForOrgSafe(ctx.orgId, product.id),
      stock: product.stockQuantity,
      compatibleModels: product.compatibleModels,
      attributes: product.attributes ?? {},
    },
  }
}

async function checkCompatibility(args: { model: string }, ctx: ToolContext): Promise<ToolResult> {
  const products = await prisma.product.findMany({
    where: { isActive: true, compatibleModels: { has: args.model } },
    include: { category: true },
    take: 12,
  })
  const visible = await filterForOrg(ctx.orgId, products as (Product & { category: Category })[])
  if (visible.length === 0) return { ok: false, hint: SUPPORT_HINT }
  const matches = await Promise.all(
    visible.map(async (p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stockQuantity,
      priceResolved: await resolveForOrgSafe(ctx.orgId, p.id),
      compatibleModels: p.compatibleModels,
    }))
  )
  return { ok: true, data: { matches } }
}

export async function handleTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (name) {
    case 'searchProducts':
      return searchProducts(args as { query: string }, ctx)
    case 'getProductDetail':
      return getProductDetail(args as { productId: string }, ctx)
    case 'checkCompatibility':
      return checkCompatibility(args as { model: string }, ctx)
  }
}
