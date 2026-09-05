// PORTED from a-decade-apart/category.js STOPWORDS/isContentWord()/collectCategorySentences()：
// 分类词表页把某个技能分类下全部场景的正确答案例句摊平列出来，句子里的"内容词"
// （过滤掉虚词/功能词后剩下的）常驻染色，不是整句都上色。
import type { GameContent } from "./types";

const STOPWORDS = new Set([
  "a", "an", "the", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs", "myself",
  "yourself", "himself", "herself", "itself", "ourselves", "themselves",
  "this", "that", "these", "those", "here", "there",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "doing", "done",
  "have", "has", "had", "having",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "and", "or", "but", "so", "if", "because", "as", "than", "since", "while", "although",
  "that's", "it's", "i'm", "you're", "we're", "they're", "he's", "she's", "let's", "i've", "you've",
  "we've", "they've", "i'd", "you'd", "he'd", "she'd", "we'd", "they'd", "i'll", "you'll", "he'll",
  "she'll", "we'll", "they'll",
  "don't", "doesn't", "didn't", "won't", "can't", "couldn't", "wouldn't", "shouldn't",
  "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
  "to", "of", "in", "on", "at", "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "from", "up", "down", "out", "off", "over", "under",
  "again", "further", "once",
  "not", "no", "yes", "nor", "only", "just", "very", "too", "also", "really", "quite", "much", "many",
  "more", "most", "some", "such", "own", "same", "other", "another",
  "please", "thank", "thanks", "okay", "ok", "sure", "right", "now", "well", "still", "already", "yet",
  "finally", "actually",
  "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
  "all", "any", "both", "each", "few", "less", "little",
  "one", "two", "three", "first", "second", "last", "next",
  "let", "lets", "get", "gets", "got", "go", "goes", "going", "gone", "went",
  "want", "wants", "wanted", "like", "likes", "liked",
  "know", "knows", "knew", "known",
  "think", "thinks", "thought",
  "see", "sees", "saw", "seen",
  "say", "says", "said", "tell", "tells", "told",
  "come", "comes", "came", "make", "makes", "made",
  "take", "takes", "took", "taken", "give", "gives", "gave", "given",
  "put", "puts", "look", "looks", "looked", "find", "finds", "found",
  "today", "tomorrow", "tonight", "true", "great", "good", "nice", "fine",
  "hello", "hi", "hey", "bye",
]);

export function isContentWord(word: string): boolean {
  const w = word.toLowerCase();
  return w.length > 1 && !STOPWORDS.has(w);
}

export interface CategorySentence {
  en: string;
  zh: string;
}

export function collectCategorySentences(content: GameContent, skillKey: string): CategorySentence[] {
  const seen = new Set<string>();
  const sentences: CategorySentence[] = [];
  for (const scene of content.scenes) {
    for (const node of Object.values(scene.nodes)) {
      if (node.skill !== skillKey) continue;
      const correct = node.choices.find((c) => c.correct);
      if (!correct?.text || seen.has(correct.text)) continue;
      seen.add(correct.text);
      sentences.push({ en: correct.text, zh: correct.zh || node.npcLine.zh });
    }
  }
  return sentences;
}
