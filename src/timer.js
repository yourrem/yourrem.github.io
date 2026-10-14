// Play-time counter: H:MM:SS, persisted across visits via localStorage.

const KEY = "ff7site.playtime";
let total = 0;

function readStored() {
  try {
    const v = parseInt(localStorage.getItem(KEY) || "0", 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch { return 0; }
}

function store(seconds) {
  try { localStorage.setItem(KEY, String(seconds)); } catch { /* ignore */ }
}

export function timeText() {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function initTimer(onTick) {
  total = readStored();
  setInterval(() => {
    total += 1;
    store(total);
    onTick(timeText());
  }, 1000);
}
