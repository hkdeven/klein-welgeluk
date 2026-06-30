"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { uploadToStorage, publicUrl, sanitizeName } from "@/lib/upload";

export default function ProfilePage() {
  const mockUser = useCurrentUser();
  const { signedIn, signOut } = useAuth();
  const toast = useToast();
  const isOwner = mockUser.role === "owner";
  const [guestPass, setGuestPass] = useState("");
  const [team, setTeam] = useState<any[]>([]);
  const [invite, setInvite] = useState({ email: "", display_name: "", role: "collaborator" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState({
    mentioned: true,
    assigned: true,
    stage_moved: true,
  });

  const loadTeam = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setTeam(data.users || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (isOwner) loadTeam();
  }, [isOwner]);

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

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.email.trim() || !invite.display_name.trim()) {
      toast.error("Email and name are required");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: invite.email.trim(),
          display_name: invite.display_name.trim(),
          short_name: invite.display_name.trim().split(" ")[0],
          role: invite.role,
        }),
      });
      if (!res.ok) throw new Error("Failed to add — is the email already on the team?");
      setInvite({ email: "", display_name: "", role: "collaborator" });
      await loadTeam();
      toast.success("Team member added");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setTeam((t) => t.map((u) => (u.id === id ? { ...u, role } : u)));
      toast.success("Role updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remove this person's access?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      setTeam((t) => t.filter((u) => u.id !== id));
      toast.success("Removed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    try {
      const path = `avatars/${mockUser.id}_${Date.now()}_${sanitizeName(file.name)}`;
      await uploadToStorage("photos", path, file);
      const res = await fetch(`/api/users/${mockUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl("photos", path) }),
      });
      if (!res.ok) throw new Error("Failed to save photo");
      toast.success("Photo updated");
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      const res = await fetch(`/api/users/${mockUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: "" }),
      });
      if (!res.ok) throw new Error("Failed to remove photo");
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
      setAvatarBusy(false);
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
              <div className="w-40 h-40 rounded-full bg-[#D6DCD3] overflow-hidden flex items-center justify-center text-bottle font-fraunces text-[54px] mb-3.5">
                {mockUser.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mockUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  mockUser.short_name?.charAt(0).toUpperCase()
                )}
              </div>
              {signedIn && (
                <div className="text-center text-[12px]">
                  {avatarBusy ? (
                    <span className="text-sage">Uploading…</span>
                  ) : (
                    <>
                      <button
                        className="text-sage underline"
                        onClick={() => avatarRef.current?.click()}
                      >
                        upload photo
                      </button>
                      {mockUser.avatar_url && (
                        <>
                          <span className="mx-1">·</span>
                          <button className="text-sage underline" onClick={removeAvatar}>
                            remove
                          </button>
                        </>
                      )}
                    </>
                  )}
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadAvatar}
                  />
                </div>
              )}
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

          {/* Team (owners only) */}
          {isOwner && (
            <div className="mb-8">
              <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
                Team
                <span className="flex-1 h-px bg-[#E5E1D3]"></span>
              </h2>
              <p className="text-[12px] text-sage mb-3">
                Invite-only. Add people by the email they&apos;ll sign in with (Google
                or email/password). Only listed people can sign in.
              </p>

              <div className="space-y-2 mb-4">
                {team.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 border border-[#ECE8DC] rounded p-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-bottle text-white text-[11px] font-semibold flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (u.short_name?.charAt(0) || "?").toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-pine font-medium truncate">
                        {u.display_name}
                      </div>
                      <div className="text-[11px] text-sage truncate">{u.email}</div>
                    </div>
                    <select
                      value={u.role === "owner" ? "owner" : "collaborator"}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={u.id === mockUser.id}
                      className="border border-[#D7DECF] rounded px-2 py-1 text-[12px] text-sage"
                    >
                      <option value="owner">Owner</option>
                      <option value="collaborator">Collaborator</option>
                    </select>
                    {u.id !== mockUser.id && (
                      <button
                        onClick={() => removeMember(u.id)}
                        className="text-mist hover:text-[#B5524F] text-[11px] underline flex-shrink-0"
                      >
                        remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={addMember} className="flex flex-wrap gap-2 items-center bg-whitewash p-3 rounded">
                <input
                  type="email"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  placeholder="email@example.com"
                  className="flex-1 min-w-[180px] border border-[#D7DECF] rounded p-2 text-[13px]"
                />
                <input
                  type="text"
                  value={invite.display_name}
                  onChange={(e) => setInvite({ ...invite, display_name: e.target.value })}
                  placeholder="Full name"
                  className="flex-1 min-w-[140px] border border-[#D7DECF] rounded p-2 text-[13px]"
                />
                <select
                  value={invite.role}
                  onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                  className="border border-[#D7DECF] rounded p-2 text-[13px] text-sage"
                >
                  <option value="collaborator">Collaborator</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  type="submit"
                  className="bg-bottle text-white px-4 py-2 rounded text-[13px] font-medium hover:opacity-90"
                >
                  Add
                </button>
              </form>
            </div>
          )}

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
