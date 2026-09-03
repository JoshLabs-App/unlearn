// 单词发音生成脚本：给 content/dictionary.js 里 WORD_DICT 的每一个 key 单独
// 合成一句发音（本地 Kokoro，同 scripts/generate-audio.mjs 的模型/环境），
// 写出 content/word-audio-manifest.js（单词 → 音频文件路径查找表），
// 供 main.js 的 showWordPopup() 在弹出释义的同时播放这个词的发音。
//
// 跟句子配音（AUDIO_MANIFEST）是两套独立的清单/目录，互不覆盖：
//   句子音频 → content/audio/ + content/audio-manifest.js
//   单词音频 → content/word-audio/ + content/word-audio-manifest.js
//
// 用法：node scripts/generate-word-audio.mjs
// 只会重新生成"缺失"的单词音频，已存在的不重新合成（WORD_DICT 的 key 不会变已有释义就不用重跑）。

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DICT_PATH = join(ROOT, "content", "dictionary.js");
const AUDIO_DIR = join(ROOT, "content", "word-audio");
const MANIFEST_PATH = join(ROOT, "content", "word-audio-manifest.js");

const VENV_PYTHON = join(__dirname, ".venv-tts", "bin", "python");
const KOKORO_MODEL = "prince-canuma/Kokoro-82M";
// 单词发音统一用玩家的美式男声，跟整句配音里"玩家台词"用的是同一个声线，
// 保持声音风格一致（路人 NPC 的英式男声、Emma 的英式女声都不适合当作
// "中性词典发音"）。
const WORD_VOICE = { voice: "am_puck", langCode: "a" };

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

function runMlxAudio(args, outPrefix) {
  execFileSync(
    VENV_PYTHON,
    ["-m", "mlx_audio.tts.generate", "--join_audio", "--audio_format", "wav", "--file_prefix", outPrefix, ...args],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
}

function synth(word, outPath) {
  const tmpWav = outPath.replace(/\.m4a$/, "");
  runMlxAudio(
    ["--model", KOKORO_MODEL, "--text", word, "--voice", WORD_VOICE.voice, "--lang_code", WORD_VOICE.langCode],
    tmpWav
  );
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", `${tmpWav}.wav`, outPath]);
  unlinkSync(`${tmpWav}.wav`);
}

function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const dict = loadWordDict();
  const words = Object.keys(dict);

  const manifest = {};
  let generated = 0;
  let skipped = 0;

  for (const word of words) {
    const filename = `${slugify(word)}.m4a`;
    const outPath = join(AUDIO_DIR, filename);
    manifest[word] = `content/word-audio/${filename}`;

    if (existsSync(outPath)) {
      skipped++;
      continue;
    }
    synth(word, outPath);
    generated++;
    process.stdout.write(`✓ [word] ${word}\n`);
  }

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
