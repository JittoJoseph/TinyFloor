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
    title: t('dashboardTitle'),
    path: '/dashboard',
    locale,
  });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
