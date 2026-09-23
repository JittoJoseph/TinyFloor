import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/** The line under a way in: continuing means agreeing to the Terms and the Privacy Policy. */
export function Agree({ className }: { className?: string }) {
  const t = useTranslations("legal");
  const linkClass = "underline underline-offset-2 hover:text-foreground";
  return (
    <p className={cn("text-center text-[12px] leading-relaxed text-muted-foreground", className)}>
      {t.rich("agree", {
        terms: (chunks) => (
          <Link href="/terms" className={linkClass}>
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy" className={linkClass}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
