// 点词查词：PORTED from a-decade-apart/main.js wrapWordsHTML() + attachWordLookup()。
// 网页版是把英文台词的每个单词包成 <span class="word">，这里对应地把每个单词拆成
// 独立的、自带 onPress 的嵌套 <Text>——RN 允许 <Text> 里嵌 <Text onPress>，跟网页的
// inline span 是同一个效果，单词之间的标点/空格原样保留在中间，不受影响。
import { StyleSheet, Text, type GestureResponderEvent, type StyleProp, type TextStyle } from "react-native";

import { theme } from "@/lib/theme";

// 跟网页版同一个正则：拉丁字母（含重音符）+ 撇号算一个"词"，标点/空格/数字
// 都当分隔符原样保留、不可点。
const WORD_SPLIT_RE = /([A-Za-zÀ-ÿ']+)/g;

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  activeWord?: string | null;
  // 事件一起传出去——查词弹出的释义气泡要跟着"点在哪儿"浮动定位（见 WordPopup
  // 的 anchorY），不能只知道点了哪个词、不知道点在屏幕什么位置。
  onWordPress: (word: string, event: GestureResponderEvent) => void;
  // 选择题按钮复用这个组件时要两个手势并存：单击选这个选项，长按查词——两者
  // 给的时候，每个词的 onPress 转发去 onSelect（不再触发查词），onLongPress
  // 才触发 onWordPress。不给的时候维持原来的行为（单击直接查词），给场景标题/
  // 台词那些"点了只会查词，不会被当成选择"的地方用。
  onWordLongPress?: (word: string, event: GestureResponderEvent) => void;
  onSelect?: () => void;
  // 分类词表页用：判断某个词是否该常驻染色（内容词 / 已经点查过收藏的词），
  // 跟 activeWord 那种"刚点了一下"的瞬时高亮是两回事，两者可以同时生效。
  highlightWord?: (word: string) => boolean;
}

export function WordText({
  text,
  style,
  activeWord,
  onWordPress,
  onWordLongPress,
  onSelect,
  highlightWord,
}: Props) {
  const parts = text.split(WORD_SPLIT_RE);
  const hasLongPress = !!onWordLongPress;
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (!part) return null;
        // split() 用捕获组切出来的数组固定是"非词, 词, 非词, 词…"交替，偶数下标
        // 永远是分隔符，不用再单独测一次正则。
        if (i % 2 === 0) return part;
        const isActive = activeWord === part.toLowerCase();
        return (
          <Text
            key={i}
            suppressHighlighting
            style={[
              highlightWord?.(part) ? styles.contentWord : undefined,
              isActive ? styles.active : undefined,
            ]}
            onPress={hasLongPress ? onSelect : (e) => onWordPress(part, e)}
            onLongPress={hasLongPress ? (e) => onWordLongPress(part, e) : undefined}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  contentWord: { color: theme.colors.accent, fontWeight: "600" },
  active: { backgroundColor: theme.colors.accentSoft },
});
