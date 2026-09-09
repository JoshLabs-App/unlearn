// 书架：一个 App 多本书（设计文档"平台架构决策"+原则 9）。分级引擎、grammarTag 体系、
// 复习引擎跨书复用，但每本书的进度、技能、复习队列各自独立——第二本书不挂在第一本书
// 的课号序列后面。
//
// 主线「十年之约」是内容层的历史主角，直接用 game-content.json（GAME_CONTENT 那份）；
// 第二本书起走 content/books/<slug>.json，由 a-decade-apart/scripts/build-mobile-content.mjs
// 从 a-decade-apart/content/books/<slug>/chapter*.js 生成。加新书只要往那个目录放章节文件，
// 重跑打包脚本，这里不用改代码。
import type { GameContent } from "@/lib/game/types";

import mainContent from "./game-content.json";
import bookIndex from "./books/index.json";
import bakerStreet from "./books/baker-street.json";
import ruth from "./books/ruth.json";

export const MAIN_BOOK_ID = "a-decade-apart";

export interface BookChapter {
  index: number;
  title: string;
  subtitle: string;
  /** 这一章从第几幕开始（0 基）。 */
  startScene: number;
  sceneCount: number;
}

export interface BookMeta {
  id: string;
  title: string;
  titleEn: string;
  /** 建议起步等级（A1/A2/…）。全开放不锁，只作为难度标签展示。 */
  minLevel: string;
  /** 改编来源署名，原创作品为 null。 */
  basedOn: string | null;
  chapters: number;
  scenes: number;
  emoji: string;
  /** 书架上的一句话介绍。 */
  blurb: string;
  /** 书架标签，如"第一部 · A1 起步"。 */
  tag: string;
  /** 读完当前已上线内容后，结算页显示的收尾语——每本书各写各的，不能共用主线那段。 */
  outro: string;
  /** 章节索引，由 build-mobile-content.mjs 从各章文件的 @chapter-title 注释生成。 */
  chapterList: BookChapter[];
  /**
   * 连载 = 一条线从头讲到尾，跳章看不懂，不给章节跳转入口；
   * 短篇集 = 一章一个独立故事，可以从任意一章读起。
   */
  serial: boolean;
  /**
   * 内容形态。"story" 是改写成对话体的课程（选台词、答错进复习队列、有分级校验）；
   * "reading" 是原文阅读本（一个字不改，配中文对照和逐节朗读，没有产出环节）。
   * 书架和路由靠它决定跳游戏页还是阅读页。
   */
  kind: "story" | "reading";
}

// 第二本书起的静态内容表。文件名即 slug，跟 books/index.json 里的 id 对应。
const BOOK_CONTENT: Record<string, unknown> = {
  "baker-street": bakerStreet,
  ruth,
};

const MAIN_BOOK: BookMeta = {
  id: MAIN_BOOK_ID,
  title: "十年之约",
  titleEn: "A Decade Apart",
  minLevel: "A1",
  basedOn: null,
  chapters: 95,
  scenes: (mainContent as unknown as GameContent).scenes.length,
  emoji: "💌",
  serial: true,
  kind: "story",
  chapterList: [],
  tag: "第一部 · A1 起步",
  blurb:
    "十年前的一封信、一个旧地址。你落地多伦多，从海关的第一句对话开始，一路找到那个等着被找到的人。",
  outro:
    "你在多伦多安顿了下来——开了账户、租了房、认识了室友——但那张旧照片和地址一直没放下。今晚，你决定明天就去看看。",
};

// 第二本书起的展示文案。内容本身（章节、台词）来自 books/<slug>.json，这里只放
// 书架上的门面：emoji 封面、标签、一句话介绍。
const PRESENTATION: Record<
  string,
  { emoji: string; tag: string; blurb: string; outro: string; serial: boolean }
> = {
  // 路得记：原文阅读本，不改写一个字。对外只当一个故事讲，不在界面上谈译本和版权
  // （那些写在内容文件的注释里，给我们自己看）。
  ruth: {
    emoji: "🌾",
    serial: false,
    tag: "原文阅读 · B1",
    blurb:
      "饥荒年间，一个外族女子失去了丈夫，却选择跟着婆婆回到陌生的家乡。她在别人的麦田里拾穗谋生，遇见了那块地的主人。85 节，原文不改写，配中文对照和逐节朗读。",
    outro: "读完了。一个关于忠诚和恩慈的古老故事，也是少数以女子命名、从头到尾没有战争的一卷。",
  },
  "baker-street": {
    emoji: "🔍",
    serial: false,
    tag: "第二部 · A2 起步",
    blurb:
      "1881 年的伦敦。你是刚从战场退伍的华生医生，在贝克街遇见一个能一眼看穿你的人。一章一个案子，从哪一章读起都行。",
    // 这本书还在连载，收尾语要留出口气——不能写成"全书完"，也不能烂尾在半空。
    outro:
      "又一个案子结了。你从一个刚退伍、连住处都没有的军医，变成了那个能跟上他推理的人。楼下门房捧着一顶旧帽子和一只鹅在等着，下一章就从那只鹅开始。",
  },
};

export const BOOKS: BookMeta[] = [
  MAIN_BOOK,
  ...(bookIndex as (Omit<BookMeta, "emoji" | "tag" | "blurb" | "kind"> & {
    kind?: "story" | "reading";
  })[]).map((b) => {
    const kind = b.kind ?? "story";
    return {
      ...b,
      kind,
      emoji: PRESENTATION[b.id]?.emoji ?? "📖",
      tag: PRESENTATION[b.id]?.tag ?? `${b.minLevel} 起步`,
      blurb: PRESENTATION[b.id]?.blurb ?? "",
      outro: PRESENTATION[b.id]?.outro ?? "这一段读完了。下一章还在写，先回书架看看别的。",
      serial: PRESENTATION[b.id]?.serial ?? true,
      // 阅读本的 chapters 是「章 → 节」，不是课程那种带 startScene 的幕索引，
      // 章节跳转由阅读页自己处理，这里留空。
      chapterList:
        kind === "reading"
          ? []
          : ((getBookContent(b.id) as unknown as { chapters?: BookChapter[] }).chapters ?? []),
    };
  }),
];

export function getBookMeta(id: string): BookMeta {
  return BOOKS.find((b) => b.id === id) ?? MAIN_BOOK;
}

export function getBookContent(id: string): GameContent {
  if (id === MAIN_BOOK_ID) return mainContent as unknown as GameContent;
  const raw = BOOK_CONTENT[id];
  if (!raw) return mainContent as unknown as GameContent;
  return raw as GameContent;
}
