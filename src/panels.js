// Screen renderers. Each returns the HTML for the 1100x825 frame, built
// from data/site.json and the UI state `S` (see main.js). Anything the
// pointer hand can land on carries data-nav="<group>" data-i="<index>";
// data-act names the action main.js runs when it is confirmed.

import { t, para, glyph, esc } from "./text.js";
import { timeText } from "./timer.js";
import { settings, colorsAreDefault } from "./settings.js";
import { live } from "./live.js";

const SEPARATOR = "_".repeat(21);

// Attributes for a navigable element.
function nav(S, group, i, act = "") {
  const focused = S.group === group && S.index === i;
  return `data-nav="${group}" data-i="${i}" data-focused="${focused}"${act ? ` data-act="${act}"` : ""}`;
}

function image(src, cls, alt = "") {
  return src
    ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" />`
    : `<div class="${cls} placeholder" role="img" aria-label="${esc(alt)}"></div>`;
}

function resource(sprite, [cur, max], bar) {
  const pct = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return `
    <div class="resource">
      ${glyph(sprite)}
      <div>
        <div class="nums">
          <span class="num">${t(cur, { num: true })}</span>
          <span>${t("/", { num: true })}</span>
          <span class="num">${t(max, { num: true })}</span>
        </div>
        <div class="resource-bar"><div style="width:${pct}%;background-image:var(--bar-${bar})"></div></div>
      </div>
    </div>`;
}

function vitals(p) {
  return `
    <div class="vitals">
      <p class="name">${t(p.name)}</p>
      <p class="row">${glyph("lv")}${t(p.level, { num: true })}</p>
      ${resource("hp", p.hp || [0, 0], "hp")}
      ${resource("mp", p.mp || [0, 0], "mp")}
    </div>`;
}

function character(p) {
  return `<div class="char">${image(p.portrait, "portrait", `${p.name} portrait`)}${vitals(p)}</div>`;
}

// Materia slot strip. `layout` is group sizes, e.g. [2, 2, 1]. `orbs` lists
// the skill (or null) sitting in each slot. Passing `group` makes the slots
// navigable so materia can be swapped (Skills screen).
function slotStrip(S, layout = [], orbs = [], group = "") {
  let n = 0;
  const groups = layout.map((size) => {
    let slots = "";
    for (let k = 0; k < size; k++, n++) {
      const skill = orbs[n];
      const attrs = group
        ? ` ${nav(S, group, n, "slot")} data-active="${S.pick?.group === group && S.pick.index === n}"`
        : "";
      slots += `<div class="slot"${attrs}>${skill ? `<div class="orb" data-color="${esc(skill.color || "green")}"></div>` : ""}</div>`;
    }
    return `<div class="slot-group">${slots}</div>`;
  }).join("");
  return `<div class="slots">${groups}</div>`;
}

// Inline style that tints a slot's windows with the entry's own colours,
// built on the window gradient from Config: `color` is blended into the
// top-left corner and `color2` (default: `color`) into the bottom-left, by
// `strength` (0 = plain window, 1 = the raw brand colour).
function tint(entry, strength = 1) {
  if (!entry.color) return "";
  const mix = (brand, corner, k) => brand.map((v, i) => Math.round(v * k + corner[i] * (1 - k)));
  const { tl, bl } = settings.colors;
  const first = mix(entry.color, tl, strength);
  const second = entry.color2
    ? mix(entry.color2, bl, strength * 0.8)
    : mix(entry.color.map((v, i) => Math.round(v * 0.5 + [0, 10, 60][i] * 0.5)), bl, strength);
  return `--c-tl: rgb(${first.join(", ")}); --c-bl: rgb(${second.join(", ")});`;
}

function orbLabel(name, color) {
  return `<span class="orb" data-color="${esc(color || "green")}"></span>${t(name)}`;
}

