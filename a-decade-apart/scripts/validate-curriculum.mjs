// 课程分级校验脚本：按设计文档（skills/joshlabs-dev/references/projects/unlearn-english.md，
// 开头"设计精华：十二条核心原则"）定的规则扫描全部章节：
//   1. 一课最多引入 1 个新 structure 类 grammarTag（chunk 类不占名额）
//   2. structure 类必须在 3 课内复现，chunk 类放宽到 5 课
//   3. 标签必须对得上句子：grammarTag 只标玩家正确选项的语法，能从句子里推出来（原则 8）
//   4. 产出不超纲：节点标签的 tier 不能高于本章 tier（章头注 `Tier: Lx`），或 --baseline（原则 2）
//   5. 干扰项质量：不在荒谬黑名单里、不与正确项相同、正确项不能长得离谱（原则 5）
//      —— 默认只警告（历史内容太多），加 --strict 变成违规；新章节必须过 --strict
//   6. 正确选项全书查重
//   7. 词汇曝光统计：按词元算"接触过"和"出现 ≥5 次（可掌握）"，NPC 句 + 正确选项，不算错误选项（原则 7）
// 只统计玩家正确选项，NPC 台词是输入不计入语法检查。
//
// 用法：node scripts/validate-curriculum.mjs --strict-from 95        （主线：十年之约，95 章起严格）
//      node scripts/validate-curriculum.mjs --book baker-street --baseline L2 [--strict]
//   --book <slug>     校验 content/books/<slug>/chapter*.js（独立故事线，全局变量名按
//                     slug 大写下划线 + _CONTENT 约定，如 BAKER_STREET_CONTENT）
//   --baseline <Lx>   这本书的起步 tier：基线内的 tag 视为"玩家已经会了"，不占名额；
//                     玩家正确选项出现基线之外的 tag 即违规
// 只读不改，退出码 0 = 全部合规，1 = 有违规（可接入 CI）。
// 新增 grammarTag 时先判断它是 chunk 还是 structure，加进分类清单，并在 grammar-rules.mjs 里加推断规则。

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { TIER_ORDER, distractorIssues, inferGrammarTags, tagSupported, tagsUpTo, tierOfTag } from "./grammar-rules.mjs";
import { isStopword, lemmatize, tokenizeWords } from "./lemma.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ARGS = process.argv.slice(2);
function argValue(flag) { const i = ARGS.indexOf(flag); return i >= 0 ? ARGS[i + 1] : undefined; }
const BOOK_SLUG = argValue("--book");
const BASELINE = argValue("--baseline");
const STRICT = ARGS.includes("--strict") || ARGS.includes("--strict-from");
// --strict-from <章号>：只把该章起的干扰项问题当违规（主线第 1-94 章是历史内容，
// 144 处遗留问题不在校验里硬修；新章节从 95 起必须过 --strict-from 95）
const STRICT_FROM = argValue("--strict-from") ? parseInt(argValue("--strict-from"), 10) : 1;

if (BASELINE && !TIER_ORDER.includes(BASELINE)) { console.error(`--baseline 只接受 ${TIER_ORDER.join("/")}，收到：${BASELINE}`); process.exit(2); }
const BASELINE_TAGS = BASELINE ? tagsUpTo(BASELINE) : new Set();

