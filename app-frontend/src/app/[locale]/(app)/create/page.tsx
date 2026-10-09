"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CreateOfficeFlow } from "@/components/app/CreateOffice";
import { Introduce } from "@/components/entry/Introduce";
import { DoorHeaderSkeleton, DoorSkeleton } from "@/components/entry/InviteEntry";
import { EntryShell } from "@/components/entry/EntryShell";

/**
 * Making an office (docs/15): a door that asks its name, who it's for and its
 * plan. It needs an account to own it, so someone signed out signs in (or up)
 * first and comes straight back here; someone new says who they are first.
 */
export default function CreateOfficePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (!isLoading && !signedIn) router.replace(`/auth?${new URLSearchParams({ redirect: "/create", mode: "signup" })}`);
  }, [isLoading, signedIn, router]);

  if (!signedIn) {
    return (
      <EntryShell backHref="/" header={<DoorHeaderSkeleton />}>
        <DoorSkeleton />
      </EntryShell>
    );
  }
  if (user.introduced === false) return <Introduce backHref="/" />;
  return <CreateOfficeFlow />;
}
