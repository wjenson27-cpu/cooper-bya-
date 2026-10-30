const THEMES = {
  yard: {
    base: "#8ed24c",
    blobs: ["#7fc243", "#a4de62", "#6cb53c"],
    fence: "#f0d7a4",
    fenceDark: "#c89a58",
    accent: "#ff8fb0",
  },
  garden: {
    base: "#73c44a",
    blobs: ["#62b33c", "#90d85e", "#559e36"],
    fence: "#f3e0b8",
    fenceDark: "#c9a36a",
    accent: "#ffd15c",
  },
  patio: {
    base: "#e7d3b4",
    blobs: ["#dcc6a4", "#f3e6d0", "#d2b48c"],
    fence: "#f6ead8",
    fenceDark: "#a88462",
    stone: true,
    accent: "#ff9a62",
  },
  mud: {
    base: "#7dbb46",
    blobs: ["#6eab3c", "#93c85a", "#5d9434"],
    fence: "#e7c98a",
    fenceDark: "#b8894c",
    accent: "#8d6a3f",
  },
  park: {
    base: "#67b348",
    blobs: ["#569f3a", "#7dc45a", "#4b9234"],
    fence: "#edd7a4",
    fenceDark: "#b88950",
    path: true,
    accent: "#ff8fb0",
  },
  beach: {
    base: "#f6d78a",
    blobs: ["#f3cc72", "#fbe6b2", "#e7c15e"],
    fence: "#f0d2a4",
    fenceDark: "#d2a56a",
    sand: true,
    accent: "#ff8a5b",
  },
  evening: {
    base: "#5e9464",
    blobs: ["#4e8356", "#6ea572", "#3f7048"],
    fence: "#8b6a48",
    fenceDark: "#4e3828",
    evening: true,
    accent: "#ffb45a",
  },
};

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ellipse(ctx, x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
}

function glossy(ctx, x, y, rx, ry) {
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, rx * 0.08, x, y + ry * 0.1, Math.max(rx, ry));
  g.addColorStop(0, "#5a5a5a");
  g.addColorStop(0.28, "#2a2a2a");
  g.addColorStop(0.72, "#161616");
  g.addColorStop(1, "#070707");
  ctx.fillStyle = g;
}

export function drawBall(ctx, x, y, r, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin((t || 0) * 1.6) * 0.15);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#ff7a1a";
  ctx.fillRect(-r - 2, -r - 2, r * 2 + 4, r * 2 + 4);
  ctx.save();
  ctx.rotate(-0.45);
  ctx.fillStyle = "#2a62e6";
  const stripe = r * 0.42;
  for (let i = -4; i <= 4; i += 2) {
    ctx.fillRect(-r * 2, i * stripe - stripe * 0.34, r * 4, stripe * 0.62);
  }
  ctx.restore();
  const shine = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.05, -r * 0.1, -r * 0.1, r);
  shine.addColorStop(0, "rgba(255,255,255,0.85)");
  shine.addColorStop(0.45, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(90,40,10,0.28)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
}

function roundLimb(ctx, x1, y1, x2, y2, r) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(ang);
  const len = Math.hypot(x2 - x1, y2 - y1);
  ctx.beginPath();
  ctx.ellipse(len / 2, 0, Math.max(0.5, len / 2), r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function coat(ctx, x, y, rx, ry) {
  const g = ctx.createLinearGradient(x - rx, y - ry, x + rx * 0.4, y + ry);
  g.addColorStop(0, "#6a6a6a");
  g.addColorStop(0.22, "#3a3a3a");
  g.addColorStop(0.62, "#1a1a1a");
  g.addColorStop(1, "#070707");
  ctx.fillStyle = g;
}

function paintPaw(ctx, x, y, w) {
  ctx.fillStyle = "#101010";
  ellipse(ctx, x, y, w, w * 0.46);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y - 0.4);
  ctx.lineTo(x - w * 0.15, y + w * 0.25);
  ctx.moveTo(x + w * 0.05, y - 0.6);
  ctx.lineTo(x + w * 0.05, y + w * 0.28);
  ctx.stroke();
}

