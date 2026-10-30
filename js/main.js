import { AudioBus } from "./audio.js";
import { Game, LEVELS, fmtTime, writeSave } from "./game.js";

const canvas = document.getElementById("view");
const audio = new AudioBus();
const game = new Game(canvas, audio);

const el = {
  title: document.getElementById("title"),
  select: document.getElementById("select"),
  help: document.getElementById("help"),
  pause: document.getElementById("pause"),
  complete: document.getElementById("complete"),
  hud: document.getElementById("hud"),
  controls: document.getElementById("controls"),
  hint: document.getElementById("hint"),
  goal: document.getElementById("goal-banner"),
  list: document.getElementById("level-list"),
  dig: document.getElementById("dig"),
  stick: document.getElementById("stick"),
  knob: document.getElementById("knob"),
};

function show(mode) {
  document.body.dataset.mode = mode;
  el.title.classList.toggle("hidden", mode !== "title");
  el.select.classList.toggle("hidden", mode !== "select");
  el.pause.classList.toggle("hidden", mode !== "pause");
  el.complete.classList.toggle("hidden", mode !== "complete");
  el.hud.classList.toggle("hidden", mode !== "play" && mode !== "pause");
  el.controls.classList.toggle("hidden", mode !== "play");
  if (mode !== "play") {
    el.hint.classList.add("hidden");
    el.goal.classList.add("hidden");
  }
}

function starsText(n) {
  return "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n);
}

function renderLevels() {
  el.list.innerHTML = "";
  LEVELS.forEach((level, i) => {
    const saved = game.save.levels[level.id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-card";
    btn.dataset.level = String(i + 1);
    const stars = saved ? saved.stars : 0;
    const time = saved && saved.bestTime != null ? fmtTime(saved.bestTime) : "new";
    btn.innerHTML =
      '<span class="num">' + level.id + "</span>" +
      '<span class="name">' + level.name + "</span>" +
      '<span class="meta">' + starsText(stars) + " · " + time + " · par " + fmtTime(level.par) + "</span>";
    btn.addEventListener("click", () => {
      audio.unlock();
      if (!audio.muted) audio.startMusic();
      game.startLevel(i);
    });
    el.list.appendChild(btn);
  });
}

function paintMute() {
  const label = game.save.mute ? "Sound off" : "Sound on";
  const mark = game.save.mute ? "×" : "♪";
  for (const id of ["mute-title", "mute-btn"]) {
    const b = document.getElementById(id);
    b.textContent = mark;
    b.setAttribute("aria-label", game.save.mute ? "Unmute sound" : "Mute sound");
  }
  document.getElementById("mute-pause").textContent = label;
}

function toggleMute() {
  audio.unlock();
  game.save.mute = !game.save.mute;
  audio.setMuted(game.save.mute);
  if (game.save.mute) audio.stopMusic();
  else audio.startMusic();
  writeSave(game.save);
  paintMute();
}

function syncHud() {
  if (!game.def) return;
  document.getElementById("level-name").textContent = game.def.name;
  document.getElementById("ball-count").textContent = game.found + "/3 balls";
  document.getElementById("sq-count").textContent = game.squirrelsCaught + "/" + game.def.squirrels.length + " squirrels";
  document.getElementById("timer").textContent = fmtTime(game.levelTime);
  document.getElementById("pause-level").textContent = game.def.name;
}

function showComplete() {
  const level = game.def;
  document.getElementById("complete-level").textContent = level.name;
  const box = document.getElementById("stars");
  box.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "star" + (i < game.lastStars ? " filled pop" : "");
    s.style.animationDelay = i * 0.08 + "s";
    s.textContent = "★";
    box.appendChild(s);
  }
  const timeMet = game.levelTime <= level.par;
  const sqMet = game.squirrelsCaught >= level.squirrels.length;
  document.getElementById("complete-stats").innerHTML =
    "<li><span>Balls</span><span>3/3</span></li>" +
    "<li><span>Time " + (timeMet ? "★" : "☆") + "</span><span>" + fmtTime(game.levelTime) + " / " + fmtTime(level.par) + "</span></li>" +
    "<li><span>Squirrels " + (sqMet ? "★" : "☆") + "</span><span>" + game.squirrelsCaught + "/" + level.squirrels.length + "</span></li>";
  const next = document.getElementById("next");
  const last = game.levelIndex >= LEVELS.length - 1;
  next.textContent = last ? "Back to yards" : "Next yard";
  next.dataset.last = last ? "1" : "0";
}

game.onMode = (g) => {
  show(g.mode);
  if (g.mode === "complete") showComplete();
  if (g.mode === "select" || g.mode === "title") renderLevels();
  syncHud();
};

game.onHud = () => syncHud();

