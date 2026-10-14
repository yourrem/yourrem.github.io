# FF7-Style Personal Site — Skeleton Plan

> **Status (2026-10-13):** the skeleton below has been superseded by a rebuild that mirrors
> jamiepates.com. What changed from this plan: the stage is **1250x975** (layout frame 1100x825),
> text is drawn from a **sprite font** (`css/font.css`, `src/text.js`, `assets/ui/`), windows use
> `border.png` + a four-corner gradient, and `menu.js` / `router.js` / `window.css` are gone -
> `src/main.js` owns state, routing and cursor navigation, `src/panels.js` renders every screen,
> `src/settings.js` holds Config. The `data/site.json` schema in section 8 is out of date; the file
> itself is the reference.

> Brief for Claude Code. Goal of this phase: a working **skeleton** of a personal website styled after the Final Fantasy VII main menu screen. Structure, layout, components, placeholder content, and core interactions only. Real content and final art come later.

---

## 1. Concept

The whole site is one "game screen": a fixed-aspect stage centered on a black background, containing several blue gradient windows. Selecting a menu item (Projects, Skills, etc.) swaps the content of the main window, like navigating an in-game menu. No full page reloads.

Reference layout (from the inspiration site):

```
┌──────────────────────────────── black background ────────────────────────────────┐
│                                                ┌───────────────┐                  │
│   ┌────────────────────────────────────────────┤  MENU         │                  │
│   │ [PORTRAIT]  Name                next level │  Projects     │                  │
│   │             LV  35              [■■■■□□]   │  Skills       │                  │
│   │             HP  1342/1342       Limit lv 1 │☞ Equip        │                  │
│   │             MP   578/ 578       [■■■■■■]   │  History      │                  │
│   │                                            │               │                  │
│   │  ┌──────────────────────────────────────┐  │  Resume       │                  │
│   │  │ Intro / description text box         │  │  Contact      │                  │
│   │  │                                      │  │  Github       │                  │
│   │  │                                      │  │  Donate       │                  │
│   │  │                                      │  │               │                  │
│   │  └──────────────────────────────────────┘  │  Config       │                  │
│   │                                            └───────┬───────┘                  │
│   │                                            ┌───────┴───────┐                  │
│   │                                            │ Time  0:02:15 │                  │
│   │                                  ┌─────────┤ Gil   86675   │                  │
│   └──────────────────────────────────┤         └───────────────┘                  │
│                                      │  Location name             │               │
│                                      └────────────────────────────┘               │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Windows overlap: the menu window sits on top of the main window's right edge, and the location window overlaps its bottom edge.

---

## 2. Tech stack

- **Vanilla HTML + CSS + JavaScript (ES modules).** No framework, no build step required.
- Optional later: Vite for dev server/bundling. Keep the code framework-free so this stays easy.
- Content lives in a single `data/site.json` so text/stats can be edited without touching markup.
- Hosting target: static (GitHub Pages / Netlify / Vercel).

---

## 3. File structure

```
/
├── index.html
├── css/
│   ├── tokens.css        # colors, sizes, font vars (CSS custom properties)
│   ├── base.css          # reset, body, stage scaling, fonts
│   ├── window.css        # .ff-window component
│   ├── components.css    # stats, bars, menu, cursor, timer, location, text box
│   └── panels.css        # per-panel layouts (projects, skills, etc.)
├── js/
│   ├── main.js           # boot: load data, render, wire up modules
│   ├── data.js           # fetch + expose site.json
│   ├── menu.js           # menu navigation, cursor positioning, keyboard
│   ├── router.js         # hash-based panel switching (#projects, #skills…)
│   ├── panels.js         # render functions for each panel
│   ├── timer.js          # Time counter
│   ├── audio.js          # cursor/confirm/cancel sfx (no-op if files missing)
│   └── stage.js          # scale the fixed stage to fit the viewport
├── data/
│   └── site.json
└── assets/
    ├── portrait.png      # character portrait
    ├── cursor.png        # pointer hand sprite
    ├── fonts/            # font files (@font-face)
    └── sfx/
        ├── cursor.wav
        ├── confirm.wav
        └── cancel.wav
```

All asset paths are referenced from one place (`tokens.css` for fonts, `site.json` for images/sfx) so files can be swapped freely. Code must work with **missing** assets: show a placeholder box for the portrait, a CSS triangle for the cursor, fall back to a system sans-serif font, and silently skip audio.

---

## 4. The stage (scaling)

- Logical design size: **640 × 480** (4:3, a 2× multiple of the original game's 320 × 240).
- `#stage` is absolutely sized at 640 × 480 and positioned by coordinates inside it.
- `stage.js` computes `scale = min(innerWidth / 640, innerHeight / 480)` and applies `transform: scale()` centered on the black page. Recalculate on resize.
- On narrow portrait screens (< 600px wide), switch to a **mobile layout**: drop the fixed stage, stack windows vertically at full width (menu becomes a horizontal/scrollable or 2-column list at the top). Same components, different CSS.

