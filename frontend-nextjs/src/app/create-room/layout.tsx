import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a Room',
  description:
    'Open a virtual office room on SpatialMeet. Name it, add a password if you want one, then share one link with your team.',
};

export default function CreateRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
