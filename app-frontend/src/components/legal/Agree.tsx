import { useTranslations } from "next-intl";
import { useSitePage } from "@/lib/links";
import { cn } from "@/lib/utils";

/** The line under a way in: continuing means agreeing to the Terms and the Privacy Policy. */
export function Agree({ className }: { className?: string }) {
  const t = useTranslations("legal");
  const linkClass = "underline underline-offset-2 hover:text-foreground";
  const termsHref = useSitePage("/terms");
  const privacyHref = useSitePage("/privacy");
  return (
    <p className={cn("text-center text-[12px] leading-relaxed text-muted-foreground", className)}>
      {t.rich("agree", {
        terms: (chunks) => (
          <a href={termsHref} className={linkClass}>
            {chunks}
          </a>
        ),
        privacy: (chunks) => (
          <a href={privacyHref} className={linkClass}>
            {chunks}
          </a>
        ),
      })}
    </p>
  );
}
