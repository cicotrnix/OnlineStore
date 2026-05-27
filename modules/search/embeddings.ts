import { embedDocument, embedQuery } from '@/lib/voyage'

export async function embedSearchQuery(text: string): Promise<number[]> {
  return embedQuery(text)
}

export async function embedProductText(text: string): Promise<number[]> {
  return embedDocument(text)
}

export function formatVectorForPostgres(vec: number[]): string {
  return `[${vec.join(',')}]`
}

export interface ProductForEmbedding {
  name: string
  description: string | null
  sku: string
  category: { name: string }
}

export function buildSearchableText(product: ProductForEmbedding): string {
  return [product.name, product.description ?? '', product.sku, product.category.name]
    .filter(Boolean)
    .join('\n')
}
