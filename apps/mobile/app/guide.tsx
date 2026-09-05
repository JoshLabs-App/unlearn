// 新手引导——不是一页说明书，是一段真的能"玩"的开场序章。结构照抄正式游戏页
// （index.tsx GameScreen）的语法：场景卡换色 + 呼吸头像 + 对话气泡 + 两个选项，
// 一个是"游戏的活法"、一个是"死记硬背的老路"——选错了照样有摇晃+提示（复用
// ChoiceButton 自带的 wrong 态），选对了才播下一幕。顺序是"先讲方法，再带
// 情景"：前三幕讲三条卖点（无痛化/剧情化/游戏化，来自网站首页 index.html 的
// value-grid），新用户还不知道"十年之约"是什么，不该一上来就丢故事钩子；
// 第四幕才带出第一章真实的第一句台词（原样搬自 chapter1.js），让玩家实打实
// 试玩一次；最后一幕才是"出发"确认。首次启动自动播一遍（见 _layout.tsx 的
// AsyncStorage 判断），演完才露出"开始读故事"按钮和折叠的玩法备忘——"更多"
// 页留了常驻入口，随时能回来重播。
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { ChoiceButton, type ChoiceState } from "@/components/game/ChoiceButton";
import { ComboBadge } from "@/components/game/ComboBadge";
import { ConfettiBurst } from "@/components/game/ConfettiBurst";
import { PrimaryButton } from "@/components/game/PrimaryButton";
import { playLine } from "@/lib/game/audio";
import { bigImpact } from "@/lib/game/haptics";
import { playSfx } from "@/lib/game/sfx";
import { theme } from "@/lib/theme";

interface Choice {
  en: string;
  zh: string;
  correct: boolean;
  hint?: string;
}

interface Scene {
  tag: string;
  avatar: string;
  npcEn: string;
  npcZh: string;
  choices: [Choice, Choice];
}

// 5 幕小序章。新用户第一次打开，根本不知道"十年之约"是什么——一上来就讲
// "分开十年"的剧情钩子，对方接不住。所以开场先讲清楚"我们的学习方式"（无痛化/
// 剧情化/游戏化，跟之前一样用能"是/否"回答的简单问句、Yes/No 级别的答案），
// 方法讲完了，才带出第一阶的情景——不是编一段新的预告文案，是直接把正式游戏
// 第一章第一句真实台词（chapter1.js scenes[0].nodes.n1，海关官员那句"Hello!
// Passport, please."）搬过来，让玩家实打实试玩一次，而不是继续听概念。最后
// 一幕才是"出发"确认。
const SCENES: Scene[] = [
  {
    tag: "无痛化",
    avatar: "🙈",
    npcEn: "No flashcards. No grammar drills. Sound good?",
    npcZh: "没有单词卡，也没有语法题，听起来怎么样？",
    choices: [
      { en: "Agree", zh: "太好了，我只想读故事。", correct: true },
      {
        en: "Disagree",
        zh: "先给我背 200 个单词。",
        correct: false,
        hint: "不同意？那你打算怎么学英语呢 😅",
      },
    ],
  },
  {
    tag: "剧情化",
    avatar: "📖",
    npcEn: "You learn from a story, not a textbook. Curious?",
    npcZh: "跟着故事学，不是跟着课本学。好奇吗？",
    choices: [
      { en: "Yes", zh: "多说一点。", correct: true },
      {
        en: "No",
        zh: "跳到语法章节。",
        correct: false,
        hint: "不好奇？可是好故事最让人上头了～",
      },
    ],
  },
  {
    tag: "游戏化",
    avatar: "🎮",
    npcEn: "Answer right, the story moves on. Ready?",
    npcZh: "答对了，故事就往前走。准备好了吗？",
    choices: [
      { en: "Yes", zh: "明白了，我会好好玩下去。", correct: true },
      {
        en: "No",
        zh: "直接告诉我答案吧。",
        correct: false,
        hint: "别紧张，答错也没关系，接着玩就好～",
      },
    ],
  },
  {
    // 这一幕不是新写的台词——原样搬自 a-decade-apart/content/chapter1.js
    // scenes[0]（Toronto Pearson Airport · 入境检查）的第一个 node，连头像
    // 都跟正式游戏那个场景一样用 👮，让玩家看到的就是"真的开局"，不是宣传语。
    tag: "试玩一幕",
    avatar: "👮",
    npcEn: "Hello! Passport, please.",
    npcZh: "你好！请出示护照。",
    choices: [
      { en: "Here you are.", zh: "给你", correct: true },
      {
        en: "Nice to meet you.",
        zh: "很高兴认识你",
        correct: false,
        hint: "递东西给别人时说「给你」→ Here you are.",
      },
    ],
  },
  {
    tag: "出发",
    avatar: "🧳",
    npcEn: "Ready to start your story?",
    npcZh: "准备好开始你的故事了吗？",
    choices: [
      { en: "Yes", zh: "好，出发。", correct: true },
      { en: "No", zh: "让我再想想。", correct: false, hint: "都试玩过一幕了，还差这一步吗？" },
    ],
  },
];