// The menu window: full list on Home, collapsed to the current screen's
// label (plus a close box) everywhere else.
function menu(data, S) {
  const entries = data.menu || [];
  if (S.route !== "home") {
    const current = entries.find((e) => e.id === S.route);
    return `
      <nav class="box menu menu--closed" aria-label="Main menu"><ul><li>${t(current?.label || "")}</li></ul></nav>
      <a class="box close" href="#home" aria-label="Close">${t("X")}</a>`;
  }
  let i = 0;
  const items = entries.map((e) => {
    if (e.divider) return "<li></li>";
    const attrs = nav(S, "menu", i++);
    return e.external
      ? `<li><a ${attrs} href="${esc(e.href || "#")}" target="_blank" rel="noopener noreferrer">${t(e.label)}${glyph("external-link-icon")}</a></li>`
      : `<li><a ${attrs} href="#${esc(e.id)}">${t(e.label)}</a></li>`;
  }).join("");
  // 45px per row, so the window grows with the number of entries.
  return `<nav class="box menu" style="height:${40 + entries.length * 45}px" aria-label="Main menu"><ul>${items}</ul></nav>`;
}

// The equipped item for an equip slot (honouring changes made on the Equip screen).
function equipped(data, S, slotIndex) {
  const slot = data.equip?.slots?.[slotIndex];
  if (!slot) return null;
  return slot.items?.[S.equipped[slotIndex] ?? slot.equipped ?? 0] || null;
}

