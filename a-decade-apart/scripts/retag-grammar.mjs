// 重标 grammarTag：把"标签与玩家句子不一致"的节点按 grammar-rules.mjs 的推断重新打标。
// 只改 grammarTag 这一行，不动台词。规则：
//   - 新标签必须被句子支持（inferGrammarTags），且在本章 tier 允许范围内，
//     且它的"首次引入章"不晚于本章（不让某个语法点被提前引入，破坏路线图）；
//   - 找不到合适的就退回 statement。
// 用法：node scripts/retag-grammar.mjs            （只报告，不写文件）
//      node scripts/retag-grammar.mjs --write    （写回 content/chapter*.js）
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { inferGrammarTags, tagSupported, tagsUpTo } from "./grammar-rules.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "content");
const WRITE = process.argv.includes("--write");
// 各语法点在主线里的首次引入章（来自设计文档路线图）
export const INTRO_CHAPTER = {
  statement: 1, "do-question": 1, "wh-question": 1, "can-modal": 1, "will-future": 1, "present-continuous": 1, "short-answer": 1, "please-request": 1, courtesy: 1, "lets-suggestion": 1,
  "past-simple": 4, connector: 4, "present-perfect": 8, comparative: 9, conditional: 10, passive: 11,
  "past-perfect": 13, subjunctive: 14, "reported-speech": 15, concession: 16, "conditional-advanced": 17, "relative-clause": 18, "phrasal-verb": 19,
};

const files = readdirSync(DIR).filter((f) => /^chapter\d+\.js$/.test(f)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
let changed = 0, total = 0;
const byOld = {}, byNew = {};
for (const f of files) {
  const path = join(DIR, f);
  let src = readFileSync(path, "utf8");
  const chapter = parseInt(f.match(/\d+/)[0], 10);
  const tier = (src.match(/Tier:\s*(L\d)/) || [, "L4"])[1];
  const allowed = tagsUpTo(tier);
  // 节点切片：每个节点从 npcLine 开始；正确选项在内容里总是排第一（validate 已确认 2814/2814）。
  const NODE_RE = /grammarTag:\s*"([^"]+)"([\s\S]*?choices:\s*\[\s*\{\s*text:\s*")((?:[^"\\]|\\.)*)"/g;
  src = src.replace(NODE_RE, (whole, tag, mid, text) => {
    total++;
    const sentence = text.replace(/\\"/g, '"');
    if (tagSupported(tag, sentence)) return whole;
    const cands = inferGrammarTags(sentence);
    const pick = cands.find((t) => allowed.has(t) && (INTRO_CHAPTER[t] || 1) <= chapter) || "statement";
    if (pick === tag) return whole;
    changed++;
    byOld[tag] = (byOld[tag] || 0) + 1;
    byNew[pick] = (byNew[pick] || 0) + 1;
    return `grammarTag: "${pick}"${mid}${text}"`;
  });
  if (WRITE) writeFileSync(path, src);
}
console.log(`${WRITE ? "已写回" : "预演"}：扫描 ${total} 个节点，重标 ${changed} 个`);
console.log("原标签分布：", Object.entries(byOld).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "));
console.log("新标签分布：", Object.entries(byNew).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "));
// 校验：写回后重新加载，确认没有节点仍然不一致
if (WRITE) {
  const sandbox = {}; vm.createContext(sandbox);
  for (const f of files) vm.runInContext(readFileSync(join(DIR, f), "utf8"), sandbox);
  const G = vm.runInContext("GAME_CONTENT", sandbox);
  let bad = 0, nodes = 0;
  for (const sc of G.scenes) for (const n of Object.values(sc.nodes)) { nodes++; if (!tagSupported(n.grammarTag, n.choices.find((c) => c.correct).text)) bad++; }
  console.log(`复核：${nodes} 个节点，仍不一致 ${bad} 个`);
}
