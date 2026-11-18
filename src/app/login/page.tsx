"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name (at least 2 characters)."),
    email: z.string().trim().email("Please enter a valid email address."),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const forgotSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

function LoginFormContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") ? nextParam : "/account";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth_callback_failed"
      ? "Email verification link expired or invalid. Please sign in or request a new link."
      : null
  );
  const [message, setMessage] = useState<string | null>(null);

  function switchMode(next: "signin" | "signup" | "forgot") {
    setMode(next);
    setError(null);
    setMessage(null);
    setNeedsConfirmation(false);
  }

  async function handleResendConfirmation() {
    setError(null);
    setMessage(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not resend confirmation email.");
        return;
      }
      setNeedsConfirmation(false);
      setMessage(
        "Confirmation email resent! Please check your inbox and spam folder."
      );
    } catch {
      setError("Network error while resending confirmation email.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setNeedsConfirmation(false);

    if (mode === "forgot") {
      const parsed = forgotSchema.safeParse({ email });
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "Please enter a valid email."
        );
        return;
      }

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }

      setLoading(true);
      try {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(parsed.data.email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
          });
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setMessage(
          "Password reset link sent! Please check your email inbox (and spam folder)."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not send password reset email."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "signin") {
      const parsed = signInSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "Please check your inputs."
        );
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          needsConfirmation?: boolean;
        };
        if (!res.ok) {
          setError(data.error ?? "Sign in failed.");
          setNeedsConfirmation(Boolean(data.needsConfirmation));
          return;
        }
        window.location.assign(safeNext);
      } catch {
        setError("Network error while signing in. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Create Account
    const parsed = signUpSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          password: parsed.data.password,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        hasSession?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create account.");
        return;
      }

      if (data.hasSession) {
        window.location.assign(safeNext);
        return;
      }

      setMessage(
        "Account created! Please check your email inbox (and spam folder) for a confirmation link."
      );
    } catch {
      setError("Network error while creating account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to FoundDex
        </Link>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" />
              FoundDex Account
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "signin"
                ? "Sign in to FoundDex"
                : mode === "signup"
                  ? "Create an account"
                  : "Reset your password"}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {mode === "signin"
                ? "Sign in to report items, verify ownership, and manage returns."
                : mode === "signup"
                  ? "Join FoundDex to help return lost items safely."
                  : "Enter your email address and we will send you a password reset link."}
            </p>
          </div>

          {mode !== "forgot" && (
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-lg py-2 transition-colors cursor-pointer ${
                  mode === "signin"
                    ? "bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-lg py-2 transition-colors cursor-pointer ${
                  mode === "signup"
                    ? "bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                  >
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "signup" ? 6 : 1}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/60 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300 space-y-2">
                <p>{error}</p>
                {needsConfirmation && email && (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendConfirmation}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold underline cursor-pointer"
                  >
                    <MailCheck className="h-3.5 w-3.5" />
                    {resending
                      ? "Sending..."
                      : "Resend confirmation email"}
                  </button>
                )}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="w-full text-center text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 cursor-pointer"
              >
                Back to Sign In
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="h-96 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 animate-pulse" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
