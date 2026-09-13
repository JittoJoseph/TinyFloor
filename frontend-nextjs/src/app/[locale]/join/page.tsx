import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { joinPath } from "@/lib/links";
import { fetchPublic } from "@/lib/serverApi";
import { toInviteRoom, type InviteRoom } from "@/lib/directory";
import { JoinRoom } from "@/components/entry/JoinRoom";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** The invited room, looked up once per request for the page and its link preview. */
const findRoom = cache(
  async (roomId?: string, code?: string): Promise<InviteRoom | null> => {
    if (!roomId && !code) return null;
    const room = await fetchPublic<Parameters<typeof toInviteRoom>[0]>(
      code
        ? `/api/rooms/share/${encodeURIComponent(code)}`
        : `/api/rooms/${encodeURIComponent(roomId as string)}`,
    );
    return room && toInviteRoom(room);
  },
);

// An invite unfurls in WhatsApp, Slack or Discord with the room's name and the
// TinyFloor preview image, but never shows up in search.
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const [t, room] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "metadata" }),
    findRoom(one(query.roomId), one(query.code)),
  ]);

  return pageMetadata({
    locale,
    path: room ? joinPath(room.id) : "/join",
    title: room ? t("joinRoomTitle", { room: room.name }) : t("joinTitle"),
    description: room
      ? t("joinRoomDescription", { room: room.name })
      : t("description"),
    noindex: true,
  });
}

export default async function JoinPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale as Locale);
  const roomId = one(query.roomId);
  const code = one(query.code);

  return (
    <JoinRoom
      initialRoom={await findRoom(roomId, code)}
      roomId={roomId}
      code={code}
    />
  );
}
