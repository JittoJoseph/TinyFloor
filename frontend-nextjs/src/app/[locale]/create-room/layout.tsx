import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata({
  path: '/create-room',
  title: 'createRoomTitle',
  description: 'createRoomDescription',
});

export default function CreateRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
