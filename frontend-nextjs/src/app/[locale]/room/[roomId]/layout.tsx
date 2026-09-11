import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata({
  path: ({ roomId }) => `/room/${roomId}`,
  title: 'roomTitle',
  noindex: true,
});

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
