// Boot + UI state + routing + pointer-hand navigation.
//
// The whole screen is re-rendered from state on every change (route,
// focus, selection). `S.group`/`S.index` say where the hand is; panels.js
// marks that element data-focused="true".

import { loadData } from "./data.js";
import { initStage } from "./stage.js";
import { initAudio, play } from "./audio.js";
import { initTimer } from "./timer.js";
import { t } from "./text.js";
import { settings, loadSettings, applySettings, DEFAULT_COLORS } from "./settings.js";
import { renderScreen, SCREENS } from "./panels.js";

const stage = document.getElementById("stage");
let data = null;

const S = {
  route: "home",
  group: "menu",     // nav group the hand is in
  index: 0,          // index within that group
  tab: 0,            // Projects: active tab
  item: 0,           // Projects / Skills: selected list item
  slot: 0,           // Equip: selected slot row
  equipped: {},      // Equip: slot index -> item index (overrides site.json)
  materia: [[], []], // Skills: skill name (or null) per materia slot, for Wpn. and Arm.
  pick: null,        // Skills: slot being filled, { group, index }
  histGroup: null,   // History: chosen save-data group, or null for the chooser
  loading: null,     // History: memory-card bar progress (0-100), or null
  corner: null,      // Config: corner being edited (tl/tr/bl/br)
  location: 0
};

// Where the hand starts on each screen.
const START = {
  home: "menu", projects: "list", skills: "list", equip: "rows",
  history: "opts", contact: "links", config: "corners", resume: "links", links: "saves"
};

// `enter` plays the arrival animation; `from` (the screen we came from, or
// "boot" on first load) picks which one - see "Screen transitions" in
// css/components.css.
function render({ enter = false, from = "boot" } = {}) {
  const scrolled = [...stage.querySelectorAll(".scroll")].map((el) => el.scrollTop);
  stage.innerHTML = `<div class="frame ${S.route}${enter ? ` enter from-${from}` : ""}">${renderScreen(data, S)}</div>`;
  stage.querySelectorAll(".scroll").forEach((el, i) => { if (!enter) el.scrollTop = scrolled[i] || 0; });
  stage.querySelector('[data-focused="true"]')?.scrollIntoView({ block: "nearest" });
}

function navItems() {
  return [...stage.querySelectorAll("[data-nav]")].map((el) => ({ el, group: el.dataset.nav, index: Number(el.dataset.i) }));
}

// True while a choice is being made for a picked slot (a materia on Skills,
// an item on Equip). Until it is confirmed or cancelled the hand is confined
// to the list being chosen from, so hovering elsewhere changes nothing.
function locked() {
  return !!S.pick || (S.route === "equip" && S.group === "items");
}

// Move the hand. Selection follows focus on list-style screens.
function focus(group, index, { sound = true } = {}) {
  if (leaving) return;                           // mid-transition: ignore input
  if (S.group === group && S.index === index) return;
  if (locked() && group !== S.group) return;     // mid-choice: the hand stays in its list
  S.group = group;
  S.index = index;
  if (group === "list") S.item = index;
  if (group === "rows") S.slot = index;
  if (sound) play("select");
  render();
}

const ACTIONS = {
  tab(i) { S.tab = i; S.item = 0; S.group = "list"; S.index = 0; },
  row(i) { S.slot = i; S.group = "items"; S.index = S.equipped[i] ?? data.equip?.slots?.[i]?.equipped ?? 0; },
  equip(i) { S.equipped[S.slot] = i; S.group = "rows"; S.index = S.slot; play("materia"); },
  // Skills: pick a slot, then choose the materia that goes in it.
  slot(i) {
    S.pick = { group: S.group, index: i };
    const current = S.materia[Number(S.group.slice(5))][i];
    S.group = "list";
    S.index = Math.max(0, (data.skills || []).findIndex((sk) => sk.name === current));
  },
  materia(i) {
    if (!S.pick) return;
    const name = data.skills[i].name;
    const target = S.materia[Number(S.pick.group.slice(5))];
    const previous = target[S.pick.index] ?? null;
    if (previous === name) {
      target[S.pick.index] = null;                 // choosing it again unsets the slot
    } else {
      // A materia can only sit in one slot: swap with wherever it was.
      for (const row of S.materia) {
        const at = row.indexOf(name);
        if (at >= 0) row[at] = previous;
      }
      target[S.pick.index] = name;
    }
    S.group = S.pick.group; S.index = S.pick.index; S.pick = null;
    play("materia");
  },
  histGroup(i) { S.histGroup = i; S.group = "saves"; S.index = 0; play("saveSelect"); startLoading(); },
  corner(i) { const k = ["tl", "tr", "bl", "br"][i]; S.corner = S.corner === k ? null : k; },
  sound(i) { settings.sound = i === 0; applySettings(); },
  crt(i) { settings.crt = i === 0; applySettings(); },
  resetColors() {
    settings.colors = structuredClone(DEFAULT_COLORS);
    applySettings();
    S.corner = null; S.group = "corners"; S.index = 0;
  },
  location() { S.location += 1 + Math.floor(Math.random() * 5); }
};

