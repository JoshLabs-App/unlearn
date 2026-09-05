// 单词级词典：移植自 a-decade-apart/content/dictionary.js 的 WORD_DICT（长按/点击
// 查词功能用），key 统一小写（含缩写形式，如 don't / i'm），value 是贴合章节语境的
// 简明中文释义。
import wordDictRaw from "@/content/word-dict.json";
import { remoteWordAudioUrl } from "@/content/remoteAudioManifest";

export const WORD_DICT: Record<string, string> = wordDictRaw;

export function lookupWord(word: string): string | null {
  return WORD_DICT[word.toLowerCase()] ?? null;
}

export { remoteWordAudioUrl };
