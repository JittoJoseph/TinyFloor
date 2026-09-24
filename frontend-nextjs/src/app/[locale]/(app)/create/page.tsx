"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/motion/loader";
import { HomeFrame } from "@/components/app/HomeFrame";
import { MakeOffice } from "@/components/app/CreateOffice";

/**
 * Making an office: the name, typed straight into the office as the app will
 * show it, then its floor. It needs an account to own it, so someone signed
 * out signs in (or up) first and comes straight back here.
 */
export default function CreateOfficePage() {
  const td = useTranslations("dashboard");
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (!isLoading && !signedIn) router.replace(`/auth?${new URLSearchParams({ redirect: "/create", mode: "signup" })}`);
  }, [isLoading, signedIn, router]);

  if (!signedIn) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-rail text-muted-foreground">
        <Loader variant="dots" size={20} />
      </div>
    );
  }

  return (
    <HomeFrame active={null}>
      <MakeOffice greeting={td("newOffice")} />
    </HomeFrame>
  );
}
