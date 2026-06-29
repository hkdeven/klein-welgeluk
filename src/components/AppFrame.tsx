"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Footer from "@/components/Footer";
import { EditModeContext } from "@/components/EditModeContext";
import { useCurrentUser } from "@/components/AuthProvider";
import { usePages } from "@/hooks/usePages";

// Routes that render standalone, without the app shell.
const BARE_ROUTES = ["/login"];

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { pages } = usePages();
  const user = useCurrentUser();
  const [editMode, setEditMode] = useState(false);

  if (BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      <div className="shell">
        {/* Sidebar lives here so it persists across navigation (no flash). */}
        <Sidebar pages={pages} editMode={editMode} />
        <div className="flex-1">
          <Topbar user={user} editMode={editMode} onEditModeChange={setEditMode} />
          <main>{children}</main>
          <Footer />
        </div>
      </div>
    </EditModeContext.Provider>
  );
}
