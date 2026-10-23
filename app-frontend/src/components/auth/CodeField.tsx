"use client";

import { forwardRef } from "react";
import { inputClass } from "@/components/entry/EntryShell";

export const CODE_LENGTH = 6;

/**
 * The six digits from the email, in one field: typed, pasted ("123 456" too)
 * or filled in by the phone from the message. A whole code is handed on at
 * once, so nobody has to press anything after it.
 */
export const CodeField = forwardRef<
  HTMLInputElement,
  {
    id?: string;
    value: string;
    onChange: (code: string) => void;
    onComplete?: (code: string) => void;
    invalid?: boolean;
    disabled?: boolean;
    describedBy?: string;
    className?: string;
  }
>(function CodeField({ id, value, onChange, onComplete, invalid, disabled, describedBy, className }, ref) {
  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={CODE_LENGTH + 4}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const code = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
        onChange(code);
        if (code.length === CODE_LENGTH && code !== value) onComplete?.(code);
      }}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={`${inputClass} text-center font-mono !text-[22px] tracking-[0.5em] indent-[0.5em] ${
        invalid ? "!border-destructive/50 focus:!ring-destructive/15" : ""
      } ${className ?? ""}`}
    />
  );
});
