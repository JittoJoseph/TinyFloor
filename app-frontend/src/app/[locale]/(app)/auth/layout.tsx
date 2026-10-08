import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata({
  path: '/auth',
  title: 'authTitle',
  description: 'authDescription',
  noindex: true,
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
