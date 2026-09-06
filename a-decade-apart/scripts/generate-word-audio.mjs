// 单词发音生成脚本：给 content/dictionary.js 里 WORD_DICT 的每一个 key 单独
// 合成一句发音（本地 Qwen3-TTS，同 scripts/generate-audio.mjs 的引擎/环境，
// 批量合成在 scripts/tts_qwen3.py），
// 写出 content/word-audio-manifest.js（单词 → 音频文件路径查找表），
// 供 main.js 的 showWordPopup() 在弹出释义的同时播放这个词的发音。
//
// 跟句子配音（AUDIO_MANIFEST）是两套独立的清单/目录，互不覆盖：
//   句子音频 → content/audio/ + content/audio-manifest.js
//   单词音频 → content/word-audio/ + content/word-audio-manifest.js
//
// 用法：node scripts/generate-word-audio.mjs [--out-dir content/word-audio-new] [--limit N]
// 只会重新生成"缺失"的单词音频，已存在的不重新合成（WORD_DICT 的 key 不会变已有释义就不用重跑）。

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DICT_PATH = join(ROOT, "content", "dictionary.js");
const MANIFEST_PATH = join(ROOT, "content", "word-audio-manifest.js");
const VENV_PYTHON = join(__dirname, ".venv-tts", "bin", "python");
const TTS_SCRIPT = join(__dirname, "tts_qwen3.py");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const AUDIO_DIR = argValue("--out-dir") ? join(process.cwd(), argValue("--out-dir")) : join(ROOT, "content", "word-audio");
const LIMIT = argValue("--limit") ? Number(argValue("--limit")) : undefined;
// 单词发音统一用玩家台词的那个男声（tts_qwen3.py 里 role=word，跟 player 同一音色），
// 保持声音风格一致——路人 NPC 的男声、Emma 的女声都不适合当作"中性词典发音"。

function loadWordDict() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(DICT_PATH, "utf8"), sandbox);
  return vm.runInContext("WORD_DICT;", sandbox);
}

function slugify(word) {
  const base = word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 40);
  const hash = createHash("md5").update(word).digest("hex").slice(0, 8);
  return `${base || "word"}-${hash}`;
}

function synthBatch(jobs) {
  if (jobs.length === 0) return;
  const jobsPath = join(tmpdir(), `tts-word-jobs-${process.pid}.jsonl`);
  writeFileSync(jobsPath, jobs.map((j) => JSON.stringify(j)).join("\n") + "\n", "utf8");
  const args = [TTS_SCRIPT, "--jobs", jobsPath, "--out-dir", AUDIO_DIR];
  if (LIMIT) args.push("--limit", String(LIMIT));
  execFileSync(VENV_PYTHON, args, { stdio: "inherit" });
}

function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const dict = loadWordDict();
  const words = Object.keys(dict);

  const manifest = {};
  const jobs = [];
  let skipped = 0;

  for (const word of words) {
    const filename = `${slugify(word)}.m4a`;
    const outPath = join(AUDIO_DIR, filename);
    manifest[word] = `content/word-audio/${filename}`;

    if (existsSync(outPath)) {
      skipped++;
      continue;
    }
    jobs.push({ text: word, role: "word", out: outPath });
  }
  synthBatch(jobs);
  const generated = jobs.filter((j) => existsSync(j.out)).length;

  const manifestSource = `// 由 scripts/generate-word-audio.mjs 自动生成，不要手改。
// 单词（WORD_DICT 的 key）→ 音频文件路径的查找表；main.js 的 showWordPopup()
// 靠单词原文精确匹配来找对应的发音。
const WORD_AUDIO_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;
  writeFileSync(MANIFEST_PATH, manifestSource, "utf8");

  console.log(`\n生成 ${generated} 条，复用 ${skipped} 条，共 ${words.length} 个单词。`);
  console.log(`清单写入 ${MANIFEST_PATH}`);
}

main();
