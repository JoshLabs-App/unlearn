import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthProvider } from "@/contexts/AuthContext";
import { GameProvider } from "@/contexts/GameContext";
import { theme } from "@/lib/theme";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

const SEEN_GUIDE_KEY = "eng-rpg-seen-guide";

// 首次启动自动弹一次"设计理念/怎么玩"说明页——只看 AsyncStorage 有没有这个
// 标记，不跟游戏存档挂钩（哪怕清空游戏进度重来，也不用再看一遍新手说明）。
// "更多"页里另有一个常驻入口手动打开同一个页面，两条路径共用 guide.tsx。
function FirstLaunchGuide() {
  const router = useRouter();
  useEffect(() => {
    void AsyncStorage.getItem(SEEN_GUIDE_KEY).then((seen) => {
      if (seen === "1") return;
      void AsyncStorage.setItem(SEEN_GUIDE_KEY, "1");
      router.push("/guide");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在应用启动时判断一次
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <AuthProvider>
          <GameProvider>
            <StatusBar style="dark" />
            <FirstLaunchGuide />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.text,
                headerTitleStyle: { fontWeight: "600" },
                contentStyle: { backgroundColor: theme.colors.background },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              {/* 游戏页：从首页场景卡点进来的独立全屏页，故意留在 (tabs) 组外面——
                  expo-router 只在当前路由落在 (tabs) 内时才画底部 tab 栏，这里
                  是"游戏页不展示下面的几个固定图标"这条要求最省心的实现方式，
                  不用在 game.tsx 里额外藏 tab 栏。*/}
              <Stack.Screen name="game" options={{ headerShown: false }} />
              <Stack.Screen
                name="guide"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="auth/index"
                options={{ presentation: "modal", title: "登录", headerShown: false }}
              />
              <Stack.Screen
                name="auth/callback"
                options={{ headerShown: false, animation: "none" }}
              />
            </Stack>
          </GameProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
