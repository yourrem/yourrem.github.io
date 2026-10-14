// Scale the fixed 1250x975 stage to fit the viewport, centred.

const LOGICAL_W = 1250;
const LOGICAL_H = 975;

let frame = null;

function apply() {
  frame = null;
  const scale = Math.min(
    window.innerWidth / LOGICAL_W,
    window.innerHeight / LOGICAL_H
  );
  const root = document.documentElement.style;
  root.setProperty("--scale", String(scale));
  // Centre vertically when the viewport is taller than the scaled stage.
  const spare = Math.max(0, window.innerHeight - LOGICAL_H * scale);
  document.getElementById("stage").style.top = `${spare / 2}px`;
}

export function initStage() {
  apply();
  window.addEventListener("resize", () => {
    if (frame === null) frame = requestAnimationFrame(apply);
  });
}
