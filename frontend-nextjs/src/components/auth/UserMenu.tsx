"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { User, LogOut, LayoutDashboard, ChevronDown, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";

/** Sign in, or who is signed in with a way to the dashboard and out. */
export const UserMenu: React.FC = () => {
  const t = useTranslations("userMenu");
  const tc = useTranslations("common");
  const tAuth = useTranslations("auth");
  const { user, isAuthenticated, isGuest, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  // Back to this page once signed in.
  const authHref = (mode?: "signup") =>
    `/auth?${new URLSearchParams({ redirect: pathname, ...(mode ? { mode } : {}) })}`;

  if (!isAuthenticated) {
    return (
      <Link
        href={authHref()}
        className="cursor-pointer h-10 px-5 flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.06)] rounded-full text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] shadow-sm hover:shadow-md transition-all"
      >
        <User className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{tAuth("signIn")}</span>
      </Link>
    );
  }

  const itemClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(0,0,0,0.02)] transition-colors group w-full";
  const iconWrapClass =
    "w-8 h-8 bg-white border border-[rgba(0,0,0,0.05)] rounded-full flex items-center justify-center shadow-sm";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="cursor-pointer h-10 px-4 flex items-center gap-2.5 bg-white border border-[rgba(0,0,0,0.06)] rounded-full shadow-sm hover:shadow-md transition-all"
      >
        <div className="w-6 h-6 bg-[rgba(0,0,0,0.04)] rounded-full border border-[rgba(0,0,0,0.05)] flex items-center justify-center">
          <span className="text-[10px] text-[var(--color-braun-text)] font-bold uppercase">
            {user?.displayName?.charAt(0) || "G"}
          </span>
        </div>
        <span className="hidden sm:inline max-w-24 truncate text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)]">
          {user?.displayName || tc("guest")}
        </span>
        {isGuest && (
          <span className="text-[9px] font-bold uppercase tracking-widest bg-[rgba(0,0,0,0.04)] text-[var(--color-braun-text)] opacity-70 px-2 py-0.5 rounded-full">
            {tc("guest")}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-50 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute end-0 top-full mt-2 w-64 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-lg z-50 overflow-hidden font-body">
            <div className="p-5 border-b border-[rgba(0,0,0,0.04)]">
              <p className="text-base font-medium text-[var(--color-braun-text)] tracking-tight truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-[var(--color-braun-text)] opacity-50 truncate">
                {isGuest ? t("visitingAsGuest") : user?.email}
              </p>
            </div>

            <div className="p-2">
              {isGuest ? (
                <Link href={authHref("signup")} onClick={() => setIsOpen(false)} className={itemClass}>
                  <div className={iconWrapClass}>
                    <UserPlus className="w-3.5 h-3.5 text-[var(--color-braun-orange)]" />
                  </div>
                  <div className="text-start">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)]">
                      {tAuth("createAccount")}
                    </span>
                    <span className="text-[10px] text-[var(--color-braun-text)] opacity-50">{t("keepYourName")}</span>
                  </div>
                </Link>
              ) : (
                <>
                  <Link href="/dashboard" onClick={() => setIsOpen(false)} className={itemClass}>
                    <div className={iconWrapClass}>
                      <LayoutDashboard className="w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-70 group-hover:opacity-100" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)]">
                      {tc("offices")}
                    </span>
                  </Link>
                  <Link href="/account" onClick={() => setIsOpen(false)} className={itemClass}>
                    <div className={iconWrapClass}>
                      <UserRound className="w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-70 group-hover:opacity-100" />
                    </div>
                    <div className="text-start">
                      <span className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)]">
                        {tc("account")}
                      </span>
                      <span className="text-[10px] text-[var(--color-braun-text)] opacity-50">{t("manageProfile")}</span>
                    </div>
                  </Link>
                </>
              )}

              <button
                onClick={async () => {
                  setIsOpen(false);
                  await signOut();
                  router.push("/");
                }}
                className={`${itemClass} cursor-pointer hover:bg-[rgba(255,78,0,0.04)]`}
              >
                <div className={`${iconWrapClass} group-hover:border-[rgba(255,78,0,0.2)]`}>
                  <LogOut className="w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-70 group-hover:text-[var(--color-braun-orange)] group-hover:opacity-100" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] group-hover:text-[var(--color-braun-orange)]">
                  {tc("signOut")}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
