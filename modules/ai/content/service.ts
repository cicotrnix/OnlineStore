import { prisma } from '@/lib/db/client'
import type { Locale } from '@/lib/i18n'
import { complete } from '@/modules/ai/provider'
import storeConfig from '@/store.config'
import { parseContentSections } from './parser'
import { buildContentPrompt } from './prompt'

export interface GenerateInput {
  productId: string
  locale: Locale
}

export async function generateContentForProduct(input: GenerateInput) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { category: { select: { name: true } } },
  })
  if (!product) throw new Error(`Product not found: ${input.productId}`)

  const brandVoice = storeConfig.identity.brandVoice
  if (!brandVoice) {
    throw new Error('store.config.identity.brandVoice missing — required for content generation')
  }

  const prompt = buildContentPrompt({
    brandVoice,
    productName: product.name,
    categoryName: product.category.name,
    attributes: (product.attributes ?? {}) as Record<string, unknown>,
    locale: input.locale,
  })

  const completion = await complete(prompt, {
    model: storeConfig.ai.contentModel,
    maxTokens: 1500,
    temperature: 0.3,
  })

  const parsed = parseContentSections(completion.text)

  return prisma.productContent.upsert({
    where: { productId_locale: { productId: input.productId, locale: input.locale } },
    create: {
      productId: input.productId,
      locale: input.locale,
      longDescriptionMd: parsed.longDescriptionMd,
      shortDescription: parsed.shortDescription,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      status: 'DRAFT',
    },
    update: {
      longDescriptionMd: parsed.longDescriptionMd,
      shortDescription: parsed.shortDescription,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      status: 'DRAFT',
    },
  })
}
