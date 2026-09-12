"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Search, Users } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const TABS = [
  { id: "rooms", href: "/rooms" },
  { id: "people", href: "/people" },
] as const;

/**
 * Top of the rooms and people directories: navigation, title, the rooms/people
 * tabs, a live count and the search field. Owns the sign-in modal.
 */
export function DirectoryHeader({
  active,
  subtitle,
  ctaLabel,
  count,
  query,
  onQueryChange,
  searchPlaceholder,
  onSearch,
}: {
  active: (typeof TABS)[number]["id"];
  subtitle: string;
  ctaLabel: string;
  count: string;
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  /** Submit handler; when set, Enter and a search button trigger it. */
  onSearch?: () => void;
}) {
  const t = useTranslations("directory");
  const tc = useTranslations("common");
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 md:gap-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="cursor-pointer flex items-center justify-center h-10 px-4 sm:px-5 bg-white border border-[rgba(0,0,0,0.06)] rounded-full text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] shadow-sm hover:shadow-md transition-all gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 opacity-70 rtl:rotate-180" />
            <span className="hidden sm:inline">{tc("back")}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSwitcher side="bottom" align="end" compact />
            <UserMenu onLoginClick={() => setShowAuthModal(true)} />
            <Link
              href="/create-room"
              className="cursor-pointer flex items-center justify-center gap-2 h-10 px-5 sm:px-6 bg-[var(--color-braun-orange)] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#3d3d3d] transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ctaLabel}</span>
            </Link>
          </div>
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
            {t.rich(`${active}Title`, {
              em: (chunks) => <span className="font-medium">{chunks}</span>,
            })}
          </h1>
          <p className="text-[var(--color-braun-text)] opacity-50 text-sm md:text-base">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex w-full md:inline-flex md:w-auto items-center bg-[#e0e0da] p-1.5 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`cursor-pointer flex-1 text-center py-2.5 md:px-10 rounded-full text-sm font-medium text-[var(--color-braun-text)] transition-all ${
                  tab.id === active
                    ? "bg-white shadow-sm"
                    : "opacity-50 hover:opacity-100"
                }`}
              >
                {tc(tab.id)}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-braun-text)] opacity-40 uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" />
            <span>{count}</span>
          </div>
        </div>

        <div className="w-full md:w-72 relative">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-30" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => onSearch && e.key === "Enter" && onSearch()}
            placeholder={searchPlaceholder}
            className="w-full ps-10 pe-10 h-10 md:h-11 bg-white border border-[rgba(0,0,0,0.08)] shadow-sm rounded-full text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-all placeholder:text-[var(--color-braun-text)] placeholder:opacity-30"
          />
          {onSearch && (
            <button
              onClick={onSearch}
              aria-label={t("search")}
              className="cursor-pointer absolute end-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.08)] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-60" />
            </button>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
