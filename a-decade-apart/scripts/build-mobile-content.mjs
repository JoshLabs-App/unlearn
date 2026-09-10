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

// —— 第二本书起：content/books/<slug>/chapter*.js 各自产出 apps/mobile/content/books/<slug>.json ——
// 每本书是独立的全局变量（BAKER_STREET_CONTENT 这种），不往 GAME_CONTENT 上 push，
// 复现窗口/课号/入门 tier 都按书独立算（设计文档原则 9）。
import { existsSync, mkdirSync } from "node:fs";
const BOOKS_SRC = join(DIR, "books");
if (existsSync(BOOKS_SRC)) {
  const outDir = join(MOBILE, "books");
  mkdirSync(outDir, { recursive: true });
  const index = [];
  for (const slug of readdirSync(BOOKS_SRC).sort()) {
    const bookDir = join(BOOKS_SRC, slug);
    const chapters = readdirSync(bookDir)
      .filter((f) => /^chapter\d+\.js$/.test(f))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
    if (!chapters.length) continue;
    const sb = {}; vm.createContext(sb);
    const global = slug.toUpperCase().replace(/-/g, "_") + "_CONTENT";
    // 一边加载一边记每章占了哪几幕：短篇集要在书籍详情页列出章节让人跳着读
    // （"从哪一章读起都行"这句话得有对应的入口，不然就是文案超过实际功能）。
    // 章节标题从文件头的 @chapter-title / @chapter-subtitle 注释取。
    const chapterIndex = [];
    for (const f of chapters) {
      const src = readFileSync(join(bookDir, f), "utf8");
      const before = (() => {
        try { return vm.runInContext(`${global}.scenes.length`, sb); } catch { return 0; }
      })();
      vm.runInContext(src, sb);
      const after = vm.runInContext(`${global}.scenes.length`, sb);
      const title = src.match(/@chapter-title\s+(.+)/)?.[1]?.trim();
      const subtitle = src.match(/@chapter-subtitle\s+(.+)/)?.[1]?.trim();
      chapterIndex.push({
        index: chapterIndex.length + 1,
        title: title || `第 ${chapterIndex.length + 1} 章`,
        subtitle: subtitle || "",
        startScene: before,
        sceneCount: after - before,
      });
    }
    const book = vm.runInContext(`${global};`, sb);
    book.chapters = chapterIndex;
    const out = join(outDir, `${slug}.json`);
    writeFileSync(out, JSON.stringify(book));
    index.push({
      id: book.bookId || slug,
      title: book.bookTitle,
      titleEn: book.bookTitleEn,
      minLevel: book.minLevel,
      basedOn: book.basedOn || null,
      chapters: chapters.length,
      scenes: book.scenes.length,
    });
    console.log(`已生成 ${out}：${chapters.length} 章，${book.scenes.length} 幕`);
  }
  writeFileSync(join(outDir, "index.json"), JSON.stringify(index));
  console.log(`已生成书目索引：${index.map((b) => b.title).join("、")}`);
}

// —— 原文阅读本：content/books/<slug>/reading.js → apps/mobile/content/books/<slug>.json ——
// 跟改写课程不是一种东西（章→节，没有选项和 grammarTag），但同样放 books 目录下，
// 靠 kind: "reading" 区分。书目索引里也标上 kind，书架据此决定跳阅读页还是游戏页。
if (existsSync(BOOKS_SRC)) {
  const outDir = join(MOBILE, "books");
  const idxPath = join(outDir, "index.json");
  const index = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, "utf8")) : [];
  for (const slug of readdirSync(BOOKS_SRC).sort()) {
    const f = join(BOOKS_SRC, slug, "reading.js");
    if (!existsSync(f)) continue;
    const sb = {}; vm.createContext(sb);
    vm.runInContext(readFileSync(f, "utf8"), sb);
    const global = slug.toUpperCase().replace(/-/g, "_") + "_CONTENT";
    const book = vm.runInContext(`${global};`, sb);
    const verses = book.chapters.reduce((n, c) => n + c.verses.length, 0);
    writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(book));
    if (!index.some((b) => b.id === (book.bookId || slug))) {
      index.push({
        id: book.bookId || slug,
        title: book.bookTitle,
        titleEn: book.bookTitleEn,
        minLevel: book.minLevel,
        basedOn: book.source || null,
        kind: "reading",
        chapters: book.chapters.length,
        scenes: verses,
      });
    }
    console.log(`已生成 ${join(outDir, slug + ".json")}：${book.chapters.length} 章，${verses} 节（原文阅读本）`);
  }
  writeFileSync(idxPath, JSON.stringify(index));
}
