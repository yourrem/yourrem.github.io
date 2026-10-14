// Live project widgets. Each loader fetches a project's own published data
// and boils it down to label/value rows plus an optional bar series.

const cache = {};

const day = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const pretty = (iso) => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const num = (n) => Math.round(n).toLocaleString("en-US");

// SF Crime Desk: the site exports its API as static JSON under /api/, with
// windowed files named by their start and end dates.
async function sfcrime(base) {
  const get = async (name) => {
    const res = await fetch(`${base}${name}.json`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.json();
  };
  const { latest_date: end } = await get("latest-date");
  const window30 = `__end-${end}__limit-15__start-${day(end, -30)}`;
  const [trends, forecast, categories, hoods] = await Promise.all([
    get("trends"), get("forecast"), get(`categories${window30}`), get(`neighborhoods${window30}`)
  ]);
  const last30 = trends.slice(-30);
  const latest = trends[trends.length - 1];
  const next = forecast.predictions?.[forecast.predictions.length - 1];
  return {
    rows: [
      ["Data through", pretty(end)],
      ["Incidents that day", num(latest.count)],
      ["7-day average", num(latest.avg)],
      ["Last 30 days", num(last30.reduce((s, d) => s + d.count, 0))],
      ["Top category", categories[0]?.category || "-"],
      ["Top neighborhood", hoods[0]?.neighborhood || "-"],
      ["Forecast " + (next ? pretty(next.date) : ""), next ? num(next.predicted) : "-"],
      ["Model error (RMSE)", forecast.metrics?.rmse ?? "-"]
    ],
    bars: last30.map((d) => d.count),
    barsLabel: "Daily incidents, last 30 days"
  };
}

const LOADERS = { sfcrime };

// Returns { status: "loading" | "ready" | "error", data? } and kicks off the
// fetch the first time; `onReady` re-renders when it lands.
export function live(cfg, onReady) {
  const key = `${cfg.type}:${cfg.api}`;
  if (!cache[key]) {
    cache[key] = { status: "loading" };
    LOADERS[cfg.type](cfg.api)
      .then((data) => { cache[key] = { status: "ready", data }; })
      .catch((err) => { console.warn("Live data failed:", err.message); cache[key] = { status: "error" }; })
      .finally(onReady);
  }
  return cache[key];
}
