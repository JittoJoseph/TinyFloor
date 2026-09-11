"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { AuthForm, type AuthMode } from "./AuthForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  showCloseButton?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
  showCloseButton = true,
}) => {
  const tc = useTranslations("common");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[2rem] shadow-xl max-w-md w-full p-8 md:p-10 animate-in fade-in zoom-in duration-200">
        {showCloseButton && (
          <button
            onClick={onClose}
            aria-label={tc("close")}
            className="cursor-pointer absolute top-5 end-5 p-2 bg-[rgba(0,0,0,0.02)] hover:bg-[rgba(0,0,0,0.06)] rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
          </button>
        )}

        <AuthForm initialMode={initialMode} onSuccess={onClose} />
      </div>
    </div>
  );
};