// History: fill the memory-card bar in ten steps, then show the files.
let loadTimer = null;
function stopLoading() {
  clearInterval(loadTimer);
  loadTimer = null;
  S.loading = null;
}
function startLoading() {
  stopLoading();
  S.loading = 0;
  loadTimer = setInterval(() => {
    S.loading += 10;
    if (S.loading > 100) {            // one beat on the full bar, then the files
      stopLoading();
      render();
      return;
    }
    if (S.loading === 100) play("save");
    const bar = stage.querySelector(".mem-bar");
    if (bar) { bar.style.width = `${S.loading}%`; bar.dataset.progress = S.loading; }
  }, 80);
}

function act(el) {
  const fn = ACTIONS[el.dataset.act];
  if (!fn || leaving) return false;
  fn(Number(el.dataset.i));
  play("select");
  render();
  return true;
}

// Step back one level; from a screen's top level, return Home.
function back() {
  play("back");
  if (S.route === "history" && S.histGroup !== null) {
    stopLoading();
    S.group = "opts"; S.index = S.histGroup; S.histGroup = null;
  } else if (S.route === "skills" && S.pick) {
    S.group = S.pick.group; S.index = S.pick.index; S.pick = null;
  } else if (S.route === "equip" && S.group === "items") {
    S.group = "rows"; S.index = S.slot;
  } else if (S.route === "config" && S.corner) {
    S.corner = null;
  } else if (S.route !== "home") {
    location.hash = "#home";
    return;
  } else return;
  render();
}

// Skills: the slot strips are rows (left/right), stacked above the list.
function skillsKey(key) {
  const count = (g) => stage.querySelectorAll(`[data-nav="${g}"]`).length;
  const clamp = (g, i) => Math.max(0, Math.min(count(g) - 1, i));
  const order = ["slots0", "slots1", "list"].filter((g) => count(g));
  const row = order.indexOf(S.group);
  const dx = { ArrowLeft: -1, ArrowRight: 1 }[key] || 0;
  const dy = { ArrowUp: -1, ArrowDown: 1 }[key] || 0;
  if (S.group === "list") {
    if (dy) return focus("list", (S.index + dy + count("list")) % count("list"));
    if (dx < 0 && !S.pick && row > 0) focus(order[row - 1], 0);
    return;
  }
  if (dx) return focus(S.group, clamp(S.group, S.index + dx));
  const next = order[row + dy];
  if (next) focus(next, next === "list" ? 0 : clamp(next, S.index));
}