// 演完 5 幕，Yes/No 选完就翻页翻过去了——前三幕（无痛化/剧情化/游戏化）
// 是什么意思，很容易被节奏冲淡。收尾页专门把这三条理念摘出来复述一遍，配色
// 跟对应那一幕的场景卡一致（scenePalette[0..2]），让玩家玩完记得住"我们信的
// 是什么"，不只是记得住"我一路点了几个 Yes"。
const PRINCIPLE_RECAP = [
  { tag: "无痛化", desc: "没有单词卡，没有语法题", paletteIndex: 0 },
  { tag: "剧情化", desc: "跟着故事学，不是跟着课本学", paletteIndex: 1 },
  { tag: "游戏化", desc: "答对了，故事才往下走", paletteIndex: 2 },
];

const HOW_TO_PLAY = [
  { icon: "💬", title: "选你会怎么回应", desc: "读懂对方的话，从几个选项里选一句你会说的英文——选对了剧情才会往下走。" },
  { icon: "❤️", title: "心数有限，别乱猜", desc: "答错扣一颗心，心空了会被拦住，得先靠「复习闪回」赚回一颗才能继续。" },
  { icon: "👆", title: "长按单词，随手查释义", desc: "不认识的词长按一下就能看中文意思，还会自动收进「待复习」。" },
  { icon: "🕰", title: "翻页回看，不怕漏掉", desc: "对话卡下方的箭头能翻回已经答对的历史记录，重新听一遍、看一遍。" },
  { icon: "🧭", title: "底部四个标签", desc: "「角色成长」看技能/排行榜，「待复习」刷生词闪回，「全部对话」整段回放，「更多」管账号和设置。" },
];

// 头像呼吸动效，照抄 index.tsx 里 GameScreen 的 BreathingAvatar——独立开一份小
// 组件而不是跨文件导出，是因为原版就是那个页面的私有组件，这里只是同款手法。
function BreathingAvatar({ children, style }: { children: string; style: object }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[style, animStyle]}>{children}</Animated.Text>;
}

const SPARKLE_COUNT = 10;
const SPARKLE_GLYPHS = ["✨", "⭐"];

