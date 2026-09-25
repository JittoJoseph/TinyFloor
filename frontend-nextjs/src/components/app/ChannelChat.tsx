"use client";

import { usePathname } from "next/navigation";
import { ChatView } from "./ChatView";

/**
 * A conversation, named by the last part of the address. Its page is built
 * once for every conversation (see the office's layout), so the name is read
 * here rather than from the route.
 */
export function ChannelChat() {
  const pathname = usePathname();
  return <ChatView channel={decodeURIComponent(pathname.split("/chat/")[1] ?? "")} />;
}