### Window coordinates (approximate, logical px within 640×480)

| Window          | x   | y   | w   | h   | z |
|-----------------|-----|-----|-----|-----|---|
| Main            | 50  | 61  | 453 | 365 | 1 |
| ↳ Portrait      | 80  | 80  | 73  | 83  | – |
| ↳ Text box      | 80  | 197 | 365 | 193 | – |
| Menu            | 467 | 39  | 139 | 273 | 3 |
| Time / Gil      | 462 | 347 | 144 | 58  | 3 |
| Location        | 333 | 408 | 273 | 47  | 2 |

A thin gray connector line runs vertically from the bottom of the Menu window to the top of the Time/Gil window (~x 504).

---

## 5. Design tokens (`tokens.css`)

```css
:root {
  /* window gradient (Config page can change these later) */
  --win-tl: #2c3ed6;    /* top-left */
  --win-mid: #1a1f90;
  --win-br: #06083c;    /* bottom-right */
  --win-border-outer: #e0e0e0;
  --win-border-inner: #6e6e8e;
  --win-radius: 6px;

  --text: #ffffff;
  --text-shadow: 1px 1px 0 #1c1c1c;
  --label: #5fe0e0;      /* LV / HP / MP */
  --bar-track: #6a6a6a;
  --bar-exp: #e8b4c4;    /* next level fill (pink) */
  --bar-limit: #e2dcae;  /* limit fill (pale yellow) */
  --bar-hp: #4a7cff;
  --bar-mp: #6fe0d8;
  --bg: #000000;

  --font-main: "FF7Menu", "Trebuchet MS", system-ui, sans-serif;
  --font-size: 16px;      /* at 640×480 logical */
}
```

---

## 6. Components

### 6.1 `.ff-window`
Reusable window: diagonal gradient `linear-gradient(135deg, var(--win-tl), var(--win-mid) 50%, var(--win-br))`, light outer border, darker inner edge via `box-shadow: inset`, small radius. All text white with `--text-shadow`. Supports an opening animation (scale from 0 height → full, ~150ms) when a panel appears.

### 6.2 Character header (inside Main)
- Portrait `<img>` with `image-rendering: pixelated`.
- Name, then rows: `LV`, `HP cur/max`, `MP cur/max`. Labels in `--label` cyan; numbers right-aligned in a fixed-width column (use `font-variant-numeric: tabular-nums`).
- Thin colored underline bars under HP and MP.
- Right column: "next level" label + bar, "Limit level N" label + bar.
- Bars: `<div class="bar"><div class="bar__fill" style="--pct: 62%"></div></div>`.

### 6.3 Text box
Nested `.ff-window` showing the panel's description text. Optional **typewriter effect** (toggle in Config): reveal characters over time; click / Enter skips to full text.

### 6.4 Menu + pointer cursor
- `<nav><ul>` of real `<a href="#projects">` links (works without JS, accessible).
- Groups separated by spacing: `[Projects, Skills, Equip, History]`, `[Resume, Contact, Github, Donate]`, `[Config]`.
- External items (Github, Donate, Resume PDF) open in a new tab.
- **Cursor**: absolutely positioned sprite to the left of the active item. Moves on hover, focus, and arrow keys. Idle animation: bob horizontally 2px every ~400ms (`steps()` for a choppy retro feel).
- Keyboard: ↑/↓ moves (wraps), Enter/Space selects, Esc/Backspace returns to Home panel. Play `cursor` / `confirm` / `cancel` sfx.

### 6.5 Time / Gil
- **Time**: `H:MM:SS` counting up from page load (`timer.js`, `setInterval` 1s). Optionally persist total across visits with `localStorage` (wrap in try/catch).
- **Gil**: number from `site.json` (placeholder; could later be wired to GitHub stats).

### 6.6 Location
Shows the current panel's "location" name from `site.json` (e.g. Home → "Cactus Island", Projects → "Workshop"). Updates on navigation.

---

## 7. Panels (router)

Hash-based routing: `#home` (default), `#projects`, `#skills`, `#equip`, `#history`, `#contact`, `#config`. The **menu, Time/Gil, and Location windows stay fixed**; only the **Main window's contents** change.

