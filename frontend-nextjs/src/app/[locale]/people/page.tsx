import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import type { PublicUser } from "@/lib/types";
import { fetchPublic } from "@/lib/serverApi";
import { PEOPLE_PAGE_SIZE, toDirectoryPeople } from "@/lib/directory";
import { PeopleDirectory } from "@/components/directory/PeopleDirectory";

export const revalidate = 60;

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const people = await fetchPublic<PublicUser[]>(
    `/api/users/public?page=0&size=${PEOPLE_PAGE_SIZE}`,
  );

  return <PeopleDirectory initialPeople={people && toDirectoryPeople(people)} />;
}
