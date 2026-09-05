import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/lib/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "页面不存在" }} />
      <View style={styles.container}>
        <Text style={styles.title}>这个页面不存在</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>回到游戏主页</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  title: { fontSize: 16, color: theme.colors.text },
  link: { marginTop: theme.spacing.sm },
  linkText: { color: theme.colors.accent, fontWeight: "600" },
});
