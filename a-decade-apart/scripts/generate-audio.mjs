// 配音生成脚本：本地神经网络 TTS 把 content 里所有英文台词
// （NPC 台词 + 玩家选项 + 词汇库）批量转成压缩音频，并写出一份文本→文件名的清单
// （content/audio-manifest.js），供 main.js 在运行时按文本查找对应音频播放。
//
// 用法：node scripts/generate-audio.mjs
// 只会重新生成"文本变化过"或"音频文件缺失"的条目，已存在且文本没变的不会重新合成。
//
// 依赖：scripts/.venv-tts（Python 3.12 venv），装了 mlx-audio + misaki[en]，
// 首次跑 `python -m mlx_audio.tts.generate ...` 时会自动从 HuggingFace 拉模型权重
// 到 ~/.cache/huggingface（Kokoro-82M 约 300MB，Chatterbox 约 2GB），需要联网。
// 建环境：
//   /opt/homebrew/opt/python@3.12/bin/python3.12 -m venv scripts/.venv-tts
//   scripts/.venv-tts/bin/pip install mlx-audio "misaki[en]"

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
const AUDIO_DIR = join(ROOT, "content", "audio");
const MANIFEST_PATH = join(ROOT, "content", "audio-manifest.js");

const VENV_PYTHON = join(__dirname, ".venv-tts", "bin", "python");
const KOKORO_MODEL = "prince-canuma/Kokoro-82M";

// 路人 NPC（机场官员/司机/店员等）统一用 Kokoro 英式男声——量大、要快、不追求个性。
// 玩家选项/词汇统一用 Kokoro 美式男声（男主视角——玩家是男生，跟 Emma 是异性关系，
// 声音不能配成女声，不然听起来会像同性）。
// 剧情里固定的女性角色台词（chapter*.js 里手动标了 npcLine.voice 的几句）单独分配
// Kokoro 自带的英式女声，跟路人 NPC 区分开，各角色之间也用不同音色区分：
//   - Emma（女主角）→ bf_emma
//   - Ho太太（贯穿全剧的邻居老太太）→ bf_alice
//   - 剧情里出现的女医生 → bf_lily
//   - 剧情里出现的女性职员/官员（市政厅、移民局、酒店前台等）→ bf_isabella
// （曾试过用 Chatterbox 做更有情感起伏的声线，但它在本机跑单句要卡好几分钟，
// 性价比太低，先放弃——如果以后想再试，mlx-audio 已经装好了，模型是
// ResembleAI/chatterbox，直接加回 synth() 的分支即可。）
const NPC_VOICE = { voice: "bm_george", langCode: "b" };
const PLAYER_VOICE = { voice: "am_puck", langCode: "a" };
const NAMED_VOICES = {
  emma: { voice: "bf_emma", langCode: "b" },
  ho: { voice: "bf_alice", langCode: "b" },
  doctor: { voice: "bf_lily", langCode: "b" },
  official: { voice: "bf_isabella", langCode: "b" }
};

function loadGameContent() {
  const sandbox = {};
  vm.createContext(sandbox);
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
        setLine(choice.text, "player");
      }
    }
  }
  for (const item of content.vocabBank) {
    setLine(item.en, "player");
  }
  return lines;
}

// 调用 mlx-audio 的 CLI 合成一句台词。--join_audio 强制把内部按标点切出的多个
// 分句合并成一个文件，输出文件名固定为 `${prefix}.wav`，不会带 _000 这种序号后缀。
function runMlxAudio(args, outPrefix) {
  execFileSync(
    VENV_PYTHON,
    ["-m", "mlx_audio.tts.generate", "--join_audio", "--audio_format", "wav", "--file_prefix", outPrefix, ...args],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
}

function synth(text, speaker, voiceTag, outPath) {
  const tmpWav = outPath.replace(/\.m4a$/, "");
  const v = NAMED_VOICES[voiceTag] || (speaker === "npc" ? NPC_VOICE : PLAYER_VOICE);
  runMlxAudio(
    ["--model", KOKORO_MODEL, "--text", text, "--voice", v.voice, "--lang_code", v.langCode],
    tmpWav
  );
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", `${tmpWav}.wav`, outPath]);
  unlinkSync(`${tmpWav}.wav`);
}

function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const content = loadGameContent();
  const lines = collectLines(content);

  const manifest = {};
  let generated = 0;
  let skipped = 0;

  for (const [text, { speaker, voice }] of lines) {
    const filename = `${slugify(text)}.m4a`;
    const outPath = join(AUDIO_DIR, filename);
    manifest[text] = `content/audio/${filename}`;

    if (existsSync(outPath)) {
      skipped++;
      continue;
    }
    synth(text, speaker, voice, outPath);
    generated++;
    process.stdout.write(`✓ [${voice || speaker}] ${text}\n`);
  }

  const manifestSource = `// 由 scripts/generate-audio.mjs 自动生成，不要手改。
// 文本 → 音频文件路径的查找表；main.js 靠原文精确匹配来找对应的配音。
const AUDIO_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;
  writeFileSync(MANIFEST_PATH, manifestSource, "utf8");

  console.log(`\n生成 ${generated} 条，复用 ${skipped} 条，共 ${lines.size} 条台词。`);
  console.log(`清单写入 ${MANIFEST_PATH}`);
}

main();
