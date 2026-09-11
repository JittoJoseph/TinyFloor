"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { User, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export type AuthMode = "login" | "register";

const inputClass =
  "w-full ps-11 pe-4 h-12 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-colors placeholder:text-[var(--color-braun-text)] placeholder:opacity-40";

const iconClass =
  "absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-40";

/** Sign-in / sign-up card content, shared by the /auth page and the modal. */
export function AuthForm({
  initialMode = "login",
  onSuccess,
}: {
  initialMode?: AuthMode;
  onSuccess: () => void;
}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = isLogin
        ? await login(username, password)
        : await register(
            username,
            password,
            email || undefined,
            displayName || undefined,
          );
      if (response.message) setError(response.message);
      else onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#fbfbf9] rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-center mx-auto mb-5">
          <Sparkles
            className="w-6 h-6 text-[var(--color-braun-orange)]"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="text-2xl font-light tracking-tight text-[var(--color-braun-text)] mb-2">
          {isLogin ? t("welcomeBack") : t("joinUs")}
        </h2>
        <p className="text-[var(--color-braun-text)] opacity-50 text-sm">
          {isLogin ? t("signInSubtitle") : t("registerSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User className={iconClass} />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("username")}
            className={inputClass}
            required
          />
        </div>

        {!isLogin && (
          <>
            <div className="relative">
              <Mail className={iconClass} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailOptional")}
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Sparkles className={iconClass} />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("displayNameOptional")}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div className="relative">
          <Lock className={iconClass} />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password")}
            className={`${inputClass} pe-11`}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-[var(--color-braun-text)] opacity-40 hover:opacity-70 transition-opacity"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {error && (
          <div className="bg-[rgba(255,78,0,0.05)] text-[var(--color-braun-orange)] px-4 py-3 rounded-xl text-xs font-medium border border-[rgba(255,78,0,0.1)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 mt-2 bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] font-bold uppercase tracking-widest text-xs rounded-full hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {isSubmitting
            ? tc("loading")
            : isLogin
              ? t("signIn")
              : t("createAccount")}
        </button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-[var(--color-braun-text)] opacity-60 text-sm">
          {isLogin ? t("noAccount") : t("haveAccount")}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? "register" : "login");
              setError("");
            }}
            className="cursor-pointer ms-2 text-[var(--color-braun-text)] opacity-100 hover:text-[var(--color-braun-orange)] font-bold transition-colors"
          >
            {isLogin ? t("signUp") : t("signIn")}
          </button>
        </p>
      </div>
    </>
  );
}
