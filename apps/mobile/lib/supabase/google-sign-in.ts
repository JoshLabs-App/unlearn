// Native Google Sign-In (account-picker bottom sheet) instead of the Supabase
// web OAuth flow. Client IDs come from a Google Cloud OAuth app registered
// against this app's bundle id (com.unlearn.decadeapart) — see README note
// below for where to create them.
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { getSupabase, isSupabaseConfigured } from "./client";

// Web client ID is the "JoshLabs" shared Google Cloud project (827770827257),
// already authorized for this same Supabase project (tgobadhdylarhssudplc) —
// JoshMoney/AskBible/Selah.my share it too, since it's just the idToken
// audience Supabase checks, not something tied to one app's bundle id.
const GOOGLE_WEB_CLIENT_ID = "827770827257-cigkgaq8k1m8qiu9ogq6n60d4s5uqili.apps.googleusercontent.com";
// iOS client IDs ARE bundle-id-specific — this one is a new "iOS" OAuth
// credential under the same 827770827257 project, registered to
// com.unlearn.decadeapart (named "UnlearnEnglish iOS" in the console).
const GOOGLE_IOS_CLIENT_ID = "827770827257-c1dtd0kaaqfo7t96cr8btpe1ihtudkkf.apps.googleusercontent.com";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  configured = true;
}

export async function signInWithGoogleViaSupabase(): Promise<{ ok: boolean; reason?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };
  if (!GOOGLE_WEB_CLIENT_ID) return { ok: false, reason: "google_not_configured" };

  ensureConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { ok: false, reason: "cancelled" };

    const idToken = response.data.idToken;
    if (!idToken) return { ok: false, reason: "no_id_token" };

    const supabase = getSupabase();
    if (!supabase) return { ok: false, reason: "not_configured" };

    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      return { ok: false, reason: "cancelled" };
    }
    return { ok: false, reason: e instanceof Error ? e.message : "auth_failed" };
  }
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabase();
  try {
    if (supabase) await supabase.auth.signOut({ scope: "local" });
  } catch {
    // fall through and still clear the Google side below
  }
  // signOut() alone only clears the SDK's local cache — on iOS the system keeps
  // a shared Google web session, so the next signIn() silently reuses the same
  // account instead of showing the picker. revokeAccess() actually tears down
  // the OAuth grant, which is what forces the picker to show again.
  try {
    await GoogleSignin.signOut();
  } catch {
    // no cached Google session to clear
  }
  try {
    await GoogleSignin.revokeAccess();
  } catch {
    // nothing to revoke (not signed in via Google, or already revoked)
  }
}

export { supabaseAuthRedirectUri } from "./oauth-session";
