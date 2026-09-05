// 通用主按钮：按下有轻微下压 + 变暗反馈和触感震动。
// 曾经在底部加过一条深色厚度边模拟"实体键"立体感，但那条边跟按钮描边颜色太
// 接近、又在窄按钮上显得像一道多余的杂线（见 ChoiceButton.tsx 同样的教训），
// 去掉了——按下时改成按钮本身轻微下沉 1px + 变暗，靠这个给"按下去了"的反馈。
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";

import { theme } from "@/lib/theme";

interface Props {
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  variant?: "accent" | "surface";
  // 提示态文案（比如"显示中文"这种告诉用户按下去会发生什么的小字），跟真正
  // 的按钮文案视觉上要分得开——小一号、灰色调，不然看着像是已经生效的正文。
  hint?: boolean;
  // "lg"：更高、字更大的一档，给屏幕底部那条常驻"继续"条用——它是答对之后
  // 唯一的下一步动作，又离视线焦点（对话区）最远，做得比普通按钮更抢眼一点。
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  variant = "accent",
  hint,
  size = "md",
  style,
}: Props) {
  const isAccent = variant === "accent";
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.shadowWrap, isAccent ? styles.shadowWrapAccent : styles.shadowWrapSurface, disabled && styles.btnDisabled, style]}>
      {({ pressed }) => (
        <View
          style={[
            styles.btn,
            isAccent ? styles.btnAccent : styles.btnSurface,
            size === "lg" && styles.btnLg,
            pressed && !disabled && (isAccent ? styles.btnAccentPressed : styles.btnSurfacePressed),
          ]}>
          {/* key={label}：安卓上高并发动画（成就解锁+彩纸屑+XP飘字同时炸出来）会让这
              段文字的更新偶尔被跳过——背景色照常变绿，文字却停留在上一次的内容甚至
              空白，逻辑（onPress 对应的动作）完全正常，纯粹是这块文字没画出来。给
              文字换个 key 逼 React 每次都整个重新挂载而不是尝试原地 diff，就不会再
              有更新被吞掉的情况。 */}
          <Text
            key={label}
            style={[
              styles.text,
              isAccent ? styles.textAccent : styles.textSurface,
              size === "lg" && styles.textLg,
              hint && styles.textHint,
            ]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Android 上 borderRadius 圆角 + elevation 投影同时作用在同一层时，四个圆角
  // 边缘偶尔会漏出一丝背景色的锯齿缝——外层单独只管投影和外轮廓形状（背景色只
  // 是给阴影定形状用），实际可见、会裁切的圆角内容放到内层单独一层，两层严丝
  // 合缝叠在一起，就不会露出那道缝了。
  shadowWrap: {
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
  },
  shadowWrapAccent: { backgroundColor: theme.colors.accent },
  shadowWrapSurface: { backgroundColor: theme.colors.surface },
  btn: {
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
    // 这里故意不加 overflow:"hidden"。安卓（Fabric）上内层 View 一旦设了
    // overflow:"hidden"，Text 在原地从"显示中文"提示态（13px 灰字）切到答对后
    // 的正文态（17px 白字、内容换成这句中文）时，背景色照常变绿，文字却完全
    // 不画——不是竞态，是每次必现，游戏页底部的"继续"条答对之后一片空绿。
    // 上面那个 key={label} 强制重挂载也救不了。去掉 overflow:"hidden" 就正常了；
    // 圆角靠 borderRadius + 自身背景色已经能裁出来，Text 也不会超出按钮，没有
    // 东西真的需要被裁切。
  },
  btnLg: { paddingVertical: 20 },
  btnAccent: { backgroundColor: theme.colors.accent },
  btnAccentPressed: { backgroundColor: theme.colors.accentDeep },
  btnSurface: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  btnSurfacePressed: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
  btnDisabled: { opacity: 0.5 },
  text: { fontWeight: "800", fontSize: 17 },
  textLg: { fontSize: 21 },
  textAccent: { color: theme.colors.surface },
  textSurface: { color: theme.colors.text },
  textHint: { fontWeight: "600", fontSize: 13, color: theme.colors.textMuted },
});
