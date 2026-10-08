"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HomeFrame } from "@/components/app/HomeFrame";
import { AccountSkeleton } from "@/components/app/HomeSkeletons";
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
      <HomeFrame active="account">
        <AccountSkeleton />
      </HomeFrame>
    );
  }
  return (
    <HomeFrame active="account">
      <AccountView />
    </HomeFrame>
  );
}
