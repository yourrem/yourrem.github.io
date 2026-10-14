// Sound effects through the Web Audio API: each clip is fetched and decoded
// once into memory, so playing it is instant (an <audio> element re-reads
// its file and lags behind the cursor).
//
// Off until enabled in Config, and silent until the first user gesture
// (browser autoplay rules). A missing file is a silent no-op.

const VOLUME = 0.2;

let ctx = null;
let gain = null;
let enabled = false;
const buffers = {};         // id -> AudioBuffer

function context() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor({ latencyHint: "interactive" });
  gain = ctx.createGain();
  gain.gain.value = VOLUME;
  gain.connect(ctx.destination);
  return ctx;
}

async function load(id, src) {
  try {
    const data = await (await fetch(src)).arrayBuffer();
    // Callback form: Safari's decodeAudioData does not return a promise.
    buffers[id] = await new Promise((ok, fail) => context().decodeAudioData(data, ok, fail));
  } catch { /* missing or undecodable: stay silent */ }
}

export function initAudio(sfxMap = {}) {
  if (!context()) return;
  for (const [id, src] of Object.entries(sfxMap)) load(id, src);
  // The context starts suspended until the user interacts with the page.
  const unlock = () => { if (ctx.state !== "running") ctx.resume(); };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function play(id) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const buffer = buffers[id];
  if (!buffer) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  source.start();
}

export function setSoundEnabled(value) { enabled = !!value; }
