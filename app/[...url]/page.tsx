import { notFound, redirect } from 'next/navigation';
import { reconstructTargetUrlFromSegments } from '@/lib/classifier';

interface CatchAllPageProps {
  params: Promise<{ url: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UrlPrefixRedirectPage({
  params,
  searchParams,
}: CatchAllPageProps) {
  const { url } = await params;
  const query = await searchParams;

  const targetUrl = reconstructTargetUrlFromSegments(url, query);
  if (!targetUrl) {
    notFound();
  }

  redirect(`/?url=${encodeURIComponent(targetUrl)}`);
}
