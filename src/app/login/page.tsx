"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { signedIn, signInWithGoogle, signInWithEmail, enterGuest, authError } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);

  // Once authenticated, leave the login page.
  useEffect(() => {
    if (signedIn) router.push("/");
  }, [signedIn, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    const { error } = await signInWithEmail(email, password);
    setBusy(false);
    if (error) toast.error(error);
    else router.push("/");
  };

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/guest-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) throw new Error("Invalid passcode");
      enterGuest();
      router.push("/");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="login-page">
      {!isGuest ? (
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

          <h3 className="font-fraunces text-[17px] font-medium text-bottle text-center mb-3.5">
            Sign in
          </h3>

          {authError && (
            <div className="text-[12px] text-[#B5524F] bg-[#FBF3F3] border border-[#E2C9C9] rounded p-2 mb-3 text-center">
              {authError}
            </div>
          )}

          <button className="sso-btn" onClick={signInWithGoogle}>
            <span className="w-[18px] h-[18px] flex items-center justify-center font-bold text-[#4285F4]">
              G
            </span>
            Continue with Google
          </button>

          <div className="divider">or sign in with email</div>

          <form onSubmit={handleEmailSignIn}>
            <input
              className="field-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="field-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="primary-btn" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="text-center text-[11px] text-mist mt-3.5">
            For owners, architect, engineer, contractors.
          </div>

          <div className="text-center text-[12px] text-sage mt-[18px] pt-[18px] border-t border-[#ECE8DC]">
            Following along?{" "}
            <button
              onClick={() => setIsGuest(true)}
              className="underline cursor-pointer hover:text-bottle"
            >
              Enter as guest
            </button>
          </div>
        </div>
      ) : (
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
            Guest access
          </h3>

          <p className="text-[13px] text-sage text-center leading-[1.5] mb-[18px]">
            Enter the passcode shared by Deven or Wernardt. You&apos;ll be able to
            browse the whole project, but won&apos;t be able to comment or make
            changes.
          </p>

          <form onSubmit={handleGuest}>
            <input
              className="field-input"
              type="text"
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <button className="primary-btn" type="submit">
              View the site
            </button>
          </form>

          <div className="text-center text-[12px] text-sage mt-[18px] pt-[18px] border-t border-[#ECE8DC]">
            Collaborator?{" "}
            <button
              onClick={() => setIsGuest(false)}
              className="underline cursor-pointer hover:text-bottle"
            >
              Sign in instead
            </button>
          </div>
        </div>
      )}

      <Footer fixed />
    </div>
  );
}
