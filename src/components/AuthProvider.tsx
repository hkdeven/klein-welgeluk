"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";

export interface AppUser {
  id: string;
  display_name: string;
  short_name: string;
  role: string;
  avatar_url: string | null;
  email?: string;
}

const FALLBACK_USER: AppUser = {
  id: "ddbabb8d-5d95-4b1d-8842-fd9fad9e50d6",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

const GUEST_USER: AppUser = {
  id: "guest",
  display_name: "Guest",
  short_name: "Guest",
  role: "guest",
  avatar_url: null,
};

const GUEST_KEY = "kw_guest";

interface AuthValue {
  user: AppUser;
  signedIn: boolean;
  isGuest: boolean;
  canWrite: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => void;
  signInWithMicrosoft: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  enterGuest: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue>({
  user: FALLBACK_USER,
  signedIn: false,
  isGuest: false,
  canWrite: false,
  loading: true,
  authError: null,
  signInWithGoogle: () => {},
  signInWithMicrosoft: () => {},
  signInWithEmail: async () => ({}),
  enterGuest: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSession = async (session: any) => {
    const authUser = session?.user;
    if (authUser?.email) {
      try {
        const res = await fetch("/api/users/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authUser.email,
            avatar_url:
              authUser.user_metadata?.avatar_url ||
              authUser.user_metadata?.picture ||
              null,
          }),
        });
        if (res.ok) {
          const u = await res.json();
          setAppUser({ ...u, email: authUser.email });
          setSignedIn(true);
          setAuthError(null);
        } else if (res.status === 403) {
          // Invite-only: email not on the team — reject and sign out.
          const d = await res.json().catch(() => ({}));
          setAuthError(d.error || "This account isn't on the team yet.");
          setAppUser(null);
          setSignedIn(false);
          await supabaseClient.auth.signOut();
        }
      } catch {
        /* ignore network errors */
      }
    } else {
      setAppUser(null);
      setSignedIn(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(GUEST_KEY) === "1") {
      setIsGuest(true);
    }
    let active = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (active) handleSession(data.session);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      handleSession(session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

  const signInWithGoogle = () => {
    setAuthError(null);
    supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  };
  const signInWithMicrosoft = () => {
    setAuthError(null);
    supabaseClient.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo, scopes: "email" },
    });
  };
  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };
  const enterGuest = () => {
    if (typeof window !== "undefined") localStorage.setItem(GUEST_KEY, "1");
    setAuthError(null);
    setIsGuest(true);
  };
  const signOut = async () => {
    await supabaseClient.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem(GUEST_KEY);
    setAppUser(null);
    setSignedIn(false);
    setIsGuest(false);
  };

  const user = signedIn && appUser ? appUser : isGuest ? GUEST_USER : FALLBACK_USER;

  return (
    <AuthContext.Provider
      value={{
        user,
        signedIn,
        isGuest,
        canWrite: signedIn,
        loading,
        authError,
        signInWithGoogle,
        signInWithMicrosoft,
        signInWithEmail,
        enterGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useCurrentUser = () => useContext(AuthContext).user;
