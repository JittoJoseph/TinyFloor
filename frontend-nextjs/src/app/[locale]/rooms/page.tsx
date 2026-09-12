import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { fetchPublic } from "@/lib/serverApi";
import { ROOMS_PAGE_SIZE, toDirectoryRooms, type RawRoom } from "@/lib/directory";
import { RoomsDirectory } from "@/components/directory/RoomsDirectory";

export const revalidate = 60;

export default async function RoomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const rooms = await fetchPublic<RawRoom[]>(
    `/api/rooms?page=0&size=${ROOMS_PAGE_SIZE}`,
  );

  return <RoomsDirectory initialRooms={rooms && toDirectoryRooms(rooms)} />;
}