// Projects: up/down stay in the item list; left/right change tab.
function projectsKey(key) {
  const tabs = data.projects?.tabs || [];
  const count = tabs[S.tab]?.items?.length || 0;
  if (key === "ArrowUp" || key === "ArrowDown") {
    if (count) focus("list", (S.index + (key === "ArrowDown" ? 1 : -1) + count) % count);
    return;
  }
  if (tabs.length < 2) return;
  ACTIONS.tab((S.tab + (key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length);
  play("select");
  render();
}

// Resume: up/down scroll the document; left/right walk the links.
function resumeKey(key) {
  if (key === "ArrowUp" || key === "ArrowDown") {
    stage.querySelector(".resume-scroll")?.scrollBy({ top: key === "ArrowDown" ? 154 : -154, behavior: "smooth" });
    return;
  }
  const items = navItems().filter((it) => it.group === S.group);
  if (!items.length) return;
  const next = items[(S.index + (key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
  focus(next.group, next.index);
}

function onKey(e) {
  if (e.target.matches?.("input, textarea") || leaving) return;
  if (S.route === "projects" && e.key.startsWith("Arrow")) {
    e.preventDefault();
    projectsKey(e.key);
    return;
  }
  if (S.route === "resume" && e.key.startsWith("Arrow")) {
    e.preventDefault();
    resumeKey(e.key);
    return;
  }
  if (S.route === "skills" && e.key.startsWith("Arrow")) {
    e.preventDefault();
    skillsKey(e.key);
    return;
  }
  const items = navItems().filter((it) => !locked() || it.group === S.group);
  const at = items.findIndex((it) => it.group === S.group && it.index === S.index);
  switch (e.key) {
    case "ArrowDown":
    case "ArrowUp": {
      if (!items.length) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = items[(Math.max(at, 0) + step + items.length) % items.length];
      focus(next.group, next.index);
      break;
    }
    case "ArrowRight":
    case "ArrowLeft": {
      // Jump to the neighbouring group (tabs <-> list, On <-> Off, ...).
      const groups = [...new Set(items.map((it) => it.group))];
      const same = items.filter((it) => it.group === S.group);
      const step = e.key === "ArrowRight" ? 1 : -1;
      let next;
      if (same.length === 2 && S.route === "config") {
        next = same[(same.findIndex((it) => it.index === S.index) + 1) % 2];
      } else if (groups.length > 1) {
        const g = groups[(groups.indexOf(S.group) + step + groups.length) % groups.length];
        next = items.find((it) => it.group === g);
      }
      if (!next) return;
      e.preventDefault();
      focus(next.group, next.index);
      break;
    }
    case "Enter":
    case " ": {
      const el = items[at]?.el;
      if (!el) return;
      e.preventDefault();
      if (!act(el)) { play("select"); (el.matches("a") ? el : el.querySelector("a"))?.click(); }
      break;
    }
    case "Escape":
    case "Backspace":
      e.preventDefault();
      back();
      break;
    default:
  }
}

// Route changes to or from Home play an exit animation on the current
// screen first (class "leave"), then render the new one.
let leaving = null;                  // pending exit timer, or null
const LEAVE_MS = { home: 620, page: 250 };

function onRoute() {
  const id = (location.hash || "#home").slice(1);
  const next = SCREENS.includes(id) ? id : "home";
  const prev = onRoute.last;

  const arrive = () => {
    leaving = null;
    S.route = next;
    S.group = START[S.route];
    S.index = 0;
    S.tab = 0; S.item = 0; S.slot = 0; S.histGroup = null; S.corner = null; S.pick = null;
    stopLoading();
    if (S.route === "home") {
      // Leave the hand on the menu entry we just came back from.
      const from = (data.menu || []).filter((e) => !e.divider).findIndex((e) => e.id === prev);
      if (from >= 0) S.index = from;
    }
    onRoute.last = S.route;
    const label = (data.menu || []).find((e) => e.id === S.route)?.label;
    const base = data.profile?.name || "Portfolio";
    document.title = label ? `${base} | ${label}` : base;
    render({ enter: true, from: prev ? (prev === "home" ? "home" : "page") : "boot" });
  };

  clearTimeout(leaving);
  leaving = null;
  const frame = stage.querySelector(".frame");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (frame && prev && prev !== next && !still && (prev === "home" || next === "home")) {
    frame.className = `frame ${prev} leave`;      // drop the arrival classes so exit rules win
    leaving = setTimeout(arrive, prev === "home" ? LEAVE_MS.home : LEAVE_MS.page);
  } else {
    arrive();
  }
}

async function boot() {
  data = await loadData();
  // Warm the coloured font sheets so tinted text never pops in late.
  for (const c of ["blue", "grey", "yellow", "red"]) new Image().src = `assets/ui/font-spritesheet--${c}.png`;
  initStage();
  initAudio(data.sfx || {});
  loadSettings();
  S.materia = [0, 1].map((i) => [...(data.equip?.materia?.[i] || [])]);
  S.location = Math.floor(Math.random() * 1000);

  initTimer((text) => {
    const el = stage.querySelector('[data-label="time"]');
    if (el) el.innerHTML = t(text, { num: true });
  });

  // mousemove rather than mouseover: a re-render under a resting pointer
  // must not drag the hand back to wherever the mouse happens to be.
  stage.addEventListener("mousemove", (e) => {
    const el = e.target.closest("[data-nav]");
    if (el) focus(el.dataset.nav, Number(el.dataset.i));
  });
  // Actions fire on press, so they cannot be lost to a re-render that
  // lands between press and release. Plain links navigate natively.
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.dataset.nav) { S.group = el.dataset.nav; S.index = Number(el.dataset.i); }
    act(el);
  });
  stage.addEventListener("click", (e) => {
    if (!e.target.closest("[data-act]") && e.target.closest("a")) play("select");
  });
  // Config colour sliders: update live without re-rendering mid-drag.
  stage.addEventListener("input", (e) => {
    const input = e.target.closest("input[data-ch-index]");
    if (!input || !S.corner) return;
    settings.colors[S.corner][Number(input.dataset.chIndex)] = Number(input.value);
    applySettings();
    input.parentElement.querySelector(".val").innerHTML = t(input.value, { num: true });
  });
  stage.addEventListener("change", (e) => { if (e.target.closest("input[data-ch-index]")) render(); });

  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", onRoute);
  onRoute();
}

boot();
