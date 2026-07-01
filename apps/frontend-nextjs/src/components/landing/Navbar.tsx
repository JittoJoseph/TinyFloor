import React from "react";
import Link from "next/link";

export const Navbar: React.FC = () => {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-10 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <span className="font-body font-bold text-xl tracking-tight text-[var(--color-braun-text)]">
            SpatialMeet
          </span>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center bg-[rgba(0,0,0,0.03)] rounded-full p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.02)]">
            <a
              href="#features"
              className="px-5 py-1.5 rounded-full text-[13px] font-medium text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300"
            >
              Specs
            </a>
            <a
              href="#how-it-works"
              className="px-5 py-1.5 rounded-full text-[13px] font-medium text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300"
            >
              Manual
            </a>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center justify-center transition-all duration-300 px-4 py-1.5 rounded-full text-[13px] font-medium text-[var(--color-braun-text)] bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] md:px-6 md:py-2 md:bg-[var(--color-braun-text)] md:text-[var(--color-braun-bg)] md:border-transparent md:shadow-md md:hover:shadow-lg"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
};