const screens = {
  home(data, S) {
    const p = data.profile || {};
    const locations = data.home?.locations || [];
    return `
      <section class="box party">
        <div class="party-head">
          ${image(p.portrait, "portrait", `${p.name} portrait`)}
          ${vitals(p)}
          <div class="gauges">
            <p>${t("next level")}</p>
            <div class="progress"${p.daysToBirthday ? ` title="${p.daysToBirthday} days to level ${p.level + 1}"` : ""}><div><div style="width:${Number(p.nextLevelPct) || 0}%;background-color:var(--bar-exp)"></div></div></div>
            <p>${t(`Limit level ${p.limitLevel ?? 1}`)}</p>
            <div class="progress"><div><div data-limit="true" style="width:${Number(p.limitPct) || 0}%"></div></div></div>
          </div>
        </div>
        <div class="box bio">${(data.home?.text || []).map((l) => para(l)).join("")}</div>
      </section>
      <aside class="box meta">
        <ul>
          <li class="between"><span>${t("Time")}</span><span data-label="time">${t(timeText(), { num: true })}</span></li>
          <li class="between"><span>${t("Gil")}</span><span>${t(p.gil ?? 0, { num: true })}</span></li>
        </ul>
      </aside>
      <footer class="box page-info">
        <span>${t(locations[S.location % (locations.length || 1)] || "")}</span>
        ${locations.length > 1 ? `<span class="refresh" data-act="location" title="Travel">${glyph("reset-icon")}</span>` : ""}
      </footer>`;
  },

  projects(data, S) {
    const tabs = data.projects?.tabs || [];
    const items = tabs[S.tab]?.items || [];
    const p = items[S.item] || items[0];
    const tabsHtml = tabs.map((tab, i) =>
      `<li data-act="tab" data-i="${i}" data-active="${i === S.tab}">${t(tab.label)}</li>`).join("");
    const list = items.map((it, i) => `
      <li ${nav(S, "list", i, it.live ? "live" : "")}>
        <a${it.url && !it.live ? ` href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"` : ""}>
          <span class="row">${it.icon ? `<img class="icon" src="${esc(it.icon)}" alt="" />` : ""}${t(it.name)}</span>
          <span class="row count">${t(":", { num: true })}${t(it.count ?? 1, { num: true })}</span>
        </a>
      </li>`).join("");
    const detail = p ? `
      <div class="detail">
        <div class="detail-head">
          <div>${t(p.name, { color: "blue" })}</div>
          <div class="dim">${t(p.year ?? "")}</div>
        </div>
        <div class="separator">${t(SEPARATOR)}</div>
        <div class="skill-tags">${(p.skills || []).map((s) => `<span class="materia">${orbLabel(s.name, s.color)}</span>`).join("")}</div>
        <div class="separator">${t(SEPARATOR)}</div>
        <div class="detail-info">${para(p.description)}</div>
        <div class="separator">${t(SEPARATOR)}</div>
        <div class="detail-links" data-text-color="yellow">
          ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${t("View")}${glyph("external-link-icon")}</a>` : ""}
          ${p.repo ? `<a href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer">${t("Source")}${glyph("external-link-icon")}</a>` : ""}
          ${p.live ? `<span class="live-tag" data-act="live" data-i="${S.item}">${t("Live", { color: "yellow" })}</span>` : ""}
        </div>
      </div>` : "";
    return `
      <div class="box header"><ul class="tabs">${tabsHtml}</ul></div>
      <div class="box description">${t(p?.summary || "")}</div>
      <div class="box proj-left">${detail}</div>
      <div class="box proj-right"><div class="scroll list-wrap bar"><ul>${list}</ul></div></div>`;
  },

  skills(data, S) {
    const p = data.profile || {};
    const skills = data.skills || [];
    const byName = (name) => skills.find((sk) => sk.name === name) || null;
    // The detail pane follows the hand: a slot shows the materia in it
    // (nothing if empty), the list shows the skill under the hand.
    const inSlots = S.group.startsWith("slots");
    const s = inSlots ? byName(S.materia[Number(S.group.slice(5))]?.[S.index]) : skills[S.index];
    const picked = S.pick ? S.materia[Number(S.pick.group.slice(5))]?.[S.pick.index] : null;
    const gear = [0, 1].map((i) => {
      const slot = data.equip?.slots?.[i];
      const it = equipped(data, S, i);
      return slot && it ? `
        <div>
          <p>${t(slot.label, { color: "blue" })}${t(it.name)}</p>
          ${slotStrip(S, it.slots, (S.materia[i] || []).map(byName), `slots${i}`)}
        </div>` : "";
    }).join("");
    const stars = s ? Array.from({ length: s.max ?? 5 }, (_, i) =>
      `<li class="star" data-color="${esc(s.color || "green")}" data-star="${i < (s.level ?? 0)}"></li>`).join("") : "";
    const list = skills.map((sk, i) =>
      `<li><span class="materia" ${nav(S, "list", i, "materia")} data-active="${!!S.pick && sk.name === picked}">${orbLabel(sk.name, sk.color)}</span></li>`).join("");
    const detail = s ? `
        <div class="top"><p class="materia">${orbLabel(s.name, s.color)}</p><ul class="stars">${stars}</ul></div>
        <div class="stat-rows">
          <div class="stat-row">${t("AP", { color: "blue" })}<span class="val">${t(s.ap ?? 0, { num: true })}</span></div>
          <div class="stat-row">${t("To next level", { color: "blue" })}<span class="val">${(s.level ?? 0) >= (s.max ?? 5) ? t("MASTER") : t(s.next ?? 0, { num: true })}</span></div>
        </div>
        <div class="abilities">
          <p>${t("Ability list", { color: "blue" })}</p>
          <ul>${(s.abilities || []).map((a) => `<li>${t(a)}</li>`).join("")}</ul>
        </div>` : "";
    const hint = S.pick ? "Choose a materia to set in this slot." : "";
    return `
      <div class="box skills-header"><div>${character(p)}<div class="gear">${gear}</div></div></div>
      <div class="box description">${t(s?.description || hint)}</div>
      <div class="box skills-left">${detail}</div>
      <div class="box skills-right"><div class="scroll bar"><ul>${list}</ul></div></div>`;
  },

  equip(data, S) {
    const p = data.profile || {};
    const slots = data.equip?.slots || [];
    const slot = slots[S.slot] || slots[0] || { items: [] };
    const current = equipped(data, S, S.slot);
    // While browsing the right-hand list, preview the item under the hand.
    const shown = (S.group === "items" ? slot.items[S.index] : current) || current || {};
    const rows = slots.map((sl, i) => `
      <li ${nav(S, "rows", i, "row")} data-active="${S.group === "items" && i === S.slot}">
        <span>${t(sl.label, { color: "blue" })}</span><span>${t(equipped(data, S, i)?.name || "")}</span>
      </li>`).join("");
    // Stats are totals across everything equipped. While choosing, the
    // right-hand column shows the totals with the item under the hand
    // swapped in: yellow for an increase, red for a decrease.
    const comparing = S.group === "items";
    const totals = (swapIn) => {
      const sum = {};
      slots.forEach((sl, i) => {
        const it = i === S.slot && swapIn ? swapIn : equipped(data, S, i);
        for (const [k, v] of Object.entries(it?.stats || {})) sum[k] = (sum[k] || 0) + v;
      });
      return sum;
    };
    const before = totals();
    const after = totals(shown);
    const stats = Object.keys(before).map((k) => {
      const [was, now] = [before[k], after[k] ?? 0];
      const color = now > was ? "yellow" : now < was ? "red" : "white";
      return `<li>
        <span>${t(k, { color: "blue" })}</span><span>${t(was, { num: true })}</span>
        ${comparing ? `<span class="arrow">${t(">", { color: "blue" })}</span><span>${t(now, { num: true, color })}</span>` : ""}
      </li>`;
    }).join("");
    const list = (slot.items || []).map((it, i) =>
      `<li><span ${nav(S, "items", i, "equip")}>${t(it.name)}</span></li>`).join("");
    return `
      <div class="box equip-header"><div>${character(p)}<ul class="equip-rows">${rows}</ul></div></div>
      <div class="box description">${t(shown.description || "")}</div>
      <div class="box equip-slots">
        <div><span>${t("Slot", { color: "blue" })}</span>${slotStrip(S, shown.slots)}</div>
        <div class="growth"><span>${t("Growth", { color: "blue" })}</span><span>${t(shown.growth || "Normal")}</span></div>
      </div>
      <div class="box equip-stats"><ul>${stats}</ul></div>
      <div class="box equip-right"><div class="scroll bar"><ul>${list}</ul></div></div>`;
  },

  history(data, S) {
    const groups = data.history?.groups || [];
    if (S.histGroup === null) {
      const opts = groups.map((g, i) =>
        `<li ${nav(S, "opts", i, "histGroup")}><button>${t(g.label)}</button></li>`).join("");
      return `
        <div class="box header header--text">${t("Select a Save Data File.")}</div>
        <div class="box mem-select" style="height:${16 + groups.length * 40}px"><ul>${opts}</ul></div>`;
    }
    // Brief "reading the memory card" bar before the files appear;
    // main.js advances it.
    if (S.loading !== null) {
      return `
        <div class="box header header--text">${t("Checking Memory card.")}</div>
        <div class="box mem-loading"><div class="mem-bar" data-progress="${S.loading}" style="width:${Math.min(S.loading, 100)}%"></div></div>`;
    }
    const p = data.profile || {};
    const entries = groups[S.histGroup]?.entries || [];
    const file = String((S.group === "saves" ? S.index : 0) + 1).padStart(2, "0");
    const saves = entries.map((e, i) => {
      const accent = tint(e);
      const tag = e.url ? `a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer"` : "div";
      return `
        <${tag} class="save" ${nav(S, "saves", i)} style="top:${i * 244.5}px;${accent}">
          <div class="box">
            <div class="save-main">
              ${image(e.logo, "logo", `${e.name} logo`)}
              <div class="save-who"><p>${t(p.name)}</p><p class="row">${glyph("lv")}${t(e.level ?? "", { num: true })}</p></div>
            </div>
            <div class="box save-meta"><ul>
              <li class="between"><span>${t(e.roleLabel || "Role")}</span><span>${t(e.role || "")}</span></li>
              <li class="between"><span>${t("Years")}</span><span>${t(e.years || "")}</span></li>
            </ul></div>
            <div class="box save-name"><div>${t(e.name)}</div></div>
          </div>
        </${tag.split(" ")[0]}>`;
    }).join("");
    return `
      <div class="box header header--text">${t("Select a file.")}</div>
      <div class="box file-label">${t("FILE", { color: "yellow" })}${t(` ${file}`)}</div>
      <div class="saves scroll hide-scrollbar">${saves}</div>`;
  },

  resume(data, S) {
    const p = data.profile || {};
    const r = data.resume || {};
    const rule = `<div class="separator">${t("_".repeat(40))}</div>`;
    const link = (l, i, group) => `
      <li><a ${nav(S, group, i)} data-text-color="yellow" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${t(l.label)}${glyph("external-link-icon")}</a></li>`;
    const skills = (data.skills || []).map((sk) => `
      <div class="materia-row">
        <span class="materia">${orbLabel(sk.name, sk.color)}</span>
        <ul class="stars small">${Array.from({ length: sk.max ?? 5 }, (_, i) =>
          `<li class="star" data-color="${esc(sk.color || "green")}" data-star="${i < (sk.level ?? 0)}"></li>`).join("")}</ul>
      </div>`).join("");
    const record = (e) => {
      const tag = e.url ? `a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer"` : "div";
      return `
        <${tag} class="record">
          ${e.logo ? `<img class="record-logo" src="${esc(e.logo)}" alt="${esc(e.name)} logo" />` : ""}
          <div class="record-body">
            <div class="between"><span>${t(e.name)}</span><span>${t(e.years || "", { color: "blue" })}</span></div>
            ${e.role ? `<div class="role" data-text-color="blue">${para(e.role)}</div>` : ""}
            ${(e.lines || []).map((l) => `<div class="line">${para(l)}</div>`).join("")}
          </div>
        </${tag.split(" ")[0]}>`;
    };
    const sections = (r.sections || []).map((sec) => `
      ${rule}
      <div class="heading"><div class="box section-title">${t(sec.heading)}</div></div>
      ${(sec.records || []).map(record).join('<div class="record-gap"></div>')}`).join("");
    return `
      <div class="box header header--text">${t(p.name)}</div>
      <div class="box resume-body">
        <div class="scroll bar resume-scroll">
          <div class="profile-top">
            <div class="box resume-title">${(r.title || []).map((l) => `<p>${t(l)}</p>`).join("")}</div>
            <ul class="resume-links">${(r.links || []).map((l, i) => link(l, i, "links")).join("")}</ul>
          </div>
          ${rule}
          <div class="profile-row">
            ${p.portrait ? image(p.portrait, "resume-portrait", `${p.name} portrait`) : ""}
            <ul class="resume-stats">${(r.stats || []).map(([k, v]) =>
              `<li class="between"><span>${t(k, { color: "blue" })}</span><span>${t(v)}</span></li>`).join("")}</ul>
          </div>
          ${rule}
          ${(r.summary || []).map((l) => `<div class="paragraph">${para(l)}</div>`).join("")}
          ${rule}
          <div class="heading"><div class="box section-title">${t("Skills")}</div></div>
          <div class="materia-grid">${skills}</div>
          ${sections}
          ${rule}
          <ul class="resume-footer">${(r.links || []).map((l, i) => link(l, i, "footer")).join("")}</ul>
        </div>
      </div>`;
  },

  // Same save-slot layout as History, one slot per site or profile.
  links(data, S) {
    const links = data.links || [];
    const file = String(S.index + 1).padStart(2, "0");
    const slots = links.map((l, i) => `
      <a class="save" ${nav(S, "saves", i)} href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"
         style="top:${i * 244.5}px;${tint(l, 0.45)}">
        <div class="box">
          <div class="save-main">
            <div class="app-icon" style="background:${esc(l.background || "#333")}">${l.icon ? `<img src="${esc(l.icon)}" alt="${esc(l.name)} icon" />` : ""}</div>
            <div class="save-who"><p>${t(l.name)}</p></div>
          </div>
          <div class="box save-meta"><ul>
            <li class="between"><span>${t("User")}</span><span>${t(l.user || "")}</span></li>
            <li class="between"><span>${t("Type")}</span><span>${t(l.type || "")}</span></li>
          </ul></div>
          <div class="box save-name"><div>${t(l.display || l.url)}</div></div>
        </div>
      </a>`).join("");
    return `
      <div class="box header header--text">${t("Select a link.")}</div>
      <div class="box file-label">${t("LINK", { color: "yellow" })}${t(` ${file}`)}</div>
      <div class="saves scroll hide-scrollbar">${slots}</div>`;
  },

  contact(data, S) {
    const c = data.contact || {};
    const links = (c.links || []).map((l, i) => `
      <li><a ${nav(S, "links", i)} data-text-color="yellow" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${t(l.label)}${glyph("external-link-icon")}</a></li>`).join("");
    return `
      <div class="box header header--text">${t("PHS")}</div>
      <div class="box description">${t(c.description || "")}</div>
      <div class="box contact-body">
        <p>${t("Channels", { color: "grey" })}</p>
        <ul>${links}</ul>
      </div>`;
  },

  config(data, S) {
    const corners = ["tl", "tr", "bl", "br"];
    const names = { tl: "top left", tr: "top right", bl: "bottom left", br: "bottom right" };
    const buttons = corners.map((k, i) =>
      `<button ${nav(S, "corners", i, "corner")} data-active="${S.corner === k}" aria-label="Edit ${names[k]} colour"></button>`).join("");
    const sliders = S.corner ? `
      <div class="box sliders">${["r", "g", "b"].map((ch, i) => `
        <div data-ch="${ch}">
          <input type="range" min="0" max="255" value="${settings.colors[S.corner][i]}" data-ch-index="${i}" aria-label="${ch.toUpperCase()}" />
          <span class="val">${t(settings.colors[S.corner][i], { num: true })}</span>
        </div>`).join("")}
      </div>` : "";
    const toggle = (group, on) => `
      <div class="toggle">
        <button ${nav(S, group, 0, group)} data-disabled="${!on}">${t("On")}</button>
        <button ${nav(S, group, 1, group)} data-disabled="${on}">${t("Off")}</button>
      </div>`;
    return `
      <div class="box header"></div>
      <div class="box config-body">
        <ul>
          <li>
            <div class="label">${t("Window Color", { color: "blue" })}</div>
            <div class="box picker">
              <div class="corners">${buttons}</div>
              ${colorsAreDefault() ? "" : `<button class="picker-reset" ${nav(S, "reset", 0, "resetColors")} aria-label="Reset colours">${glyph("reset-icon")}</button>`}
              ${sliders}
            </div>
          </li>
          <li style="margin-top:${S.corner ? 190 : 0}px">
            <div class="label">${t("Sound", { color: "blue" })}</div>${toggle("sound", settings.sound)}
          </li>
          <li>
            <div class="label">${t("CRT Effect", { color: "blue" })}</div>${toggle("crt", settings.crt)}
          </li>
        </ul>
      </div>`;
  }
};