function chapterFiles(dir) {
  const files = readdirSync(dir).filter((f) => /^chapter\d+\.js$/.test(f)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  if (files.length === 0) { console.error(`${dir} 下没有 chapter*.js`); process.exit(2); }
  return files.map((f) => join(dir, f));
}
const CONTENT_DIR = BOOK_SLUG ? join(ROOT, "content", "books", BOOK_SLUG) : join(ROOT, "content");
const CONTENT_PATHS = chapterFiles(CONTENT_DIR);
const CONTENT_GLOBAL = BOOK_SLUG ? BOOK_SLUG.toUpperCase().replace(/-/g, "_") + "_CONTENT" : "GAME_CONTENT";

// 固定短语：整块记的功能句，不占"一课一个新点"名额，复现窗口更宽松
const CHUNK_TAGS = new Set(["courtesy", "please-request", "short-answer", "lets-suggestion", "connector", "phrasal-verb"]);
// 语法结构：真正的生成式规则，占名额，复现窗口更严格
const STRUCTURE_TAGS = new Set(["statement", "do-question", "wh-question", "can-modal", "will-future", "present-continuous", "past-simple", "present-perfect", "comparative", "conditional", "passive", "past-perfect", "subjunctive", "reported-speech", "concession", "conditional-advanced", "relative-clause"]);
const RECURRENCE_WINDOW_STRUCTURE = 3;
const RECURRENCE_WINDOW_CHUNK = 5;
const MASTERY_EXPOSURES = 5;

// 按加载顺序在同一个沙箱里回放，同时记下每个场景属于哪一章、那一章的 tier（章头注 `Tier: Lx`）
function loadGameContent() {
  const sandbox = {}; vm.createContext(sandbox);
  const sceneChapter = [], chapterTier = {};
  for (const path of CONTENT_PATHS) {
    const src = readFileSync(path, "utf8");
    const chapter = parseInt(path.match(/chapter(\d+)\.js$/)[1], 10);
    chapterTier[chapter] = (src.match(/Tier:\s*(L\d)/) || [])[1] || BASELINE || null;
    const before = vm.runInContext(`typeof ${CONTENT_GLOBAL} === "undefined" ? 0 : ${CONTENT_GLOBAL}.scenes.length`, sandbox);
    vm.runInContext(src, sandbox);
    const after = vm.runInContext(`${CONTENT_GLOBAL}.scenes.length`, sandbox);
    for (let i = before; i < after; i++) sceneChapter[i] = chapter;
  }
  return { content: vm.runInContext(`${CONTENT_GLOBAL};`, sandbox), sceneChapter, chapterTier };
}

function collectTagsByLesson(content) {
  return content.scenes.map((scene) => {
    const tags = [];
    for (const node of Object.values(scene.nodes)) if (node.grammarTag) tags.push(node.grammarTag);
    return { id: scene.id, title: scene.title, tags };
  });
}
function tagKind(tag) { return CHUNK_TAGS.has(tag) ? "chunk" : "structure"; }

function checkOneNewTagPerLesson(lessons) {
  const violations = [];
  const seen = new Set(BASELINE_TAGS);
  lessons.forEach((lesson, idx) => {
    const newTags = [...new Set(lesson.tags)].filter((t) => !seen.has(t));
    const newStructure = newTags.filter((t) => tagKind(t) === "structure");
    if (newStructure.length > 1) violations.push({ rule: "一课最多1个新语法结构", lesson: idx + 1, title: lesson.title, detail: `同时引入了 ${newStructure.length} 个新 structure grammarTag：${newStructure.join(", ")}（chunk 类不占名额）` });
    newTags.forEach((t) => seen.add(t));
  });
  return violations;
}
function checkRecurrenceWindow(lessons) {
  const violations = [];
  const firstSeenAt = new Map(), allSeenAt = new Map();
  lessons.forEach((lesson, idx) => {
    for (const tag of new Set(lesson.tags)) {
      if (!allSeenAt.has(tag)) allSeenAt.set(tag, []);
      allSeenAt.get(tag).push(idx);
      if (!firstSeenAt.has(tag)) firstSeenAt.set(tag, idx);
    }
  });
  for (const [tag, occ] of allSeenAt) {
    const kind = tagKind(tag);
    const window = kind === "chunk" ? RECURRENCE_WINDOW_CHUNK : RECURRENCE_WINDOW_STRUCTURE;
    const intro = firstSeenAt.get(tag);
    const next = occ.find((i) => i > intro);
    if (next === undefined) violations.push({ rule: "新语法点必须复现", lesson: intro + 1, title: lessons[intro].title, detail: `grammarTag "${tag}"（${kind}）在第 ${intro + 1} 课引入后，全书再没有复现过` });
    else if (next - intro > window) violations.push({ rule: "复现间隔过长", lesson: intro + 1, title: lessons[intro].title, detail: `grammarTag "${tag}"（${kind}）第 ${intro + 1} 课引入，直到第 ${next + 1} 课才复现（间隔 ${next - intro} 课，超过 ${window} 课上限）` });
  }
  return violations;
}
// 产出上限：标签的 tier 不能高于本章 tier（主线按章头注；--baseline 时按基线）
function checkOutputCeiling(content, sceneChapter, chapterTier) {
  const violations = [];
  content.scenes.forEach((scene, idx) => {
    const tier = BASELINE || chapterTier[sceneChapter[idx]];
    if (!tier) return;
    const allowed = tagsUpTo(tier);
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      if (node.grammarTag && !allowed.has(node.grammarTag)) violations.push({ rule: `产出超出 ${tier} 上限`, lesson: idx + 1, title: scene.title, detail: `节点 ${nodeId} 的 grammarTag "${node.grammarTag}" 属于 ${tierOfTag(node.grammarTag) || "未分级"}，本章是 ${tier}` });
    }
  });
  return violations;
}
// 标签必须对得上句子（原则 8）
function checkTagConsistency(content) {
  const violations = [];
  content.scenes.forEach((scene, idx) => {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      const right = node.choices.find((c) => c.correct);
      if (!right || !node.grammarTag) continue;
      if (!tagSupported(node.grammarTag, right.text)) violations.push({ rule: "标签与句子不一致", lesson: idx + 1, title: scene.title, detail: `节点 ${nodeId} 标了 "${node.grammarTag}"，但玩家句 "${right.text}" 里推不出这个结构（推断：${inferGrammarTags(right.text).join("/")}）。标签只能标玩家产出，不能标 NPC 句里的语法` });
    }
  });
  return violations;
}
// 玩家句里推断出的结构如果高于本章 tier，提醒人工复核（推断是近似，只警告）
function inferredCeilingWarnings(content, sceneChapter, chapterTier) {
  const warnings = [];
  content.scenes.forEach((scene, idx) => {
    const tier = BASELINE || chapterTier[sceneChapter[idx]];
    if (!tier) return;
    const allowed = tagsUpTo(tier);
    for (const node of Object.values(scene.nodes)) {
      const right = node.choices.find((c) => c.correct);
      if (!right) continue;
      // chunk 类（短语动词/连接词/礼貌语等）各级都会自然出现，不算超纲
      const over = inferGrammarTags(right.text).filter((t) => !allowed.has(t) && !CHUNK_TAGS.has(t));
      if (over.length) warnings.push(`第 ${idx + 1} 课（${tier}）"${right.text}" 疑似用了 ${over.join("/")}`);
    }
  });
  return warnings;
}
function checkDistractors(content) {
  const found = [];
  content.scenes.forEach((scene, idx) => {
    for (const [nodeId, node] of Object.entries(scene.nodes)) for (const issue of distractorIssues(node)) found.push({ rule: "干扰项质量", lesson: idx + 1, title: scene.title, detail: `节点 ${nodeId}：${issue}` });
  });
  return found;
}
function findDuplicateCorrectChoices(content) {
  const seen = new Map(), dups = [];
  content.scenes.forEach((scene, idx) => {
    for (const node of Object.values(scene.nodes)) {
      const right = node.choices.find((c) => c.correct);
      if (!right) continue;
      const key = right.text.trim().toLowerCase();
      if (seen.has(key)) dups.push(`"${right.text}"：第 ${seen.get(key)} 课和第 ${idx + 1} 课`); else seen.set(key, idx + 1);
    }
  });
  return dups;
}
// 词汇曝光：NPC 句 + 正确选项，按词元，去停用词；错误选项不算
function exposureStats(content, sceneChapter, chapterTier) {
  const vocab = new Set();
  const lines = [];
  content.scenes.forEach((scene, idx) => {
    for (const node of Object.values(scene.nodes)) {
      const right = node.choices.find((c) => c.correct);
      lines.push({ idx, text: node.npcLine.en, npc: true });
      if (right) lines.push({ idx, text: right.text, npc: false });
      tokenizeWords(node.npcLine.en).forEach((w) => vocab.add(w));
      for (const c of node.choices) tokenizeWords(c.text).forEach((w) => vocab.add(w));
    }
  });
  const count = new Map();
  const npcLen = {};
  for (const l of lines) {
    const toks = tokenizeWords(l.text);
    if (l.npc) { const t = chapterTier[sceneChapter[l.idx]] || "?"; (npcLen[t] || (npcLen[t] = [])).push(toks.length); }
    for (const w of toks) { const lm = lemmatize(w, vocab); if (isStopword(lm)) continue; count.set(lm, (count.get(lm) || 0) + 1); }
  }
  const encountered = count.size;
  const masterable = [...count.values()].filter((c) => c >= MASTERY_EXPOSURES).length;
  const once = [...count.values()].filter((c) => c === 1).length;
  const avgLen = Object.fromEntries(Object.entries(npcLen).map(([t, a]) => [t, (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)]));
  return { encountered, masterable, once, avgLen };
}

