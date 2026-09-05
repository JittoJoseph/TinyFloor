import React from "react";
import Link from "next/link";

const product = [
  { label: "Rooms", href: "/rooms" },
  { label: "People", href: "/people" },
  { label: "Create a room", href: "/create-room" },
  { label: "Dashboard", href: "/dashboard" },
];

const learn = [
  { label: "Tour the room", href: "/#how-it-works" },
  { label: "Two ways in", href: "/#start" },
  { label: "Questions", href: "/#faq" },
];

const elsewhere = [
  { label: "GitHub", href: "https://github.com/JittoJoseph" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jittojoseph17/" },
  { label: "Portfolio", href: "https://www.jittojoseph.xyz" },
];

const columns = [
  { title: "Product", links: product, external: false },
  { title: "Learn", links: learn, external: false },
  { title: "Elsewhere", links: elsewhere, external: true },
];

const linkClass =
  "cursor-pointer font-body text-sm text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:text-[var(--color-braun-orange)] transition-all";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[var(--color-braun-bg)] border-t border-black/10 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="font-body font-bold text-xl tracking-tight text-[var(--color-braun-text)]">
              SpatialMeet
            </div>
            <p className="font-body text-sm text-[var(--color-braun-text)] opacity-50 mt-3 max-w-xs leading-relaxed">
              A virtual office you walk around in. Free, in the browser.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-braun-text)] opacity-35 mb-4">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={linkClass}
                      {...(column.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="font-body text-xs text-[var(--color-braun-text)] opacity-40 mt-12 pt-6 border-t border-black/10">
          © {new Date().getFullYear()} Jitto Joseph. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