| Panel     | Main window content (skeleton = placeholder data) |
|-----------|----------------------------------------------------|
| Home      | Character header + intro text box (as in reference) |
| Projects  | Scrollable list styled like the FF7 Item menu: name on left, short tag on right; selecting one shows its description in the text box with link(s) |
| Skills    | Styled like the Materia/Magic list: skill names in a 2–3 column grid, each with a level (e.g. ★★★☆) |
| Equip     | Styled like the Equip screen: slots "Weapon / Armor / Accessory" → primary language/editor/tools; lower text box describes the selected item |
| History   | Timeline of jobs/education as a list, selected entry details in text box |
| Contact   | List of contact methods (email, socials) as links |
| Config    | Settings: window color pickers (4 corners → update CSS vars), sound on/off, typewriter on/off, text speed. Persist in `localStorage` |
| Resume / Github / Donate | External links, no panel |

Long lists scroll inside the window with up/down arrow indicators instead of a visible scrollbar.

---

## 8. Data model (`data/site.json`)

```json
{
  "profile": {
    "name": "Your Name",
    "portrait": "assets/portrait.png",
    "level": 30,
    "hp": [1000, 1000],
    "mp": [500, 500],
    "nextLevelPct": 62,
    "limitLevel": 1,
    "limitPct": 100,
    "gil": 12345
  },
  "home": {
    "location": "Cactus Island",
    "text": ["I'm a Web Developer based in …", "Welcome to my personal sandbox."]
  },
  "menu": [
    { "id": "projects", "label": "Projects", "location": "Workshop" },
    { "id": "skills",   "label": "Skills",   "location": "Materia Cave" },
    { "id": "equip",    "label": "Equip",    "location": "Armory" },
    { "id": "history",  "label": "History",  "location": "Archives" },
    { "divider": true },
    { "id": "resume",   "label": "Resume",   "href": "assets/resume.pdf", "external": true },
    { "id": "contact",  "label": "Contact",  "location": "Inn" },
    { "id": "github",   "label": "Github",   "href": "https://github.com/you", "external": true },
    { "id": "donate",   "label": "Donate",   "href": "#", "external": true },
    { "divider": true },
    { "id": "config",   "label": "Config",   "location": "Config" }
  ],
  "projects": [ { "name": "Project One", "tag": "JS", "description": "…", "url": "#" } ],
  "skills":   [ { "name": "JavaScript", "level": 4, "max": 5 } ],
  "equip":    { "weapon": "VS Code", "armor": "TypeScript", "accessory": "Coffee" },
  "history":  [ { "years": "2020–now", "title": "Senior Dev @ Company", "description": "…" } ],
  "contact":  [ { "label": "Email", "href": "mailto:you@example.com" } ],
  "sfx": { "cursor": "assets/sfx/cursor.wav", "confirm": "assets/sfx/confirm.wav", "cancel": "assets/sfx/cancel.wav" }
}
```

---

## 9. Accessibility & polish requirements

- Menu items are real links/buttons; visible focus state = cursor sprite moves to focused item.
- `prefers-reduced-motion`: disable cursor bob, window open animation, and typewriter.
- Sound **off by default** until the first user interaction (browser autoplay rules); toggle in Config.
- Text is real HTML text (not images) so it's selectable and readable by screen readers.
- `alt` text on the portrait. Page `<title>` updates per panel.

---

## 10. Build phases

**Phase 1 — Skeleton (this task)**
1. File structure, `index.html`, all CSS files with tokens.
2. Stage scaling + black background.
3. `.ff-window` component; place all windows at the coordinates in §4.
4. Home panel fully laid out with placeholder data from `site.json`.
5. Menu with working cursor (mouse + keyboard) and hash routing.
6. Empty-but-styled placeholder panels for Projects, Skills, Equip, History, Contact, Config.
7. Time counter running; Gil and Location rendered from data.
8. Graceful fallbacks for every missing asset.

**Acceptance for Phase 1:** opening `index.html` via a local server shows the Home screen matching the reference layout; arrow keys and mouse move the cursor; selecting menu items swaps the main window and updates the location name; resizing the browser keeps the stage centered and proportional; no console errors with the `assets/` folder empty.

**Phase 2** — Real panel layouts (Item/Materia/Equip styles), scroll arrows, typewriter, window-open animation, sfx.
**Phase 3** — Config page (live color editing + persistence), mobile layout, real content, deploy.

---

## 11. Prompt to give Claude Code

> Read PLAN.md. Build **Phase 1** only, using vanilla HTML/CSS/JS with ES modules and no build step. Follow the file structure, window coordinates, tokens, and data model exactly. Use placeholder content from `data/site.json`. Every asset must be optional with a fallback. When finished, tell me how to run it locally and list anything you deviated from in the plan.
