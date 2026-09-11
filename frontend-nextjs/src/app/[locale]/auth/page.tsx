"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/auth/AuthForm";

function Loading() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-braun-bg)]">
      <div className="text-center flex flex-col items-center">
        <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-[var(--color-braun-text)] opacity-50 uppercase tracking-widest font-bold">
          {t("loading")}
        </p>
      </div>
    </div>
  );
}

function AuthPageContent() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const urlMode = searchParams.get("mode");

  // Signing in flips `isAuthenticated`, so this also covers a fresh login.
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push(redirect);
  }, [isAuthenticated, isLoading, router, redirect]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[var(--color-braun-bg)]">
      {/* Header */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="cursor-pointer inline-flex items-center gap-2 text-[var(--color-braun-text)] opacity-50 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span className="font-bold text-xs uppercase tracking-widest">
            {tc("back")}
          </span>
        </Link>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-white rounded-xl border border-[rgba(0,0,0,0.06)] shadow-sm flex items-center justify-center">
          <Gamepad2
            className="text-[var(--color-braun-text)] w-5 h-5"
            strokeWidth={1.5}
          />
        </div>
        <span className="text-xl font-medium tracking-tight text-[var(--color-braun-text)]">
          SpatialMeet
        </span>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl max-w-md w-full p-8 md:p-10 border border-[rgba(0,0,0,0.06)]">
        <AuthForm
          initialMode={urlMode === "signup" || urlMode === "register" ? "register" : "login"}
          onSuccess={() => router.push(redirect)}
        />
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center">
        <Link
          href="/rooms"
          className="cursor-pointer inline-block text-[var(--color-braun-text)] opacity-40 hover:opacity-70 text-xs font-bold uppercase tracking-widest transition-opacity"
        >
          {t("continueGuest")}
        </Link>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthPageContent />
    </Suspense>
  );
}
