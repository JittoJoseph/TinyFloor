/**
 * An office name typed before there is an account to own it. It waits in this
 * browser while someone signs up; /create finishes the job when they are back.
 */
const PENDING_KEY = "tinyfloorPendingSpace";

export function rememberPendingOffice(name: string) {
  try {
    localStorage.setItem(PENDING_KEY, name);
  } catch {}
}

export function pendingOffice(): string {
  try {
    return localStorage.getItem(PENDING_KEY) ?? "";
  } catch {
    return "";
  }
}

export function forgetPendingOffice() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}

/**
 * Where making an office goes: /create, its door (signing up first when
 * there's no account yet to own it). A name already typed waits for it
 * there; one from the demo office says so, so the door's Back returns to the
 * demo rather than out to the site.
 */
export function makeOfficeHref({ account, name, fromDemo = false }: { account: boolean; name?: string; fromDemo?: boolean }): string {
  // Started afresh, a name left from an earlier try that never finished doesn't come back to fill the door.
  if (name) rememberPendingOffice(name);
  else forgetPendingOffice();
  const create = fromDemo ? `/create?${new URLSearchParams({ from: "demo" })}` : "/create";
  return account ? create : `/auth?${new URLSearchParams({ redirect: create, mode: "signup" })}`;
}
