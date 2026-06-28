"use client";

import { useState } from "react";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const [isGuest, setIsGuest] = useState(false);

  return (
    <div className="login-page">
      {!isGuest ? (
        <div className="login-card">
          <div className="text-center mb-6">
            <h2 className="font-fraunces text-[24px] text-bottle font-medium mb-1">
              Klein Welgeluk
            </h2>
            <small className="block font-sans text-[10px] tracking-[0.16em] uppercase text-sage font-normal mt-1">
              build diary
            </small>
          </div>

          <h3 className="font-fraunces text-[17px] font-medium text-bottle text-center mb-3.5">
            Sign in
          </h3>

          <button className="sso-btn">
            <span className="w-[18px] h-[18px] flex items-center justify-center font-bold text-[#4285F4]">
              G
            </span>
            Continue with Google
          </button>

          <button className="sso-btn">
            <span className="w-[18px] h-[18px] flex items-center justify-center font-bold text-[#00A4EF]">
              ⊞
            </span>
            Continue with Microsoft
          </button>

          <div className="divider">or sign in with email</div>

          <input
            className="field-input"
            type="email"
            placeholder="Email"
          />
          <input
            className="field-input"
            type="password"
            placeholder="Password"
          />
          <button className="primary-btn">Sign in</button>

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
            <h2 className="font-fraunces text-[24px] text-bottle font-medium mb-1">
              Klein Welgeluk
            </h2>
            <small className="block font-sans text-[10px] tracking-[0.16em] uppercase text-sage font-normal mt-1">
              build diary
            </small>
          </div>

          <h3 className="font-fraunces text-[17px] font-medium text-bottle text-center mb-3">
            Guest access
          </h3>

          <p className="text-[13px] text-sage text-center leading-[1.5] mb-[18px]">
            Enter the passcode shared by Deven or Wernardt. You'll be able to
            browse the whole project, but won't be able to comment or make
            changes.
          </p>

          <input
            className="field-input"
            type="text"
            placeholder="Passcode"
          />
          <button className="primary-btn">View the site</button>

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
