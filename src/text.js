// Sprite-font text. Every character becomes a .font-glyph span whose
// background is cut from assets/ui/font-spritesheet.png (see css/font.css).
// The real character stays inside the span so text remains readable by
// screen readers and copyable.

const SUPPORTED = new Set(
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzé0123456789" +
  "!@£$%^&*()_+-=[]{};'\\:\"|,./<>?~`#"
);
// Typographic characters the sheet lacks, mapped to their nearest glyph.
const SUBSTITUTE = { "’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "." };

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// A named sprite: "hp", "mp", "lv", "external-link-icon", "reset-icon", "edit-icon".
export function glyph(name, cls = "") {
  return `<span class="font-glyph ${cls}" data-sprite="${name}" aria-hidden="true"></span>`;
}

// One unbroken run of text. `color`: blue | yellow | grey | red | white.
// `num` switches digits to the bold fixed-width set used for stats.
export function t(str, { color, num = false } = {}) {
  const glyphs = [...String(str ?? "")].map((raw) => {
    let ch = SUBSTITUTE[raw] ?? raw;
    if (!SUPPORTED.has(ch)) ch = "?";
    return `<span class="font-glyph" data-sprite="${esc(ch)}">${esc(ch)}</span>`;
  }).join("");
  return `<span class="font"${num ? ' data-label="resourceValue"' : ""}${color ? ` data-text-color="${color}"` : ""}>${glyphs}</span>`;
}

// A wrapping paragraph: one run per word, laid out by flex-wrap.
export function para(str, opts) {
  const words = String(str ?? "").split(/\s+/).filter(Boolean);
  return `<p class="para">${words.map((w) => t(w, opts)).join("")}</p>`;
}
