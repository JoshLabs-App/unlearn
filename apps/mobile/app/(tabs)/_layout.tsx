import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable } from "react-native";

import { theme } from "@/lib/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: false,
        // 头部/内容/底部 tab 栏统一用同一个背景色、去掉硬分割线——之前头部和 tab 栏是
        // 纯白 surface，中间内容区是米色 background，两条边框线一夹，页面看起来像三段
        // 拼起来的，不像一体的全屏应用。改成统一底色之后，卡片本身的阴影（theme.shadow）
        // 已经足够做出层次，不需要再靠色块分界。
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,
          shadowColor: "transparent",
          elevation: 0,
          height: 84,
          paddingTop: 12,
          paddingBottom: 18,
        },
        // Android 默认按钮的 ripple 半径是按整个按钮的对角线自动算的——图标离
        // paddingTop 更近（12 vs paddingBottom 的 18），半径一旦超过图标到顶边
        // 的距离，涟漪的上半圈就会被 tab 栏自己的边界切掉，看着像缺了一块。这里
        // 换成固定的小半径（明显小于任意方向的可用空间），涟漪始终是个完整的圆，
        // 5 个 tab 统一效果，不会有的有反馈有的没有。
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable
            {...props}
            android_ripple={{ borderless: true, radius: 24, color: theme.colors.accentSoft }}
          />
        ),
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: "800", fontSize: 22 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          // 首页：故事/场景列表（像多邻国的关卡地图），不再是游戏本体——游戏
          // 本体挪到了 tabs 组外面的 app/game.tsx，从这里的卡片点进去，退出时
          // 用页面左上角的 ✕ 键回到这里，不占底部 tab 栏。
          title: "首页",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "house.fill", android: "home", web: "home" }}
              tintColor={color}
              size={30}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: "角色成长",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" }}
              tintColor={color}
              size={30}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "待复习",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "bookmark.fill", android: "bookmark", web: "bookmark" }}
              tintColor={color}
              size={30}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "全部对话",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "clock.arrow.circlepath", android: "history", web: "history" }}
              tintColor={color}
              size={30}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "更多",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "ellipsis.circle.fill", android: "more_horiz", web: "more_horiz" }}
              tintColor={color}
              size={30}
            />
          ),
        }}
      />
    </Tabs>
  );
}
