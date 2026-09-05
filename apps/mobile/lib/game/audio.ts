// Voice-line playback for dialogue/choices/flashback review. Pattern copied from
// 05JoshMoney/apps/mobile/lib/amount-keypad-feedback.ts: a fresh AudioPlayer per play
// (not a cached/reused one) — on Android, once ExoPlayer reaches the end of a clip,
// calling seekTo(0)+play() on the same instance doesn't reliably restart playback, so
// reusing one player across lines can go silent after the first play.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { audioManifest } from "@/content/audioManifest";
import { remoteAudioUrl, remoteWordAudioUrl } from "@/content/remoteAudioManifest";

// 本地打包音频（require()）是从 app 包里读，2.5s 绰绰有余；但从第一章往后，
// playLine() 全部落到 remoteAudioUrl() 的网络 URL 上（见下方注释），弱网/冷连接
// 随随便便就要好几秒——用同一个超时会导致"能听到的只有第一章"：不是文件缺失，
// 是还没下载完就被当成"加载失败"放弃了。所以远程源给一个宽松得多的超时。
const LOAD_TIMEOUT_MS = 2500;
// 远程音频先下载到本地再播（见 resolveRemoteSource），所以"等加载"的超时只针对
// 本地文件，2.5s 足够；网络那部分的耐心单独放在下载超时里。回顾弹窗、答题
// 反馈都是等发音放完才继续的，这个数直接决定了弱网下玩家最多干等多久。
const DOWNLOAD_TIMEOUT_MS = 6000;
const MAX_PLAYBACK_MS = 8000; // 整句配音比按键音效长，超时上限也放宽一些

let audioModePromise: Promise<void> | null = null;

/** Warms up the audio session. Cheap and idempotent — safe to call repeatedly. */
export function preloadGameAudio(): Promise<void> {
  audioModePromise ??= setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: "mixWithOthers",
  }).catch(() => {
    audioModePromise = null;
  });
  return audioModePromise;
}

// expo-audio's shipped types describe AudioPlayer's own fields but its inherited
// EventEmitter/SharedObject methods don't always resolve cleanly through every tsc
// module setup — describe just what we call here (same workaround as JoshMoney).
interface PlayerHandle {
  addListener(
    event: "playbackStatusUpdate",
    listener: (status: { didJustFinish: boolean }) => void,
  ): { remove(): void };
  release(): void;
}

function waitForLoaded(player: AudioPlayer, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const check = () => {
      // stopCurrent() 可能在两次轮询之间 release() 了这个 player（被更新的一次
      // playLine() 打断）——release 之后的 native shared object 已经不存在，
      // 再摸 .isLoaded 会抛 NativeSharedObjectNotFoundException，没人接住就红屏。
      let loaded: boolean;
      try {
        loaded = player.isLoaded;
      } catch {
        return resolve(false);
      }
      if (loaded) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      setTimeout(check, 32);
    };
    check();
  });
}

function waitForPlaybackToFinish(player: AudioPlayer, token: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subscription.remove();
      resolve();
    };
    const subscription = (player as unknown as PlayerHandle).addListener(
      "playbackStatusUpdate",
      (status) => {
        // 播放期间被新的一次 playLine() 打断（currentToken 已经往前走了）：不等
        // "真的放完"了，直接当作这次结束——不然调用方的 await 会一直卡到这句
        // 本来该放完的时长，明明音已经被换掉了。
        if (status.didJustFinish || token !== currentToken) finish();
      },
    );
    const timeout = setTimeout(finish, MAX_PLAYBACK_MS);
    player.play();
  });
}

// 跟网页版 dialogue.js 的 playLineAudio() 同一个道理：同一时间只应该有一句配音在
// 响。之前这里每次调用都建一个新 player 播放，互不知道对方存在——连点两次台词/
// 选项就会两段音频叠在一起放。现在用一个模块级的"当前播放"引用 + 递增 token，
// 新的一次播放先把上一个 player 停掉再开始，跟单选框一样任何时候只有一个在响。
let currentPlayer: AudioPlayer | null = null;
let currentToken = 0;

function stopCurrent(): void {
  currentToken++;
  if (currentPlayer) {
    try {
      (currentPlayer as unknown as PlayerHandle).release();
    } catch {
      // 已经被系统回收也没关系。
    }
    currentPlayer = null;
  }
}

// 远程配音不能直接把 URL 交给 AVPlayer 流式播放：iOS 的 AVPlayer 在线播放非 HLS 文件
// 要求服务器支持 HTTP Range 分段请求，而托管音频的 Cloudflare Pages 站点对 Range
// 一律回 200 全量（不回 206），AVPlayer 会直接报"操作已停止"、isLoaded 永远不为
// true——表现就是 iPhone 上第一章（本地打包）有声音、第二章往后（远程）全部哑巴。
// Android 的 ExoPlayer 不挑这个，但为了两端行为一致 + 顺带做本地缓存（同一句
// 台词重播/回看不用再下载），统一改成：先把 .m4a 下到 cache 目录，再用本地
// file:// 路径播放；下载失败才退回直接用 URL（Android 上还能救一下）。
// expo-file-system 在 web 上不可用（模块级 new Directory() 直接抛错），而这份代码
// 也会被 `expo start --web` 打进网页包——目录对象必须懒建，web 上整个下载步骤跳过、
// 照旧直接用 URL（浏览器 <audio> 不挑 Range）。
let voiceCacheDir: Directory | null = null;
const inflightDownloads = new Map<string, Promise<string | null>>();

