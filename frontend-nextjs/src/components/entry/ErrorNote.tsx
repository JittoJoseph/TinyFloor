"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

/** A short, calm way to say something went wrong at the door. */
export const ErrorNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 font-body text-[13px] text-red-700">
    <AlertCircle className="w-4 h-4 shrink-0" />
    {children}
  </p>
);
