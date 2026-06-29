"use client";

import { useState } from "react";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const mockUser = useCurrentUser();
  const { signedIn, signOut } = useAuth();
  const toast = useToast();
  const [guestPass, setGuestPass] = useState("");
  const [notifications, setNotifications] = useState({
    mentioned: true,
    assigned: true,
    stage_moved: true,
  });

  const setGuestPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guestPass.length < 4) {
      toast.error("Passcode must be at least 4 characters");
      return;
    }
    try {
      const res = await fetch("/api/guest-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: guestPass, set_by: mockUser.id }),
      });
      if (!res.ok) throw new Error("Failed to set passcode");
      setGuestPass("");
      toast.success("Guest passcode updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <>
      <div className="title-block">
            <h1>Your profile</h1>
            <div className="text-sage text-[12px]">
              Signed in as {mockUser.display_name} · {mockUser.role}
            </div>
          </div>

          {/* Profile grid */}
          <div className="grid grid-cols-[200px_1fr] gap-9 mb-8">
            {/* Left: Avatar */}
            <div>
              <div className="w-40 h-40 rounded-full bg-[#D6DCD3] flex items-center justify-center text-bottle font-fraunces text-[54px] mb-3.5">
                {mockUser.short_name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-center text-[12px]">
                <button className="text-sage underline">upload photo</button>
                <span className="mx-1">·</span>
                <button className="text-sage underline">remove</button>
              </div>
            </div>

            {/* Right: Fields */}
            <div>
              <div className="mb-[18px]">
                <label className="text-[10px] tracking-[0.1em] uppercase text-sage block mb-1.5">
                  Display name
                </label>
                <div className="border border-[#ECE8DC] rounded bg-whitewash p-2.5 text-[13.5px] text-pine">
                  {mockUser.display_name}
                </div>
              </div>

              <div className="mb-[18px]">
                <label className="text-[10px] tracking-[0.1em] uppercase text-sage block mb-1.5">
                  Short name
                </label>
                <div className="border border-[#ECE8DC] rounded bg-whitewash p-2.5 text-[13.5px] text-pine">
                  {mockUser.short_name}
                </div>
              </div>

              <div className="mb-[18px]">
                <label className="text-[10px] tracking-[0.1em] uppercase text-sage block mb-1.5">
                  Email
                </label>
                <div className="border border-[#ECE8DC] rounded bg-whitewash p-2.5 text-[13.5px] text-pine">
                  {mockUser.email || "—"}
                </div>
              </div>

              <div className="mb-[18px]">
                <label className="text-[10px] tracking-[0.1em] uppercase text-sage block mb-1.5">
                  Role
                </label>
                <div className="border border-[#ECE8DC] rounded bg-whitewash p-2.5 text-[13.5px] text-pine capitalize">
                  {mockUser.role}
                </div>
              </div>

              <div className="mb-[18px]">
                <label className="text-[10px] tracking-[0.1em] uppercase text-sage block mb-1.5">
                  Sign-in method
                </label>
                <div className="border border-[#ECE8DC] rounded bg-whitewash p-2.5 text-[13.5px] text-sage italic flex items-center justify-between">
                  <span>{signedIn ? "Signed in" : "Not signed in"}</span>
                  {signedIn && (
                    <button
                      onClick={signOut}
                      className="not-italic text-bottle underline text-[12px]"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="mb-8">
            <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
              Notifications
              <span className="flex-1 h-px bg-[#E5E1D3]"></span>
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.mentioned}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      mentioned: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-[13px] text-pine">@mentioned</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.assigned}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      assigned: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-[13px] text-pine">
                  Comment on assigned page
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.stage_moved}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      stage_moved: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-[13px] text-pine">
                  Stage moved on assigned page
                </span>
              </label>
            </div>
          </div>

          {/* Guest access (owners only) */}
          {mockUser.role === "owner" && (
            <div className="mb-8">
              <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
                Guest access
                <span className="flex-1 h-px bg-[#E5E1D3]"></span>
              </h2>
              <p className="text-[12px] text-sage mb-2">
                Set the passcode you share with guests. They can browse read-only —
                no comments, uploads, or edits.
              </p>
              <form onSubmit={setGuestPasscode} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  value={guestPass}
                  onChange={(e) => setGuestPass(e.target.value)}
                  placeholder="New guest passcode"
                  className="flex-1 border border-[#D7DECF] rounded p-2 text-[13px]"
                />
                <button
                  type="submit"
                  className="bg-bottle text-white px-4 py-2 rounded text-[13px] font-medium hover:opacity-90"
                >
                  Save passcode
                </button>
              </form>
            </div>
          )}

          {/* Danger zone */}
          <div>
            <h2 className="font-fraunces text-[15px] font-medium text-brass mb-3.5 flex items-center gap-[10px]">
              Danger zone
              <span className="flex-1 h-px bg-[#E5E1D3]"></span>
            </h2>
            <div className="border border-[#E8D9C2] bg-[#FBF3E9] rounded p-4">
              <button className="text-brass text-[12px] underline mb-2">
                Leave this project
              </button>
              <p className="text-[12px] text-sage">
                Comments and uploads stay, access is revoked. Only owners can
                re-invite.
              </p>
            </div>
          </div>
    </>
  );
}
