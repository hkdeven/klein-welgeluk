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

// Used before sign-in so the app stays usable during the auth rollout.
// Once you flip ENFORCE_AUTH on (force login), this is never shown.
const FALLBACK_USER: AppUser = {
  id: "ddbabb8d-5d95-4b1d-8842-fd9fad9e50d6",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

interface AuthValue {
  user: AppUser;
  signedIn: boolean;
  loading: boolean;
  signInWithGoogle: () => void;
  signInWithMicrosoft: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue>({
  user: FALLBACK_USER,
  signedIn: false,
  loading: true,
  signInWithGoogle: () => {},
  signInWithMicrosoft: () => {},
  signInWithEmail: async () => ({}),
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(FALLBACK_USER);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSession = async (session: any) => {
    const authUser = session?.user;
    if (authUser?.email) {
      try {
        const res = await fetch("/api/users/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authUser.email,
            display_name:
              authUser.user_metadata?.full_name || authUser.user_metadata?.name,
          }),
        });
        if (res.ok) {
          const appUser = await res.json();
          setUser({ ...appUser, email: authUser.email });
          setSignedIn(true);
        }
      } catch {
        /* ignore — leave fallback */
      }
    } else {
      setUser(FALLBACK_USER);
      setSignedIn(false);
    }
    setLoading(false);
  };

  useEffect(() => {
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

  const signInWithGoogle = () =>
    supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  const signInWithMicrosoft = () =>
    supabaseClient.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo, scopes: "email" },
    });
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };
  const signOut = async () => {
    await supabaseClient.auth.signOut();
    setUser(FALLBACK_USER);
    setSignedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signedIn,
        loading,
        signInWithGoogle,
        signInWithMicrosoft,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useCurrentUser = () => useContext(AuthContext).user;
