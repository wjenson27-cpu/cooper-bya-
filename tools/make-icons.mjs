import fs from "fs";
import path from "path";
import zlib from "zlib";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function set(data, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= data.length / 4 / w) return;
  const i = (y * w + x) * 4;
  const al = a / 255;
  data[i] = Math.round(r * al + data[i] * (1 - al));
  data[i + 1] = Math.round(g * al + data[i + 1] * (1 - al));
  data[i + 2] = Math.round(b * al + data[i + 2] * (1 - al));
  data[i + 3] = Math.min(255, data[i + 3] + a);
}

function fill(data, w, h, r, g, b) {
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
}

function circle(data, w, cx, cy, rad, r, g, b, a = 255) {
  const x0 = Math.floor(cx - rad);
  const y0 = Math.floor(cy - rad);
  const x1 = Math.ceil(cx + rad);
  const y1 = Math.ceil(cy + rad);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad) {
        const edge = d > rad - 1.2 ? Math.max(0, rad - d) * a : a;
        set(data, w, x, y, r, g, b, edge);
      }
    }
  }
}

function ellipse(data, w, cx, cy, rx, ry, r, g, b, a = 255) {
  const x0 = Math.floor(cx - rx);
  const y0 = Math.floor(cy - ry);
  const x1 = Math.ceil(cx + rx);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d <= 1) set(data, w, x, y, r, g, b, a);
    }
  }
}

function drawIcon(size, maskable) {
  const data = Buffer.alloc(size * size * 4);
  const bg = maskable ? [255, 214, 170] : [255, 246, 232];
  fill(data, size, size, bg[0], bg[1], bg[2]);
  const s = size / 512;
  const y = size * (maskable ? 0.56 : 0.54);
  ellipse(data, size, 150 * s, y + 10 * s, 70 * s, 28 * s, 20, 20, 20);
  ellipse(data, size, 250 * s, y, 120 * s, 70 * s, 22, 22, 22);
  ellipse(data, size, 210 * s, y + 78 * s, 16 * s, 36 * s, 16, 16, 16);
  ellipse(data, size, 280 * s, y + 78 * s, 16 * s, 36 * s, 16, 16, 16);
  ellipse(data, size, 250 * s, y + 78 * s, 14 * s, 34 * s, 12, 12, 12);
  ellipse(data, size, 360 * s, y - 36 * s, 28 * s, 46 * s, 18, 18, 18);
  ellipse(data, size, 390 * s, y - 20 * s, 62 * s, 48 * s, 28, 28, 28);
  ellipse(data, size, 450 * s, y - 4 * s, 48 * s, 28 * s, 36, 36, 36);
  ellipse(data, size, 492 * s, y - 6 * s, 16 * s, 14 * s, 12, 12, 12);
  circle(data, size, 488 * s, y - 10 * s, 5 * s, 255, 255, 255);
  ellipse(data, size, 400 * s, y - 36 * s, 16 * s, 18 * s, 255, 250, 243);
  circle(data, size, 404 * s, y - 34 * s, 8 * s, 166, 98, 48);
  circle(data, size, 405 * s, y - 35 * s, 4 * s, 20, 10, 6);
  circle(data, size, 400 * s, y - 40 * s, 3 * s, 255, 255, 255);
  ellipse(data, size, 446 * s, y + 16 * s, 12 * s, 16 * s, 243, 163, 181);
  ellipse(data, size, 330 * s, y + 8 * s, 22 * s, 16 * s, 227, 57, 53);
  circle(data, size, 338 * s, y + 22 * s, 10 * s, 242, 193, 77);
  circle(data, size, 70 * s, y + 70 * s, 28 * s, 255, 122, 26);
  ellipse(data, size, 62 * s, y + 70 * s, 8 * s, 22 * s, 42, 98, 230);
  ellipse(data, size, 82 * s, y + 70 * s, 8 * s, 22 * s, 42, 98, 230);
  return encodePNG(size, size, data);
}

const dir = path.join(process.cwd(), "icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon-192.png"), drawIcon(192, false));
fs.writeFileSync(path.join(dir, "icon-512.png"), drawIcon(512, false));
fs.writeFileSync(path.join(dir, "icon-maskable-512.png"), drawIcon(512, true));
console.log("icons written");
