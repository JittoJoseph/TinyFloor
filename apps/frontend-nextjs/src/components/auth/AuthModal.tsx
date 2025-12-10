"use client";

import React, { useState } from "react";
import { X, User, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
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
          displayName || undefined
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-ui-white rounded-3xl border-2 border-ui-border shadow-retro-lg max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl border-2 border-brand-primary/20 flex items-center justify-center mx-auto mb-4 rotate-3">
            <Sparkles className="w-8 h-8 text-brand-primary" />
          </div>
          <h2 className="text-3xl font-pixel text-gray-900 mb-2">
            {mode === "login" ? "Welcome Back!" : "Join Us!"}
          </h2>
          <p className="text-gray-500">
            {mode === "login"
              ? "Sign in to your account"
              : "Create your cozy account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none transition-colors font-medium"
              required
            />
          </div>

          {/* Email (register only) */}
          {mode === "register" && (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none transition-colors font-medium"
              />
            </div>
          )}

          {/* Display Name (register only) */}
          {mode === "register" && (
            <div className="relative">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name (optional)"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none transition-colors font-medium"
              />
            </div>
          )}

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none transition-colors font-medium"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading
              ? "Loading..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center mt-6">
          <p className="text-gray-500">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              onClick={switchMode}
              className="ml-2 text-brand-primary hover:underline font-bold"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>

        {/* Speech bubble tail decoration */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-ui-white border-r-2 border-b-2 border-ui-border rotate-45" />
      </div>
    </div>
  );
};
