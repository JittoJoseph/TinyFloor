"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, ChevronRight, DoorOpen } from "@/components/ui/icons";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { lobbyPath } from "@/lib/links";
import { JoinByLink } from "./CreateOffice";
import { LitFace } from "@/components/ui/LitFace";
import { ActionLink } from "@/components/ui/Action";

/**
 * No office yet, just after signing up (docs/15): one thing to do, make one.
 * Someone who was invited pastes the link instead, and the lobby is there
 * meanwhile. On a phone those two are grouped as a list; wider, they sit
 * quietly underneath.
 */
export function NoOffice() {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-[440px] sm:flex sm:min-h-[calc(100dvh-14rem)] sm:flex-col sm:items-center sm:justify-center sm:pb-6 sm:text-center">
      <LitFace seed={user?.id ?? "your-office"} size={80} phone={60} square />
      <p className="mt-7 text-[13px] font-medium text-muted-foreground sm:mt-9">
        {user ? t("welcome", { name: user.displayName.split(" ")[0] }) : t("welcomeAnonymous")}
      </p>
      <h1 className="mt-1 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:mt-1.5 sm:text-[34px] sm:leading-tight sm:tracking-[-0.025em]">
        {t("makeTitle")}
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground sm:text-balance sm:text-[14.5px]">{t("welcomeBody")}</p>
      <ActionLink href="/create" className="mt-7 h-12 text-[15px] sm:mt-8 sm:max-w-[320px]">
        {t("createOffice")}
      </ActionLink>

      <p className="mb-2.5 mt-12 px-4 text-[12px] font-medium text-faint sm:hidden">{t("otherWays")}</p>
      <div className="w-full divide-y divide-border overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-28px_rgb(0_0_0/0.45)] sm:mt-14 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none">
        <div className="p-4 sm:p-0">
          <p className="text-[14px] font-medium text-foreground sm:mb-3 sm:flex sm:items-center sm:gap-3 sm:text-[12px] sm:font-normal sm:text-faint sm:before:h-px sm:before:flex-1 sm:before:bg-border sm:after:h-px sm:after:flex-1 sm:after:bg-border">
            {t("invited")}
          </p>
          <p className="mb-3 text-[12.5px] text-muted-foreground sm:hidden">{t("invitedBody")}</p>
          <JoinByLink />
        </div>
        <Link
          href={lobbyPath}
          className="flex items-center gap-3 p-4 transition-colors active:bg-foreground/[0.03] sm:mx-auto sm:mt-9 sm:w-fit sm:gap-1.5 sm:p-0 sm:text-muted-foreground sm:hover:text-foreground"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground sm:size-auto sm:border-0 sm:text-current">
            <DoorOpen className="size-4 rtl:-scale-x-100" />
          </span>
          <span className="min-w-0 flex-1 text-start sm:hidden">
            <span className="block text-[14px] font-medium text-foreground">{ts("publicLobby")}</span>
            <span className="block text-[12.5px] text-muted-foreground">{t("lobbyBody")}</span>
          </span>
          <span className="hidden text-[13px] sm:inline">{t("lobbyNote")}</span>
          <ChevronRight className="size-4 text-faint sm:hidden rtl:rotate-180" />
          <ArrowRight className="hidden size-3.5 sm:block rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
