"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Footer from "@/components/Footer";
import { EditModeContext } from "@/components/EditModeContext";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";
import { usePages } from "@/hooks/usePages";

// Routes that render standalone, without the app shell.
const BARE_ROUTES = ["/login"];

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { pages } = usePages();
  const user = useCurrentUser();
  const { signedIn, isGuest, canWrite, loading } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const isBare = BARE_ROUTES.includes(pathname);
  const allowed = signedIn || isGuest;

  // Forced login: once the session is known, bounce anyone not signed in (and
  // not a verified guest) to /login.
  useEffect(() => {
    if (!isBare && !loading && !allowed) router.replace("/login");
  }, [isBare, loading, allowed, router]);

  if (isBare) {
    return <>{children}</>;
  }

  // Wait for the session check, and don't flash the app while redirecting.
  if (loading || !allowed) {
    return null;
  }

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      <div className="shell">
        {/* Sidebar lives here so it persists across navigation (no flash). */}
        <Sidebar pages={pages} editMode={editMode} canCreate={canWrite} />
        <div className="flex-1">
          <Topbar user={user} editMode={editMode} onEditModeChange={setEditMode} />
          <main>{children}</main>
          <Footer />
        </div>
      </div>
    </EditModeContext.Provider>
  );
}
