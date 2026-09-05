// 远程配音查找表：text -> 网站上那份 .m4a 的相对路径（不是本地打包的 require()
// 资源）。移植自 a-decade-apart/content/audio-manifest.js 的完整版（11081 条，
// 覆盖全部 94 章），跟 content/audioManifest.ts（只有第一章、本地打包）分工不同：
// 本地包只塞得下一章的音频，塞全部 94 章体积太大；这份只是文本，体积很小（~1MB），
// 换来的是"能播放的范围"覆盖到全部章节——找不到本地资源时，去这张表查相对路径，
// 拼上网站域名当作远程 URL 播放（见 lib/game/audio.ts）。
import raw from "./remote-audio-manifest.json";
import wordAudioRaw from "./word-audio-manifest.json";

export const remoteAudioManifest: Record<string, string> = raw;

// 单词级发音，跟整句配音是两张独立的表（移植自 content/word-audio-manifest.js）——
// key 是单词原文（小写），不是整句文本，查词弹出释义的同时读这张表。
export const wordAudioManifest: Record<string, string> = wordAudioRaw;

// 音频托管在 Cloudflare R2（bucket english-game-assets，公开开发地址 pub-xxx.r2.dev）。
// 之前指向 Pages 静态站（unlearn-eng.pages.dev），但 Pages 对 HTTP Range 请求只回
// 200 全量，iOS 的 AVPlayer 在线播放要求 206 分段响应，导致 iPhone 上远程配音全部
// 加载失败；R2 正常支持 Range。manifest 里的路径是网页版相对路径
// "content/audio/xxx.m4a"，R2 里的 key 是 "audio/xxx.m4a"，拼 URL 时去掉 "content/"。
// 注意：r2.dev 开发地址 Cloudflare 标注有限速、不建议正式环境长期使用，以后有自己的
// 域名可以给 bucket 绑定自定义域名后只改这一行。
export const AUDIO_SITE_BASE = "https://pub-4fe761ea13094f5daf3edbaf403234ce.r2.dev/";

function toRemoteUrl(relPath: string): string {
  return AUDIO_SITE_BASE + relPath.replace(/^content\//, "");
}

export function remoteAudioUrl(text: string): string | null {
  const relPath = remoteAudioManifest[text];
  if (!relPath) return null;
  return toRemoteUrl(relPath);
}

export function remoteWordAudioUrl(word: string): string | null {
  const relPath = wordAudioManifest[word.toLowerCase()];
  if (!relPath) return null;
  return toRemoteUrl(relPath);
}
