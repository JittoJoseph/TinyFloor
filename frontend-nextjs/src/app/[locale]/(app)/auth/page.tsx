"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthScreen, safeRedirect } from "@/components/auth/AuthScreen";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  return (
    <AuthScreen
      initialMode={mode === "signup" || mode === "register" ? "signup" : "signin"}
      redirect={safeRedirect(searchParams.get("redirect"))}
    />
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  );
}
