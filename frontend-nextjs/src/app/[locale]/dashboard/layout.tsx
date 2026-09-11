import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata({
  path: '/dashboard',
  title: 'dashboardTitle',
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
