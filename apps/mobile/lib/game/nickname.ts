// 默认昵称生成：新玩家第一次进来给一个现成的、正面的昵称，而不是一片空白让人
// 自己想——格式固定"情绪/态度形容词 + 水果/蔬菜/动物"（比如"努力的土豆"），
// 组合起来天然带点可爱、鼓励的调性，不需要玩家动脑筋，想改再去"更多"页改。
const MOODS = [
  "努力的",
  "开心的",
  "勇敢的",
  "淡定的",
  "元气满满的",
  "温柔的",
  "机智的",
  "好奇的",
  "坚持的",
  "乐观的",
  "靠谱的",
  "专注的",
  "谦虚的",
  "幽默的",
  "认真的",
  "冷静的",
  "自信的",
  "热心的",
];

const CREATURES = [
  "土豆",
  "西瓜",
  "兔子",
  "番茄",
  "柠檬",
  "松鼠",
  "熊猫",
  "玉米",
  "苹果",
  "猫咪",
  "狐狸",
  "葡萄",
  "南瓜",
  "草莓",
  "考拉",
  "刺猬",
  "菠萝",
  "芒果",
  "浣熊",
  "企鹅",
];

export function generateDefaultNickname(): string {
  const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  const creature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  return mood + creature;
}
