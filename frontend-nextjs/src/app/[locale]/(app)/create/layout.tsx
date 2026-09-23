import { localizedMetadata } from '@/lib/seo';

// A form, not a page to land on from a search: named, but kept out of the index.
export const generateMetadata = localizedMetadata({
  path: '/create',
  title: 'createTitle',
  description: 'description',
  noindex: true,
});

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
