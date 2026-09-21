"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type OfficeSummary } from "@/lib/api";
import { officePath } from "@/lib/links";
import { AppHeader } from "@/components/app/AppHeader";
import { label, quietLabel } from "@/components/room/ui";

function Loading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-braun-bg)]">
      <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Your offices: one card each, one click into the floor. */
export default function DashboardPage() {
  const t = useTranslations("office.spaces");
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

  if (!offices) return <Loading />;

  return (
    <div className="min-h-screen w-full bg-[var(--color-braun-bg)]">
      <AppHeader />
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="font-body text-2xl font-medium tracking-tight text-[var(--color-braun-text)]">{t("title")}</h1>
          {offices.length > 0 && (
            <Link
              href="/create"
              className="cursor-pointer h-10 px-4 rounded-full bg-[var(--color-braun-text)] text-white font-body text-[13px] font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("new")}
            </Link>
          )}
        </div>

        {offices.length === 0 ? (
          <div className="rounded-3xl border border-black/[0.06] bg-[#fbfbf9] px-6 py-8 text-center">
            <h2 className="font-body text-lg font-semibold tracking-tight text-[var(--color-braun-text)]">
              {t("emptyTitle")}
            </h2>
            <p className={`${quietLabel} mt-1 mb-6`}>{t("emptyBody")}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/create"
                className="cursor-pointer h-11 px-5 rounded-full bg-[var(--color-braun-text)] text-white font-body text-[13px] font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("create")}
              </Link>
              <Link
                href="/lobby"
                className="cursor-pointer h-11 px-5 rounded-full bg-white border border-black/[0.06] shadow-sm font-body text-[13px] font-semibold flex items-center justify-center"
              >
                {t("visitLobby")}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {offices.map((office) => (
              <li key={office.id}>
                <Link
                  href={officePath(office.id)}
                  className="cursor-pointer group block rounded-3xl border border-black/[0.06] bg-[#fbfbf9] overflow-hidden transition-[border-color,box-shadow] hover:border-black/15 hover:shadow-[0_18px_44px_-28px_rgba(0,0,0,0.5)]"
                >
                  {/* A glimpse of the floor, so an office looks like a place. */}
                  <span className="block h-28 bg-[var(--color-braun-panel)] bg-[url('/office.png')] bg-cover bg-center" />
                  <span className="flex items-center gap-3 px-4 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className={`block ${label} text-[var(--color-braun-text)] truncate`}>{office.name}</span>
                      <span className={`flex items-center gap-1.5 ${quietLabel} mt-0.5`}>
                        <Users className="w-3.5 h-3.5" />
                        {t("members", { used: office.members, seats: office.seats })}
                        <span className="opacity-60">· {t(`roles.${office.role}`)}</span>
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
