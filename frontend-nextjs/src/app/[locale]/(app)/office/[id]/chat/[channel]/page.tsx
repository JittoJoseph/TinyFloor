import { ChannelChat } from "@/components/app/ChannelChat";

/** Built once, as `_`, for every conversation; the conversation is read from the address. */
export function generateStaticParams() {
  return [{ channel: "_" }];
}

export default function ChannelPage() {
  return <ChannelChat />;
}
