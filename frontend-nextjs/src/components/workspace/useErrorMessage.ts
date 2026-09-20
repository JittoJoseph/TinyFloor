"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";

/** Turns an API error into a sentence for the person, in their language. */
export function useErrorMessage() {
  const t = useTranslations("workspace.errors");

  return useCallback(
    (error: unknown) => {
      const code = error instanceof ApiError ? error.code : "";
      const messages: Record<string, string> = {
        member_limit: t("member_limit"),
        not_allowed: t("not_allowed"),
        owner_cannot_leave: t("owner_cannot_leave"),
        owner_role: t("owner_role"),
        bad_capacity: t("bad_capacity"),
        name_required: t("name_required"),
        bad_email: t("bad_email"),
        invite_used: t("invite_used"),
        invite_invalid: t("invite_invalid"),
        wrong_account: t("wrong_account"),
        wrong_password: t("wrong_password"),
        password_too_short: t("password_too_short"),
        password_too_long: t("password_too_long"),
        too_many_attempts: t("too_many_attempts"),
        slow_down: t("too_many_attempts"),
        not_found: t("not_found"),
        network: t("network"),
      };
      return messages[code] ?? t("generic");
    },
    [t],
  );
}
