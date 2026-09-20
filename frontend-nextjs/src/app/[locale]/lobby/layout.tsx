import { localizedMetadata } from "@/lib/seo";

export const generateMetadata = localizedMetadata({
  path: "/lobby",
  title: "lobbyTitle",
  description: "lobbyDescription",
});

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
