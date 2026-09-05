// Supabase client singleton. Pattern copied from X/apps/mobile/lib/supabase/client.ts:
// AsyncStorage-backed session persistence + AppState-driven auto-refresh (stop refreshing
// while backgrounded, resume on foreground).
//
// Same backend/project as the web game (see a-decade-apart/auth.js) — these are the anon
// key + URL already shipped in the public web bundle, safe to embed here too (RLS on the
// Supabase side is what actually protects data, not keeping this key secret).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const SUPABASE_URL = "https://tgobadhdylarhssudplc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnb2JhZGhkeWxhcmhzc3VkcGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTMwMDAsImV4cCI6MjA5Njc4OTAwMH0.5EqC5hJFmydZaVBmpXJk1ddJNGX_fY2hN83k5IzAO3I";

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let client: SupabaseClient | null = null;
let autoRefreshWired = false;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  if (!autoRefreshWired) {
    autoRefreshWired = true;
    AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void client?.auth.startAutoRefresh();
      } else {
        void client?.auth.stopAutoRefresh();
      }
    });
  }
  return client;
}
