"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/motion/loader";
import { HomeFrame } from "@/components/app/HomeFrame";
import { OfficeNameCard, useCreateOffice } from "@/components/app/CreateOffice";

/**
 * Making an office: the name, typed straight into the office as the app will
 * show it, then its floor. It needs an account to own it, so someone signed
 * out signs in (or up) first and comes straight back here.
 */
export default function CreateOfficePage() {
  const t = useTranslations("create");
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;
  const { name, setName, typed, busy, error, create } = useCreateOffice();

  useEffect(() => {
    if (!isLoading && !signedIn) router.replace(`/auth?${new URLSearchParams({ redirect: "/create", mode: "signup" })}`);
  }, [isLoading, signedIn, router]);

  if (!signedIn) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader variant="dots" size={20} />
      </div>
    );
  }

  return (
    <HomeFrame active={null}>
      <form onSubmit={create} className="mx-auto max-w-[440px] pt-2 text-center sm:pt-8">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground sm:text-[32px]">{t("title")}</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        <OfficeNameCard name={name} onName={setName} autoFocus className="mt-9 shadow-[0_24px_48px_-28px_rgb(0_0_0/0.35)]" />
        {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!typed || busy}
          className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? t("creating") : typed ? t("makeNamed", { name: typed }) : t("create")}
          {!busy && <ArrowRight className="size-4 rtl:rotate-180" />}
        </button>
        <p className="mt-4 text-[12.5px] text-muted-foreground">{t("freePlan")}</p>
      </form>
    </HomeFrame>
  );
}
