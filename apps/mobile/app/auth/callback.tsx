// OAuth deep-link fallback when openAuthSessionAsync doesn't capture the callback itself
// (Apple/Google web-flow redirects here via the `unlearn://auth/callback` scheme).
// Pattern copied from X/apps/mobile/app/auth/callback.tsx.
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getSupabase } from "@/lib/supabase/client";
import { theme } from "@/lib/theme";

export default function AuthCallbackScreen() {
  useEffect(() => {
    void (async () => {
      const supabase = getSupabase();
      const url = await Linking.getInitialURL();
      if (!supabase || !url) {
        router.replace("/(tabs)");
        return;
      }

      const { params, errorCode } = QueryParams.getQueryParams(url);
      if (!errorCode && params.code) {
        await supabase.auth.exchangeCodeForSession(params.code);
      } else if (!errorCode && params.access_token) {
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? "",
        });
      }
      router.replace("/(tabs)");
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});