export const SCREENS = Object.keys(screens);

// Live-data window over the Projects screen.
function liveWindow(data, S, onReady) {
  const p = data.projects?.tabs?.[S.tab]?.items?.[S.item];
  if (!p?.live) return "";
  const state = live(p.live, onReady);
  let body = `<p class="live-status">${t("Loading data...")}</p>`;
  if (state.status === "error") body = `<p class="live-status">${t("Could not reach the data. Try again later.", { color: "red" })}</p>`;
  if (state.status === "ready") {
    const d = state.data;
    const max = Math.max(...d.bars, 1);
    body = `
      <ul class="live-rows">${d.rows.map(([k, v]) =>
        `<li class="between"><span>${t(k, { color: "blue" })}</span><span>${t(v)}</span></li>`).join("")}</ul>
      <p class="live-label">${t(d.barsLabel, { color: "grey" })}</p>
      <div class="live-bars">${d.bars.map((v) => `<span style="height:${(v / max) * 100}%"></span>`).join("")}</div>`;
  }
  return `
    <div class="live-backdrop" data-act="closeLive"></div>
    <div class="box live-window">
      <div class="between live-head">
        <span>${t(p.live.title || p.name)}</span>
        <a ${nav(S, "overlay", 0)} data-text-color="yellow" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${t("Open site")}${glyph("external-link-icon")}</a>
      </div>
      ${body}
    </div>`;
}

export function renderScreen(data, S, onReady) {
  return (screens[S.route] || screens.home)(data, S) + menu(data, S)
    + (S.overlay === "live" ? liveWindow(data, S, onReady) : "");
}

// Title screen: NEW GAME / Continue? on black.
// `choice` is the highlighted option; Continue? is greyed out until there
// is a previous visit to continue from.
export function renderTitle(data, choice, canContinue) {
  const p = data.profile || {};
  const title = data.title || {};
  const option = (i, label, disabled = false) =>
    `<li data-nav="title" data-i="${i}" data-focused="${choice === i}"${disabled ? ' data-disabled="true"' : ""}>${t(label)}</li>`;
  return `
    <div class="title-screen" tabindex="-1">
      <ul class="title-menu">
        ${option(0, "NEW GAME")}
        ${option(1, "Continue?", !canContinue)}
      </ul>
      <p class="title-credit">${t(title.subtitle ? `${p.name}  -  ${title.subtitle}` : p.name, { color: "grey" })}</p>
    </div>`;
}
