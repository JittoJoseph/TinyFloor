"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { lobbyPath } from "@/lib/links";
import { AppShell, Logo } from "./AppShell";
import { RailIcons } from "./railIcons";
import { YouMenu } from "./YouMenu";

/**
 * Home and your account, in the same frame as an office: the rail, and one
 * panel. The public lobby waits quietly at the foot of the rail.
 */
export function HomeShell({ active, children }: { active: "home" | "account"; children: ReactNode }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  const lobby = { href: lobbyPath, label: ts("publicLobby"), icon: RailIcons.lobby };
  return (
    <AppShell
      mark={
        <Link href="/dashboard" aria-label="TinyFloor" className="flex rounded-[30%] outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
          <Logo size={40} />
        </Link>
      }
      destinations={[
        { key: "home", href: "/dashboard", label: t("home"), icon: RailIcons.home, active: active === "home" },
        { key: "account", href: "/account", label: ts("account"), icon: RailIcons.account, active: active === "account" },
      ]}
      leave={lobby}
      you={<YouMenu onFloor={false} leave={lobby} />}
      floor={null}
    >
      {children}
    </AppShell>
  );
}
