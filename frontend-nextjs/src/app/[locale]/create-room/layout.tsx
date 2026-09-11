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
    title: t('createRoomTitle'),
    description: t('createRoomDescription'),
    path: '/create-room',
    locale,
  });
}

export default function CreateRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
