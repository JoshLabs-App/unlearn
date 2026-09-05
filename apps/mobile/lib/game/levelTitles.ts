// CEFR 等级（A1/A2/B1/B2/B2+）本身是给语言学习者看的专业分级，玩家未必有概念，
// 配一个"称号"文案更有代入感——数字段位常见套路（青铜/黄金那种），这里换成跟
// "十年之约"故事氛围搭一点的说法。纯展示层，不影响 computeLevelProgress 的判定。
// 用英文而不是中文，跟游戏内其它进度文案（第几幕/剩余词数）保持同一种语言，不在
// 主界面上突然冒出一段中文。
const LEVEL_TITLES: Record<string, string> = {
  A1: "Newcomer",
  A2: "Rookie Traveler",
  B1: "Local Player",
  B2: "Local Insider",
  "B2+": "Decade Friend",
};

export function levelTitle(level: string): string {
  return LEVEL_TITLES[level] ?? level;
}
