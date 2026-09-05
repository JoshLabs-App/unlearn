// 把 content/chapter*.js 按加载顺序在沙箱里回放，生成手机端用的 apps/mobile/content/game-content.json。
// 改了任何章节内容（台词、标签、vocabBank）都要重跑一次，不然手机端和网页端不一致。
// 用法：node scripts/build-mobile-content.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "content");
const OUT = join(ROOT, "..", "apps", "mobile", "content", "game-content.json");
const files = readdirSync(DIR).filter((f) => /^chapter\d+\.js$/.test(f)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
const sandbox = {}; vm.createContext(sandbox);
for (const f of files) vm.runInContext(readFileSync(join(DIR, f), "utf8"), sandbox);
const content = vm.runInContext("GAME_CONTENT", sandbox);
const json = JSON.stringify(content);
writeFileSync(OUT, json);
console.log(`已生成 ${OUT}：${files.length} 章，${content.scenes.length} 幕，${content.vocabBank.length} 条 vocabBank，${(json.length / 1024).toFixed(0)} KB`);

// 同步词典和配音清单：手机端的 word-dict.json / remote-audio-manifest.json / word-audio-manifest.json
// 都是网页端对应 .js 文件的 JSON 拷贝，这里一起生成，免得三份数据各改各的。
function globalFromScript(path, name) {
  const sb = {}; vm.createContext(sb);
  vm.runInContext(readFileSync(path, "utf8"), sb);
  return vm.runInContext(`${name};`, sb);
}
const MOBILE = join(ROOT, "..", "apps", "mobile", "content");
const pairs = [
  [join(DIR, "dictionary.js"), "WORD_DICT", join(MOBILE, "word-dict.json")],
  [join(DIR, "audio-manifest.js"), "AUDIO_MANIFEST", join(MOBILE, "remote-audio-manifest.json")],
  [join(DIR, "word-audio-manifest.js"), "WORD_AUDIO_MANIFEST", join(MOBILE, "word-audio-manifest.json")],
];
for (const [src, name, out] of pairs) {
  try {
    const data = globalFromScript(src, name);
    writeFileSync(out, JSON.stringify(data));
    console.log(`已同步 ${out}：${Object.keys(data).length} 条`);
  } catch (e) {
    console.log(`跳过 ${out}：${e.message}`);
  }
}
