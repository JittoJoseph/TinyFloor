"use client";

import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[var(--color-braun-bg)] border-t border-[rgba(0,0,0,0.1)] py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="flex flex-col gap-3">
          <div className="font-body font-bold text-2xl tracking-tight text-[var(--color-braun-text)] flex items-center gap-2">
            SpatialMeet
          </div>
          <div className="font-body text-xs text-[var(--color-braun-text)] opacity-40">
            © {new Date().getFullYear()} Jitto Joseph. All rights reserved.
          </div>
        </div>

        <div className="flex flex-wrap gap-8 items-center mt-6 md:mt-0">
          <Link
            href="https://github.com/JittoJoseph"
            target="_blank"
            className="font-body text-sm font-medium text-[var(--color-braun-text)] opacity-70 hover:opacity-100 hover:text-[var(--color-braun-orange)] transition-all"
          >
            GitHub
          </Link>
          <Link
            href="https://www.linkedin.com/in/jittojoseph17/"
            target="_blank"
            className="font-body text-sm font-medium text-[var(--color-braun-text)] opacity-70 hover:opacity-100 hover:text-[var(--color-braun-orange)] transition-all"
          >
            LinkedIn
          </Link>
          <Link
            href="https://www.jittojoseph.xyz"
            target="_blank"
            className="font-body text-sm font-medium text-[var(--color-braun-text)] opacity-70 hover:opacity-100 hover:text-[var(--color-braun-orange)] transition-all"
          >
            Portfolio
          </Link>
        </div>
      </div>
    </footer>
  );
};
