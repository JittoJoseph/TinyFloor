import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a Room',
  description: 'Set up a new virtual office space on SpatialMeet for your team or friends.',
};

export default function CreateRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
