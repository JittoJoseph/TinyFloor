"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, DoorClosed, Hash, Link2, MessagesSquare } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFloor } from "@/lib/floor";
import { rememberOffice } from "@/lib/pendingOffice";
import { OfficePreview } from "./OfficePreview";
import { PlansSoon } from "@/components/ui/PlansSoon";

/**
 * The lobby's reason to exist, on one screen: name an office, and see it take
 * shape beside you as you type — its mark, its channels, you on its floor.
 * One ask, making an office; paying can wait.
 */
export function YourOfficeView() {
  const t = useTranslations("lobby.yourOffice");
  const router = useRouter();
  const { user } = useAuth();
  const everyone = useFloor();
  const [name, setName] = useState("");
  const reduce = useReducedMotion();
  const others = everyone.filter((one) => one.id !== user?.id);
  const account = !!user && !user.guest;
  const shown = name.trim() || t("placeholderName");

  const start = (event: React.FormEvent) => {
    event.preventDefault();
    const wanted = name.trim();
    if (!wanted) return;
    // /create makes it as soon as there is an account to own it.
    rememberOffice(wanted);
    router.push(account ? "/create" : `/auth?${new URLSearchParams({ redirect: "/create", mode: "signup" })}`);
  };

  const perks: Array<{ icon: ReactNode; key: "private" | "channels" | "messages" | "guests" }> = [
    { icon: <DoorClosed />, key: "private" },
    { icon: <Hash />, key: "channels" },
    { icon: <MessagesSquare />, key: "messages" },
    { icon: <Link2 />, key: "guests" },
  ];

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto flex min-h-full w-full max-w-[1080px] items-center px-4 py-8 sm:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <p className="text-[12.5px] font-medium text-muted-foreground">{t("eyebrow")}</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[36px]">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-[26rem] text-[14.5px] leading-relaxed text-muted-foreground">{t("body")}</p>

            <form onSubmit={start} className="mt-7 max-w-[26rem]">
              <label htmlFor="office-name" className="text-[12.5px] font-medium text-foreground">
                {t("nameLabel")}
              </label>
              <div className="mt-2 flex h-12 items-center gap-1 rounded-full border border-border bg-background p-1 ps-4 transition-[border-color,box-shadow] focus-within:border-foreground/35 focus-within:shadow-[0_0_0_4px_rgb(0_0_0/0.04)]">
                <input
                  id="office-name"
                  value={name}
                  maxLength={64}
                  autoComplete="off"
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint sm:text-[14px]"
                />
                <motion.button
                  type="submit"
                  disabled={!name.trim()}
                  whileTap={reduce ? undefined : { scale: 0.96 }}
                  className="group flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("create")}
                  <ArrowRight className="size-4 transition-transform group-enabled:group-hover:translate-x-0.5 rtl:rotate-180" />
                </motion.button>
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 ps-4 text-[12px] text-muted-foreground">
                <Check className="size-3.5 text-ok" />
                {t("free")}
              </p>
              <PlansSoon className="mt-1 ps-4" />
            </form>

            <ul className="mt-8 grid max-w-[26rem] grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-6">
              {perks.map((perk) => (
                <li key={perk.key} className="flex items-center gap-2.5 text-[13px] text-foreground">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-3.5">
                    {perk.icon}
                  </span>
                  {t(`perks.${perk.key}`)}
                </li>
              ))}
            </ul>
          </div>

          <OfficePreview
            name={shown}
            typed={!!name.trim()}
            others={others.map((one) => one.id)}
            person={user ? { id: user.id, name: user.displayName } : null}
          />
        </div>
      </div>
    </div>
  );
}