game.onFrame = (g) => {
  const action = g.actionLabel();
  el.dig.textContent = action.label;
  el.dig.classList.toggle("hot", action.hot);
  const showHint = g.def.id === 1 && g.found === 0;
  el.hint.classList.toggle("hidden", !showHint);
  el.goal.classList.toggle("hidden", g.found < 3);
};

document.getElementById("play").addEventListener("click", () => {
  audio.unlock();
  if (!audio.muted) audio.startMusic();
  game.mode = "select";
  show("select");
  renderLevels();
});

document.getElementById("back-title").addEventListener("click", () => {
  game.mode = "title";
  show("title");
});

document.getElementById("help-open").addEventListener("click", () => {
  audio.unlock();
  if (!audio.muted) audio.startMusic();
  el.help.classList.remove("hidden");
});

document.getElementById("help-close").addEventListener("click", () => {
  el.help.classList.add("hidden");
});

document.getElementById("pause-btn").addEventListener("click", () => game.pause());
document.getElementById("resume").addEventListener("click", () => {
  audio.unlock();
  game.resume();
});
document.getElementById("retry").addEventListener("click", () => {
  audio.unlock();
  if (!audio.muted) audio.startMusic();
  game.startLevel(game.levelIndex);
});
document.getElementById("pause-levels").addEventListener("click", () => {
  game.mode = "select";
  show("select");
  renderLevels();
  if (!audio.muted) audio.startMusic();
});
document.getElementById("mute-title").addEventListener("click", toggleMute);
document.getElementById("mute-btn").addEventListener("click", toggleMute);
document.getElementById("mute-pause").addEventListener("click", toggleMute);

document.getElementById("replay").addEventListener("click", () => {
  audio.unlock();
  if (!audio.muted) audio.startMusic();
  game.startLevel(game.levelIndex);
});
document.getElementById("to-levels").addEventListener("click", () => {
  game.mode = "select";
  show("select");
  renderLevels();
  if (!audio.muted) audio.startMusic();
});
document.getElementById("next").addEventListener("click", () => {
  audio.unlock();
  if (document.getElementById("next").dataset.last === "1") {
    game.mode = "select";
    show("select");
    renderLevels();
    if (!audio.muted) audio.startMusic();
    return;
  }
  if (!audio.muted) audio.startMusic();
  game.startLevel(game.levelIndex + 1);
});

function stickVector(e) {
  const r = el.stick.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const max = r.width * 0.36;
  const m = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, max / m);
  el.knob.style.transform = "translate(" + dx * k + "px," + dy * k + "px)";
  game.setStick(dx / max, dy / max);
  el.stick.setAttribute("aria-valuenow", String(Math.min(1, m / max).toFixed(2)));
}

el.stick.addEventListener("pointerdown", (e) => {
  el.stick.setPointerCapture(e.pointerId);
  stickVector(e);
});
el.stick.addEventListener("pointermove", (e) => {
  if (el.stick.hasPointerCapture(e.pointerId)) stickVector(e);
});
function stickUp(e) {
  if (el.stick.hasPointerCapture(e.pointerId)) el.stick.releasePointerCapture(e.pointerId);
  el.knob.style.transform = "";
  game.setStick(0, 0);
  el.stick.setAttribute("aria-valuenow", "0");
}
el.stick.addEventListener("pointerup", stickUp);
el.stick.addEventListener("pointercancel", stickUp);

el.dig.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  game.tapAction();
});

canvas.addEventListener("pointerdown", (e) => {
  if (game.mode !== "play") return;
  const p = game.pointerWorld(e.clientX, e.clientY);
  game.setDest(p.x, p.y);
});

const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys.add(e.key);
  if (e.key === "Escape" && game.mode === "play") game.pause();
  if (e.key === "Escape" && game.mode === "pause") game.resume();
  if (e.key === " " || e.key === "Enter") {
    if (game.mode === "play") game.tapAction();
  }
  applyKeys();
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
  applyKeys();
});
function applyKeys() {
  let x = 0;
  let y = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) x += 1;
  if (keys.has("ArrowUp") || keys.has("w")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) y += 1;
  if (game.mode === "play" && (x || y || keys.size === 0)) game.setStick(x, y);
}

document.addEventListener("touchmove", (e) => {
  if (e.target.closest("#select, .card, .title-wrap")) return;
  e.preventDefault();
}, { passive: false });

document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.mode === "play") game.pause();
});

game.resize();
window.addEventListener("resize", () => game.resize());
show("title");
paintMute();
renderLevels();

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.__game = {
  ready: true,
  snapshot: () => game.snapshot(),
  setStick: (x, y) => game.setStick(x, y),
  tapAction: () => game.tapAction(),
};

if (!location.search.includes("nosw=1") && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
