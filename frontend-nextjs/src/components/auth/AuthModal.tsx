"use client";

import React, { useState } from "react";
import { X, User, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
  showCloseButton?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
  showCloseButton = true,
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        const response = await login(username, password);
        if (response.message) {
          setError(response.message);
        } else {
          onClose();
        }
      } else {
        const response = await register(
          username,
          password,
          email || undefined,
          displayName || undefined,
        );
        if (response.message) {
          setError(response.message);
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

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
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="cursor-pointer absolute top-5 right-5 p-2 bg-[rgba(0,0,0,0.02)] hover:bg-[rgba(0,0,0,0.06)] rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#fbfbf9] rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-center mx-auto mb-5">
            <Sparkles
              className="w-6 h-6 text-[var(--color-braun-orange)]"
              strokeWidth={1.5}
            />
          </div>
          <h2 className="text-2xl font-light tracking-tight text-[var(--color-braun-text)] mb-2">
            {mode === "login" ? "Welcome Back" : "Join Us"}
          </h2>
          <p className="text-[var(--color-braun-text)] opacity-50 text-sm">
            {mode === "login"
              ? "Sign in to your account"
              : "Create your workspace account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-40" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full pl-11 pr-4 h-12 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-colors placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
              required
            />
          </div>

          {/* Email (register only) */}
          {mode === "register" && (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full pl-11 pr-4 h-12 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-colors placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
              />
            </div>
          )}

          {/* Display Name (register only) */}
          {mode === "register" && (
            <div className="relative">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-40" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name (optional)"
                className="w-full pl-11 pr-4 h-12 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-colors placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
              />
            </div>
          )}

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-40" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-11 pr-11 h-12 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-colors placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-braun-text)] opacity-40 hover:opacity-70 transition-opacity"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-[rgba(255,78,0,0.05)] text-[var(--color-braun-orange)] px-4 py-3 rounded-xl text-xs font-medium border border-[rgba(255,78,0,0.1)]">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] font-bold uppercase tracking-widest text-xs rounded-full hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isLoading
              ? "Loading..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center mt-6 pt-6 border-t border-[rgba(0,0,0,0.06)]">
          <p className="text-[var(--color-braun-text)] opacity-60 text-sm">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              onClick={switchMode}
              className="cursor-pointer ml-2 text-[var(--color-braun-text)] opacity-100 hover:text-[var(--color-braun-orange)] font-bold transition-colors"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
