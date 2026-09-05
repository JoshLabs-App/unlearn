// Color tokens ported from a-decade-apart/style.css :root custom properties, so the
// mobile app reads visually consistent with the web version.
export const theme = {
  colors: {
    background: "#faf6f0",
    surface: "#ffffff",
    text: "#2b2420",
    textMuted: "#8a7f74",
    accent: "#3e8f4f",
    accentSoft: "#dcefe0",
    // 按压态"实体键"的底边深色——比 accent 深一档，用来在 3D 按钮下方露出一条
    // 厚度边，模拟按键被压下前的凸起感（见 ChoiceButton/primary-btn 的 depth 边框）。
    accentDeep: "#296b38",
    correct: "#2f8f6f",
    correctSoft: "#e6f4ea",
    correctDeep: "#1f6650",
    wrong: "#cf5252",
    wrongSoft: "#fbe9e9",
    wrongDeep: "#a13939",
    border: "#ece2d6",
    borderDeep: "#d8cabb",
    // 火苗/连胜专用暖色调，跟主 accent 绿区分开，页面里才不会"只有一种颜色"。
    gold: "#d9a63a",
    goldSoft: "#faedcf",
    goldDeep: "#a97c1f",
    surfaceDeep: "#e3ddd3",
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  // 等级条五色渐变，锚点跟 CEFR_VOCAB_THRESHOLDS 的真实占比对齐，照抄网页版
  // style.css .level-bar 的渐变（那边的注释解释了锚点为什么是这几个百分比）。
  levelGradient: ["#4c9a6a", "#d9a63a", "#6a5acd", "#a8477a", "#a8477a"] as string[],
  // 每个技能一个自己的强调色，按 skillMeta 的 key 顺序循环取用——单靠统一的品牌绿
  // 会让"角色成长"页五六条技能长得一模一样，分了颜色才有"收集不同徽章"的感觉。
  skillPalette: ["#3e8f4f", "#3a7fb0", "#a8477a", "#d9a63a", "#6a5acd", "#c06a3a"] as string[],
  // 场景卡片背景色，按 sceneIndex 循环——每一幕换一个柔和色调，主线才有"换场景"的
  // 视觉提示，而不是从头到尾同一块米色卡片。
  scenePalette: [
    { bg: "#eef6ee", tint: "#3e8f4f" },
    { bg: "#eaf2fa", tint: "#3a7fb0" },
    { bg: "#f8eef4", tint: "#a8477a" },
    { bg: "#fbf3e2", tint: "#d9a63a" },
    { bg: "#f0eefa", tint: "#6a5acd" },
    { bg: "#fbeee4", tint: "#c06a3a" },
  ] as { bg: string; tint: string }[],
  shadow: {
    card: {
      shadowColor: "#2b2420",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    float: {
      shadowColor: "#2b2420",
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  },
} as const;
