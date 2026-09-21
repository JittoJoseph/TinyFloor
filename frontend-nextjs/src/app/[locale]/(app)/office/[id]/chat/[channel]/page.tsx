"use client";

import { use } from "react";
import { ChatView } from "@/components/app/ChatView";

export default function ChannelPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel } = use(params);
  return <ChatView channel={decodeURIComponent(channel)} />;
}
