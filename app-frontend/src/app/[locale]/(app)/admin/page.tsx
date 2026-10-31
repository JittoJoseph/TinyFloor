"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chats, Inbox as InboxIcon, Office, Overview as OverviewIcon, People as PeopleIcon } from "@/components/ui/icons";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type AdminSummary } from "@/lib/api";
import { homePath } from "@/lib/links";
import { AppShell, Logo } from "@/components/app/AppShell";
import { YouMenu } from "@/components/app/YouMenu";
import { Loader } from "@/components/motion/loader";
import { Overview } from "./Overview";
import { Inbox } from "./Inbox";
import { People } from "./People";
import { Offices } from "./Offices";
import { Lobby } from "./Lobby";
import { adminPath, VIEWS, type View, type ViewProps } from "./views";

/*
 * The admin view, for the team, in the frame every place in the app has: the
 * rail, and one panel. Overview is the numbers; Inbox is Help and feedback;
 * People, Offices and the Lobby's chat are each a list beside the one picked
 * from it. Where you are (the view, and what's picked) is in the address, so
 * a refresh, the back button and a link to a person or an office all work.
 * The API answers only the admin accounts; everyone else gets "nothing
 * here". In English: it's a tool for the team, not a page.
 */

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <Admin />
    </Suspense>
  );
}

function Admin() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [denied, setDenied] = useState(false);
  const view: View = VIEWS.find((one) => one === params.get("view")) ?? "overview";
  const picked = params.get("id");

  const recount = useCallback(() => {
    api.adminSummary().then(setSummary, (error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) setDenied(true);
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.guest) router.replace(`/auth?${new URLSearchParams({ redirect: "/admin" })}`);
    else recount();
  }, [isLoading, user, router, recount]);

  // The Inbox knows what's unread before the counts are read again.
  const unread = useCallback((count: number) => setSummary((now) => now && { ...now, counts: { ...now.counts, helpUnread: count } }), []);
  const pick = useCallback((id: string | null) => router.replace(adminPath(view, id)), [router, view]);
  const open = useCallback((to: View, id: string) => router.push(adminPath(to, id)), [router]);

  if (denied) return <p className="py-24 text-center font-(family-name:--font-app) text-[14px] text-muted-foreground">There&apos;s nothing here.</p>;
  if (!summary) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-rail text-muted-foreground">
        <Loader variant="dots" size={20} />
      </div>
    );
  }

  const props: ViewProps = { summary, picked, pick, open, recount };
  const labels: Record<View, string> = { overview: "Overview", inbox: "Inbox", people: "People", offices: "Offices", lobby: "Lobby" };
  const icons: Record<View, React.ReactNode> = {
    overview: <OverviewIcon />,
    inbox: <InboxIcon />,
    people: <PeopleIcon />,
    offices: <Office />,
    lobby: <Chats />,
  };
  return (
    <div className="font-(family-name:--font-app)">
      <AppShell
        help={false}
        mark={
          <Link href={homePath} aria-label="TinyFloor" className="flex size-10 items-center justify-center">
            <Logo size={34} />
          </Link>
        }
        destinations={VIEWS.map((key) => ({
          key,
          href: adminPath(key),
          label: labels[key],
          icon: icons[key],
          active: view === key,
          badge: key === "inbox" ? summary.counts.helpUnread || undefined : undefined,
        }))}
        leave={{ href: homePath, label: "Back to TinyFloor" }}
        you={<YouMenu onFloor={false} />}
        floor={null}
      >
        {view === "overview" && <Overview summary={summary} recount={recount} open={open} />}
        {view === "inbox" && <Inbox {...props} onUnread={unread} />}
        {view === "people" && <People {...props} />}
        {view === "offices" && <Offices {...props} />}
        {view === "lobby" && <Lobby {...props} />}
      </AppShell>
    </div>
  );
}
