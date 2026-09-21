"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * Three things at the top: what TinyFloor is, the way back to your offices (or
 * in, if you have none), and the language. Everything else is in the page.
 */
export const Navbar: React.FC = () => {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const { user, isLoading } = useAuth();
  const hasAccount = !isLoading && !!user && !user.guest;

  return (
    <nav aria-label={t("main")} className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-10 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
          {/* The mark, as the favicon and the app's rail draw it (scripts/make-icons.py). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={30} height={30} className="size-[30px]" />
          <span className="font-body font-bold text-xl tracking-tight text-[var(--color-braun-text)]">TinyFloor</span>
        </Link>

        <div className="flex items-center gap-3 md:gap-5">
          <a
            href="#how-it-works"
            className="hidden md:block px-3 py-1.5 text-[13px] font-medium text-[var(--color-braun-text)] opacity-60 hover:opacity-100 transition-opacity duration-200"
          >
            {t("tour")}
          </a>
          <a
            href="#faq"
            className="hidden md:block px-3 py-1.5 text-[13px] font-medium text-[var(--color-braun-text)] opacity-60 hover:opacity-100 transition-opacity duration-200"
          >
            {tc("questions")}
          </a>

          <LanguageSwitcher side="bottom" align="end" compact />

          {hasAccount ? (
            <Link
              href="/dashboard"
              className="cursor-pointer flex items-center justify-center px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[13px] font-medium bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              {tc("offices")}
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="cursor-pointer hidden sm:block px-3 py-1.5 text-[13px] font-medium text-[var(--color-braun-text)] opacity-60 hover:opacity-100 transition-opacity duration-200"
              >
                {tc("signIn")}
              </Link>
              <Link
                href="/create"
                className="cursor-pointer flex items-center justify-center px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[13px] font-medium bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                {tc("createOffice")}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
