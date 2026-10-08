"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HomeFrame } from "@/components/app/HomeFrame";
import { HomeSkeleton } from "@/components/app/HomeSkeletons";
import { HomeView } from "@/components/app/HomeView";
import { Introduce } from "@/components/entry/Introduce";

/** Home: your office, in the same frame as the office itself. Someone new says who they are first (docs/15). */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (!isLoading && !signedIn) router.replace(`/auth?${new URLSearchParams({ redirect: "/dashboard" })}`);
  }, [isLoading, signedIn, router]);

  if (!signedIn) {
    return (
      <HomeFrame active="home">
        <HomeSkeleton />
      </HomeFrame>
    );
  }
  if (user.introduced === false) return <Introduce backHref="/" />;
  return (
    <HomeFrame active="home">
      <HomeView />
    </HomeFrame>
  );
}
