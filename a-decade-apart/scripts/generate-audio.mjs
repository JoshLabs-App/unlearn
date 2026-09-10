// 配音生成脚本：本地 Qwen3-TTS 把 content 里所有英文台词
// （NPC 台词 + 玩家选项 + 词汇库）批量转成压缩音频，并写出一份文本→文件名的清单
// （content/audio-manifest.js），供 main.js 在运行时按文本查找对应音频播放。
//
// 用法：node scripts/generate-audio.mjs [--out-dir content/audio-new] [--limit N]
// 只会重新生成"文本变化过"或"音频文件缺失"的条目，已存在且文本没变的不会重新合成。
// --out-dir 用来先生成到别的目录（比如整批换引擎重做时），跑完再整体替换 content/audio。
//
// 引擎：Qwen3-TTS-12Hz-1.7B-CustomVoice（mlx-audio，Apple Silicon 本地跑），
// 合成本身在 scripts/tts_qwen3.py 里按批并行解码，这里只负责收集台词、分配角色、写清单。
// 2026-09 之前用的是 Kokoro-82M（快 5 倍但音色平），全部台词已用 Qwen3 重做过一遍。
//
// 依赖：scripts/.venv-tts（Python 3.12 venv），装了 mlx-audio>=0.5.1；
// 首次跑会自动从 HuggingFace 拉模型权重到 ~/.cache/huggingface（约 4.2GB），需要联网。
// 建环境：
//   /opt/homebrew/opt/python@3.12/bin/python3.12 -m venv scripts/.venv-tts
//   scripts/.venv-tts/bin/pip install mlx-audio

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
// 按 index.html 里 <script> 的加载顺序列——后面的章节文件是往同一个 GAME_CONTENT
// 对象上 push，不是各自独立声明，所以必须按顺序、在同一个 vm context 里依次跑。
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
  join(ROOT, "content", "chapter94.js"),
  join(ROOT, "content", "chapter95.js")
];
const MANIFEST_PATH = join(ROOT, "content", "audio-manifest.js");
const VENV_PYTHON = join(__dirname, ".venv-tts", "bin", "python");
const TTS_SCRIPT = join(__dirname, "tts_qwen3.py");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const AUDIO_DIR = argValue("--out-dir") ? join(process.cwd(), argValue("--out-dir")) : join(ROOT, "content", "audio");
const LIMIT = argValue("--limit") ? Number(argValue("--limit")) : undefined;

// 角色 → 音色的对应关系在 scripts/tts_qwen3.py 的 ROLE_VOICES 里统一维护，这里只给角色名：
//   npc      路人 NPC（机场官员/司机/店员等），量大、不追求个性
//   player   玩家选项 / vocabBank——玩家是男生，跟 Emma 是异性关系，必须是男声
//   emma / ho / doctor / official  剧情里固定的女性角色（chapter*.js 里 npcLine.voice 手动标的）
const ROLES = new Set([
  "npc", "player", "emma", "ho", "doctor", "official",
  // 第二本书「福尔摩斯 · 贝克街」的角色（--book baker-street 时用到）
  "watson", "holmes", "stamford", "wilson", "spaulding", "jones", "merryweather", "hudson",
  "king", "irene", "godfrey", "mary", "windibank",
]);

// --book <slug>：给第二本书起的独立故事线配音（content/books/<slug>/chapter*.js）。
// 音频文件和 manifest 仍然是全局共用一份——manifest 是"文本 → 文件"的查找表，
// 按文本精确匹配，不需要按书分；同一句话在两本书里出现也只合成一次。
// 不带 --book 就是主线，行为跟以前完全一样。
const BOOK_SLUG = argValue("--book");
// 玩家（正确/错误选项、vocabBank）在这本书里由谁来念。主线是 player（美式男声），
// 福尔摩斯里玩家扮演华生，用 watson 这个角色的音色。
const PLAYER_ROLE = argValue("--player-role") || (BOOK_SLUG === "baker-street" ? "watson" : "player");

