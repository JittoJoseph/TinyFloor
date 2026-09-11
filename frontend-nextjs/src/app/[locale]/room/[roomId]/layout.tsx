import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; roomId: string }>;
}): Promise<Metadata> {
  const { locale, roomId } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return pageMetadata({
    title: t('roomTitle'),
    path: `/room/${roomId}`,
    locale,
    noindex: true,
  });
}

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
