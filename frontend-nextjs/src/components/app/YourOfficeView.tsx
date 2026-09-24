"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, DoorClosed, Hash, Link2, MessagesSquare } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFloor } from "@/lib/floor";
import { rememberOffice } from "@/lib/pendingOffice";
import { Face, FaceStack } from "@/components/ui/Face";
import { PlansSoon } from "@/components/ui/PlansSoon";

/**
 * The lobby's reason to exist, on one screen: name an office and go make it.
 * Its mark takes the name's colour as it is typed, and if people are here
 * with you, it says you can bring them. One ask, making an office; paying can wait.
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
  const typed = name.trim();

  const start = (event: React.FormEvent) => {
    event.preventDefault();
    if (!typed) return;
    // /create makes it as soon as there is an account to own it.
    rememberOffice(typed);
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
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center px-5 py-12 text-center sm:px-8">
        {/* The office's mark, in the colour its name gives it: the same one it will wear on the rail. */}
        <motion.span
          key={typed.toLowerCase() || "your-office"}
          initial={reduce ? false : { scale: 0.85, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
          aria-hidden
          className="mx-auto flex"
        >
          <Face seed={typed.toLowerCase() || "your-office"} size={56} square />
        </motion.span>

        <p className="mt-6 text-[12.5px] font-medium text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[36px]">{t("title")}</h1>
        <p className="mx-auto mt-3 max-w-[27rem] text-[14.5px] leading-relaxed text-muted-foreground">{t("body")}</p>

        <form onSubmit={start} className="mx-auto mt-8 w-full max-w-[26rem] text-start">
          <label htmlFor="office-name" className="sr-only">
            {t("nameLabel")}
          </label>
          <div className="flex h-12 items-center gap-1 rounded-full border border-border bg-background p-1 ps-4 transition-[border-color,box-shadow] focus-within:border-foreground/35 focus-within:shadow-[0_0_0_4px_rgb(0_0_0/0.04)]">
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
              disabled={!typed}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className="group flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("create")}
              <ArrowRight className="size-4 transition-transform group-enabled:group-hover:translate-x-0.5 rtl:rotate-180" />
            </motion.button>
          </div>
        </form>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Check className="size-3.5 text-ok" />
          {t("free")}
        </p>
        <PlansSoon className="mt-1 justify-center" />

        {others.length > 0 && (
          <p className="mx-auto mt-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-background py-1 pe-3.5 ps-1 text-[12.5px] text-muted-foreground [--face-ring:var(--ui-background)]">
            <FaceStack seeds={others.map((one) => one.id)} size={22} max={4} />
            {t("bringThem", { count: others.length })}
          </p>
        )}

        <ul className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {perks.map((perk) => (
            <li key={perk.key} className="flex flex-col items-center gap-2 bg-card px-3 py-4 text-[12.5px] leading-snug text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">{perk.icon}</span>
              {t(`perks.${perk.key}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
