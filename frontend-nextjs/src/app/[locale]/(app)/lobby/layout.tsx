import { localizedMetadata } from "@/lib/seo";
import { LobbyShell } from "@/components/app/LobbyShell";

export const generateMetadata = localizedMetadata({
  path: "/lobby",
  title: "lobbyTitle",
  description: "lobbyDescription",
});

/** The public lobby, in the same shell as an office: the floor, its chat, who is here. */
export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return <LobbyShell>{children}</LobbyShell>;
}
