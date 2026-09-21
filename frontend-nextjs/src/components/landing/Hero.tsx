import React from "react";
import { Link } from "@/lib/i18n/navigation";
import { SITE_URL } from "@/lib/site";

/** The browser window the hero scenes sit in, with the public room in its address bar. */
export const BrowserWindow: React.FC<{
  caption?: string;
  children: React.ReactNode;
}> = ({ caption, children }) => (
  <figure className="m-0 w-full">
    <div className="w-[calc(100%+2rem)] -mx-4 md:w-full md:mx-auto relative z-10 group px-2 md:px-0">
      <div className="bg-white rounded-[1rem] md:rounded-[1.5rem] p-2 md:p-3 shadow-2xl border border-[rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between gap-2 md:gap-4 px-2 py-1 mb-1">
          <div
            aria-hidden="true"
            className="flex gap-1.5 shrink-0 w-[50px] md:w-[70px]"
          >
            <div className="w-3 h-3 rounded-full bg-[#ed6a5e] border border-[rgba(0,0,0,0.1)]"></div>
            <div className="w-3 h-3 rounded-full bg-[#f4bf4f] border border-[rgba(0,0,0,0.1)]"></div>
            <div className="w-3 h-3 rounded-full bg-[#61c554] border border-[rgba(0,0,0,0.1)]"></div>
          </div>

          <Link
            href="/lobby"
            dir="ltr"
            className="cursor-pointer flex-1 h-5 md:h-6 rounded md:rounded-md bg-[#f0f0eb] transition-colors border border-[rgba(0,0,0,0.06)] flex items-center justify-center px-4 overflow-hidden max-w-xl"
          >
            <span className="font-body text-[11px] md:text-xs font-medium text-[var(--color-braun-text)] opacity-50 tracking-wide truncate">
              {SITE_URL.replace("https://", "")}/lobby
            </span>
          </Link>

          <div className="w-[50px] md:w-[70px] shrink-0"></div>
        </div>

        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-lg md:rounded-xl overflow-hidden bg-[var(--color-braun-bg)] border border-[rgba(0,0,0,0.08)]">
          <div className="absolute inset-0 pointer-events-auto">{children}</div>
        </div>
      </div>
    </div>
    {caption && <figcaption className="sr-only">{caption}</figcaption>}
  </figure>
);
