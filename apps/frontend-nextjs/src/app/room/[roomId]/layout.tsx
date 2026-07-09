import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Active Room',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
