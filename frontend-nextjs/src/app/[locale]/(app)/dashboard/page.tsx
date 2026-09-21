"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, DoorOpen, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type OfficeSummary } from "@/lib/api";
import { officePath } from "@/lib/links";
import { EASE_OUT } from "@/lib/ease";
import { AppTopBar } from "@/components/app/AppTopBar";
import { Logo } from "@/components/app/AppShell";
import { Face, FaceStack } from "@/components/ui/Face";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";

/** Your offices, each a place you can see into before walking in. */
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [offices, setOffices] = useState<OfficeSummary[] | null>(null);
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (isLoading) return;
    if (!signedIn) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/dashboard" })}`);
      return;
    }
    let cancelled = false;
    api.me().then(
      ({ offices: mine }) => !cancelled && setOffices(mine),
      () => !cancelled && setOffices([]),
    );
    return () => {
      cancelled = true;
    };
  }, [isLoading, signedIn, router]);

  if (!offices || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader variant="dots" size={20} />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = user.displayName.split(" ")[0];

  return (
    <div className="min-h-dvh bg-background">
      <AppTopBar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground sm:text-[30px]">
          {t(greeting, { name: firstName })}
        </h1>
        {offices.length > 0 && <p className="mt-1 text-[14.5px] text-muted-foreground">{t("subtitle")}</p>}

        {offices.length === 0 ? (
          <Empty />
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((office, index) => (
              <OfficeCard key={office.id} office={office} index={index} />
            ))}
          </ul>
        )}

        {offices.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Shortcut href="/create" icon={<Plus className="size-5" />} title={t("newOffice")} body={t("newOfficeBody")} />
            <Shortcut href="/lobby" icon={<Logo size={40} />} bare title={t("lobby")} body={t("lobbyBody")} />
          </div>
        )}
      </main>
    </div>
  );
}

/** Somewhere else to go, as a row: making an office, or the lobby. */
function Shortcut({
  href,
  icon,
  title,
  body,
  bare,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  bare?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[18px] border border-border bg-card p-3.5 pe-5 transition-colors hover:border-border-strong"
    >
      {bare ? (
        icon
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-foreground">{title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{body}</span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
    </Link>
  );
}

function OfficeCard({ office, index }: { office: OfficeSummary; index: number }) {
  const t = useTranslations("dashboard");
  const tRoles = useTranslations("office.roles");
  const ts = useTranslations("shell");
  const reduce = useReducedMotion();
  const here = office.here ?? 0;
  const faces = office.faces ?? [];

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT, delay: index * 0.04 }}
    >
      <Link
        href={officePath(office.id)}
        className="group block overflow-hidden rounded-[22px] border border-border bg-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float [--face-ring:var(--ui-card)]"
      >
        {/* A look at the floor, so an office reads as a place. */}
        <div className="relative h-36 overflow-hidden bg-muted">
          <span className="absolute inset-0 bg-[url('/office.png')] bg-cover bg-center transition-transform duration-500 [image-rendering:pixelated] group-hover:scale-[1.04]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          <span
            className={cn(
              "absolute start-3 top-3 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium backdrop-blur-md",
              here ? "bg-black/55 text-white" : "bg-black/35 text-white/80",
            )}
          >
            <span className={cn("size-1.5 rounded-full", here ? "bg-ok" : "bg-white/50")} />
            {t("onFloor", { count: here })}
          </span>
        </div>

        <div className="relative px-5 pb-5 pt-0">
          <Face seed={office.id} size={44} square className="-mt-6 rounded-[30%] ring-4 ring-card" />
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold tracking-tight text-foreground">{office.name}</p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {ts("membersOf", { used: office.members, seats: office.seats })} · {tRoles(office.role)}
              </p>
            </div>
            {faces.length > 0 && <FaceStack seeds={faces.map((one) => one.id)} size={26} max={4} />}
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

function Empty() {
  const t = useTranslations("dashboard");
  return (
    <div className="mt-8 grid overflow-hidden rounded-[26px] border border-border bg-card md:grid-cols-[1.1fr_1fr]">
      <div className="relative min-h-52 bg-muted">
        <span className="absolute inset-0 bg-[url('/office.png')] bg-cover bg-center [image-rendering:pixelated]" />
      </div>
      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{t("emptyTitle")}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{t("emptyBody")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Plus className="size-4" />
            {t("newOffice")}
          </Link>
          <Link
            href="/lobby"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <DoorOpen className="size-4" />
            {t("lobby")}
          </Link>
        </div>
      </div>
    </div>
  );
}
