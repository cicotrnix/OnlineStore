import { prisma } from '@/lib/db/client'
import type { Locale } from '@/lib/i18n'
import { filterForOrg } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import { isVerified } from '@/modules/verification'
import { getStoreConfig } from '@/stores'
import type { Category, Product } from '@prisma/client'

export interface ToolContext {
  orgId: string | null
  locale: Locale
}

export type ToolName = 'searchProducts' | 'getProductDetail' | 'checkCompatibility'

export type ToolResult = { ok: true; data: Record<string, unknown> } | { ok: false; hint: string }

function supportHint(): string {
  return `If you can't find a product, please contact ${getStoreConfig().identity.supportEmail}.`
}

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

/**
 * ADR 0034: el precio mayorista es gated por verificación. Solo orgs VERIFIED
 * reciben precio. Anónimos y orgs PENDING/REJECTED reciben { priceVisible:false }
 * (equivalente a loginForPrice) — nunca el basePrice ni el precio resuelto.
 * La visibilidad de productos (filterForOrg) es independiente y NO se toca aquí.
 */
async function priceFieldsFor(
  orgId: string | null,
  productId: string
): Promise<Record<string, unknown>> {
  const verified = orgId ? await isVerified(orgId) : false
  if (!verified) return { priceVisible: false }
  const price = await pricingService.resolveForOrg(orgId as string, productId)
  return { priceVisible: true, priceResolved: price.toString() }
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
  if (top.length === 0) return { ok: false, hint: supportHint() }
  const results = await Promise.all(
    top.map(async (p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stockQuantity,
      ...(await priceFieldsFor(ctx.orgId, p.id)),
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
  if (!product || !product.isActive) return { ok: false, hint: supportHint() }
  const visible = await filterForOrg(ctx.orgId, [product as Product & { category: Category }])
  if (visible.length === 0) return { ok: false, hint: supportHint() }
  const priceFields = await priceFieldsFor(ctx.orgId, product.id)
  return {
    ok: true,
    data: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      // basePrice solo se expone junto al precio resuelto a orgs VERIFIED.
      ...(priceFields.priceVisible ? { basePrice: product.basePrice.toString() } : {}),
      ...priceFields,
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
  if (visible.length === 0) return { ok: false, hint: supportHint() }
  const matches = await Promise.all(
    visible.map(async (p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stockQuantity,
      ...(await priceFieldsFor(ctx.orgId, p.id)),
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
