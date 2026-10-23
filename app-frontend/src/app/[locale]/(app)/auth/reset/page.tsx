"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordScreen } from "@/components/auth/ResetPasswordScreen";

function ResetPageContent() {
  return <ResetPasswordScreen token={useSearchParams().get("token")} />;
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetPageContent />
    </Suspense>
  );
}
