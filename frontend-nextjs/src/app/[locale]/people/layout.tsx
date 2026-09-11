import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return pageMetadata({
    title: t('peopleTitle'),
    description: t('peopleDescription'),
    path: '/people',
    locale,
  });
}

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
