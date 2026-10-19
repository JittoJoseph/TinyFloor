"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Accessibility, ArrowLeft, Bell, Building2, ChevronRight, CreditCard, Headphones, KeyRound, Mic, Monitor, Moon, SlidersHorizontal, Sun, UserRound, Video } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type DomainAccess, type InvitePolicy } from "@/lib/api";
import { savedDevices, saveDevices } from "@/lib/media";
import { setPref, usePrefs, type Prefs } from "@/lib/prefs";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import { Switch } from "@/components/motion/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select";
import { Button } from "@/components/motion/button/base";
import { Face } from "@/components/ui/Face";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ShellView } from "./AppShell";
import { PresenceDock } from "./PresenceDock";
import { usePlace } from "./place";
import { useOfficeMaybe } from "./OfficeShell";
import { PlanSection } from "./PlanSection";
import { Profile, SignIn } from "@/components/account/AccountView";

type Section = "profile" | "signin" | "general" | "media" | "notifications" | "accessibility" | "office" | "plan";
const SECTIONS: Section[] = ["profile", "signin", "general", "media", "notifications", "accessibility", "office", "plan"];

const ICONS: Record<Section, ReactNode> = {
  profile: <UserRound />,
  signin: <KeyRound />,
  general: <SlidersHorizontal />,
  media: <Headphones />,
  notifications: <Bell />,
  accessibility: <Accessibility />,
  office: <Building2 />,
  plan: <CreditCard />,
};

/**
 * Settings, in the shell like everything else: your account (who you are to
 * everyone, how you sign in), your own preferences, kept in this browser, and
 * — in an office — the office's own. A link opens a section by its name:
 * …/settings#profile, …/settings#plan.
 */
export function SettingsView() {
  const t = useTranslations("settings");
  const ts = useTranslations("shell");
  const tp = useTranslations("office.profile");
  const place = usePlace();
  const { user } = useAuth();
  const account: Section[] = user && !user.guest ? ["profile", "signin"] : [];
  const yours: Section[] = ["general", "media", "notifications", "accessibility"];
  const office: Section[] = place.kind === "office" ? ["office", "plan"] : [];
  const shown = [...account, ...yours, ...office];
  // A link straight to a section ("Get more seats" → …/settings#plan, your profile → #profile).
  const hashed = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "") as Section;
  const linked = SECTIONS.includes(hashed) && shown.includes(hashed) ? hashed : null;
  // What was picked by hand, and under which link: a link opened afterwards (the office
  // menu's "Office settings" while already here) takes over from it.
  const [chosen, setSection] = useState<{ one: Section; at: string } | null>(null);
  const [pickedByHand, setPicked] = useState<{ shown: boolean; at: string } | null>(null);
  const handHolds = (by: { at: string } | null): by is { at: string } => !!by && (by.at === hashed || !linked);
  const section = (handHolds(chosen) ? chosen.one : linked) ?? "general";
  const picked = handHolds(pickedByHand) ? pickedByHand.shown : !!linked;
  const reduce = useReducedMotion();
  const label = (one: Section) => (one === "profile" || one === "signin" ? tp(`sections.${one}`) : t(`sections.${one}`));

  const choose = (one: Section) => {
    setSection({ one, at: hashed });
    setPicked({ shown: true, at: hashed });
  };

  const item = (one: Section) => (
    <button
      key={one}
      type="button"
      onClick={() => choose(one)}
      aria-current={section === one ? "page" : undefined}
      className={cn(
        "relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-start text-[13.5px] transition-colors [&_svg]:size-4",
        section === one ? "text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
      )}
    >
      {section === one && (
        <motion.span
          layoutId="settings-row"
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-0 rounded-lg bg-muted"
        />
      )}
      <span className="relative">{ICONS[one]}</span>
      <span className="relative flex-1">{label(one)}</span>
      <ChevronRight className="relative size-3.5 text-faint md:hidden rtl:rotate-180" />
    </button>
  );

  return (
    <ShellView
      showDetail={picked}
      column={
        <>
          <header className="flex h-14 shrink-0 items-center px-4">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{ts("settings")}</h2>
          </header>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {account.length > 0 && user && (
              <>
                <p className="truncate px-2.5 pb-1 pt-1 text-[12px] font-medium text-faint">{user.displayName}</p>
                <div className="mb-3 flex flex-col gap-px">{account.map(item)}</div>
              </>
            )}
            <p className="px-2.5 pb-1 pt-1 text-[12px] font-medium text-faint">{t("preferences")}</p>
            <div className="flex flex-col gap-px">{yours.map(item)}</div>
            {office.length > 0 && (
              <>
                <p className="px-2.5 pb-1 pt-4 text-[12px] font-medium text-faint">{place.name}</p>
                <div className="flex flex-col gap-px">{office.map(item)}</div>
              </>
            )}
          </nav>
          <PresenceDock place={place.name} settingsHref={place.paths.settings} />
        </>
      }
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-6">
        <IconButton
          label={ts("back")}
          size="sm"
          className="md:hidden"
          onClick={() => setPicked({ shown: false, at: hashed })}
          icon={<ArrowLeft className="rtl:rotate-180" />}
        />
        <span className="text-[15px] font-semibold text-foreground">{label(section)}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-8">
          {section === "profile" && <Profile />}
          {section === "signin" && <SignIn />}
          {section === "general" && <General />}
          {section === "media" && <Media />}
          {section === "notifications" && <Notifications />}
          {section === "accessibility" && <AccessibilitySection />}
          {section === "office" && <OfficeSection />}
          {section === "plan" && <PlanSection />}
        </div>
      </div>
    </ShellView>
  );
}

function subscribeHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

/** A group of settings on one card, the way every settings page reads. */
export function Group({ title, note, action, children }: { title: string; note?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
          {note && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{note}</p>}
        </div>
        {action}
      </div>
      {/* Inside a place's panel it sits in; on Home's ground the frame raises it into a panel of its own. */}
      <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-[var(--group-bg,var(--ui-background))] shadow-[var(--group-shadow,none)] [--face-ring:var(--group-bg,var(--ui-background))]">
        {children}
      </div>
    </section>
  );
}

export function Row({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Toggle({
  pref,
  title,
  description,
}: {
  pref: keyof Prefs;
  title: string;
  description?: string;
}) {
  const prefs = usePrefs();
  return (
    <Row
      title={title}
      description={description}
      control={<Switch checked={prefs[pref]} onCheckedChange={(on) => setPref(pref, on)} ariaLabel={title} />}
    />
  );
}

/** Theme and language: the same in an office's settings and on your account. */
export function General() {
  const t = useTranslations("settings");
  const ts = useTranslations("shell");
  const theme = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const themes: Array<{ value: ThemeChoice; icon: ReactNode }> = [
    { value: "system", icon: <Monitor className="size-4" /> },
    { value: "light", icon: <Sun className="size-4" /> },
    { value: "dark", icon: <Moon className="size-4" /> },
  ];
  return (
    <>
      <Group title={t("appearance")}>
        <div className="px-4 py-3.5">
          <p className="text-[13.5px] font-medium text-foreground">{ts("theme")}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t("themeNote")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {themes.map((one) => (
              <button
                key={one.value}
                type="button"
                aria-pressed={theme === one.value}
                onClick={() => setTheme(one.value)}
                className={cn(
                  "group overflow-hidden rounded-xl border text-start transition-colors",
                  theme === one.value ? "border-foreground/40 ring-1 ring-foreground/20" : "border-border hover:border-border-strong",
                )}
              >
                <ThemePreview kind={one.value} />
                <span className="flex items-center gap-1.5 px-2.5 py-2 text-[12.5px] font-medium text-foreground">
                  {one.icon}
                  {ts(`themes.${one.value}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Group>
      <Group title={t("language")}>
        <Row
          title={t("languageTitle")}
          description={t("languageNote")}
          control={
            <div className="w-44">
              <Select
                value={locale}
                onValueChange={(code) => router.replace(`${pathname}${window.location.search}`, { locale: code as Locale })}
              >
                <SelectTrigger className="h-9 bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((one) => (
                    <SelectItem key={one.code} value={one.code}>
                      {one.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </Group>
    </>
  );
}

/** A tiny sketch of the app in that theme. */
function ThemePreview({ kind }: { kind: ThemeChoice }) {
  const half = (dark: boolean) => (
    <span className={cn("flex h-full flex-1 gap-1 p-1.5", dark ? "bg-[#0f0f10]" : "bg-[#f0f0ec]")}>
      <span className={cn("w-2.5 rounded-sm", dark ? "bg-[#1e1e21]" : "bg-[#e2e2dc]")} />
      <span className={cn("flex flex-1 flex-col gap-1 rounded-sm p-1", dark ? "bg-[#161617]" : "bg-white")}>
        <span className={cn("h-1 w-3/4 rounded-full", dark ? "bg-[#3a3a3e]" : "bg-[#d6d6d0]")} />
        <span className={cn("h-1 w-1/2 rounded-full", dark ? "bg-[#2a2a2e]" : "bg-[#e6e6e0]")} />
      </span>
    </span>
  );
  return (
    <span className="flex h-14 border-b border-border">
      {kind === "system" ? (
        <>
          {half(false)}
          {half(true)}
        </>
      ) : (
        half(kind === "dark")
      )}
    </span>
  );
}

interface Device {
  deviceId: string;
  label: string;
}
const DEFAULT = "default";

function Media() {
  const t = useTranslations("settings");
  const [microphones, setMicrophones] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [audio, setAudio] = useState(() => savedDevices().audio ?? DEFAULT);
  const [video, setVideo] = useState(() => savedDevices().video ?? DEFAULT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        let devices = await navigator.mediaDevices.enumerateDevices();
        if (devices.every((device) => !device.label)) {
          // Labels stay blank until the browser has granted the devices once.
          const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          probe.getTracks().forEach((track) => track.stop());
        }
        if (cancelled) return;
        const of = (kind: MediaDeviceKind) =>
          devices
            .filter((device) => device.kind === kind && device.deviceId && device.deviceId !== DEFAULT)
            .map(({ deviceId, label }) => ({ deviceId, label }));
        setMicrophones(of("audioinput"));
        setCameras(of("videoinput"));
      } catch {
        // No permission or no devices: the default ones are used.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = (kind: "audio" | "video", value: string) => {
    if (kind === "audio") setAudio(value);
    else setVideo(value);
    const next = { ...savedDevices(), [kind]: value === DEFAULT ? undefined : value };
    saveDevices(next);
  };

  const device = (kind: "audio" | "video", value: string, list: Device[], label: string) => (
    <div className="w-56 max-w-[55vw]">
      <Select value={value} onValueChange={(next) => pick(kind, next)}>
        <SelectTrigger className="h-9 bg-card text-[13px]">
          <SelectValue className="truncate" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>{t("default")}</SelectItem>
          {list.map((one) => (
            <SelectItem key={one.deviceId} value={one.deviceId}>
              {one.label || `${label} ${one.deviceId.slice(0, 6)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <Group title={t("devices")} note={t("devicesNote")}>
        <Row title={t("microphone")} control={device("audio", audio, microphones, t("microphone"))} />
        <Row title={t("camera")} control={device("video", video, cameras, t("camera"))} />
      </Group>
      <Group title={t("voice")} note={t("voiceNote")}>
        <Toggle pref="noiseSuppression" title={t("noiseSuppression")} description={t("noiseSuppressionNote")} />
        <Toggle pref="echoCancellation" title={t("echoCancellation")} description={t("echoCancellationNote")} />
      </Group>
      <Group title={t("video")}>
        <Toggle pref="mirrorVideo" title={t("mirror")} description={t("mirrorNote")} />
      </Group>
      <p className="flex items-center gap-2 text-[12px] text-faint">
        <Mic className="size-3.5" />
        <Video className="size-3.5" />
        {t("mediaLocal")}
      </p>
    </>
  );
}

function Notifications() {
  const t = useTranslations("settings");
  return (
    <>
      <Group title={t("sounds")}>
        <Toggle pref="messageSound" title={t("messageSound")} description={t("messageSoundNote")} />
        <Toggle pref="joinSound" title={t("joinSound")} description={t("joinSoundNote")} />
      </Group>
      <Group title={t("onTheFloor")}>
        <Toggle pref="nudges" title={t("nudges")} description={t("nudgesNote")} />
      </Group>
    </>
  );
}

function AccessibilitySection() {
  const t = useTranslations("settings");
  return (
    <>
      <Group title={t("motion")}>
        <Toggle pref="reduceMotion" title={t("reduceMotion")} description={t("reduceMotionNote")} />
      </Group>
      <Group title={t("performance")}>
        <Toggle pref="batterySaver" title={t("batterySaver")} description={t("batterySaverNote")} />
      </Group>
    </>
  );
}

/**
 * The office's own settings: its name, and for its owner, handing it to
 * someone else. Leaving or closing it is the quiet last line, and each asks
 * first, with staying as the answer that's easiest to give.
 */
function OfficeSection() {
  const t = useTranslations("office.settings");
  const tPeople = useTranslations("office.people");
  const tc = useTranslations("common");
  const tPlans = useTranslations("office.plans");
  const { user } = useAuth();
  const context = useOfficeMaybe();
  const [name, setName] = useState(context?.office.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!context || !user) return null;
  const { office, overview, refresh } = context;
  const admin = office.role === "admin";
  const owner = user.id === office.owner;
  const others = overview.members.filter((member) => member.id !== user.id);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-8 flex items-center gap-4">
        <Face seed={office.id} size={56} square />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-foreground">{office.name}</p>
          <p className="text-[13px] text-muted-foreground">
            {t("plan", {
              plan: tPlans.has(office.plan as "free") ? tPlans(office.plan as "free") : office.plan,
              used: office.members,
              seats: office.seats,
            })}
            {" · "}
            {owner ? tPeople("owner") : tPeople(office.role)}
          </p>
          <PlansSoon className="mt-1" />
        </div>
      </div>

      <Group title={t("name")} note={admin ? undefined : t("nameAdminsOnly")}>
        <div className="flex gap-2 px-4 py-3.5">
          <input
            value={name}
            maxLength={64}
            disabled={!admin || busy}
            aria-label={t("name")}
            onChange={(event) => setName(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3.5 text-[16px] text-foreground outline-none transition-colors focus:border-foreground/35 disabled:opacity-60 sm:text-[14px]"
          />
          {admin && name.trim() && name.trim() !== office.name && (
            <Button
              size="md"
              className="h-10 px-4 text-[13px]"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.renameOffice(office.id, name.trim());
                  await refresh();
                })
              }
            >
              {tc("save")}
            </Button>
          )}
        </div>
      </Group>

      {error && <p className="-mt-4 mb-6 text-[12.5px] text-destructive">{error}</p>}

      {admin && (
        <InvitePolicyRow
          officeId={office.id}
          policy={office.invitePolicy ?? "everyone"}
          domain={office.joinDomain ?? null}
          domainJoin={office.domainJoin ?? "ask"}
        />
      )}

      {owner && others.length > 0 && <HandOver officeId={office.id} officeName={office.name} paid={office.plan !== "free"} members={others} />}

      <LeaveOrClose officeId={office.id} officeName={office.name} owner={owner} userId={user.id} />
    </>
  );
}

/**
 * The owner giving the office to someone in it: they become its owner (and an
 * admin), and you stay on as an admin. Without this, closing was the only way
 * for an owner to step back.
 */
function HandOver({
  officeId,
  officeName,
  paid,
  members,
}: {
  officeId: string;
  officeName: string;
  paid: boolean;
  members: Array<{ id: string; displayName: string }>;
}) {
  const t = useTranslations("office.settings");
  const tc = useTranslations("common");
  const { refresh } = useOfficeMaybe()!;
  const [to, setTo] = useState<string>("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = members.find((member) => member.id === to);

  const handOver = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await api.handOver(officeId, picked.id);
      await refresh();
      setAsking(false);
      setTo("");
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title={t("handOver")} note={paid ? `${t("handOverNote")} ${t("handOverBilling")}` : t("handOverNote")}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3.5">
        <div className="min-w-0 flex-1 basis-48">
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="h-10 bg-card text-[13px]" aria-label={t("handOverPick")}>
              <SelectValue placeholder={t("handOverPick")} />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" size="md" className="h-10 px-4 text-[13px]" disabled={!picked} onClick={() => setAsking(true)}>
          {t("handOverButton")}
        </Button>
      </div>
      {picked && (
        <Dialog
          open={asking}
          onClose={() => setAsking(false)}
          title={t("handOverTitle", { office: officeName, name: picked.displayName })}
          description={t("handOverSure", { name: picked.displayName })}
          closeLabel={tc("close")}
          footer={
            <>
              <Button variant="ghost" size="sm" className="h-10 px-4" onClick={() => setAsking(false)}>
                {tc("cancel")}
              </Button>
              <Button size="sm" className="h-10 px-5" disabled={busy} onClick={handOver}>
                {t("handOverIt")}
              </Button>
            </>
          }
        >
          {error && <p className="text-[12.5px] text-destructive">{error}</p>}
        </Dialog>
      )}
    </Group>
  );
}

/**
 * The way out, kept to one quiet line at the foot of the page: leaving for a
 * member, closing for the owner (who has to hand it over to leave). Either
 * asks first. Staying is the button; going is the plain words beside it, and
 * closing for everyone also wants the office's name typed out.
 */
function LeaveOrClose({ officeId, officeName, owner, userId }: { officeId: string; officeName: string; owner: boolean; userId: string }) {
  const t = useTranslations("office.settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const named = typed.trim().toLowerCase() === officeName.trim().toLowerCase();

  const close = () => {
    setAsking(false);
    setTyped("");
    setError(null);
  };

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      if (owner) await api.closeOffice(officeId);
      else await api.removeMember(officeId, userId);
      router.replace("/");
    } catch (problem) {
      // A paid plan is cancelled first, on purpose, from the plan section (docs/pricing.md).
      if (problem instanceof ApiError && problem.code === "cancel_plan_first") setError(t("cancelPlanFirst"));
      else setError(problem instanceof ApiError ? problem.message : t("wrong"));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mt-12 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="cursor-pointer text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
        >
          {owner ? t("close") : t("leave")}
        </button>
      </div>
      <Dialog
        open={asking}
        onClose={close}
        title={owner ? t("closeTitle", { office: officeName }) : t("leaveTitle", { office: officeName })}
        description={owner ? t("closeSure") : t("leaveSure")}
        closeLabel={tc("close")}
        footer={
          <>
            <button
              type="button"
              disabled={busy || (owner && !named)}
              onClick={go}
              className="me-auto inline-flex h-10 cursor-pointer items-center rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              {owner ? t("closeIt") : t("leaveIt")}
            </button>
            <Button size="sm" className="h-10 px-5" onClick={close}>
              {owner ? t("keepOffice") : t("stay")}
            </Button>
          </>
        }
      >
        {(owner || error) && (
          <>
            {owner && (
              <label className="block">
                <span className="text-[12.5px] text-muted-foreground">{t("closeType", { name: officeName })}</span>
                <input
                  value={typed}
                  autoComplete="off"
                  onChange={(event) => setTyped(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-card px-3.5 text-[16px] text-foreground outline-none transition-colors focus:border-foreground/35 sm:text-[14px]"
                />
              </label>
            )}
            {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
          </>
        )}
      </Dialog>
    </>
  );
}

/**
 * Who can share the office's invite link: everyone (the default, since a team
 * grows by its members bringing each other) or only admins, for an office that
 * wants to decide who comes in.
 */
function InvitePolicyRow({
  officeId,
  policy,
  domain,
  domainJoin,
}: {
  officeId: string;
  policy: InvitePolicy;
  /** The owner's company domain, when there is one to open the office to. */
  domain: string | null;
  domainJoin: DomainAccess;
}) {
  const t = useTranslations("office.settings");
  const { refresh } = useOfficeMaybe()!;
  const [value, setValue] = useState<InvitePolicy>(policy);
  const [access, setAccess] = useState<DomainAccess>(domainJoin);
  const [error, setError] = useState<string | null>(null);

  // Colleagues at the owner's company, finding the office by their email: they ask unless an admin decides otherwise.
  const changeAccess = async (next: DomainAccess) => {
    const before = access;
    setAccess(next);
    setError(null);
    try {
      await api.updateOffice(officeId, { domainJoin: next });
      await refresh();
    } catch (problem) {
      setAccess(before);
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    }
  };

  const change = async (next: InvitePolicy) => {
    const before = value;
    setValue(next);
    setError(null);
    try {
      await api.updateOffice(officeId, { invitePolicy: next });
      await refresh();
    } catch (problem) {
      setValue(before);
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    }
  };

  return (
    <Group title={t("inviting")}>
      <Row
        title={t("whoInvites")}
        description={value === "admins" ? t("whoInvitesAdmins") : t("whoInvitesEveryone")}
        control={
          <div className="w-44">
            <Select value={value} onValueChange={(next) => void change(next as InvitePolicy)}>
              <SelectTrigger className="h-9 bg-card text-[13px]" aria-label={t("whoInvites")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">{t("inviteEveryone")}</SelectItem>
                <SelectItem value="admins">{t("inviteAdmins")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
      {domain && (
        <Row
          title={t("domainJoin", { domain })}
          description={access === "open" ? t("domainOpenNote", { domain }) : access === "ask" ? t("domainAskNote") : t("domainOffNote")}
          control={
            <div className="w-44">
              <Select value={access} onValueChange={(next) => void changeAccess(next as DomainAccess)}>
                <SelectTrigger className="h-9 bg-card text-[13px]" aria-label={t("domainJoin", { domain })}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ask">{t("domainAsk")}</SelectItem>
                  <SelectItem value="open">{t("domainOpen")}</SelectItem>
                  <SelectItem value="off">{t("domainOff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}
      {error && <p className="px-4 pb-3 text-[12.5px] text-destructive">{error}</p>}
    </Group>
  );
}
