// 第三个选项：从同一段剧情附近别的节点里借一句"语法通顺、但答非所问"的玩家句当干扰项
// （设计精华第 5 条：错误选项不能靠常识排除，要逼玩家真的读懂 NPC 那句话）。
// 内容里现有的两个选项大多一眼能排除，这一条在渲染时动态补上，不改内容文件。
// 逻辑与 a-decade-apart/main.js 的 pickContextualDistractor 相同，改一处同步另一处。
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

export function pickContextualDistractor(content: GameContent, sceneIndex: number, nodeId: string, node: SceneNode): ExtraChoice | null {
  const correct = node.choices.find((c) => c.correct);
  if (!correct) return null;
  const cLen = words(correct.text).length;
  if (cLen < MIN_WORDS) return null;
  const own = new Set(node.choices.map((c) => c.text.trim().toLowerCase()));
  const context = new Set([...words(node.npcLine.en), ...node.choices.flatMap((c) => words(c.text))]);
  const lo = Math.max(0, sceneIndex - WINDOW), hi = Math.min(content.scenes.length - 1, sceneIndex + WINDOW);
  const pool: { text: string; zh?: string; overlap: number; key: string }[] = [];
  for (let i = lo; i <= hi; i++) {
    if (i === sceneIndex) continue;
    for (const [nid, n] of Object.entries(content.scenes[i].nodes)) {
      const right = n.choices.find((c) => c.correct);
      if (!right) continue;
      const ws = words(right.text);
      if (ws.length < MIN_WORDS || ws.length < cLen * 0.6 || ws.length > cLen * 1.5) continue;
      if (own.has(right.text.trim().toLowerCase())) continue;
      if (/\?$/.test(right.text.trim()) !== /\?$/.test(correct.text.trim())) continue; // 问句/陈述句形态要一致，不然形态本身泄露答案
      // 语境词重叠越少越"答非所问"；同一技能领域（同话题）再加 1 分惩罚，优先借别的话题的句子
      const overlap = ws.filter((w) => w.length > 3 && context.has(w)).length * 2 + (n.skill === node.skill ? 1 : 0);
      pool.push({ text: right.text, zh: right.zh, overlap, key: `${i}:${nid}` });
    }
  }
  if (pool.length === 0) return null;
  // 优先跟当前语境词汇重叠最少的（最"答非所问"），同分里用确定性哈希挑一个——
  // 同一个节点每次渲染都拿到同一句，不会因为重渲染换来换去。
  const minOverlap = Math.min(...pool.map((p) => p.overlap));
  const best = pool.filter((p) => p.overlap === minOverlap);
  const pick = best[hash(`${sceneIndex}:${nodeId}`) % best.length];
  return { text: pick.text, zh: pick.zh };
}
