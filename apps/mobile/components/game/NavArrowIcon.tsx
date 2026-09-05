// 翻页箭头图标：原来用 expo-symbols 的系统图标（安卓上走 Material Symbols 字体），
// 线条偏细、两端是硬切角，用户反馈"太单薄、大小间距颜色都不对"。改成纯 View
// 拼出来的圆头箭头——两条圆角"胶囊"交叉出一个尖角，两端和交叉点都是圆的，不用
// 额外装 react-native-svg（那个需要重新原生编译，这次不想再触发一轮）。
// withBar 给"跳到上一场/下一场"那两个按钮加一条同色圆头竖条，跟箭头拼成
// "|◀"/"▶|" 的效果，区别于普通的"翻一句"箭头。
import { View } from "react-native";

export function NavArrowIcon({
  color,
  size = 20,
  direction = "left",
  withBar = false,
}: {
  color: string;
  size?: number;
  direction?: "left" | "right";
  withBar?: boolean;
}) {
  const thickness = size * 0.17;
  const armLength = size * 0.62;
  const tipX = size * 0.34;
  const barWidth = thickness;
  const barHeight = size * 0.86;

  return (
    <View
      style={{
        width: size,
        height: size,
        transform: direction === "right" ? [{ scaleX: -1 }] : undefined,
      }}>
      <View
        style={{
          position: "absolute",
          left: tipX,
          top: size / 2 - thickness / 2,
          width: armLength,
          height: thickness,
          borderRadius: thickness / 2,
          backgroundColor: color,
          transform: [{ rotate: "45deg" }],
          transformOrigin: "0% 50%",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: tipX,
          top: size / 2 - thickness / 2,
          width: armLength,
          height: thickness,
          borderRadius: thickness / 2,
          backgroundColor: color,
          transform: [{ rotate: "-45deg" }],
          transformOrigin: "0% 50%",
        }}
      />
      {/* 两条胶囊各自的圆头端严格来说只覆盖尖角一半的角度，两个半圆拼起来理论上
          能盖满一整圈，但胶囊本身那么细（厚度只有几个像素），圆角在这个尺寸下
          几乎看不出来，尖角看着还是像硬角。直接在两条胶囊交叉的那个点上叠一个
          实心小圆点（直径=胶囊厚度），不管两条胶囊自己的端点画得圆不圆，这个
          点上肉眼看到的永远是个干净的圆角——矢量图形里"圆头接缝"就是这么画的。 */}
      <View
        style={{
          position: "absolute",
          left: tipX - thickness / 2,
          top: size / 2 - thickness / 2,
          width: thickness,
          height: thickness,
          borderRadius: thickness / 2,
          backgroundColor: color,
        }}
      />
      {withBar ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: (size - barHeight) / 2,
            width: barWidth,
            height: barHeight,
            borderRadius: barWidth / 2,
            backgroundColor: color,
          }}
        />
      ) : null}
    </View>
  );
}
