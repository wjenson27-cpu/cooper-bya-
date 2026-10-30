import { LEVELS, fmtTime, starCount } from "./levels.js";
import {
  bakeGround,
  bakeTitle,
  drawBall,
  drawBush,
  drawCooper,
  drawDecor,
  drawGnome,
  drawMound,
  drawMud,
  drawNap,
  drawParticle,
  drawSprinkler,
  drawSquirrel,
  drawToy,
  drawTree,
  outsideFill,
} from "./draw.js";

const SAVE_KEY = "cooper-bya-save-v1";
const INTERACT = 58;

export class Game {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = audio;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.input = { x: 0, y: 0, stick: false, dest: null };
    this.mode = "title";
    this.levelIndex = 0;
    this.t = 0;
    this.levelTime = 0;
    this.shake = 0;
    this.particles = [];
    this.floaters = [];
    this.player = null;
    this.balls = [];
    this.squirrels = [];
    this.solids = [];
    this.ground = null;
    this.titleBg = null;
    this.titleW = 0;
    this.titleH = 0;
    this.found = 0;
    this.squirrelsCaught = 0;
    this.lastStars = 0;
    this.splashCool = 0;
    this.viewW = 1;
    this.viewH = 1;
    this.dpr = 1;
    this.cam = { x: 0, y: 0 };
    this.closeup = false;
    this.save = loadSave();
    this.audio.setMuted(!!this.save.mute);
    this.onHud = () => {};
    this.onMode = () => {};
    this.onFrame = () => {};
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      this.reduced = e.matches;
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.viewW = Math.max(1, rect.width);
    this.viewH = Math.max(1, rect.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.viewW * this.dpr);
    this.canvas.height = Math.round(this.viewH * this.dpr);
  }

  setStick(x, y) {
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    this.input.x = x;
    this.input.y = y;
    this.input.stick = m > 0.12;
    if (this.input.stick) this.input.dest = null;
  }

  tapAction() {
    if (this.mode !== "play" || !this.player || this.player.digT > 0) return;
    const ball = this.nearestHidden();
    this.player.digT = ball ? 0.42 : 0.26;
    this.player.digBall = ball;
    this.player.anim = "dig";
    this.audio.dig();
    this.burst(this.player.x, this.player.y + 8, "dirt", ball ? 8 : 4);
    if (!this.reduced) this.shake = ball ? 3.5 : 1.5;
    buzz(ball ? 18 : 10);
  }

  pointerWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left + this.cam.x,
      y: clientY - rect.top + this.cam.y,
    };
  }

  setDest(x, y) {
    if (this.mode !== "play") return;
    const hidden = this.balls.find((b) => !b.found && b.hide !== "open" && Math.hypot(b.x - x, b.y - y) < 36);
    this.input.dest = { x, y, auto: !!hidden };
    this.input.stick = false;
    this.input.x = 0;
    this.input.y = 0;
  }

  startLevel(index) {
    this.levelIndex = index;
    const def = LEVELS[index];
    this.def = def;
    this.player = {
      x: def.start.x,
      y: def.start.y,
      r: 18,
      facing: -Math.PI / 2,
      face: 1,
      anim: "idle",
      happyT: 0,
      digT: 0,
      digBall: null,
      cycle: 0,
      wet: 0,
    };
    this.balls = def.balls.map((b) => ({ ...b }));
    this.squirrels = def.squirrels.map((s) => ({ ...s, state: "idle" }));
    this.solids = [];
    for (const tree of def.trees) this.solids.push({ kind: "circle", x: tree.x, y: tree.y + 6, r: Math.max(16, tree.r * 0.42) });
    for (const gnome of def.gnomes) this.solids.push({ kind: "circle", x: gnome.x, y: gnome.y + 4, r: 16 });
    for (const rect of def.rects) this.solids.push({ kind: "rect", ...rect });
    this.found = 0;
    this.squirrelsCaught = 0;
    this.levelTime = 0;
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
    this.input.dest = null;
    this.input.x = 0;
    this.input.y = 0;
    this.input.stick = false;
    this.worldW = def.w;
    this.worldH = def.h + 200;
    this.ground = bakeGround({ ...def, h: this.worldH });
    this.mode = "play";
    this.audio.bark();
    this.onMode(this);
    this.onHud(this);
  }

  pause() {
    if (this.mode !== "play") return;
    this.mode = "pause";
    this.audio.stopMusic();
    this.setStick(0, 0);
    this.onMode(this);
  }

  resume() {
    if (this.mode !== "pause") return;
    this.mode = "play";
    if (!this.audio.muted) this.audio.startMusic();
    this.onMode(this);
  }

  frame(dt) {
    this.t += this.reduced ? dt * 0.35 : dt;
    if (this.mode === "play") {
      this.levelTime += dt;
      this.sim(dt);
      if (Math.floor(this.levelTime * 5) !== Math.floor((this.levelTime - dt) * 5)) this.onHud(this);
    } else if (this.mode === "complete" || this.mode === "pause") {
      this.particlesUpdate(dt);
    }
    if (this.mode === "play") this.onFrame(this);
    this.draw();
  }

  sim(dt) {
    const p = this.player;
    if (p.wet > 0) p.wet -= dt;
    if (p.happyT > 0) p.happyT = Math.max(0, p.happyT - dt);
    if (p.digT > 0) {
      p.digT -= dt;
      p.anim = "dig";
      if (!this.reduced && Math.random() < 0.4) this.burst(p.x + (Math.random() - 0.5) * 10, p.y + 10, "dirt", 1);
      if (p.digT <= 0) this.finishDig();
    } else {
      this.move(dt);
    }
    this.resolve();
    this.sprinklers(dt);
    this.resolve();
    this.clamp();
    this.pickups();
    this.squirrelsUpdate(dt);
    this.particlesUpdate(dt);
    this.splashCool = Math.max(0, this.splashCool - dt);
    this.camera();
  }

  move(dt) {
    const p = this.player;
    let x = 0;
    let y = 0;
    if (this.input.stick) {
      x = this.input.x;
      y = this.input.y;
    } else if (this.input.dest) {
      const dx = this.input.dest.x - p.x;
      const dy = this.input.dest.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        if (this.input.dest.auto) this.tapAction();
        this.input.dest = null;
      } else {
        x = dx / d;
        y = dy / d;
      }
    }
    const moving = Math.hypot(x, y) > 0.05;
    let speed = 156;
    if (this.inMud(p.x, p.y)) speed = 64;
    if (p.wet > 0) speed *= 0.78;
    if (moving) {
      p.x += x * speed * dt;
      p.y += y * speed * dt;
      p.facing = Math.atan2(y, x);
      if (Math.abs(x) > 0.18) p.face = x > 0 ? 1 : -1;
      p.anim = "walk";
      p.cycle += dt * 11;
      if (!this.reduced && Math.random() < 0.25) this.burst(p.x - p.face * 10, p.y + 14, "dust", 1);
    } else {
      p.anim = "idle";
    }
  }

  inMud(x, y) {
    for (const m of this.def.mud) {
      const nx = (x - m.x) / m.rx;
      const ny = (y - m.y) / m.ry;
      if (nx * nx + ny * ny <= 1) return true;
    }
    return false;
  }

  resolve() {
    const p = this.player;
    for (const s of this.solids) {
      if (s.kind === "circle") {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = p.r + s.r;
        if (d < min) {
          p.x += (dx / d) * (min - d);
          p.y += (dy / d) * (min - d);
        }
      } else {
        const cx = clamp(p.x, s.x, s.x + s.w);
        const cy = clamp(p.y, s.y, s.y + s.h);
        let dx = p.x - cx;
        let dy = p.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < p.r) {
          if (d === 0) {
            const left = p.x - s.x;
            const right = s.x + s.w - p.x;
            const up = p.y - s.y;
            const down = s.y + s.h - p.y;
            const m = Math.min(left, right, up, down);
            if (m === left) p.x = s.x - p.r;
            else if (m === right) p.x = s.x + s.w + p.r;
            else if (m === up) p.y = s.y - p.r;
            else p.y = s.y + s.h + p.r;
          } else {
            p.x += (dx / d) * (p.r - d);
            p.y += (dy / d) * (p.r - d);
          }
        }
      }
    }
  }

  clamp() {
    const p = this.player;
    p.x = clamp(p.x, 46, this.worldW - 46);
    p.y = clamp(p.y, 46, this.worldH - 46);
  }

  sprinklers(dt) {
    const p = this.player;
    for (const s of this.def.sprinklers) {
      const ang = s.phase + this.t * s.speed;
      s.angle = ang;
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const d = Math.hypot(dx, dy);
      let diff = Math.atan2(dy, dx) - ang;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (d < s.range && d > 18 && Math.abs(diff) < 0.38) {
        p.x += Math.cos(ang) * 90 * dt;
        p.y += Math.sin(ang) * 90 * dt;
        p.wet = 0.45;
        if (this.splashCool <= 0) {
          this.audio.splash();
          this.splashCool = 0.45;
          this.burst(p.x, p.y, "drop", this.reduced ? 1 : 3);
        }
      }
    }
  }

  pickups() {
    const p = this.player;
    for (const b of this.balls) {
      if (b.found || b.hide !== "open") continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < 30) this.collect(b);
    }
    if (this.found >= 3 && Math.hypot(this.def.nap.x - p.x, this.def.nap.y - p.y) < 40) {
      this.win();
    }
  }

  finishDig() {
    const ball = this.player.digBall;
    this.player.digBall = null;
    if (ball && !ball.found && Math.hypot(ball.x - this.player.x, ball.y - this.player.y) < INTERACT + 8) {
      this.collect(ball);
    }
  }

  collect(ball) {
    if (ball.found) return;
    ball.found = true;
    this.found += 1;
    this.audio.found();
    this.audio.bark();
    buzz(28);
    this.burst(ball.x, ball.y, "spark", this.reduced ? 4 : 14);
    this.floater(ball.x, ball.y - 20, "Got it!");
    this.player.happyT = 0.7;
    if (!this.reduced) this.shake = 2;
    this.onHud(this);
  }

  squirrelsUpdate(dt) {
    for (const sq of this.squirrels) {
      if (sq.state === "gone" || sq.state === "tree") continue;
      const tree = this.def.trees[sq.tree];
      const pd = Math.hypot(sq.x - this.player.x, sq.y - this.player.y);
      if (sq.state === "idle" && pd < 148) {
        sq.state = "flee";
        this.audio.squeak();
      }
      if (sq.state === "flee") {
        const dx = tree.x - sq.x;
        const dy = tree.y - sq.y;
        const d = Math.hypot(dx, dy) || 1;
        sq.x += (dx / d) * 112 * dt;
        sq.y += (dy / d) * 112 * dt;
        const near = Math.hypot(sq.x - this.player.x, sq.y - this.player.y);
        if (near < 34) {
          sq.state = "gone";
          this.squirrelsCaught += 1;
          this.audio.squeak();
          buzz(16);
          this.floater(sq.x, sq.y - 16, "+25");
          this.burst(sq.x, sq.y, "spark", this.reduced ? 2 : 8);
          this.onHud(this);
        } else if (d < 24) {
          sq.state = "tree";
          sq.x = tree.x + 16;
          sq.y = tree.y - 26;
        }
      }
    }
  }

  win() {
    if (this.mode !== "play") return;
    this.lastStars = starCount(this.def, this.levelTime, this.squirrelsCaught);
    const prev = this.save.levels[this.def.id] || { stars: 0, bestTime: null, squirrels: 0 };
    this.save.levels[this.def.id] = {
      stars: Math.max(prev.stars, this.lastStars),
      bestTime: prev.bestTime == null ? this.levelTime : Math.min(prev.bestTime, this.levelTime),
      squirrels: Math.max(prev.squirrels || 0, this.squirrelsCaught),
    };
    writeSave(this.save);
    this.player.anim = "nap";
    this.player.x = this.def.nap.x;
    this.player.y = this.def.nap.y + 6;
    this.mode = "complete";
    this.audio.stopMusic();
    this.audio.bark();
    this.audio.fanfare();
    buzzPattern();
    this.burst(this.def.nap.x, this.def.nap.y, "spark", this.reduced ? 4 : 18);
    this.camera();
    this.onMode(this);
    this.onHud(this);
  }

  nearestHidden() {
    let best = null;
    let bestD = INTERACT;
    for (const b of this.balls) {
      if (b.found || b.hide === "open") continue;
      const d = Math.hypot(b.x - this.player.x, b.y - this.player.y);
      if (d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  actionLabel() {
    const ball = this.player ? this.nearestHidden() : null;
    if (!ball) return { label: "DIG", hot: false };
    if (ball.hide === "bush") return { label: "SNIFF", hot: true };
    if (ball.hide === "toy") return { label: "NUDGE", hot: true };
    return { label: "DIG", hot: true };
  }

  burst(x, y, kind, n) {
    const colors = ["#ffe08a", "#fff", "#ff7a1a", "#7eb0ff", "#f3a3b5"];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 70;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (kind === "spark" ? 20 : 0),
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        kind,
        color: colors[i % colors.length],
        r: 2 + Math.random() * 2.5,
        rot: Math.random() * 6,
      });
    }
    if (this.particles.length > 90) this.particles.splice(0, this.particles.length - 90);
  }

  floater(x, y, text) {
    this.floaters.push({ x, y, text, life: 0.9, max: 0.9 });
  }

  particlesUpdate(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 18 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (this.shake > 0) {
      this.shake *= Math.pow(0.05, dt);
      if (this.shake < 0.2) this.shake = 0;
    }
  }

  camera() {
    if (!this.player || !this.def) return;
    const vw = this.viewW;
    const vh = this.viewH;
    const land = vw > vh;
    const focusY = land ? vh * 0.5 : vh * 0.6;
    if (this.worldW <= vw) this.cam.x = -(vw - this.worldW) / 2;
    else this.cam.x = clamp(this.player.x - vw / 2, 0, this.worldW - vw);
    if (this.worldH <= vh) this.cam.y = -(vh - this.worldH) / 2;
    else this.cam.y = clamp(this.player.y - focusY, 0, this.worldH - vh);
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    if (this.closeup) {
      this.drawCloseup();
      return;
    }
    if (this.mode === "title" || this.mode === "select") {
      this.drawTitle();
      return;
    }
    ctx.fillStyle = outsideFill(this.def.theme);
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.save();
    if (this.shake > 0 && !this.reduced) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    ctx.translate(-this.cam.x, -this.cam.y);
    if (this.ground) ctx.drawImage(this.ground, 0, 0);
    for (const m of this.def.mud) {
      if (this.def.theme === "beach") drawMud(ctx, m, true);
    }
    const sprites = [];
    for (const d of this.def.decor) sprites.push({ y: d.y, draw: () => drawDecor(ctx, d, this.def.theme === "evening") });
    for (const tree of this.def.trees) {
      sprites.push({
        y: tree.y,
        draw: () => drawTree(ctx, tree.x, tree.y, tree.r, tree.kind, this.def.theme === "evening"),
      });
    }
    for (const bush of this.def.bushes) {
      sprites.push({ y: bush.y, draw: () => drawBush(ctx, bush.x, bush.y, bush.r, this.t, false) });
    }
    for (const gnome of this.def.gnomes) sprites.push({ y: gnome.y, draw: () => drawGnome(ctx, gnome.x, gnome.y) });
    for (const ball of this.balls) {
      if (ball.found) continue;
      if (ball.hide === "dig") sprites.push({ y: ball.y, draw: () => drawMound(ctx, ball.x, ball.y, this.t, false) });
      if (ball.hide === "bush") {
        const hot = this.player && Math.hypot(ball.x - this.player.x, ball.y - this.player.y) < INTERACT;
        sprites.push({ y: ball.y, draw: () => drawBush(ctx, ball.x, ball.y, 28, this.t, hot) });
      }
      if (ball.hide === "toy") sprites.push({ y: ball.y, draw: () => drawToy(ctx, ball.x, ball.y, ball.toy || "bucket", this.t) });
      if (ball.hide === "open") {
        const bob = this.reduced ? 0 : Math.sin(this.t * 3 + ball.x) * 3;
        sprites.push({ y: ball.y, draw: () => drawBall(ctx, ball.x, ball.y + bob, 13, this.t) });
      }
    }
    sprites.push({
      y: this.def.nap.y,
      draw: () => drawNap(ctx, this.def.nap, this.t, this.found >= 3, this.reduced),
    });
    for (const s of this.def.sprinklers) {
      sprites.push({
        y: s.y,
        draw: () => drawSprinkler(ctx, s.x, s.y, s.angle || s.phase, s.range),
      });
    }
    for (const sq of this.squirrels) {
      if (sq.state === "gone") continue;
      sprites.push({
        y: sq.y,
        draw: () => drawSquirrel(ctx, sq.x, sq.y, { t: this.t, state: sq.state, reduced: this.reduced }),
      });
    }
    const napPose = this.mode === "complete" || this.player.anim === "nap";
    const showHappy = this.player.happyT > 0 && !napPose && this.player.anim !== "dig";
    sprites.push({
      y: this.player.y + 16,
      draw: () =>
        drawCooper(ctx, this.player.x, this.player.y, {
          t: this.t,
          facing: this.player.facing,
          face: this.player.face,
          anim: napPose ? "nap" : showHappy ? "happy" : this.player.anim,
          sit: napPose,
          cycle: this.player.cycle,
          scale: 1.32,
          reduced: this.reduced,
          tilt: napPose ? -0.12 : -0.42,
        }),
    });
    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) s.draw();
    for (const p of this.particles) drawParticle(ctx, p);
    ctx.fillStyle = "#3a2718";
    ctx.font = "700 16px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawTitle() {
    if (!this.titleBg || this.titleW !== this.viewW || this.titleH !== this.viewH) {
      this.titleBg = bakeTitle(this.viewW, this.viewH);
      this.titleW = this.viewW;
      this.titleH = this.viewH;
    }
    const ctx = this.ctx;
    ctx.drawImage(this.titleBg, 0, 0, this.viewW, this.viewH);
    const land = this.viewW > this.viewH;
    const cx = land ? this.viewW * 0.28 : this.viewW * 0.48;
    const cy = land ? this.viewH * 0.58 : this.viewH * 0.5;
    const scale = land ? Math.min(1.45, this.viewH / 300) : Math.min(1.72, this.viewW / 250);
    drawCooper(ctx, cx, cy, {
      sit: true,
      lookUp: true,
      tilt: -0.5,
      face: 1,
      scale,
      t: this.t,
      reduced: this.reduced,
      anim: "sit",
    });
    const bob = this.reduced ? 0 : Math.sin(this.t * 2.4) * 4;
    drawBall(ctx, cx + 46 * scale, cy + 18 * scale + bob, 7 * scale, this.t);
  }

  drawCloseup() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = this.viewW;
    const h = this.viewH;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#bfe6ff");
    g.addColorStop(0.45, "#e7f6c8");
    g.addColorStop(1, "#7ec84a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const scale = Math.min((w * 0.9) / 100, (h * 0.7) / 78);
    drawCooper(ctx, w * 0.5, h * (w > h ? 0.56 : 0.5), {
      anim: "walk",
      face: 1,
      facing: 0,
      cycle: Math.PI / 2,
      scale,
      t: this.t,
      reduced: false,
    });
  }

  snapshot() {
    return {
      mode: this.mode,
      found: this.found,
      ballsTotal: 3,
      squirrelsCaught: this.squirrelsCaught,
      squirrelsTotal: this.squirrels.length,
      time: this.levelTime,
      par: this.def ? this.def.par : 0,
      stars: this.lastStars,
      interactRange: INTERACT,
      player: this.player ? { x: this.player.x, y: this.player.y, r: this.player.r } : null,
      balls: this.balls.map((b) => ({ x: b.x, y: b.y, hide: b.hide, found: !!b.found })),
      nap: this.def ? { x: this.def.nap.x, y: this.def.nap.y } : null,
      solids: this.solids,
      w: this.worldW || 0,
      h: this.worldH || 0,
      levelId: this.def ? this.def.id : 0,
    };
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { mute: false, levels: {} };
    const data = JSON.parse(raw);
    return { mute: !!data.mute, levels: data.levels || {} };
  } catch (err) {
    return { mute: false, levels: {} };
  }
}

export function writeSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function buzz(ms) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (err) {
    /* some browsers block vibration */
  }
}

function buzzPattern() {
  try {
    if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
  } catch (err) {
    /* ignore */
  }
}

export { LEVELS, fmtTime, SAVE_KEY };
