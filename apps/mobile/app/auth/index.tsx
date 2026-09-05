// Login screen. Mirrors the web login modal's layout (a-decade-apart/index.html
// #auth-overlay: OAuth buttons prominent up top, email magic-link as the secondary path
// below a divider) — Apple button first (native AppleAuthenticationButton, styling
// referenced from X/apps/mobile/app/(tabs)/settings.tsx:364-372), Google below it.
import { useRouter } from "expo-router";
import { useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/lib/theme";

export default function AuthScreen() {
  const router = useRouter();
  const { appleAvailable, supabaseConfigured, signInWithApple, signInWithGoogle, sendMagicLink } =
    useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "apple" | "google", fn: () => Promise<void>) {
    setError(null);
    setBusy(kind);
    try {
      await fn();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败，请重试");
    } finally {
      setBusy(null);
    }
  }

  async function handleSendLink() {
    if (!email.trim()) return;
    setError(null);
    setBusy("email");
    try {
      await sendMagicLink(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请重试");
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🔐</Text>
        <Text style={styles.title}>登录账号</Text>
        <Text style={styles.subtitle}>进度可跨设备同步</Text>
      </View>

      {!supabaseConfigured ? (
        <Text style={styles.hint}>登录暂不可用（未配置 Supabase）</Text>
      ) : (
        <>
          <View style={styles.oauthGroup}>
            {appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={theme.radius.md}
                style={styles.appleButton}
                onPress={() => void run("apple", signInWithApple)}
              />
            ) : null}
            <Pressable
              style={[styles.googleButton, busy === "google" && styles.buttonBusy]}
              disabled={busy !== null}
              onPress={() => void run("google", signInWithGoogle)}>
              {busy === "google" ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.googleButtonText}>使用 Google 登录</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>或使用邮箱</Text>
            <View style={styles.dividerLine} />
          </View>

          {sent ? (
            <View>
              <Text style={styles.hint}>📧 已发送登录邮件到 {email}，请查收并点击邮件里的链接完成登录。</Text>
              <Pressable style={styles.ghostButton} onPress={() => setSent(false)}>
                <Text style={styles.ghostButtonText}>换一个邮箱</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.input}
                placeholder="邮箱 email"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Pressable
                style={[styles.primaryButton, busy === "email" && styles.buttonBusy]}
                disabled={busy !== null}
                onPress={() => void handleSendLink()}>
                {busy === "email" ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>发送登录邮件</Text>
                )}
              </Pressable>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}

      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>关闭</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: theme.spacing.lg },
  headerIcon: { fontSize: 36, marginBottom: theme.spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
  oauthGroup: { gap: theme.spacing.sm },
  appleButton: { width: "100%", height: 48 },
  googleButton: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: { fontWeight: "600", color: theme.colors.text },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { color: theme.colors.textMuted, fontSize: 12 },
  input: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: theme.colors.surface, fontWeight: "700" },
  buttonBusy: { opacity: 0.7 },
  ghostButton: {
    marginTop: theme.spacing.sm,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: { color: theme.colors.text, fontWeight: "600" },
  hint: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { color: theme.colors.wrong, marginTop: theme.spacing.sm, fontSize: 13 },
  closeButton: { marginTop: theme.spacing.xl, alignItems: "center" },
  closeButtonText: { color: theme.colors.textMuted },
});
