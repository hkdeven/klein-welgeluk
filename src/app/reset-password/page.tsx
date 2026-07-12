"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { useToast } from "@/components/Toast";
import { supabaseClient } from "@/lib/supabase-client";

// Landing page for the password-reset email. The link signs the user into a
// recovery session (handled by supabase-js); this page sets the new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  // null = still checking, false = no recovery session, true = ready
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    // The recovery token in the URL may still be exchanging when we land here.
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    const { error } = await supabaseClient.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    router.push("/");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login-logo.png"
            alt="Klein Welgeluk"
            className="mx-auto"
            style={{ width: 300, maxWidth: "100%", height: "auto", objectFit: "contain" }}
          />
        </div>

        <h3 className="font-fraunces text-[17px] font-medium text-bottle text-center mb-3">
          Set a new password
        </h3>

        {ready === null ? (
          <p className="text-[13px] text-sage text-center">Checking your reset link…</p>
        ) : ready ? (
          <form onSubmit={submit}>
            <input
              className="field-input"
              type="password"
              placeholder="New password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <input
              className="field-input"
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button className="primary-btn" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        ) : (
          <>
            <p className="text-[13px] text-sage text-center leading-[1.5] mb-[18px]">
              This reset link is invalid or has expired. Request a new one from
              the sign-in page ("Forgot password?" under the email form).
            </p>
            <a href="/login" className="primary-btn block text-center">
              Back to sign in
            </a>
          </>
        )}
      </div>

      <Footer fixed />
    </div>
  );
}
