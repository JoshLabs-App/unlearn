// Pattern copied from X/apps/mobile/lib/supabase/apple-sign-in.ts.
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import type { Session } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "./client";
import { signInWithOAuthProvider } from "./oauth-session";

export type ProviderSignInResult =
  | { ok: true; session: Session | null }
  | { ok: false; reason: string };

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS === "ios") {
    return AppleAuthentication.isAvailableAsync();
  }
  return false;
}

/**
 * iOS: Supabase OAuth via in-app browser (Services ID flow), NOT the native
 * AppleAuthentication.signInAsync — X's app hit "Sign Up Not Completed" from Apple with
 * the native flow under their bundle id, so this project reuses their already-verified
 * web-flow approach instead of risking the same failure.
 */
async function signInWithAppleOAuth(): Promise<ProviderSignInResult> {
  const oauth = await signInWithOAuthProvider("apple");
  if (!oauth.ok) {
    return { ok: false, reason: oauth.reason ?? "auth_failed" };
  }

  const supabase = getSupabase();
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return { ok: true, session: data.session };
}

export async function signInWithAppleViaSupabase(): Promise<ProviderSignInResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  if (Platform.OS === "ios") {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) return { ok: false, reason: "not_available" };
  }

  return signInWithAppleOAuth();
}
