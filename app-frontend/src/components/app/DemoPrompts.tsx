"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { saveIdentity } from "@/lib/identity";
import { lobbyPath, officePath } from "@/lib/links";
import { openOfficeAhead } from "@/lib/officeAhead";
import { renameOnFloor } from "@/lib/floor";
import { rememberPendingOffice } from "@/lib/pendingOffice";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { CLIENT_ID, GoogleButton, googleAvailable, loadGoogle } from "@/components/auth/GoogleButton";
import { Modal } from "@/components/ui/Modal";
import { Face } from "@/components/ui/Face";
import { ActionButton } from "@/components/ui/Action";
import { bezel, bezelPanel, onBezel } from "@/components/ui/bezel";
import { QuietChoice, StepError, StepTitle } from "@/components/entry/DoorSteps";
import { cn } from "@/lib/utils";

/** How long someone has looked around the demo office before Google offers to make them an account. */
const ONE_TAP_AFTER_MS = 45_000;
/** And before they're asked to make an office of their own. */
const OFFICE_AFTER_MS = 150_000;
/** Once asked, not again from this browser for a week. */
const OFFICE_KEY = "tinyfloorOfficePrompt";
const OFFICE_QUIET_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Time spent on the demo office's floor, counted only while the page is in
 * view: `due` is called once, when `ms` of it has passed. One timer a second,
 * nothing else.
 */
function useFloorTime(active: boolean, ms: number, due: () => void) {
  const fire = useEffectEvent(due);
  useEffect(() => {
    if (!active) return;
    let spent = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      spent += 1000;
      if (spent < ms) return;
      window.clearInterval(timer);
      fire();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, ms]);
}

/**
 * What the demo office asks of someone who has looked around (docs/analytics.md):
 * after a while, Google's One Tap offers a guest an account, one tap and
 * they're a member where they stand, the same character, their Google name on
 * their tag, no reload; and a while later, a door of its own asks them to name
 * their team's office.
 */
export function DemoPrompts() {
  const { user, signInWithGoogle } = useAuth();
  const pathname = usePathname();
  const guest = !!user?.guest;

  // One Tap, for a guest: Google decides whether to show it, and stays quiet once it's closed.
  const cancel = useRef<(() => void) | null>(null);
  useFloorTime(guest && googleAvailable, ONE_TAP_AFTER_MS, () => {
    const clientId = CLIENT_ID;
    if (!clientId || document.querySelector("[aria-modal=true]")) return;
    loadGoogle().then(
      (google) => {
        google.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (!credential || !user) return;
            const before = user.id;
            signInWithGoogle({ credential }, "google_one_tap").then(
              ({ user: next, created }) => {
                saveIdentity({ name: next.displayName, character: next.character });
                // The guest became the account, the same person on the floor: only the name on their tag changes.
                // Signing in to another account instead walks the floor in again as that one (LobbyShell).
                if (created && next.id === before) renameOnFloor(next.displayName);
              },
              () => {},
            );
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signup",
          itp_support: true,
          use_fedcm_for_prompt: true,
        });
        google.id.prompt();
        cancel.current = () => google.id.cancel();
      },
      () => {},
    );
  });
  useEffect(() => () => cancel.current?.(), []);

  // The office prompt, for a guest, or someone who became an account here: the
  // same id, so the time they've spent looking around keeps counting.
  const [guestId, setGuestId] = useState<string | null>(null);
  if (user?.guest && guestId !== user.id) setGuestId(user.id);
  const [asking, setAsking] = useState(false);
  const eligible = !!user && user.id === guestId;
  useFloorTime(eligible, OFFICE_AFTER_MS, () => {
    try {
      const last = Number(localStorage.getItem(OFFICE_KEY) ?? 0);
      if (Date.now() - last < OFFICE_QUIET_MS) return;
      localStorage.setItem(OFFICE_KEY, String(Date.now()));
    } catch {}
    // Not over something else they're doing: another view, or a dialog.
    if (!pathname.endsWith(lobbyPath) || document.querySelector("[aria-modal=true]")) return;
    cancel.current?.();
    track("office_prompt_shown");
    setAsking(true);
  });

  return <OfficePrompt open={asking} onClose={() => setAsking(false)} />;
}

