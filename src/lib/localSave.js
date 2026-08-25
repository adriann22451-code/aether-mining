const SAVE_KEY = "aether-mining-save-v1";

// Fallback persistence for whenever we're NOT synced to the backend (e.g. the
// game opened as a plain browser link instead of a real Telegram launch, or
// the Supabase call failed). Without this, progress only ever lived in React
// state — gone the instant the tab reloads. This never overrides real
// backend sync; App.jsx only reads/writes it while `isBackendOnline` is false.

export function loadLocalSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null; // corrupted save or storage unavailable (e.g. private browsing) — just start fresh
  }
}

export function saveLocalSave(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // storage full or unavailable — nothing more we can do, fail silently
  }
}
