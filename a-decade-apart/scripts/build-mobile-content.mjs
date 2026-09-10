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
// 不打进移动端包的书。中国区应用商店不接受宗教内容，《路得记》先从 App 里拿下来。
// 注意这是"不打包"而不是"隐藏入口"——内容压根不生成 apps/mobile/content/books/ruth.json，
// 也不进 index.json，所以 bundle 里搜不到任何相关文本，不是靠 UI 藏起来的。
//
// 源文件 content/books/ruth/reading.js 原样保留，网页版照常读它（网页版不上架，
// 不受这条限制）。以后要放回 App：把 slug 从下面这个 Set 里删掉，重跑本脚本，
// 再把 apps/mobile/content/books.ts 里那三处 ruth 的注释解开即可。
const MOBILE_EXCLUDED_BOOKS = new Set(["ruth"]);

const MOBILE = join(ROOT, "..", "apps", "mobile", "content");
const pairs = [
  [join(DIR, "dictionary.js"), "WORD_DICT", join(MOBILE, "word-dict.json")],
  [join(DIR, "audio-manifest.js"), "AUDIO_MANIFEST", join(MOBILE, "remote-audio-manifest.json")],
  [join(DIR, "word-audio-manifest.js"), "WORD_AUDIO_MANIFEST", join(MOBILE, "word-audio-manifest.json")],
];
// 被排除的书，它们的台词原文也不能跟着配音清单进包——AUDIO_MANIFEST 的 key 就是
// 原文本身，只删 books/<slug>.json 的话，整本经文照样躺在 remote-audio-manifest.json
// 里，等于书没拿掉。这里把它们的文本收集出来，从清单里剔掉。
function excludedBookTexts() {
  const texts = new Set();
  // 这里不能用下面的 BOOKS_SRC：那个 const 定义在本函数之后，暂时性死区会报错。
  const booksDir = join(DIR, "books");
  if (!existsSync(booksDir)) return texts;
  for (const slug of MOBILE_EXCLUDED_BOOKS) {
    const f = join(booksDir, slug, "reading.js");
    if (!existsSync(f)) continue;
    const sb = {}; vm.createContext(sb);
    vm.runInContext(readFileSync(f, "utf8"), sb);
    const g = slug.toUpperCase().replace(/-/g, "_") + "_CONTENT";
    const book = vm.runInContext(`${g};`, sb);
    for (const ch of book.chapters || []) for (const v of ch.verses || []) if (v.en) texts.add(v.en);
  }
  return texts;
}
const EXCLUDED_TEXTS = excludedBookTexts();

const tokenize = (t) => (String(t || "").toLowerCase().match(/[a-z]+'?[a-z]*/g) || []);

// 词典里那些只有被排除的书才会用到的词（moab、boaz、moabitess、ephrathah……）也得
// 剔掉，否则书拿走了，专有名词连着中文释义还躺在 word-dict.json 里。
// 但不能把被排除书用过的词全删——land、field、home 这类通用词别的书同样在用。
// 判断标准：这个词在"会进包的内容"里还出现吗？出现就留下。
function excludedOnlyWords() {
  if (!EXCLUDED_TEXTS.size) return new Set();
  const suspect = new Set();
  for (const t of EXCLUDED_TEXTS) for (const w of tokenize(t)) suspect.add(w);
  // 会进包的内容：主线全部台词 + 过滤后仍在配音清单里的台词（覆盖第二本书起）。
  const kept = new Set();
  for (const scene of content.scenes) {
    for (const node of Object.values(scene.nodes)) {
      for (const w of tokenize(node.npcLine && node.npcLine.en)) kept.add(w);
      for (const c of node.choices || []) for (const w of tokenize(c.text)) kept.add(w);
    }
  }
  const fullAudio = globalFromScript(join(DIR, "audio-manifest.js"), "AUDIO_MANIFEST");
  for (const text of Object.keys(fullAudio)) {
    if (EXCLUDED_TEXTS.has(text)) continue;
    for (const w of tokenize(text)) kept.add(w);
  }
  // 还要算上未被排除的第二本书起——它们有些台词没配音，不在 AUDIO_MANIFEST 里，
  // 只靠上面两项会漏掉（贝克街的 servant 就是这么被误判成"路得记专属词"的）。
  const booksDir2 = join(DIR, "books");
  if (existsSync(booksDir2)) {
    for (const slug of readdirSync(booksDir2).sort()) {
      if (MOBILE_EXCLUDED_BOOKS.has(slug)) continue;
      const dir = join(booksDir2, slug);
      const srcs = readdirSync(dir).filter((f) => /^chapter\d+\.js$/.test(f) || f === "reading.js");
      if (!srcs.length) continue;
      const sb = {}; vm.createContext(sb);
      for (const f of srcs) vm.runInContext(readFileSync(join(dir, f), "utf8"), sb);
      const g = slug.toUpperCase().replace(/-/g, "_") + "_CONTENT";
      let book;
      try { book = vm.runInContext(`${g};`, sb); } catch { continue; }
      // 改写课程和原文读本结构不同，索性把整本序列化后扫一遍词，宁可多留不可误删。
      for (const w of tokenize(JSON.stringify(book))) kept.add(w);
    }
  }
  for (const w of kept) suspect.delete(w);
  return suspect;
}
const EXCLUDED_WORDS = excludedOnlyWords();
if (EXCLUDED_WORDS.size) {
  console.log(`  只属于不打包书籍的词：${EXCLUDED_WORDS.size} 个（${[...EXCLUDED_WORDS].slice(0, 8).join(", ")}${EXCLUDED_WORDS.size > 8 ? " …" : ""}）`);
}

for (const [src, name, out] of pairs) {
  try {
    let data = globalFromScript(src, name);
    // 整句配音清单：key 是台词原文，按整句剔除。
    if (out.endsWith("remote-audio-manifest.json") && EXCLUDED_TEXTS.size) {
      const before = Object.keys(data).length;
      data = Object.fromEntries(Object.entries(data).filter(([text]) => !EXCLUDED_TEXTS.has(text)));
      const removed = before - Object.keys(data).length;
      if (removed) console.log(`  配音清单已剔除 ${removed} 条（来自不打包的书：${[...MOBILE_EXCLUDED_BOOKS].join("、")}）`);
    }
    // 词典和单词发音表：key 是单个词，按上面算出的"专属词"剔除。
    if ((out.endsWith("word-dict.json") || out.endsWith("word-audio-manifest.json")) && EXCLUDED_WORDS.size) {
      const before = Object.keys(data).length;
      data = Object.fromEntries(Object.entries(data).filter(([w]) => !EXCLUDED_WORDS.has(w.toLowerCase())));
      const removed = before - Object.keys(data).length;
      if (removed) console.log(`  ${out.endsWith("word-dict.json") ? "词典" : "单词发音表"}已剔除 ${removed} 条`);
    }
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
    if (MOBILE_EXCLUDED_BOOKS.has(slug)) continue;
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
    if (MOBILE_EXCLUDED_BOOKS.has(slug)) continue;
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