function main() {
  const { content, sceneChapter, chapterTier } = loadGameContent();
  const lessons = collectTagsByLesson(content);
  if (BOOK_SLUG) console.log(`书：${BOOK_SLUG}（${CONTENT_GLOBAL}）${BASELINE ? `，基线 ${BASELINE}` : ""}`);

  const untagged = [];
  content.scenes.forEach((scene, idx) => { for (const [nodeId, node] of Object.entries(scene.nodes)) if (!node.grammarTag) untagged.push(`第 ${idx + 1} 课 (${scene.id}) 节点 ${nodeId}`); });

  const distractor = checkDistractors(content);
  const violations = [
    ...checkOneNewTagPerLesson(lessons),
    ...checkRecurrenceWindow(lessons),
    ...checkOutputCeiling(content, sceneChapter, chapterTier),
    ...checkTagConsistency(content),
    ...(STRICT ? distractor.filter((d) => (sceneChapter[d.lesson - 1] || 1) >= STRICT_FROM) : []),
  ].sort((a, b) => a.lesson - b.lesson);
  const duplicates = findDuplicateCorrectChoices(content);
  const ceilingWarn = inferredCeilingWarnings(content, sceneChapter, chapterTier);
  const stats = exposureStats(content, sceneChapter, chapterTier);

  console.log(`扫描 ${lessons.length} 课，${lessons.reduce((n, l) => n + l.tags.length, 0)} 个 grammarTag。`);
  console.log(`词汇（按词元，去停用词，不含错误选项）：接触 ${stats.encountered}，出现≥${MASTERY_EXPOSURES}次可掌握 ${stats.masterable}，只出现1次 ${stats.once}`);
  console.log(`NPC 平均句长（词）：${Object.entries(stats.avgLen).map(([t, v]) => `${t} ${v}`).join("  ")}\n`);

  if (untagged.length) { console.log(`⚠ ${untagged.length} 个节点缺少 grammarTag：`); untagged.forEach((u) => console.log(`  - ${u}`)); console.log(""); }
  if (duplicates.length) { console.log(`⚠ ${duplicates.length} 句正确选项重复出现：`); duplicates.forEach((d) => console.log(`  - ${d}`)); console.log(""); }
  if (ceilingWarn.length) { console.log(`⚠ ${ceilingWarn.length} 句玩家正确选项疑似超出本章 tier（推断近似，请人工复核）：`); ceilingWarn.slice(0, 15).forEach((w) => console.log(`  - ${w}`)); if (ceilingWarn.length > 15) console.log(`  … 其余 ${ceilingWarn.length - 15} 条略`); console.log(""); }
  const softDistractor = STRICT ? distractor.filter((d) => (sceneChapter[d.lesson - 1] || 1) < STRICT_FROM) : distractor;
  if (softDistractor.length) {
    const byKind = {};
    for (const d of softDistractor) { const k = d.detail.includes("黑名单") ? "荒谬黑名单" : d.detail.includes("相同") ? "与正确项相同" : "长度泄露答案"; byKind[k] = (byKind[k] || 0) + 1; }
    console.log(`⚠ ${softDistractor.length} 处干扰项质量问题（${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join("，")}）——历史内容只警告；新章节用 --strict-from <章号> 视为违规：`);
    softDistractor.slice(0, 8).forEach((d) => console.log(`  - 第${d.lesson}课 ${d.detail}`));
    if (softDistractor.length > 8) console.log(`  … 其余 ${softDistractor.length - 8} 条略`);
    console.log("");
  }

  if (violations.length === 0) console.log("✅ 全部合规。");
  else {
    console.log(`✘ ${violations.length} 处违规：\n`);
    const shown = violations.slice(0, 40);
    for (const v of shown) { console.log(`[第${v.lesson}课 · ${v.title}] ${v.rule}`); console.log(`  ${v.detail}\n`); }
    if (violations.length > shown.length) console.log(`… 其余 ${violations.length - shown.length} 条略`);
  }
  process.exit(violations.length > 0 ? 1 : 0);
}
main();