// 每答对一次就炸一小簇星星——消消乐那种"消除瞬间"的解压感靠的就是这种高频率、
// 小范围的即时反馈，不是只留到最后才给一次大彩纸屑（那个仍然保留给"全部通关"
// 这一件最大的事）。粒子数不多、寿命很短（~450ms），不会喧宾夺主。
function SparkleDot({ index, onDone }: { index: number; onDone?: () => void }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(1);

  const angle = (index / SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
  const distance = 34 + Math.random() * 26;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  useEffect(() => {
    scale.value = withSequence(withSpring(1.15, { damping: 6, stiffness: 260 }), withTiming(0.7, { duration: 260 }));
    translateX.value = withTiming(dx, { duration: 420, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(dy, { duration: 420, easing: Easing.out(Easing.quad) });
    opacity.value = withDelay(
      200,
      withTiming(0, { duration: 240 }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时播一次
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return <Animated.Text style={[styles.sparkleDot, style]}>{SPARKLE_GLYPHS[index % 2]}</Animated.Text>;
}

function SparkleBurst({ onDone }: { onDone?: () => void }) {
  return (
    <View style={styles.sparkleWrap} pointerEvents="none">
      {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
        <SparkleDot key={i} index={i} onDone={i === 0 ? onDone : undefined} />
      ))}
    </View>
  );
}

// 一幕的完整播放单元：进场轻微上滑+淡入+缩放弹入（跟正式游戏的 TransitionCard
// 一个手法，多加一层 scale punch-in）；两个选项谁对谁错照搬 index.tsx 的
// choiceState/onPressChoice 逻辑——选错的原地摇晃+露出吐槽提示、被锁住不能再选；
// 选对的除了绿光一闪，还会炸一小簇星星+整卡"消除"般地缩小淡出，才切到下一幕——
// 消消乐那种"看着它消失掉"的解压感，靠的正是这个退场动画，不是单纯瞬间切换。
function ScenePlay({
  scene,
  index,
  onAdvance,
  onResult,
}: {
  scene: Scene;
  index: number;
  onAdvance: () => void;
  onResult: (correct: boolean) => void;
}) {
  const [disabled, setDisabled] = useState<Set<number>>(new Set());
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [sparkleKey, setSparkleKey] = useState<number | null>(null);
  const palette = theme.scenePalette[index % theme.scenePalette.length];
  const translateY = useSharedValue(16);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 12, stiffness: 170 });
    opacity.value = withTiming(1, { duration: 260 });
    scale.value = withSpring(1, { damping: 11, stiffness: 200 });
  }, [translateY, opacity, scale]);

  // 跟正式游戏的 GameScreen 一样，一进这一幕就念一遍 NPC 的台词——之前这个引导
  // 序章完全没接 playLine，全程哑巴。"试玩一幕"那句是原样搬自 chapter1.js 的
  // 真实台词，本地打包的配音表里有，能读出来；其它几幕是专门给引导写的新文案
  // （无痛化/剧情化/游戏化/出发），没有对应的配音素材，playLine 查不到会静默
  // 跳过——不是漏接了，是那几句本来就没录过音。
  useEffect(() => {
    void playLine(scene.npcEn);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在这一幕挂载时播一次
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  function choiceState(idx: number): ChoiceState {
    if (pickedIdx !== idx) return "idle";
    return scene.choices[idx].correct ? "correct" : "wrong";
  }

  // 答对/答错都配上音效+震动，跟正式游戏 onPressChoice 一样——纯文字反馈太
  // 安静，加上这两样才有"这是在玩游戏"的感觉，而不是在填一张问卷。
  function handlePress(idx: number) {
    if (disabled.has(idx)) return;
    const choice = scene.choices[idx];
    setPickedIdx(idx);
    // 跟正式游戏 handleChoice 一样，点哪个选项就念哪句——"试玩一幕"的两个选项
    // 也是原样搬自 chapter1.js，配音表里查得到。
    void playLine(choice.en);
    if (choice.correct) {
      setDisabled(new Set(scene.choices.map((_, i) => i)));
      setHint(null);
      playSfx("correct");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSparkleKey(Date.now());
      onResult(true);
      // 先让绿光+星星炸完一拍，再让整卡缩小淡出——"消除"要看得见过程，
      // 不能选完立刻硬切下一幕。
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 220 });
        scale.value = withTiming(0.85, { duration: 220 });
        translateY.value = withTiming(-10, { duration: 220 });
      }, 480);
      setTimeout(onAdvance, 480 + 230);
    } else {
      setDisabled((prev) => new Set(prev).add(idx));
      setHint(choice.hint ?? null);
      playSfx("wrong");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onResult(false);
    }
  }

  const pickedCorrect = pickedIdx !== null && scene.choices[pickedIdx].correct;

  return (
    <Animated.View style={[styles.sceneCard, { backgroundColor: palette.bg }, cardStyle]}>
      <View style={styles.sceneHead}>
        <BreathingAvatar style={[styles.avatar, { borderColor: palette.tint }]}>{scene.avatar}</BreathingAvatar>
        <Text style={[styles.sceneTag, { color: palette.tint }]}>{scene.tag}</Text>
      </View>
      <View style={styles.dialogueBubble}>
        <Text style={styles.npcEn}>{scene.npcEn}</Text>
        <Text style={styles.npcZh}>{scene.npcZh}</Text>
      </View>
      <View style={styles.choices}>
        {scene.choices.map((choice, idx) => (
          <ChoiceButton
            key={idx}
            label={choice.en}
            state={choiceState(idx)}
            disabled={disabled.has(idx)}
            onPress={() => handlePress(idx)}
          />
        ))}
      </View>
      {hint ? <Text style={styles.hint}>💡 {hint}</Text> : null}
      {pickedCorrect ? <Text style={styles.choiceZh}>{scene.choices[pickedIdx as number].zh}</Text> : null}
      {sparkleKey ? <SparkleBurst key={sparkleKey} onDone={() => setSparkleKey(null)} /> : null}
    </Animated.View>
  );
}

