// Auth context shape copied from X/apps/mobile/contexts/AuthContext.tsx (onAuthStateChange
// subscription, signInWithApple/signInWithGoogle/signOut) — but WITHOUT the Cabinet-X-specific
// "exchange Supabase session for a custom backend token" layer, since this app has no
// backend of its own: the Supabase session itself is the source of truth (same as the web
// game's window.GameAuth in a-decade-apart/auth.js). Adds sendMagicLink(), which the web
// version has (auth.js sendMagicLink) but X's app does not need.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { isAppleSignInAvailable, signInWithAppleViaSupabase } from "@/lib/supabase/apple-sign-in";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithGoogleViaSupabase, signOutSupabase } from "@/lib/supabase/google-sign-in";
import { supabaseAuthRedirectUri } from "@/lib/supabase/oauth-session";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  supabaseConfigured: boolean;
  appleAvailable: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!supabaseConfigured) throw new Error("Supabase is not configured");
    const result = await signInWithAppleViaSupabase();
    if (!result.ok) {
      if (result.reason === "cancelled") return;
      throw new Error(result.reason ?? "Apple sign-in failed");
    }
  }, [supabaseConfigured]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) throw new Error("Supabase is not configured");
    const result = await signInWithGoogleViaSupabase();
    if (!result.ok) {
      if (result.reason === "cancelled") return;
      throw new Error(result.reason ?? "Google sign-in failed");
    }
  }, [supabaseConfigured]);

  const sendMagicLink = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: supabaseAuthRedirectUri() },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await signOutSupabase();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      supabaseConfigured,
      appleAvailable,
      signInWithApple,
      signInWithGoogle,
      sendMagicLink,
      signOut,
    }),
    [session, loading, supabaseConfigured, appleAvailable, signInWithApple, signInWithGoogle, sendMagicLink, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
