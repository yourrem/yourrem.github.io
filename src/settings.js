// User settings (Config screen): window corner colours, sound, CRT effect.
// Persisted in localStorage and applied to the document.

import { setSoundEnabled } from "./audio.js";

const KEY = "ff7site.settings.v2";   // v2: sound defaults to on

export const DEFAULT_COLORS = {
  tl: [2, 34, 186],
  tr: [2, 24, 145],
  bl: [0, 15, 105],
  br: [0, 3, 50]
};

export const settings = {
  colors: structuredClone(DEFAULT_COLORS),
  sound: true,
  crt: true
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) {
      for (const k of Object.keys(DEFAULT_COLORS)) {
        const c = saved.colors?.[k];
        if (Array.isArray(c) && c.length === 3) settings.colors[k] = c.map((n) => Math.max(0, Math.min(255, n | 0)));
      }
      if (typeof saved.sound === "boolean") settings.sound = saved.sound;
      if (typeof saved.crt === "boolean") settings.crt = saved.crt;
    }
  } catch { /* ignore */ }
  applySettings();
}

export function applySettings() {
  const root = document.documentElement.style;
  for (const [k, [r, g, b]] of Object.entries(settings.colors)) {
    root.setProperty(`--c-${k}`, `rgb(${r}, ${g}, ${b})`);
  }
  document.body.classList.toggle("crt-effect", settings.crt);
  setSoundEnabled(settings.sound);
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export function colorsAreDefault() {
  return JSON.stringify(settings.colors) === JSON.stringify(DEFAULT_COLORS);
}
