// Load site content from data/site.json with a safe inline fallback,
// so the page still renders if the fetch fails.

const FALLBACK = {
  profile: {
    name: "Your Name", portrait: "",
    level: 1, hp: [100, 100], mp: [50, 50],
    nextLevelPct: 0, limitLevel: 1, limitPct: 0, gil: 0
  },
  home: { locations: ["Home"], text: ["Content failed to load. Check data/site.json."] },
  menu: [
    { id: "projects", label: "Projects" },
    { id: "contact", label: "Contact" },
    { divider: true },
    { id: "config", label: "Config" }
  ],
  projects: { tabs: [] }, skills: [], equip: { slots: [] },
  history: { groups: [] }, contact: { links: [] }, sfx: {}
};

// Level is age, and "next level" is how far through the current year of
// age we are - so the bar fills up as the next birthday approaches.
function applyBirthday(data, now = new Date()) {
  const p = data.profile || {};
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.birthday || "");
  if (!m) return data;
  const [year, month, day] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  let last = new Date(now.getFullYear(), month, day);
  if (last > now) last = new Date(now.getFullYear() - 1, month, day);
  const next = new Date(last.getFullYear() + 1, month, day);
  p.level = last.getFullYear() - year;
  p.nextLevelPct = ((now - last) / (next - last)) * 100;
  p.daysToBirthday = Math.ceil((next - now) / 86400000);
  if (data.home?.text) data.home.text = data.home.text.map((l) => l.replace("{age}", p.level));
  return data;
}

export async function loadData() {
  try {
    const res = await fetch("data/site.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return applyBirthday(await res.json());
  } catch (err) {
    console.warn("Falling back to default data:", err.message);
    return FALLBACK;
  }
}
