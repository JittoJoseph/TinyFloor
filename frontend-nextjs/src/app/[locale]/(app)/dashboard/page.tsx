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
import { FloorScene } from "@/components/floor/FloorScene";

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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground sm:text-[30px]">
              {t(greeting, { name: firstName })}
            </h1>
            {offices.length > 0 && <p className="mt-1 text-[14.5px] text-muted-foreground">{t("subtitle")}</p>}
          </div>
          {offices.length > 0 && (
            <Link
              href="/create"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background transition-[background-color,transform] hover:bg-foreground/90 active:scale-[0.98]"
            >
              <Plus className="size-4" />
              {t("newOffice")}
            </Link>
          )}
        </div>

        {offices.length === 0 ? (
          <Empty />
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((office, index) => (
              <OfficeCard key={office.id} office={office} index={index} />
            ))}
          </ul>
        )}

        {offices.length > 0 && (
          <div className="mt-10">
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

/** The floor's rooms, one to a card, so offices do not all look alike. */
const VIEWS: Array<[number, number, number, number]> = [
  [16, 4, 16, 9],
  [31, 10, 16, 9],
  [0, 2, 15, 12],
  [0, 18, 15, 12],
  [32, 1, 15, 9],
];

function viewFor(id: string): [number, number, number, number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return VIEWS[Math.abs(hash) % VIEWS.length];
}

/**
 * An office as a place: a window onto its floor, drawn at the art's own pixel
 * size so it stays crisp, who is there now, and the way in.
 */
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
        className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float [--face-ring:var(--ui-card)]"
      >
        <div className="relative m-1.5 mb-0 h-40 overflow-hidden rounded-[17px]">
          <FloorScene view={viewFor(office.id)} className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
          <span
            className={cn(
              "absolute start-2.5 top-2.5 flex h-7 items-center gap-1.5 rounded-full border border-border bg-card/90 px-2.5 text-[12px] font-medium shadow-float backdrop-blur-md",
              here ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className={cn("size-1.5 rounded-full", here ? "bg-ok" : "bg-faint")} />
            {t("onFloor", { count: here })}
          </span>
        </div>

        <div className="flex flex-1 items-center gap-3.5 p-4">
          <Face seed={office.id} size={44} square />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.5px] font-semibold tracking-tight text-foreground">{office.name}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {ts("membersOf", { used: office.members, seats: office.seats })} · {tRoles(office.role)}
            </p>
          </div>
          {faces.length > 0 && <FaceStack seeds={faces.map((one) => one.id)} size={24} max={3} />}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[13px]">
          <span className="font-medium text-foreground">{t("walkIn")}</span>
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
          </span>
        </div>
      </Link>
    </motion.li>
  );
}

function Empty() {
  const t = useTranslations("dashboard");
  return (
    <div className="mt-8 grid overflow-hidden rounded-[26px] border border-border bg-card md:grid-cols-[1.1fr_1fr]">
      <FloorScene view={[15, 2, 32, 22]} className="relative m-2 min-h-56 rounded-[20px]" />
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
