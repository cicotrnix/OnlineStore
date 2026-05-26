import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ category: string }>
}

export default async function CatalogCategoryPage({ params }: Props) {
  const { category } = await params
  redirect(`/catalog?category=${category}`)
}
