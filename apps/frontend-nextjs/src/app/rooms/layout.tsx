import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Rooms',
  description: 'Browse active virtual rooms and join public workspaces in SpatialMeet.',
};

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
