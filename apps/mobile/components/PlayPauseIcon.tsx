// 播放/暂停/停止图标：原来直接把 Unicode 符号写进按钮文案（"⏸ 第 3 节"），但
// U+23F8 ⏸ 和 U+23F9 ⏹ 这两个码位在 Unicode 里默认就是 emoji 呈现，iOS 一定拿
// Apple Color Emoji 去画，按钮上就蹦出一个彩色圆角方块的"表情包"——而同一个按钮
// 另一个状态用的 ▶（U+25B6，默认文字呈现）是正常的细黑三角,两边风格对不上。
// 补 U+FE0E 变体选择符也不保险：系统字体里这两个码位压根没有文字字形，只会退回
// emoji 或者画成豆腐块。所以跟 NavArrowIcon 一样纯 View 拼，不引 react-native-svg
// （那个要重新原生编译）。颜色由调用方传，跟着按钮的深浅底色走。
import { View } from "react-native";

export function PlayPauseIcon({
  mode,
  color,
  size = 14,
}: {
  mode: "play" | "pause" | "stop";
  color: string;
  size?: number;
}) {
  if (mode === "pause") {
    // 两条圆头竖条，中间留一条等宽的缝
    const barWidth = size * 0.3;
    const bar = {
      width: barWidth,
      height: size,
      borderRadius: barWidth / 2,
      backgroundColor: color,
    };
    return (
      <View style={{ width: size, height: size, flexDirection: "row", justifyContent: "space-between" }}>
        <View style={bar} />
        <View style={bar} />
      </View>
    );
  }

  if (mode === "stop") {
    const side = size * 0.84;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: side, height: side, borderRadius: side * 0.22, backgroundColor: color }} />
      </View>
    );
  }

  // play：RN 里画实心三角的常规办法——盒子本身宽高为 0，只留边框，上下边透明、
  // 左边实色，左边框那块实色就被斜切成一个指向右的三角。视觉重心比几何中心偏左，
  // 所以往右挪一点点才像居中。
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 0,
          height: 0,
          backgroundColor: "transparent",
          borderStyle: "solid",
          borderTopWidth: size * 0.44,
          borderBottomWidth: size * 0.44,
          borderLeftWidth: size * 0.76,
          borderRightWidth: 0,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: color,
          borderRightColor: "transparent",
          marginLeft: size * 0.12,
        }}
      />
    </View>
  );
}