function loadGameContent() {
  const sandbox = {};
  vm.createContext(sandbox);
  if (BOOK_SLUG) {
    const dir = join(ROOT, "content", "books", BOOK_SLUG);
    const files = readdirSync(dir)
      .filter((f) => /^chapter\d+\.js$/.test(f))
      .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
    for (const f of files) vm.runInContext(readFileSync(join(dir, f), "utf8"), sandbox);
    const global = BOOK_SLUG.toUpperCase().replace(/-/g, "_") + "_CONTENT";
    return vm.runInContext(`${global};`, sandbox);
  }
  for (const path of CONTENT_PATHS) {
    const code = readFileSync(path, "utf8");
    vm.runInContext(code, sandbox);
  }
  // const/let 顶层声明不会挂到 vm context 对象上，所以最后单独求值一次 GAME_CONTENT
  // 才能拿到跑完所有章节文件之后的最终对象。
  return vm.runInContext("GAME_CONTENT;", sandbox);
}

function slugify(text) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 40);
  const hash = createHash("md5").update(text).digest("hex").slice(0, 8);
  return `${base || "line"}-${hash}`;
}

function collectLines(content) {
  // Map<text, { speaker: "npc" | "player", voice?: "emma" }>
  const lines = new Map();
  const setLine = (text, speaker, voice) => {
    if (!text) return;
    if (!lines.has(text)) lines.set(text, { speaker, voice });
  };

  for (const scene of content.scenes) {
    for (const node of Object.values(scene.nodes)) {
      setLine(node.npcLine.en, "npc", node.npcLine.voice);
      for (const choice of node.choices) {
        setLine(choice.text, PLAYER_ROLE);
      }
    }
  }
  for (const item of content.vocabBank) {
    setLine(item.en, PLAYER_ROLE);
  }
  return lines;
}

// 把要合成的条目写成 JSONL，一次交给 tts_qwen3.py 批量合成（模型只加载一次、按批并行）。
function synthBatch(jobs) {
  if (jobs.length === 0) return;
  const jobsPath = join(tmpdir(), `tts-jobs-${process.pid}.jsonl`);
  writeFileSync(jobsPath, jobs.map((j) => JSON.stringify(j)).join("\n") + "\n", "utf8");
  const args = [TTS_SCRIPT, "--jobs", jobsPath, "--out-dir", AUDIO_DIR];
  if (LIMIT) args.push("--limit", String(LIMIT));
  execFileSync(VENV_PYTHON, args, { stdio: "inherit" });
}

function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const content = loadGameContent();
  const lines = collectLines(content);

  // manifest 是全局一份：给某一本书单独跑时要在现有清单上追加，不能整份覆盖，
  // 否则另一本书的条目会被抹掉。
  const manifest = {};
  if (existsSync(MANIFEST_PATH)) {
    const sb = {};
    vm.createContext(sb);
    vm.runInContext(readFileSync(MANIFEST_PATH, "utf8"), sb);
    Object.assign(manifest, vm.runInContext("AUDIO_MANIFEST;", sb));
  }
  const jobs = [];
  let skipped = 0;

  for (const [text, { speaker, voice }] of lines) {
    const filename = `${slugify(text)}.m4a`;
    const outPath = join(AUDIO_DIR, filename);
    manifest[text] = `content/audio/${filename}`;

    if (existsSync(outPath)) {
      skipped++;
      continue;
    }
    const role = voice && ROLES.has(voice) ? voice : speaker;
    jobs.push({ text, role, out: outPath });
  }
  synthBatch(jobs);
  const generated = jobs.filter((j) => existsSync(j.out)).length;

  const manifestSource = `// 由 scripts/generate-audio.mjs 自动生成，不要手改。
// 文本 → 音频文件路径的查找表；main.js 靠原文精确匹配来找对应的配音。
const AUDIO_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;
  writeFileSync(MANIFEST_PATH, manifestSource, "utf8");

  console.log(`\n生成 ${generated} 条，复用 ${skipped} 条，共 ${lines.size} 条台词。`);
  console.log(`清单写入 ${MANIFEST_PATH}`);
}

main();
