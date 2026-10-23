"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VerifyEmailScreen } from "@/components/auth/VerifyEmailScreen";

function VerifyPageContent() {
  return <VerifyEmailScreen token={useSearchParams().get("token")} />;
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageContent />
    </Suspense>
  );
}