/**
 * A door to the team's own office, over the demo floor: its name first, its
 * mark taking the name's colour as it's typed; then, for a guest, an account
 * to own it (Google keeps them where they are; email goes by the sign-up page
 * and comes back to finish). Made, they walk into it.
 */
function OfficePrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("lobby.yourOffice");
  const tp = useTranslations("lobby.officePrompt");
  const tAuth = useTranslations("auth");
  const tInvite = useTranslations("office.invite");
  const tc = useTranslations("common");
  const router = useRouter();
  const explain = useErrorMessage();
  const { user, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "account">("name");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const typed = name.trim();

  const make = async () => {
    setBusy(true);
    setError("");
    try {
      const { office } = await api.createOffice(typed);
      track("office_created", { office_id: office.id, from: "demo_prompt" });
      openOfficeAhead(office.id);
      router.push(officePath(office.id));
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  const withGoogle = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      const before = user?.id;
      const { user: next, created } = await signInWithGoogle({ code });
      saveIdentity({ name: next.displayName, character: next.character });
      if (created && next.id === before) renameOnFloor(next.displayName);
      await make();
    } catch {
      setError(tAuth("errors.google_failed"));
      setBusy(false);
    }
  };

  const submit = () => {
    if (!typed || busy) return;
    if (user && !user.guest) void make();
    else setStep("account");
  };

  const byEmail = () => {
    // /create makes it as soon as there is an account to own it.
    rememberPendingOffice(typed);
    router.push(`/auth?${new URLSearchParams({ redirect: "/create", mode: "signup" })}`);
  };

  return (
    <Modal open={open} onClose={onClose} label={t("title")} closeLabel={tc("close")} className="border-0 bg-transparent shadow-none">
      <div className={cn(bezel, "rounded-t-[30px] p-1.5 sm:rounded-[30px]")}>
        <div className={cn(onBezel, "px-3.5 pb-4 pt-3.5 sm:px-[18px] sm:pt-[18px]")}>
          <div className="flex items-center gap-3.5">
            <span key={typed.toLowerCase() || "your-office"} className="persona-pop flex shrink-0">
              <Face seed={typed.toLowerCase() || "your-office"} size={48} square />
            </span>
            <div className="min-w-0 flex-1 pe-8">
              <p className="text-[12.5px] font-medium text-muted-foreground">{t("placeholderName")}</p>
              <h2 className="break-words text-[24px] font-bold leading-tight tracking-[-0.03em] text-foreground">{typed || t("title")}</h2>
            </div>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{t("body")}</p>
        </div>
        <div className={cn(bezelPanel, "rounded-[24px] p-5 sm:p-6")}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div key={step} className="entry-step">
              {step === "name" ? (
                <>
                  <label htmlFor="prompt-office-name" className="mb-2 block text-[12.5px] font-medium text-muted-foreground">
                    {t("nameLabel")}
                  </label>
                  <input
                    id="prompt-office-name"
                    value={name}
                    maxLength={64}
                    autoComplete="off"
                    autoFocus
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("namePlaceholder")}
                    className="h-[3.25rem] w-full rounded-full border border-transparent bg-rail px-5 text-[17px] font-medium text-foreground outline-none transition-[border-color] placeholder:font-normal placeholder:text-faint focus:border-foreground/15"
                  />
                  <ActionButton type="submit" disabled={!typed} busy={busy} className="mt-4 h-[3.25rem] text-[15px]" shine>
                    {t("create")}
                  </ActionButton>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <Check className="size-3.5 text-ok" />
                    {t("free")}
                  </p>
                </>
              ) : (
                <>
                  <StepTitle title={tp("accountTitle")} body={tp("accountBody")} />
                  {googleAvailable ? (
                    <GoogleButton label={tAuth("continueWithGoogle")} busy={busy} onCode={withGoogle} onError={() => setError(tAuth("errors.google_failed"))} />
                  ) : (
                    <ActionButton onClick={byEmail}>{tInvite("createAccount")}</ActionButton>
                  )}
                  {googleAvailable && (
                    <div className="mt-2 flex justify-center">
                      <QuietChoice onClick={byEmail}>{tInvite("useEmail")}</QuietChoice>
                    </div>
                  )}
                </>
              )}
              {error && <StepError>{error}</StepError>}
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
