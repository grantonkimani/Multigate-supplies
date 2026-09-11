import { redirect } from 'next/navigation';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trimmed = slug?.trim();
  if (!trimmed) redirect('/products');
  redirect(`/products?category=${encodeURIComponent(trimmed)}`);
}
