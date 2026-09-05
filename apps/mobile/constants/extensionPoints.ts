// Phase 2/3 roadmap, kept as a single source of truth so it's easy to find what's
// intentionally deferred (see app/(tabs)/more.tsx for the corresponding "coming soon"
// stub UI, and the Phase 1 plan doc for the full scope decision).
export const PHASE_2_FEATURES = [
  "achievements-wall", // main.js ACHIEVEMENTS / checkAchievements() / showAchievementToast()
  "leaderboard-ui", // gameSync.fetchLeaderboard() already wired; needs a ranked list screen
  "avatar-upload-crop", // main.js character-overlay + avatarUploadInput
  "dialogue-history-replay", // main.js buildHistory()/renderHistoryView() (dialogue.html on web)
  "chapters-2-7", // content/chapter2.ts..chapter7.ts, same GameContent shape as chapter1.ts
  "word-tap-lookup", // main.js showWordPopup()/queueWordForReview() — adds ReviewItem.kind:"word"
] as const;
