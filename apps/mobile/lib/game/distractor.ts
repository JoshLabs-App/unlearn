// 第三个选项：从同一段剧情附近别的节点里借一句"语法通顺、但答非所问"的玩家句当干扰项
// （设计精华第 5 条：错误选项不能靠常识排除，要逼玩家真的读懂 NPC 那句话）。
// 内容里现有的两个选项大多一眼能排除，这一条在渲染时动态补上，不改内容文件。
// 逻辑与 a-decade-apart/main.js 的 pickContextualDistractor 相同，改一处同步另一处。
//
// 2026-09-07：原来每个节点各自独立挑"语境重叠最少"的一句，谁也不知道别人挑了什么，
// 结果同一句会被反复借用——福尔摩斯那本只有 10 幕、44 个节点，实测只用到 28 句，
// 最多一句出现 4 次，第 1 课连着两题都是同一句。改成整本书一次性分配：按节点顺序
// 贪心，优先借"还没被用过"的句子，用过次数相同时才比语境重叠。结果按 content 缓存，
// 同一份内容每次算出来都一样，重渲染不会换来换去。
import type { GameContent, SceneNode } from "./types";

const WINDOW = 10; // 只在前后 10 幕内借句子，保证词汇难度接近
const MIN_WORDS = 4; // 太短的句子（"Sure!"）放到哪都像对的，不借

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function words(text: string): string[] { return text.toLowerCase().match(/[a-z]+'?[a-z]*/g) || []; }

export interface ExtraChoice { text: string; zh?: string }

interface NodeInfo {
  sceneIndex: number;
  nodeId: string;
  node: SceneNode;
  right: { text: string; zh?: string };
  ws: string[];
  isQuestion: boolean;
}

// 每份内容算一次就够，用 WeakMap 挂在 content 上：换书自动分开，内容对象被回收时一起释放。
const cache = new WeakMap<GameContent, Map<string, ExtraChoice>>();

function buildAssignment(content: GameContent): Map<string, ExtraChoice> {
  const infos: NodeInfo[] = [];
  content.scenes.forEach((scene, sceneIndex) => {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      const right = node.choices.find((c) => c.correct);
      if (!right) continue;
      infos.push({
        sceneIndex, nodeId, node,
        right: { text: right.text, zh: right.zh },
        ws: words(right.text),
        isQuestion: /\?$/.test(right.text.trim()),
      });
    }
  });

  // 每一幕有哪些节点，避免每次都遍历全书找窗口内的候选。
  const byScene = new Map<number, NodeInfo[]>();
  for (const info of infos) {
    const list = byScene.get(info.sceneIndex);
    if (list) list.push(info);
    else byScene.set(info.sceneIndex, [info]);
  }

  const usedCount = new Map<string, number>();
  const result = new Map<string, ExtraChoice>();

  for (const info of infos) {
    const cLen = info.ws.length;
    if (cLen < MIN_WORDS) continue;
    const own = new Set(info.node.choices.map((c) => c.text.trim().toLowerCase()));
    const context = new Set([
      ...words(info.node.npcLine.en),
      ...info.node.choices.flatMap((c) => words(c.text)),
    ]);
    const lo = Math.max(0, info.sceneIndex - WINDOW);
    const hi = Math.min(content.scenes.length - 1, info.sceneIndex + WINDOW);

    const pool: { text: string; zh?: string; used: number; overlap: number }[] = [];
    for (let i = lo; i <= hi; i++) {
      if (i === info.sceneIndex) continue;
      for (const cand of byScene.get(i) ?? []) {
        const ws = cand.ws;
        if (ws.length < MIN_WORDS || ws.length < cLen * 0.6 || ws.length > cLen * 1.5) continue;
        if (own.has(cand.right.text.trim().toLowerCase())) continue;
        // 问句/陈述句形态要一致，不然形态本身就泄露答案
        if (cand.isQuestion !== info.isQuestion) continue;
        // 语境词重叠越少越"答非所问"；同一技能领域（同话题）再加 1 分惩罚
        const overlap =
          ws.filter((w) => w.length > 3 && context.has(w)).length * 2 +
          (cand.node.skill === info.node.skill ? 1 : 0);
        pool.push({
          text: cand.right.text,
          zh: cand.right.zh,
          used: usedCount.get(cand.right.text) ?? 0,
          overlap,
        });
      }
    }
    if (pool.length === 0) continue;

    // 先按"被借用过几次"分层——没用过的永远优先，用完一轮才轮到第二次。
    // 同一层里再按语境重叠挑最"答非所问"的，还并列就用确定性哈希定一个。
    const minUsed = Math.min(...pool.map((p) => p.used));
    const fresh = pool.filter((p) => p.used === minUsed);
    const minOverlap = Math.min(...fresh.map((p) => p.overlap));
    const best = fresh.filter((p) => p.overlap === minOverlap);
    const pick = best[hash(`${info.sceneIndex}:${info.nodeId}`) % best.length];

    usedCount.set(pick.text, (usedCount.get(pick.text) ?? 0) + 1);
    result.set(`${info.sceneIndex}:${info.nodeId}`, { text: pick.text, zh: pick.zh });
  }
  return result;
}

export function pickContextualDistractor(
  content: GameContent,
  sceneIndex: number,
  nodeId: string,
  _node: SceneNode,
): ExtraChoice | null {
  let map = cache.get(content);
  if (!map) {
    map = buildAssignment(content);
    cache.set(content, map);
  }
  return map.get(`${sceneIndex}:${nodeId}`) ?? null;
}
