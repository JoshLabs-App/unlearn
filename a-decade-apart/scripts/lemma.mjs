// 词元归并（共享模块）：把 walked/walking/walks 归到 walk，用于"诚实计数"（设计精华第 7 条）。
// 规则式近似，不追求语言学完整；候选词形只有在语料词表里真实存在时才采用，
// 避免把 "tired" 硬砍成 "tire"。apps/mobile/lib/game/progress.ts 和 a-decade-apart/main.js
// 里各有一份逻辑相同的实现，改这里记得同步那两处。
const IRREGULAR = {
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", being: "be",
  has: "have", had: "have", having: "have", does: "do", did: "do", done: "do", doing: "do",
  went: "go", gone: "go", goes: "go", going: "go", came: "come", comes: "come", coming: "come",
  got: "get", gotten: "get", gets: "get", getting: "get", made: "make", makes: "make", making: "make",
  took: "take", taken: "take", takes: "take", taking: "take", saw: "see", seen: "see", sees: "see", seeing: "see",
  said: "say", says: "say", saying: "say", knew: "know", known: "know", knows: "know", knowing: "know",
  thought: "think", thinks: "think", thinking: "think", told: "tell", tells: "tell", telling: "tell",
  gave: "give", given: "give", gives: "give", giving: "give", found: "find", finds: "find", finding: "find",
  felt: "feel", feels: "feel", feeling: "feel", kept: "keep", keeps: "keep", keeping: "keep",
  left: "leave", leaves: "leave", leaving: "leave", met: "meet", meets: "meet", meeting: "meet",
  ran: "run", runs: "run", running: "run", paid: "pay", pays: "pay", paying: "pay",
  bought: "buy", buys: "buy", buying: "buy", brought: "bring", brings: "bring", bringing: "bring",
  sold: "sell", sells: "sell", selling: "sell", built: "build", builds: "build", building: "build",
  won: "win", wins: "win", winning: "win", lost: "lose", loses: "lose", losing: "lose",
  held: "hold", holds: "hold", holding: "hold", began: "begin", begun: "begin", begins: "begin", beginning: "begin",
  spoke: "speak", spoken: "speak", speaks: "speak", speaking: "speak", forgot: "forget", forgotten: "forget", forgets: "forget",
  wrote: "write", written: "write", writes: "write", writing: "write", heard: "hear", hears: "hear", hearing: "hear",
  ate: "eat", eaten: "eat", eats: "eat", eating: "eat", drank: "drink", drunk: "drink", drinks: "drink", drinking: "drink",
  slept: "sleep", sleeps: "sleep", sleeping: "sleep", woke: "wake", woken: "wake", wakes: "wake", waking: "wake",
  stood: "stand", stands: "stand", standing: "stand", sat: "sit", sits: "sit", sitting: "sit",
  children: "child", men: "man", women: "woman", feet: "foot", teeth: "tooth", mice: "mouse", people: "person",
  better: "good", best: "good", worse: "bad", worst: "bad", more: "many", most: "many", less: "little", least: "little",
  "i'm": "i", "i've": "i", "i'll": "i", "i'd": "i", "you're": "you", "you've": "you", "you'll": "you", "you'd": "you",
  "we're": "we", "we've": "we", "we'll": "we", "we'd": "we", "they're": "they", "they've": "they", "they'll": "they", "they'd": "they",
  "he's": "he", "he'll": "he", "he'd": "he", "she's": "she", "she'll": "she", "she'd": "she", "it's": "it", "it'll": "it", "it'd": "it",
  "that's": "that", "there's": "there", "here's": "here", "what's": "what", "who's": "who", "where's": "where", "how's": "how", "let's": "let",
  "don't": "do", "doesn't": "do", "didn't": "do", "can't": "can", "cannot": "can", "couldn't": "could", "won't": "will", "wouldn't": "would",
  "isn't": "be", "aren't": "be", "wasn't": "be", "weren't": "be", "haven't": "have", "hasn't": "have", "hadn't": "have",
  "shouldn't": "should", "mustn't": "must", "needn't": "need",
};
const STOP = new Set(["the", "a", "an", "and", "or", "but", "so", "of", "to", "in", "on", "at", "by", "for", "with", "from", "as", "is", "be", "am", "are", "was", "were", "it", "its", "this", "that", "these", "those", "i", "me", "my", "you", "your", "we", "us", "our", "they", "them", "their", "he", "him", "his", "she", "her", "do", "does", "did", "have", "has", "had", "not", "no", "yes", "if", "then", "than", "too", "very", "just", "here", "there", "up", "down", "out", "off", "over", "s", "t", "ll", "ve", "re", "d", "m", "let", "oh", "ok", "okay", "hi", "hey", "wow", "ah", "um", "hmm"]);

const NO_STRIP = new Set(["tired","excited","interested","bored","worried","scared","pleased","relieved","exhausted","thrilled","amazed","confused","embarrassed","disappointed","annoyed","satisfied","delighted","married","engaged","retired","used","supposed","need","seed","feed","speed","bed","red","shed","wed","indeed","tied","died","lied"]);
export function lemmatize(word, vocab) {
  const w = word.toLowerCase();
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (NO_STRIP.has(w)) return w;
  const base = w.replace(/'(s|re|ve|ll|d|m)$/, "");
  if (base !== w) return lemmatize(base, vocab);
  if (w.length <= 3) return w;
  const has = (c) => (vocab ? vocab.has(c) : true);
  const cands = [];
  if (w.endsWith("ies") && w.length > 4) cands.push(w.slice(0, -3) + "y");
  if (w.endsWith("ied") && w.length > 4) cands.push(w.slice(0, -3) + "y");
  if (w.endsWith("ing") && w.length > 5) { const st = w.slice(0, -3); cands.push(st + "e", st); if (/([^aeiou])\1$/.test(st)) cands.push(st.slice(0, -1)); }
  if (w.endsWith("ed") && w.length >= 4) { const st = w.slice(0, -2); cands.push(st + "e", st); if (/([^aeiou])\1$/.test(st)) cands.push(st.slice(0, -1)); }
  if (w.endsWith("iest") && w.length > 5) cands.push(w.slice(0, -4) + "y");
  if (w.endsWith("est") && w.length > 5) { const st = w.slice(0, -3); cands.push(st, st + "e"); if (/([^aeiou])\1$/.test(st)) cands.push(st.slice(0, -1)); }
  if (w.endsWith("ier") && w.length > 4) cands.push(w.slice(0, -3) + "y");
  if (w.endsWith("er") && w.length > 4) { const st = w.slice(0, -2); cands.push(st, st + "e"); if (/([^aeiou])\1$/.test(st)) cands.push(st.slice(0, -1)); }
  if (w.endsWith("es") && /(sh|ch|ss|x|z|o)es$/.test(w)) cands.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) cands.push(w.slice(0, -1));
  if (w.endsWith("ly") && w.length > 5) { cands.push(w.slice(0, -2)); if (w.endsWith("ily")) cands.push(w.slice(0, -3) + "y"); }
  for (const c of cands) if (c.length >= 2 && has(c)) return c;
  return w;
}
export function isStopword(lemma) { return STOP.has(lemma) || lemma.length < 2; }
export function tokenizeWords(text) { return (text || "").toLowerCase().match(/[a-z]+'?[a-z]*/g) || []; }
