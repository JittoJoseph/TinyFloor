import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata({
  path: '/people',
  title: 'peopleTitle',
  description: 'peopleDescription',
});

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
