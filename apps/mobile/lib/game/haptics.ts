// 大事件（升级、破连击纪录）用的"厚重"震动组合——跟日常答对/答错那种单次轻/中
// 强度震动区分开，两下连续的中等冲击比一次重震动更有"砰！"的打击感，也比单纯调高
// 强度更容易在真机上感觉出差异（iOS 的 Haptics 强度分级本身就不算特别细）。
import * as Haptics from "expo-haptics";

export function bigImpact(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, 110);
}