function labLeg(ctx, hipX, hipY, phase, cycle, moving, thick) {
  const s = moving ? Math.sin(cycle + phase) : 0;
  const swing = s * 9;
  const lift = Math.max(0, s) * 5.5;
  const pawX = hipX + swing;
  const pawY = 16 - lift;
  const kneeX = hipX + swing * 0.42;
  const kneeY = hipY + (pawY - hipY) * 0.55;
  coat(ctx, hipX, hipY, thick, thick * 0.8);
  roundLimb(ctx, hipX, hipY, kneeX, kneeY, thick);
  roundLimb(ctx, kneeX, kneeY, pawX, pawY - 2, thick * 0.78);
  coat(ctx, pawX, pawY, thick, thick * 0.5);
  ellipse(ctx, pawX, pawY, thick * 1.15, thick * 0.52);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(pawX - thick * 0.45, pawY - 0.2);
  ctx.lineTo(pawX - thick * 0.15, pawY + thick * 0.32);
  ctx.moveTo(pawX + thick * 0.18, pawY - 0.2);
  ctx.lineTo(pawX + thick * 0.18, pawY + thick * 0.34);
  ctx.stroke();
}

function otterTail(ctx, wag, tuck) {
  ctx.save();
  if (tuck) {
    ctx.translate(-10, 2);
    ctx.rotate(Math.PI * 0.78 + wag);
  } else {
    ctx.translate(-18, -8);
    ctx.rotate(Math.PI - 0.5 + wag);
  }
  const parts = tuck
    ? [[0, 0, 9, 7], [7, 1, 7.2, 5.6], [13, 2, 5.4, 4.2], [18, 3, 3.8, 3]]
    : [[0, 0, 10, 8], [7, -0.4, 8.6, 6.8], [13, -0.8, 7.2, 5.6], [19, -1, 5.8, 4.5], [24, -0.8, 4.4, 3.4], [28, -0.4, 3.2, 2.5]];
  for (const [x, y, rx, ry] of parts) {
    coat(ctx, x, y, rx, ry);
    ellipse(ctx, x, y, rx, ry);
    ctx.fill();
  }
  ctx.restore();
}

function labTorso(ctx) {
  coat(ctx, 0, -4, 28, 16);
  ctx.beginPath();
  ctx.moveTo(-22, -13);
  ctx.quadraticCurveTo(-2, -20, 16, -14);
  ctx.quadraticCurveTo(30, -10, 27, -1);
  ctx.quadraticCurveTo(30, 6, 16, 9);
  ctx.quadraticCurveTo(2, 12, -12, 8);
  ctx.quadraticCurveTo(-28, 6, -27, -4);
  ctx.quadraticCurveTo(-28, -10, -22, -13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, -12);
  ctx.quadraticCurveTo(2, -16, 16, -11);
  ctx.stroke();
}

