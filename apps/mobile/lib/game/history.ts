// 对话历史回放：derive-don't-store，跟网页版 main.js 的 buildHistory() 同一个思路——
// 场景内的节点靠 node.next 串成固定路径（不管答错重试几次，next 都指向同一个下一
// 节点），所以"到目前为止读过的所有台词"完全可以从 content + 当前进度（sceneIndex/
// nodeId）现算出来，不需要另外记一份历史日志、也不会跟真实进度不同步。
import type { Choice, GameContent, SceneNode } from "./types";

export interface HistoryEntry {
  sceneIndex: number;
  sceneId: string;
  sceneTitle: string;
  sceneSubtitle: string;
  avatar: string;
  npcEn: string;
  npcZh: string;
  answerEn: string;
  answerZh: string;
}

// 供主游戏页"回顾模式"（PREV/NEXT 翻页）用：只收录玩家已经"答对走过"的节点，
// 跟网页版 main.js 的 buildHistory() 严格对齐——算到 currentNodeId 为止但不包含它
// 本身（那一句还没作答，不该能翻回去看，翻回去看会跟"这题还没答"的状态矛盾）。
export function buildHistory(
  content: GameContent,
  uptoSceneIndex: number,
  currentNodeId: string,
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (let i = 0; i <= uptoSceneIndex && i < content.scenes.length; i++) {
    const scene = content.scenes[i];
    const isCurrentScene = i === uptoSceneIndex;
    let nodeId: string | null = scene.startNode;
    while (nodeId) {
      const node: SceneNode | undefined = scene.nodes[nodeId];
      if (!node) break;
      if (isCurrentScene && nodeId === currentNodeId) break;
      const correctChoice = node.choices.find((c: Choice) => c.correct);
      entries.push({
        sceneIndex: i,
        sceneId: scene.id,
        sceneTitle: scene.title,
        sceneSubtitle: scene.subtitle,
        avatar: node.avatar || scene.avatar,
        npcEn: node.npcLine.en,
        npcZh: node.npcLine.zh,
        answerEn: correctChoice?.text ?? "",
        answerZh: correctChoice?.zh ?? node.npcLine.zh,
      });
      nodeId = node.next;
    }
  }
  return entries;
}

// 供"全部对话"页用：跟网页版 dialogue.js 的 buildLines() 一样，是完整剧本总览，
// 不跟玩家进度挂钩——摊平全部场景的每一句台词（不管读没读到过）。这跟上面的
// buildHistory()（只看"已经走过的进度"）是两个不同用途的函数，别混用。
export function buildFullScript(content: GameContent): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (let sceneIndex = 0; sceneIndex < content.scenes.length; sceneIndex++) {
    const scene = content.scenes[sceneIndex];
    let nodeId: string | null = scene.startNode;
    while (nodeId) {
      const node: SceneNode | undefined = scene.nodes[nodeId];
      if (!node) break;
      const correctChoice = node.choices.find((c: Choice) => c.correct);
      entries.push({
        sceneIndex,
        sceneId: scene.id,
        sceneTitle: scene.title,
        sceneSubtitle: scene.subtitle,
        avatar: node.avatar || scene.avatar,
        npcEn: node.npcLine.en,
        npcZh: node.npcLine.zh,
        answerEn: correctChoice?.text ?? "",
        answerZh: correctChoice?.zh ?? node.npcLine.zh,
      });
      nodeId = node.next;
    }
  }
  return entries;
}
