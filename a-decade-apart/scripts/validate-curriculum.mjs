// 课程分级校验脚本：按 skills/joshlabs-dev/references/projects/english-game.md
// 定的规则，扫描 content/chapter1.js 的产出语法点分布：
//   1. 一课最多引入 1 个新 structure 类 grammarTag（chunk 类不占名额）
//   2. structure 类必须在 3 课内复现，chunk 类放宽到 5 课
// 只统计玩家正确选项，NPC 台词是输入不计入。
//
// 用法：node scripts/validate-curriculum.mjs
// 只读不改，退出码 0 = 全部合规，1 = 有违规（可接入 CI）。
// 新增 grammarTag 时记得判断是 chunk 还是 structure，加进下面的分类清单——
// 没分类的 tag 会被当成 structure（更严格），并在结果里单独提醒。

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
// 后面章节是往同一个 GAME_CONTENT 对象上 push，不是独立声明，跟 index.html
// 里 <script> 的加载顺序保持一致，按顺序在同一个 vm context 里依次跑。
const CONTENT_PATHS = [
  join(ROOT, "content", "chapter1.js"),
  join(ROOT, "content", "chapter2.js"),
  join(ROOT, "content", "chapter3.js"),
  join(ROOT, "content", "chapter4.js"),
  join(ROOT, "content", "chapter5.js"),
  join(ROOT, "content", "chapter6.js"),
  join(ROOT, "content", "chapter7.js"),
  join(ROOT, "content", "chapter8.js"),
  join(ROOT, "content", "chapter9.js"),
  join(ROOT, "content", "chapter10.js"),
  join(ROOT, "content", "chapter11.js"),
  join(ROOT, "content", "chapter12.js"),
  join(ROOT, "content", "chapter13.js"),
  join(ROOT, "content", "chapter14.js"),
  join(ROOT, "content", "chapter15.js"),
  join(ROOT, "content", "chapter16.js"),
  join(ROOT, "content", "chapter17.js"),
  join(ROOT, "content", "chapter18.js"),
  join(ROOT, "content", "chapter19.js"),
  join(ROOT, "content", "chapter20.js"),
  join(ROOT, "content", "chapter21.js"),
  join(ROOT, "content", "chapter22.js"),
  join(ROOT, "content", "chapter23.js"),
  join(ROOT, "content", "chapter24.js"),
  join(ROOT, "content", "chapter25.js"),
  join(ROOT, "content", "chapter26.js"),
  join(ROOT, "content", "chapter27.js"),
  join(ROOT, "content", "chapter28.js"),
  join(ROOT, "content", "chapter29.js"),
  join(ROOT, "content", "chapter30.js"),
  join(ROOT, "content", "chapter31.js"),
  join(ROOT, "content", "chapter32.js"),
  join(ROOT, "content", "chapter33.js"),
  join(ROOT, "content", "chapter34.js"),
  join(ROOT, "content", "chapter35.js"),
  join(ROOT, "content", "chapter36.js"),
  join(ROOT, "content", "chapter37.js"),
  join(ROOT, "content", "chapter38.js"),
  join(ROOT, "content", "chapter39.js"),
  join(ROOT, "content", "chapter40.js"),
  join(ROOT, "content", "chapter41.js"),
  join(ROOT, "content", "chapter42.js"),
  join(ROOT, "content", "chapter43.js"),
  join(ROOT, "content", "chapter44.js"),
  join(ROOT, "content", "chapter45.js"),
  join(ROOT, "content", "chapter46.js"),
  join(ROOT, "content", "chapter47.js"),
  join(ROOT, "content", "chapter48.js"),
  join(ROOT, "content", "chapter49.js"),
  join(ROOT, "content", "chapter50.js"),
  join(ROOT, "content", "chapter51.js"),
  join(ROOT, "content", "chapter52.js"),
  join(ROOT, "content", "chapter53.js"),
  join(ROOT, "content", "chapter54.js"),
  join(ROOT, "content", "chapter55.js"),
  join(ROOT, "content", "chapter56.js"),
  join(ROOT, "content", "chapter57.js"),
  join(ROOT, "content", "chapter58.js"),
  join(ROOT, "content", "chapter59.js"),
  join(ROOT, "content", "chapter60.js"),
  join(ROOT, "content", "chapter61.js"),
  join(ROOT, "content", "chapter62.js"),
  join(ROOT, "content", "chapter63.js"),
  join(ROOT, "content", "chapter64.js"),
  join(ROOT, "content", "chapter65.js"),
  join(ROOT, "content", "chapter66.js"),
  join(ROOT, "content", "chapter67.js"),
  join(ROOT, "content", "chapter68.js"),
  join(ROOT, "content", "chapter69.js"),
  join(ROOT, "content", "chapter70.js"),
  join(ROOT, "content", "chapter71.js"),
  join(ROOT, "content", "chapter72.js"),
  join(ROOT, "content", "chapter73.js"),
  join(ROOT, "content", "chapter74.js"),
  join(ROOT, "content", "chapter75.js"),
  join(ROOT, "content", "chapter76.js"),
  join(ROOT, "content", "chapter77.js"),
  join(ROOT, "content", "chapter78.js"),
  join(ROOT, "content", "chapter79.js"),
  join(ROOT, "content", "chapter80.js"),
  join(ROOT, "content", "chapter81.js"),
  join(ROOT, "content", "chapter82.js"),
  join(ROOT, "content", "chapter83.js"),
  join(ROOT, "content", "chapter84.js"),
  join(ROOT, "content", "chapter85.js"),
  join(ROOT, "content", "chapter86.js"),
  join(ROOT, "content", "chapter87.js"),
  join(ROOT, "content", "chapter88.js"),
  join(ROOT, "content", "chapter89.js"),
  join(ROOT, "content", "chapter90.js"),
  join(ROOT, "content", "chapter91.js"),
  join(ROOT, "content", "chapter92.js"),
  join(ROOT, "content", "chapter93.js"),
  join(ROOT, "content", "chapter94.js")
];