function profileEye(ctx, x, y, lookX, lookY, closed) {
  if (closed) {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0.2 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "#fffaf2";
  ellipse(ctx, x, y, 4.6, 5);
  ctx.fill();
  ctx.fillStyle = "#c48448";
  ctx.beginPath();
  ctx.arc(x + lookX, y + lookY, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b3a18";
  ctx.beginPath();
  ctx.arc(x + lookX, y + lookY, 2.8, 0.1, Math.PI * 0.9);
  ctx.fill();
  ctx.fillStyle = "#1a0c08";
  ctx.beginPath();
  ctx.arc(x + lookX * 1.1, y + lookY, 1.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + lookX - 1.2, y + lookY - 1.3, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

function floppyEar(ctx, x, y, rot, len) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  coat(ctx, 0, len * 0.45, 7, len * 0.5);
  ellipse(ctx, 0, len * 0.45, 6.4, len * 0.48);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#3d2c2c";
  ellipse(ctx, 1, len * 0.5, 3, len * 0.28);
  ctx.fill();
  ctx.restore();
}

function neckBandana(ctx, x, y, nap) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#d32f2f";
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.quadraticCurveTo(0, 2, 9, -5);
  ctx.lineTo(4, 7);
  ctx.quadraticCurveTo(0, 12, -3, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b71c1c";
  ctx.fillRect(-1.2, -2, 2.4, 10);
  ctx.fillStyle = "#c62828";
  ctx.beginPath();
  ctx.arc(0, -3, 2.6, 0, Math.PI * 2);
  ctx.fill();
  if (!nap) {
    ctx.fillStyle = "#e8b43a";
    ctx.beginPath();
    ctx.arc(1, 8, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a87420";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(1, 8.4, 1.1, 0, Math.PI * 2);
    ctx.moveTo(-0.2, 6.8);
    ctx.arc(-0.2, 6.8, 0.45, 0, Math.PI * 2);
    ctx.moveTo(2.2, 6.8);
    ctx.arc(2.2, 6.8, 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(0.1, 7.1, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function sideHead(ctx, o) {
  const t = o.t || 0;
  const reduced = !!o.reduced;
  const dig = o.anim === "dig";
  const happy = o.anim === "happy";
  const nap = o.anim === "nap";
  const flop = reduced ? 0 : Math.sin((o.cycle || 0) * 2) * (o.anim === "walk" ? 0.18 : 0.05);
  floppyEar(ctx, 6, -30, 0.35 + flop, dig ? 14 : 20);
  coat(ctx, 16, -24, 13, 11);
  ellipse(ctx, 16, -24, 12.5, 10.5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = "#2c2c2c";
  ellipse(ctx, 30, -17, 12, 6.6);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.stroke();
  ctx.fillStyle = "#242424";
  ellipse(ctx, 26, -14, 7, 4.2);
  ctx.fill();
  ctx.fillStyle = "#0c0c0c";
  ellipse(ctx, 41, -17.5, 3.8, 3.2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ellipse(ctx, 37, -19.6, 1.1, 0.6);
  ctx.fill();
  const lookY = dig ? 1.6 : happy ? -0.4 : -0.2;
  profileEye(ctx, 18, -27, 0.4, lookY, nap);
  if (!nap) {
    const hang = dig ? 2.2 : 5.2 + (reduced ? 0 : Math.sin(t * 7) * 0.5);
    ctx.fillStyle = "#f3a3b5";
    ellipse(ctx, 30, -12 + hang * 0.15, 3.4, hang);
    ctx.fill();
    ctx.fillStyle = "#e07a90";
    ellipse(ctx, 30.4, -10.5 + hang * 0.2, 1.6, hang * 0.45);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8, -30);
  ctx.quadraticCurveTo(16, -34, 24, -28);
  ctx.stroke();
}

function drawSideLab(ctx, o) {
  const t = o.t || 0;
  const reduced = !!o.reduced;
  const moving = o.anim === "walk" || o.anim === "happy";
  const happy = o.anim === "happy";
  const cycle = moving ? o.cycle || 0 : 0;
  const wag = reduced ? 0.2 : Math.sin(t * (happy ? 16 : moving ? 9 : 4.5)) * (happy ? 0.7 : 0.45);
  const bob = moving && !reduced ? Math.abs(Math.sin(cycle * 2)) * 2.4 : 0;
  const hop = happy && !reduced ? Math.abs(Math.sin(t * 12)) * 8 : 0;
  const breathe = reduced ? 1 : 1 + Math.sin(t * 2.2) * 0.015;
  const squash = happy && !reduced ? 1 + Math.sin(t * 12) * 0.06 : 1;

  ctx.fillStyle = "rgba(50,35,15,0.2)";
  ellipse(ctx, 2, 20, 28, 6);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -bob - hop);
  ctx.scale(squash * breathe, (2 - squash) * breathe);

  labLeg(ctx, -16, -4, Math.PI, cycle, moving, 5.4);
  labLeg(ctx, 10, -4, 0, cycle, moving, 5.4);

  labTorso(ctx);
  otterTail(ctx, wag, false);

  labLeg(ctx, -8, -6, 0, cycle, moving, 7);
  labLeg(ctx, 18, -6, Math.PI, cycle, moving, 7);

  coat(ctx, 16, -12, 8, 7);
  roundLimb(ctx, 14, -8, 20, -18, 7);
  neckBandana(ctx, 16, -12, false);
  sideHead(ctx, o);
  ctx.restore();
}

function drawDigLab(ctx, o) {
  const t = o.t || 0;
  const reduced = !!o.reduced;
  const scratch = reduced ? 0 : Math.sin(t * 22);
  const wag = reduced ? 0.2 : Math.sin(t * 10) * 0.35;
  ctx.fillStyle = "rgba(50,35,15,0.2)";
  ellipse(ctx, 4, 18, 26, 6);
  ctx.fill();
  ctx.save();
  ctx.rotate(-0.42);
  otterTail(ctx, wag + 0.4, false);
  labLeg(ctx, -16, 0, 0, 0, false, 3.4, "#0c0c0c");
  coat(ctx, -4, -2, 22, 12);
  ellipse(ctx, -4, -2, 21, 11.5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.stroke();
  labLeg(ctx, -12, 2, 0.4, 0, false, 4.2, "#161616");
  ctx.restore();

  ctx.save();
  ctx.translate(18, 6);
  ctx.rotate(0.55);
  neckBandana(ctx, -2, -6, false);
  sideHead(ctx, { ...o, anim: "dig" });
  ctx.restore();

  const pawY = 14 - Math.max(0, scratch) * 4;
  ctx.fillStyle = "#141414";
  roundLimb(ctx, 10, 2, 22 + scratch * 3, pawY, 3.6);
  roundLimb(ctx, 16, 4, 28 - scratch * 3, pawY + 1, 3.4);
  paintPaw(ctx, 24 + scratch * 4, pawY + 2, 5);
  paintPaw(ctx, 30 - scratch * 3, pawY + 3, 4.6);
}

function drawBegLab(ctx, o) {
  const t = o.t || 0;
  const reduced = !!o.reduced;
  const nap = o.anim === "nap";
  const tilt = (o.tilt == null ? -0.48 : o.tilt) + (reduced ? 0 : Math.sin(t * 1.5) * 0.04);
  const wag = reduced ? 0.15 : Math.sin(t * 6) * 0.4;
  ctx.fillStyle = "rgba(50,35,15,0.2)";
  ellipse(ctx, 0, 26, 26, 7);
  ctx.fill();

  coat(ctx, -6, 6, 18, 14);
  ellipse(ctx, -6, 6, 17, 13);
  ctx.fill();
  otterTail(ctx, wag, true);
  paintPaw(ctx, -18, 18, 5.2);

  labLeg(ctx, -8, -12, 0, 0, false, 5.6);
  labLeg(ctx, 12, -12, 0.4, 0, false, 5.6);

  coat(ctx, 2, -10, 14, 16);
  ellipse(ctx, 2, -10, 13, 15);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.stroke();
  neckBandana(ctx, 2, -2, nap);

  ctx.save();
  ctx.translate(4, -28);
  ctx.rotate(tilt);
  floppyEar(ctx, -14, -6, 0.55, 15);
  floppyEar(ctx, 12, -8, -0.2, 14);
  coat(ctx, 0, 0, 15, 13);
  ellipse(ctx, 0, 0, 14.5, 12.5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = "#2a2a2a";
  ellipse(ctx, 8, 8, 10, 6.5);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();
  ctx.fillStyle = "#0c0c0c";
  ellipse(ctx, 16, 8, 3.8, 3.1);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ellipse(ctx, 15, 7, 1.1, 0.6);
  ctx.fill();
  const up = nap ? 0 : -1.8;
  profileEye(ctx, -5, -3, -0.2, up, nap);
  profileEye(ctx, 6, -4, 0.2, up, nap);
  if (!nap) {
    ctx.fillStyle = "#f3a3b5";
    ellipse(ctx, 10, 14, 3.6, 4.4);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCooper(ctx, x, y, o) {
  const facing = o.facing == null ? 0 : o.facing;
  const face = o.face != null ? o.face : Math.cos(facing) >= 0 ? 1 : -1;
  const scale = o.scale || 1;
  const sit = !!o.sit || o.anim === "sit" || o.anim === "nap";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face < 0 ? -scale : scale, scale);
  if (sit) drawBegLab(ctx, o);
  else if (o.anim === "dig") drawDigLab(ctx, o);
  else drawSideLab(ctx, o);
  ctx.restore();
}

export function drawSquirrel(ctx, x, y, o) {
  const t = o.t || 0;
  const flee = o.state === "flee";
  const perched = o.state === "tree";
  const bob = o.reduced ? 0 : Math.sin(t * (flee ? 18 : 4) + x) * (perched ? 0.4 : 1.4);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "rgba(80,50,20,0.15)";
  ellipse(ctx, 0, 8, 8, 3);
  ctx.fill();
  ctx.fillStyle = "#c4783a";
  ellipse(ctx, 0, 2, 8, 6);
  ctx.fill();
  ctx.fillStyle = "#f4e2c8";
  ellipse(ctx, 0.5, 3, 4, 3);
  ctx.fill();
  ctx.fillStyle = "#a85a28";
  ctx.save();
  ctx.rotate(perched ? -0.8 : -0.4 + Math.sin(t * 6) * 0.2);
  ellipse(ctx, -8, -6, 6, 9);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#c4783a";
  ctx.beginPath();
  ctx.arc(5, -4, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6e7cf";
  ctx.beginPath();
  ctx.arc(3.2, -6.2, 1.6, 0, Math.PI * 2);
  ctx.arc(6.6, -6.2, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a140c";
  ctx.beginPath();
  ctx.arc(3.4, -6, 0.7, 0, Math.PI * 2);
  ctx.arc(6.8, -6, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e7a0b0";
  ctx.beginPath();
  ctx.arc(5.2, -3.2, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawTree(ctx, x, y, r, kind, evening) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === "palm") {
    ctx.fillStyle = "rgba(80,50,20,0.16)";
    ellipse(ctx, 6, 8, r * 0.7, 8);
    ctx.fill();
    ctx.strokeStyle = "#b98552";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(8, -r * 0.4, -2, -r * 1.5);
    ctx.stroke();
    ctx.translate(-2, -r * 1.5);
    for (let i = 0; i < 6; i++) {
      ctx.rotate((Math.PI * 2) / 6);
      ctx.fillStyle = i % 2 ? "#2f8a45" : "#3eaa58";
      ctx.beginPath();
      ctx.ellipse(16, 0, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = "rgba(50,40,20,0.16)";
  ellipse(ctx, 0, 8, r * 0.85, 10);
  ctx.fill();
  ctx.fillStyle = evening ? "#6b4630" : "#8d5a34";
  roundLimb(ctx, 0, -r * 0.15, 0, 6, 6);
  ctx.fillStyle = evening ? "#2f6d40" : "#2f8f3e";
  ctx.beginPath();
  ctx.arc(0, -r * 0.85, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = evening ? "#3d8450" : "#46a84f";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.55, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = evening ? "#4e9460" : "#7dce68";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(r * 0.28, -r * 1.05, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawBush(ctx, x, y, r, t, hot) {
  const j = Math.sin(t * (hot ? 10 : 2.2) + x) * (hot ? 2.4 : 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(40,70,20,0.15)";
  ellipse(ctx, 0, r * 0.45, r * 0.9, r * 0.28);
  ctx.fill();
  const puffs = [
    [-r * 0.45, 0, r * 0.55],
    [r * 0.4, 2, r * 0.5],
    [0, -r * 0.35 + j, r * 0.62],
  ];
  puffs.forEach((p, i) => {
    ctx.fillStyle = i === 2 ? "#6ec85a" : "#3f9a40";
    ctx.beginPath();
    ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export function drawGnome(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(60,40,20,0.18)";
  ellipse(ctx, 0, 14, 12, 4);
  ctx.fill();
  ctx.fillStyle = "#3d6bbf";
  roundLimb(ctx, 0, 0, 0, 12, 7);
  ctx.fillStyle = "#f4f1ea";
  ellipse(ctx, 0, -2, 8, 7);
  ctx.fill();
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.lineTo(0, -22);
  ctx.lineTo(9, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f6f3ea";
  ellipse(ctx, 0, -4, 9, 2.2);
  ctx.fill();
  ctx.fillStyle = "#f2b199";
  ctx.beginPath();
  ctx.arc(0, -1, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a241c";
  ctx.beginPath();
  ctx.arc(-2.4, -3, 0.7, 0, Math.PI * 2);
  ctx.arc(2.4, -3, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMound(ctx, x, y, t, hot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(80,50,20,0.15)";
  ellipse(ctx, 0, 8, 20, 7);
  ctx.fill();
  ctx.fillStyle = "#c9965c";
  ellipse(ctx, 0, 2, 18, 10);
  ctx.fill();
  ctx.fillStyle = "#a87440";
  ellipse(ctx, -4, -1, 10, 6);
  ctx.fill();
  ctx.strokeStyle = "#7a542c";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.lineTo(-2, 6);
  ctx.moveTo(0, 0);
  ctx.lineTo(4, 6);
  ctx.moveTo(8, 1);
  ctx.lineTo(4, 7);
  ctx.stroke();
  if (hot || Math.sin(t * 3 + x) > 0.65) {
    ctx.fillStyle = "rgba(255,220,120,0.85)";
    ctx.beginPath();
    ctx.arc(10, -8, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawSprinkler(ctx, x, y, angle, range) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(80,90,100,0.15)";
  ellipse(ctx, 0, 6, 12, 5);
  ctx.fill();
  ctx.fillStyle = "#9aa7b4";
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d7e7f5";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
  ctx.stroke();
  ctx.fillStyle = "rgba(186,224,255,0.55)";
  for (let i = 1; i <= 5; i++) {
    const d = (range * i) / 6;
    const spread = i * 0.05;
    for (let k = -1; k <= 1; k++) {
      const a = angle + k * spread;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2.2 + i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawMud(ctx, m, sand) {
  ctx.save();
  const g = ctx.createRadialGradient(m.x, m.y, m.rx * 0.2, m.x, m.y, m.rx);
  if (sand) {
    g.addColorStop(0, "rgba(120,170,190,0.55)");
    g.addColorStop(1, "rgba(90,150,170,0.15)");
  } else {
    g.addColorStop(0, "rgba(92,64,36,0.55)");
    g.addColorStop(1, "rgba(92,64,36,0.12)");
  }
  ctx.fillStyle = g;
  ellipse(ctx, m.x, m.y, m.rx, m.ry);
  ctx.fill();
  ctx.strokeStyle = sand ? "rgba(255,255,255,0.35)" : "rgba(70,46,24,0.25)";
  ctx.lineWidth = 2;
  ellipse(ctx, m.x, m.y, m.rx * 0.72, m.ry * 0.62);
  ctx.stroke();
  ctx.restore();
}

export function drawNap(ctx, nap, t, ready, reduced) {
  ctx.save();
  ctx.translate(nap.x, nap.y);
  if (nap.kind === "sunny" || nap.kind === "towel") {
    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 54);
    glow.addColorStop(0, ready ? "rgba(255,236,170,0.95)" : "rgba(255,236,170,0.55)");
    glow.addColorStop(1, "rgba(255,236,170,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
  }
  if (nap.kind === "towel") {
    ctx.fillStyle = "#f26b1f";
    roundBox(ctx, -28, -16, 56, 32, 6);
    ctx.fill();
    ctx.fillStyle = "#2a62e6";
    ctx.fillRect(-28, -6, 56, 6);
    ctx.fillRect(-28, 8, 56, 6);
  } else if (nap.kind === "bed") {
    ctx.fillStyle = "#e25b4a";
    ellipse(ctx, 0, 4, 34, 20);
    ctx.fill();
    ctx.fillStyle = "#fff1dc";
    ellipse(ctx, 0, 2, 24, 13);
    ctx.fill();
    ctx.strokeStyle = "#c44538";
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 4, 34, 20);
    ctx.stroke();
  }
  if (ready) {
    ctx.fillStyle = "#6b4a2a";
    ctx.font = "bold 16px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    const lift = reduced ? 0 : Math.sin(t * 3) * 3;
    ctx.globalAlpha = 0.85;
    ctx.fillText("z", 18, -24 - lift);
    ctx.globalAlpha = 0.65;
    ctx.fillText("z", 28, -34 - lift);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function roundBox(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawToy(ctx, x, y, kind, t) {
  const wiggle = Math.sin(t * 2.4 + x) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wiggle);
  if (kind === "pot") {
    ctx.fillStyle = "#d06a45";
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-16, 12);
    ctx.lineTo(16, 12);
    ctx.lineTo(12, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e18962";
    ctx.fillRect(-14, -10, 28, 6);
    ctx.fillStyle = "#3f9a40";
    ctx.beginPath();
    ctx.arc(0, -14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd15c";
    ctx.beginPath();
    ctx.arc(0, -14, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "hose") {
    ctx.strokeStyle = "#3aaa5a";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 2, 10, 0.4, Math.PI * 1.7);
    ctx.stroke();
    ctx.strokeStyle = "#2e8a48";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 2, 5, 0, Math.PI * 1.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#f26b1f";
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(-16, 10);
    ctx.quadraticCurveTo(0, 16, 16, 10);
    ctx.lineTo(14, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a62e6";
    ctx.fillRect(-14, -2, 28, 5);
    ctx.strokeStyle = "#1d4fc4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -8, 8, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDecor(ctx, d, evening) {
  ctx.save();
  ctx.translate(d.x, d.y);
  if (d.kind === "house") {
    ctx.fillStyle = "#f2d2a8";
    ctx.fillRect(-18, -6, 36, 26);
    ctx.fillStyle = "#e25b4a";
    ctx.beginPath();
    ctx.moveTo(-24, -6);
    ctx.lineTo(0, -26);
    ctx.lineTo(24, -6);
    ctx.fill();
    ctx.fillStyle = "#6b4228";
    roundBox(ctx, -8, 4, 16, 16, 3);
    ctx.fill();
  } else if (d.kind === "planter") {
    ctx.fillStyle = "#d06a45";
    ctx.fillRect(-12, 0, 24, 16);
    ctx.fillStyle = "#3f9a40";
    ctx.beginPath();
    ctx.arc(0, -2, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.kind === "shell") {
    ctx.fillStyle = "#fff7ea";
    ctx.beginPath();
    ctx.arc(0, 0, 8, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#f0c9a0";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -8);
    ctx.moveTo(-3, 0);
    ctx.lineTo(-4, -6);
    ctx.moveTo(3, 0);
    ctx.lineTo(4, -6);
    ctx.stroke();
  } else if (d.kind === "bowl") {
    ctx.fillStyle = "rgba(70,40,20,0.15)";
    ellipse(ctx, 0, 8, 14, 5);
    ctx.fill();
    ctx.fillStyle = "#3d7ea8";
    ellipse(ctx, 0, 0, 14, 8);
    ctx.fill();
    ctx.fillStyle = "#8fd0ea";
    ellipse(ctx, 0, -1, 9, 4);
    ctx.fill();
  } else if (d.kind === "lantern") {
    ctx.fillStyle = evening ? "#6b4630" : "#8d5a34";
    ctx.fillRect(-2, -4, 4, 28);
    ctx.fillStyle = "rgba(255,196,90,0.9)";
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,210,120,0.35)";
    ctx.beginPath();
    ctx.arc(0, -12, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlower(ctx, x, y, color, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = "#3e8f32";
  ctx.fillRect(-1.2, 0, 2.4, 9);
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ellipse(ctx, 0, -5.5, 2.8, 4.4);
    ctx.fill();
  }
  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function bakeGround(level) {
  const theme = THEMES[level.theme] || THEMES.yard;
  const c = document.createElement("canvas");
  c.width = level.w;
  c.height = level.h;
  const g = c.getContext("2d");
  g.fillStyle = theme.base;
  g.fillRect(0, 0, level.w, level.h);

  if (theme.evening) {
    const sky = g.createLinearGradient(0, 0, 0, level.h);
    sky.addColorStop(0, "rgba(92,78,140,0.18)");
    sky.addColorStop(1, "rgba(255,170,90,0.08)");
    g.fillStyle = sky;
    g.fillRect(0, 0, level.w, level.h);
  }

  const rnd = mulberry32(level.seed);
  const blobCount = theme.stone ? 18 : 26;
  for (let i = 0; i < blobCount; i++) {
    g.fillStyle = theme.blobs[i % theme.blobs.length];
    g.globalAlpha = theme.stone ? 0.55 : 0.72;
    ellipse(
      g,
      rnd() * level.w,
      rnd() * level.h,
      30 + rnd() * 110,
      22 + rnd() * 80,
      rnd() * Math.PI
    );
    g.fill();
  }
  g.globalAlpha = 1;

  if (theme.stone) {
    g.strokeStyle = "rgba(150,120,80,0.28)";
    g.lineWidth = 2;
    for (let y = 40; y < level.h; y += 54) {
      for (let x = 40; x < level.w; x += 62) {
        const ox = ((y / 54) % 2) * 20;
        roundBox(g, x + ox, y, 52, 42, 8);
        g.stroke();
      }
    }
  }

  if (theme.sand) {
    g.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 80; i++) {
      g.fillRect(rnd() * level.w, rnd() * level.h, 2, 2);
    }
    const water = g.createLinearGradient(0, 0, 0, 120);
    water.addColorStop(0, "#7ec8e0");
    water.addColorStop(1, "rgba(126,200,224,0)");
    g.fillStyle = water;
    g.fillRect(0, 0, level.w, 120);
  }

  if (theme.path) {
    g.fillStyle = "rgba(226,196,140,0.55)";
    g.beginPath();
    g.moveTo(level.w * 0.5, level.h - 30);
    g.quadraticCurveTo(level.w * 0.2, level.h * 0.55, level.w * 0.55, 80);
    g.lineTo(level.w * 0.68, 80);
    g.quadraticCurveTo(level.w * 0.38, level.h * 0.6, level.w * 0.66, level.h - 30);
    g.fill();
  }

  for (const m of level.mud || []) drawMud(g, m, theme.sand);

  const flowerColors = ["#ff7a9a", "#ffd15c", "#fff", "#c98bff", "#ff8a5b"];
  for (const p of level.patches || []) {
    const fr = mulberry32(p.seed);
    for (let i = 0; i < p.n; i++) {
      drawFlower(
        g,
        p.x + (fr() - 0.5) * p.spread,
        p.y + (fr() - 0.5) * p.spread,
        flowerColors[i % flowerColors.length],
        fr() * 6
      );
    }
  }

  for (const tuft of grassTufts(level)) {
    g.strokeStyle = "rgba(255,255,255,0.18)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(tuft.x, tuft.y);
    g.quadraticCurveTo(tuft.x - 3, tuft.y - 6, tuft.x - 1, tuft.y - 10);
    g.moveTo(tuft.x, tuft.y);
    g.quadraticCurveTo(tuft.x + 4, tuft.y - 7, tuft.x + 2, tuft.y - 11);
    g.stroke();
  }

  drawFence(g, level.w, level.h, theme);
  return c;
}

function grassTufts(level) {
  const rnd = mulberry32(level.seed + 99);
  const out = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    out.push({ x: 50 + rnd() * (level.w - 100), y: 50 + rnd() * (level.h - 100) });
  }
  return out;
}

function drawFence(g, w, h, theme) {
  const m = 20;
  g.strokeStyle = theme.fenceDark;
  g.lineWidth = 8;
  g.strokeRect(m, m, w - m * 2, h - m * 2);
  g.strokeStyle = theme.fence;
  g.lineWidth = 3;
  g.strokeRect(m + 2, m + 2, w - (m + 2) * 2, h - (m + 2) * 2);
  g.fillStyle = theme.fenceDark;
  for (let x = m; x <= w - m; x += 52) {
    g.fillRect(x - 4, m - 8, 8, 16);
    g.fillRect(x - 4, h - m - 8, 8, 16);
  }
  for (let y = m; y <= h - m; y += 52) {
    g.fillRect(m - 8, y - 4, 16, 8);
    g.fillRect(w - m - 8, y - 4, 16, 8);
  }
}

export function bakeTitle(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const g = c.getContext("2d");
  const skyH = h * 0.42;
  const sky = g.createLinearGradient(0, 0, 0, skyH);
  sky.addColorStop(0, "#9fd8ff");
  sky.addColorStop(1, "#fff1d4");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, skyH);
  g.fillStyle = "#ffe7a8";
  g.beginPath();
  g.arc(w * 0.78, skyH * 0.42, Math.min(w, h) * 0.08, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)";
  blobCloud(g, w * 0.22, skyH * 0.38, 1);
  blobCloud(g, w * 0.55, skyH * 0.22, 0.7);
  const grass = g.createLinearGradient(0, skyH - 20, 0, h);
  grass.addColorStop(0, "#b6e86a");
  grass.addColorStop(1, "#73c044");
  g.fillStyle = grass;
  g.fillRect(0, skyH - 10, w, h);
  g.fillStyle = "#e7c98a";
  g.fillRect(0, skyH - 8, w, 10);
  g.fillStyle = "#c89a58";
  for (let x = 16; x < w; x += 36) g.fillRect(x, skyH - 22, 6, 24);
  const rnd = mulberry32(7);
  for (let i = 0; i < 8; i++) {
    drawFlower(g, 30 + rnd() * (w - 60), skyH + 30 + rnd() * (h * 0.25), ["#ff7a9a", "#ffd15c", "#fff"][i % 3], rnd());
  }
  return c;
}

function blobCloud(g, x, y, s) {
  g.beginPath();
  g.arc(x, y, 16 * s, 0, Math.PI * 2);
  g.arc(x + 18 * s, y + 4 * s, 12 * s, 0, Math.PI * 2);
  g.arc(x - 16 * s, y + 6 * s, 11 * s, 0, Math.PI * 2);
  g.fill();
}

export function drawParticle(ctx, p) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, p.life / p.max);
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot || 0);
  if (p.kind === "spark") {
    ctx.fillStyle = p.color;
    ctx.fillRect(-2, -2, 4, 4);
  } else if (p.kind === "drop") {
    ctx.fillStyle = "rgba(180,220,255,0.8)";
    ellipse(ctx, 0, 0, 2.2, 3);
    ctx.fill();
  } else {
    ctx.fillStyle = p.color || "rgba(150,110,60,0.7)";
    ellipse(ctx, 0, 0, p.r || 3, (p.r || 3) * 0.7);
    ctx.fill();
  }
  ctx.restore();
}

const OUTSIDE = {
  yard: "#8ed24c",
  garden: "#73c44a",
  patio: "#e7d3b4",
  mud: "#7dbb46",
  park: "#67b348",
  beach: "#f6d78a",
  evening: "#5e9464",
};

export function outsideFill(theme) {
  return OUTSIDE[theme] || "#8ed24c";
}
