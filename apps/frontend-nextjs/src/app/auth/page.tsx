"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Gamepad2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get initial tab from URL
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup" || urlMode === "register") {
      setMode("register");
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const response = await login(username, password);
        if (response.message) {
          setError(response.message);
        } else {
          const redirect = searchParams.get("redirect") || "/dashboard";
          router.push(redirect);
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
          const redirect = searchParams.get("redirect") || "/dashboard";
          router.push(redirect);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-braun-bg)]">
        <div className="text-center flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-[var(--color-braun-text)] opacity-50 uppercase tracking-widest font-bold">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[var(--color-braun-bg)]">
      {/* Header */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="cursor-pointer inline-flex items-center gap-2 text-[var(--color-braun-text)] opacity-50 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-bold text-xs uppercase tracking-widest">
            Back
          </span>
        </Link>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-white rounded-xl border border-[rgba(0,0,0,0.06)] shadow-sm flex items-center justify-center">
          <Gamepad2
            className="text-[var(--color-braun-text)] w-5 h-5"
            strokeWidth={1.5}
          />
        </div>
        <span className="text-xl font-medium tracking-tight text-[var(--color-braun-text)]">
          SpatialMeet
        </span>
      </div>

      {/* Auth Card */}
      <div className="bg-white rounded-[2rem] shadow-xl max-w-md w-full p-8 md:p-10 border border-[rgba(0,0,0,0.06)]">
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
            disabled={isSubmitting}
            className="w-full h-12 mt-2 bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] font-bold uppercase tracking-widest text-xs rounded-full hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isSubmitting
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
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="ml-2 text-[var(--color-braun-text)] opacity-100 hover:text-[var(--color-braun-orange)] font-bold transition-colors"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center">
        <Link
          href="/rooms"
          className="cursor-pointer inline-block text-[var(--color-braun-text)] opacity-40 hover:opacity-70 text-xs font-bold uppercase tracking-widest transition-opacity"
        >
          Continue as guest →
        </Link>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-braun-bg)]">
          <div className="text-center flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-[var(--color-braun-text)] opacity-50 uppercase tracking-widest font-bold">
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