// 固定短语：整块记的功能句，认知负担低，不占"一课一个新点"名额，复现窗口更宽松
const CHUNK_TAGS = new Set(["courtesy", "please-request", "short-answer", "lets-suggestion", "connector", "phrasal-verb"]);
// 语法结构：真正的生成式规则，占名额，复现窗口更严格
const STRUCTURE_TAGS = new Set(["statement", "do-question", "wh-question", "can-modal", "will-future", "present-continuous", "past-simple", "present-perfect", "comparative", "conditional", "passive", "past-perfect", "subjunctive", "reported-speech", "concession", "conditional-advanced", "relative-clause"]);

const RECURRENCE_WINDOW_STRUCTURE = 3;
const RECURRENCE_WINDOW_CHUNK = 5;

function loadGameContent() {
  const sandbox = {};
  vm.createContext(sandbox);
  for (const path of CONTENT_PATHS) {
    vm.runInContext(readFileSync(path, "utf8"), sandbox);
  }
  return vm.runInContext("GAME_CONTENT;", sandbox);
}

// 每课出现的 grammarTag 列表（按场景顺序，来自玩家正确选项，不含 NPC 台词）
function collectTagsByLesson(content) {
  return content.scenes.map((scene) => {
    const tags = [];
    for (const node of Object.values(scene.nodes)) {
      if (node.grammarTag) tags.push(node.grammarTag);
    }
    return { id: scene.id, title: scene.title, tags };
  });
}

function tagKind(tag) {
  if (CHUNK_TAGS.has(tag)) return "chunk";
  if (STRUCTURE_TAGS.has(tag)) return "structure";
  return "structure"; // 未分类的 tag 按更严格的规则处理，并单独提醒去分类
}

function checkOneNewTagPerLesson(lessons) {
  const violations = [];
  const seen = new Set();
  lessons.forEach((lesson, idx) => {
    const newTagsThisLesson = [...new Set(lesson.tags)].filter((t) => !seen.has(t));
    const newStructureTags = newTagsThisLesson.filter((t) => tagKind(t) === "structure");
    if (newStructureTags.length > 1) {
      violations.push({
        rule: "一课最多1个新语法结构",
        lesson: idx + 1,
        title: lesson.title,
        detail: `同时引入了 ${newStructureTags.length} 个新 structure grammarTag：${newStructureTags.join(", ")}（chunk 类不占名额，不算在内）`
      });
    }
    newTagsThisLesson.forEach((t) => seen.add(t));
  });
  return violations;
}

function checkRecurrenceWindow(lessons) {
  const violations = [];
  const firstSeenAt = new Map(); // tag -> lesson index (0-based)
  const allSeenAt = new Map(); // tag -> [lesson indices]

  lessons.forEach((lesson, idx) => {
    for (const tag of new Set(lesson.tags)) {
      if (!allSeenAt.has(tag)) allSeenAt.set(tag, []);
      allSeenAt.get(tag).push(idx);
      if (!firstSeenAt.has(tag)) firstSeenAt.set(tag, idx);
    }
  });

  for (const [tag, occurrences] of allSeenAt) {
    const kind = tagKind(tag);
    const window = kind === "chunk" ? RECURRENCE_WINDOW_CHUNK : RECURRENCE_WINDOW_STRUCTURE;
    const introducedAt = firstSeenAt.get(tag);
    const nextOccurrence = occurrences.find((idx) => idx > introducedAt);
    if (nextOccurrence === undefined) {
      violations.push({
        rule: "新语法点必须复现",
        lesson: introducedAt + 1,
        title: lessons[introducedAt].title,
        detail: `grammarTag "${tag}"（${kind}）在第 ${introducedAt + 1} 课引入后，全章再没有复现过`
      });
    } else if (nextOccurrence - introducedAt > window) {
      violations.push({
        rule: "复现间隔过长",
        lesson: introducedAt + 1,
        title: lessons[introducedAt].title,
        detail: `grammarTag "${tag}"（${kind}）第 ${introducedAt + 1} 课引入，直到第 ${nextOccurrence + 1} 课才复现（间隔 ${nextOccurrence - introducedAt} 课，超过 ${window} 课上限）`
      });
    }
  }
  return violations;
}

function main() {
  const content = loadGameContent();
  const lessons = collectTagsByLesson(content);

  const untagged = [];
  content.scenes.forEach((scene, idx) => {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      if (!node.grammarTag) untagged.push(`第 ${idx + 1} 课 (${scene.id}) 节点 ${nodeId}`);
    }
  });

  const violations = [
    ...checkOneNewTagPerLesson(lessons),
    ...checkRecurrenceWindow(lessons)
  ].sort((a, b) => a.lesson - b.lesson);

  console.log(`扫描 ${lessons.length} 课，${lessons.reduce((n, l) => n + l.tags.length, 0)} 个 grammarTag。\n`);

  if (untagged.length > 0) {
    console.log(`⚠ ${untagged.length} 个节点缺少 grammarTag：`);
    untagged.forEach((u) => console.log(`  - ${u}`));
    console.log("");
  }

  if (violations.length === 0) {
    console.log("✅ 全部合规。");
  } else {
    console.log(`✘ ${violations.length} 处违规：\n`);
    for (const v of violations) {
      console.log(`[第${v.lesson}课 · ${v.title}] ${v.rule}`);
      console.log(`  ${v.detail}\n`);
    }
  }

  process.exit(violations.length > 0 ? 1 : 0);
}

main();