function getVoiceCacheDir(): Directory {
  voiceCacheDir ??= new Directory(Paths.cache, "voice-cache");
  return voiceCacheDir;
}

function cachedFileFor(url: string): File {
  // manifest 里的文件名本身就带了内容哈希（xxx-8位hex.m4a），直接当缓存 key 用，
  // 文本改了/重新配音了文件名一定跟着变，不会命中旧缓存。
  const name = url.slice(url.lastIndexOf("/") + 1);
  return new File(getVoiceCacheDir(), name);
}

// 返回 null 表示"这条音频拿不到"：服务器上没这个文件（404）、下载超时、没网。
// 以前下载失败会退回把 URL 直接交给播放器——iOS 的 AVPlayer 拿到一个 404 页面
// 永远不会 loaded，只能干等满远程加载超时（当时是 10 秒）才放弃；回顾弹窗又是
// 等发音放完才提交答案，表现就是"选完之后卡 10 秒才有反应"。现在下载失败就
// 立刻当作无音频、静音继续，跟本地表里查不到这句是同一种处理，不再死等。
async function resolveRemoteSource(url: string): Promise<string | null> {
  if (Platform.OS === "web") return url;
  let file: File;
  try {
    file = cachedFileFor(url);
  } catch {
    return null;
  }
  try {
    if (file.exists) return file.uri;
  } catch {
    // 读不到缓存状态就当没缓存，下面重新下。
  }
  let pending = inflightDownloads.get(url);
  if (!pending) {
    pending = (async () => {
      try {
        const dir = getVoiceCacheDir();
        if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
        // downloadFileAsync 对非 2xx 响应会直接 reject（iOS/Android 都是），404 走的
        // 就是这条 catch。
        const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
        return downloaded.uri;
      } catch {
        return null;
      } finally {
        inflightDownloads.delete(url);
      }
    })();
    inflightDownloads.set(url, pending);
  }
  // 下载本身没有超时，弱网下可能一直挂着——这里只等有限的时间，超时就当这次
  // 没有音频；下载在后台继续，成功了下次播同一句直接命中缓存。
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), DOWNLOAD_TIMEOUT_MS));
  const inflight: Promise<string | null> = pending;
  return Promise.race([inflight, timeout]);
}

async function playSource(source: number | string, token: number): Promise<void> {
  await preloadGameAudio();
  if (token !== currentToken) return; // 等 preload 的这段时间又被更新的一次打断了
  if (typeof source === "string" && /^https?:/.test(source)) {
    const resolved = await resolveRemoteSource(source);
    if (token !== currentToken) return; // 下载期间被更新的一次打断了
    if (!resolved) return; // 拿不到就静音继续，不把 URL 塞给播放器去死等
    source = resolved;
  }
  const player = createAudioPlayer(source, { keepAudioSessionActive: true });
  currentPlayer = player;
  try {
    if (!(await waitForLoaded(player, LOAD_TIMEOUT_MS))) return;
    if (token !== currentToken) return;
    await waitForPlaybackToFinish(player, token);
  } catch {
    // Non-fatal — a missing/broken clip shouldn't block game progress.
  } finally {
    if (currentPlayer === player) {
      (player as unknown as PlayerHandle).release();
      currentPlayer = null;
    }
  }
}

/**
 * PORTED from a-decade-apart/main.js playAudio(): look up the line's audio by its exact
 * English text, play it, and resolve once playback actually finishes (or immediately if
 * there's no audio for that text — content without a voice line still works, it's just
 * silent, same as the web version's silent no-op). Starting a new playLine()/playWord()
 * call always interrupts whatever is currently playing first.
 */
export async function playLine(text: string): Promise<void> {
  // 本地只打包了第一章的配音（体积原因），后面章节在本地表里查不到时，回落到
  // 网站上那份完整音频（见 content/remoteAudioManifest.ts）——不再是"查不到就
  // 静音"，是"本地没有就去网上读"，跟用户要求的一致。
  const source: number | string | undefined = audioManifest[text] ?? remoteAudioUrl(text) ?? undefined;
  stopCurrent();
  if (!source) return;
  const token = currentToken;
  await playSource(source, token);
}

/** Same interrupt-then-play behaviour as playLine(), for an arbitrary pre-resolved asset. */
export async function playSourceInterrupting(source: number): Promise<void> {
  stopCurrent();
  const token = currentToken;
  await playSource(source, token);
}

/**
 * PORTED from a-decade-apart/main.js showWordPopup()'s playAudio(word, null,
 * WORD_AUDIO_MANIFEST) call: 单词发音跟整句配音是两张独立的表——本地完全没打包
 * 单词音频（4098 个词，体积上不划算），一律走远程 URL。
 */
export async function playWord(word: string): Promise<void> {
  const source = remoteWordAudioUrl(word) ?? undefined;
  stopCurrent();
  if (!source) return;
  const token = currentToken;
  await playSource(source, token);
}
