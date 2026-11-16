"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { sanitizeRedirectPath } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Incorrect password");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const nextUrl = sanitizeRedirectPath(params.get("next"));
      router.push(nextUrl);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            TrussEngage Studio
          </h1>
          <p className="text-xs text-slate-500">
            Private workspace. Enter your password to unlock invoices & quotations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Access Password
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {error && (
            <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
          >
            {loading ? "Unlocking..." : "Unlock Studio"}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted session · Search indexing disabled</span>
        </div>
      </div>
    </div>
  );
}

