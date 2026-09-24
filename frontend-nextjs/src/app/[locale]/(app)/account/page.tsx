"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/motion/loader";
import { HomeShell } from "@/components/app/HomeShell";
import { AccountView } from "@/components/account/AccountView";

/** Your account, beside home in the same frame. */
export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (!isLoading && !signedIn) router.replace(`/auth?${new URLSearchParams({ redirect: "/account" })}`);
  }, [isLoading, signedIn, router]);

  if (!signedIn) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader variant="dots" size={20} />
      </div>
    );
  }
  return (
    <HomeShell active="account">
      <AccountView />
    </HomeShell>
  );
}
