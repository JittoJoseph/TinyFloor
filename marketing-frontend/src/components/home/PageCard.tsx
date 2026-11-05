import { ArrowRight } from "web-shared/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { cn } from "web-shared/lib/utils";

/**
 * A page on an index: with its illustration (lib/illustrations), the picture
 * over its name and what it's for, as the guides' and the blog's cards are;
 * without one, the name and line in a quiet card.
 */
export function PageCard({ href, title, description, image }: { href: string; title: string; description: string; image?: string | null }) {
  if (!image)
    return (
      <Link href={href} className="group flex h-full flex-col rounded-[24px] bg-muted/80 p-6 transition-colors hover:bg-muted sm:p-7">
        <span className="flex items-center justify-between gap-3 text-[17px] font-semibold tracking-[-0.01em]">
          {title}
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </span>
        <span className="mt-2 text-[14.5px] leading-[1.55] text-muted-foreground">{description}</span>
      </Link>
    );
  return (
    <Link href={href} className="group flex h-full flex-col">
      <span className="block overflow-hidden rounded-[22px] bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className={cn("aspect-video h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]")}
        />
      </span>
      <span className="mt-5 text-[18px] font-semibold leading-[1.3] tracking-[-0.015em] transition-colors group-hover:text-foreground/80">{title}</span>
      <span className="mt-2 text-[14.5px] leading-[1.55] text-muted-foreground">{description}</span>
    </Link>
  );
}