function DetailsAccordion() {
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);

  function toggle() {
    setOpen((prev) => {
      rotation.value = withTiming(prev ? 0 : 90, { duration: 180 });
      return !prev;
    });
  }

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={styles.accordion}>
      <Pressable style={styles.accordionHead} onPress={toggle}>
        <Text style={styles.accordionTitle}>玩法备忘</Text>
        <Animated.Text style={[styles.accordionChevron, chevronStyle]}>›</Animated.Text>
      </Pressable>
      {open ? (
        <View style={styles.accordionBody}>
          {HOW_TO_PLAY.map((item) => (
            <View key={item.title} style={styles.detailRow}>
              <Text style={styles.detailIcon}>{item.icon}</Text>
              <View style={styles.flex1}>
                <Text style={styles.detailTitle}>{item.title}</Text>
                <Text style={styles.detailDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function GuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  // 连对计数——照搬正式游戏的连击手感，答对一次涨一次、答错清零，配合
  // ComboBadge 自带的"越连越燃"配色，给这段序章多一层消消乐式的连锁感。
  const [combo, setCombo] = useState(0);

  // "开始读故事"直接送进游戏页，不是退回首页卡片再让玩家自己点一次——序章
  // 都演完了，下一步就该是真正开始读故事，不该在首页多卡一步。
  function close() {
    router.replace("/game");
  }

  // 演完最后一幕：彩纸屑+"通关"音效+两下重震动一起上——收尾要比中间每一幕
  // 更热闹一截，才配得上"序章完成"这个时刻，跟正式游戏达成每日目标时的
  // burstConfetti()+playSfx("goal") 是同一个组合。
  function celebrate() {
    setFinished(true);
    setConfettiKey(Date.now());
    playSfx("goal");
    bigImpact();
  }

  function advance() {
    setStep((prev) => {
      const next = prev + 1;
      if (next >= SCENES.length) {
        celebrate();
        return prev;
      }
      return next;
    });
  }

  const scene = SCENES[step];

  return (
    <View style={styles.container}>
      <View style={[styles.hud, { paddingTop: insets.top + theme.spacing.sm }]}>
        {/* 品牌名先出场，"十年之约"这个故事名字留到第 4 幕（真实剧情预告）
            才一起揭出来——呼应"先讲方法，再带出情景"的顺序，不在最上面
            就把故事名字亮出来。 */}
        <Text style={styles.hudTitle}>{step >= 3 ? "别学英语 · 十年之约" : "别学英语"}</Text>
        {!finished ? (
          <Pressable onPress={() => setFinished(true)} hitSlop={8}>
            <Text style={styles.skip}>跳过</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.progressWrap}>
        <AnimatedProgressBar
          pct={((step + 1) / SCENES.length) * 100}
          height={6}
          trackColor={theme.colors.surfaceDeep}
        />
        <Text style={styles.progressLabel}>Scene {step + 1} / {SCENES.length}</Text>
      </View>

      {!finished ? (
        <View style={styles.stage}>
          <ScenePlay
            key={step}
            scene={scene}
            index={step}
            onAdvance={advance}
            onResult={(correct) => setCombo((c) => (correct ? c + 1 : 0))}
          />
          {combo >= 2 ? (
            <View style={styles.comboFloat} pointerEvents="none">
              <ComboBadge combo={combo} />
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.finishedScroll}>
          <View style={styles.finishedWrap}>
            <Text style={styles.finishedEmoji}>🏅</Text>
            <Text style={styles.finishedTitle}>序章完成</Text>
            <Text style={styles.finishedBody}>别学了，来读故事就行。</Text>

            <View style={styles.recapRow}>
              {PRINCIPLE_RECAP.map((item) => {
                const palette = theme.scenePalette[item.paletteIndex];
                return (
                  <View
                    key={item.tag}
                    style={[styles.recapChip, { backgroundColor: palette.bg, borderColor: palette.tint }]}>
                    <Text style={[styles.recapTag, { color: palette.tint }]}>{item.tag}</Text>
                    <Text style={styles.recapDesc}>{item.desc}</Text>
                  </View>
                );
              })}
            </View>

            <DetailsAccordion />

            <PrimaryButton label="开始读故事" onPress={close} style={styles.cta} />
          </View>
        </ScrollView>
      )}

      {confettiKey ? <ConfettiBurst key={confettiKey} onFinished={() => setConfettiKey(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex1: { flex: 1 },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  hudTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
  skip: { fontSize: 14, fontWeight: "700", color: theme.colors.textMuted },
  progressWrap: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm },
  progressLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, textAlign: "center" },
  stage: { flex: 1, padding: theme.spacing.md, justifyContent: "center" },
  comboFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: "center",
  },
  sceneCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    overflow: "visible",
  },
  sparkleWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  sparkleDot: { position: "absolute", fontSize: 20 },
  sceneHead: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  avatar: {
    fontSize: 30,
    width: 52,
    height: 52,
    lineHeight: 52,
    textAlign: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 26,
    borderWidth: 2,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  sceneTag: { fontSize: 15, fontWeight: "800" },
  dialogueBubble: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  npcEn: { fontSize: 21, fontWeight: "600", color: theme.colors.text, lineHeight: 29 },
  npcZh: { fontSize: 14, color: theme.colors.textMuted, marginTop: 6 },
  choices: { gap: theme.spacing.sm },
  hint: { color: theme.colors.wrong, fontSize: 14, fontWeight: "600", marginTop: theme.spacing.sm },
  choiceZh: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  finishedScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  finishedWrap: { alignItems: "center", gap: theme.spacing.sm },
  recapRow: { width: "100%", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  recapChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
  },
  recapTag: { fontSize: 14, fontWeight: "800" },
  recapDesc: { fontSize: 13, color: theme.colors.text, flexShrink: 1 },
  finishedEmoji: { fontSize: 48 },
  finishedTitle: { fontSize: 24, fontWeight: "800", color: theme.colors.text },
  finishedBody: { fontSize: 16, fontWeight: "700", color: theme.colors.accent, marginBottom: theme.spacing.sm },
  accordion: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
  },
  accordionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
  },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.textMuted },
  accordionChevron: { fontSize: 20, fontWeight: "700", color: theme.colors.textMuted },
  accordionBody: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  detailRow: { flexDirection: "row", gap: theme.spacing.sm },
  detailIcon: { fontSize: 16, width: 24 },
  detailTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.text, marginBottom: 2 },
  detailDesc: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
  cta: { width: "100%", marginTop: theme.spacing.xs },
});
