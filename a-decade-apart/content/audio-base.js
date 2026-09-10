// 音频托管在 Cloudflare R2（bucket english-game-assets），不在这个仓库里，也不跟着
// Pages 部署——360MB 的 .m4a 塞进 git 只会让每次 clone 都白拉一遍。
//
// 两张 manifest 里存的仍然是网页版的相对路径 "content/audio/xxx.m4a"（生成脚本按
// 网页目录结构写的），而 R2 里的 key 去掉了 "content/" 前缀，所以这里做一次转换。
// app 端是同一套逻辑，见 apps/mobile/content/remoteAudioManifest.ts 的 toRemoteUrl()
// ——两边保持一致，将来换 bucket 或给 bucket 绑自定义域名，各改一行就行。
//
// 为什么是 R2 不是 Pages：Pages 对 HTTP Range 请求只回 200 全量，而 iOS 的 AVPlayer
// 在线播放要求 206 分段响应，导致 iPhone 上远程配音全部加载失败；R2 正常支持 Range。
const AUDIO_BASE = "https://pub-4fe761ea13094f5daf3edbaf403234ce.r2.dev/";

function audioUrl(relPath) {
  if (!relPath) return relPath;
  if (/^https?:/.test(relPath)) return relPath; // 已经是绝对地址就原样返回
  return AUDIO_BASE + relPath.replace(/^content\//, "");
}
