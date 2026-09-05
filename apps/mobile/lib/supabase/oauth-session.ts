// Supabase OAuth web-flow helper. Pattern copied from
// X/apps/mobile/lib/supabase/oauth-session.ts (trimmed: no Google Drive token
// persistence — that's a Cabinet-X-specific feature this app doesn't have).
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import type { Provider } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";

import { getSupabase } from "./client";

WebBrowser.maybeCompleteAuthSession();

export function supabaseAuthRedirectUri(): string {
  return makeRedirectUri({ scheme: "unlearn", path: "auth/callback" });
}

export async function createSessionFromUrl(url: string): Promise<{ ok: boolean; reason?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return { ok: false, reason: errorCode };
  if (params.error) {
    return { ok: false, reason: params.error_description ?? params.error };
  }

  // Supabase defaults to PKCE — mobile OAuth callbacks carry ?code=, not #access_token=.
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken) return { ok: false, reason: "no_token" };

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? "",
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function signInWithOAuthProvider(
  provider: Provider,
  options?: { scopes?: string },
): Promise<{ ok: boolean; reason?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const redirectTo = supabaseAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(options?.scopes ? { scopes: options.scopes } : {}),
    },
  });

  if (error) return { ok: false, reason: error.message };
  if (!data.url) return { ok: false, reason: "no_auth_url" };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    return { ok: false, reason: result.type === "cancel" ? "cancelled" : "auth_failed" };
  }

  return createSessionFromUrl(result.url);
}
