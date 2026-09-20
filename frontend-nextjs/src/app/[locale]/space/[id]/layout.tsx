"use client";

import { use } from "react";
import { SpaceShell } from "@/components/space/SpaceShell";

export default function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SpaceShell workspaceId={id}>{children}</SpaceShell>;
}
