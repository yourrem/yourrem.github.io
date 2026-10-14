// Sound effects. Off until enabled in Config (and until the first user
// gesture, per browser autoplay rules). A missing file is a silent no-op.

let unlocked = false;
let enabled = false;
const clips = {};           // id -> HTMLAudioElement

export function initAudio(sfxMap = {}) {
  for (const [id, src] of Object.entries(sfxMap)) {
    try {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = 0.2;
      a.addEventListener("error", () => { delete clips[id]; }, { once: true });
      clips[id] = a;
    } catch { /* ignore */ }
  }
  const unlock = () => { unlocked = true; };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function play(id) {
  if (!unlocked || !enabled) return;
  const clip = clips[id];
  if (!clip) return;
  try {
    clip.currentTime = 0;
    clip.play().catch(() => { /* ignore */ });
  } catch { /* ignore */ }
}

export function setSoundEnabled(value) { enabled = !!value; }
