// News-image entry: "Sum up 25 November's world news in one image".
// A self-contained newspaper front page for Wednesday 25 November 2026,
// drawn from scratch with Node's standard library only (no network, no
// dependencies, no image assets). The program rasterises text with its own
// 5x7 bitmap font, draws simple vector illustrations, encodes a PNG by hand
// (zlib + CRC32) and writes it to /output/entry.png (or MAKEFUN_OUTPUT_DIR).
// Fully deterministic: the same bytes on every run.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type RGB = [number, number, number];

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: RGB = [246, 241, 224];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [22, 35, 63];
const RED: RGB = [179, 39, 30];
const GOLD: RGB = [201, 162, 39];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [110, 105, 90];
const SKY: RGB = [168, 205, 226];
const SEA: RGB = [38, 92, 140];
const SEA_DARK: RGB = [24, 66, 104];
const SUN: RGB = [240, 178, 62];
const SHIP: RGB = [52, 58, 64];
const FIRE: RGB = [232, 104, 26];
const FIRE_Y: RGB = [250, 196, 52];

// ------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows; each row is 5 bits, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
};

// --------------------------------------------------------------- canvas
const buf = new Uint8Array(W * H * 3);

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) px(xx, yy, c);
  }
}

function rectOutline(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) px(cx + x, cy + y, c);
    }
  }
}

function circleOutline(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      px(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) px(x, y, c);
    }
  }
}

// ----------------------------------------------------------------- text
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const g = FONT[up[i]] ?? FONT[' '];
    const ox = x + i * 6 * scale;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r] & (1 << (4 - col))) {
          fillRect(ox + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}

function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (textWidth(test, scale) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawBlock(lines: string[], x: number, y: number, scale: number, c: RGB, gap: number): number {
  let yy = y;
  for (const ln of lines) {
    drawText(ln, x, yy, scale, c);
    yy += 7 * scale + gap;
  }
  return yy;
}

// ------------------------------------------------------- small pictograms
function iconLaptop(x: number, y: number, c: RGB): void {
  rectOutline(x, y, 20, 13, 2, c);
  fillRect(x - 2, y + 13, 24, 3, c);
  drawText('!', x + 8, y + 3, 1, c);
}

function iconCourt(x: number, y: number, c: RGB): void {
  tri(x - 2, y + 2, x + 22, y + 2, x + 10, y - 6, c);
  fillRect(x, y + 4, 20, 2, c);
  fillRect(x + 2, y + 7, 3, 9, c);
  fillRect(x + 9, y + 7, 3, 9, c);
  fillRect(x + 16, y + 7, 3, 9, c);
  fillRect(x, y + 17, 20, 2, c);
}

function iconGlobe(x: number, y: number, c: RGB): void {
  circleOutline(x + 10, y + 10, 10, 2, c);
  line(x, y + 10, x + 20, y + 10, c);
  line(x + 10, y, x + 10, y + 20, c);
  line(x + 4, y + 2, x + 6, y + 18, c);
  line(x + 16, y + 2, x + 14, y + 18, c);
}

function iconTower(x: number, y: number, c: RGB): void {
  fillRect(x + 8, y + 6, 5, 14, c);
  fillRect(x + 6, y + 2, 9, 4, c);
  fillRect(x + 9, y - 6, 3, 8, c);
  circle(x + 10, y - 6, 2, c);
  fillRect(x + 2, y + 18, 17, 2, c);
}

function iconCross(x: number, y: number, c: RGB): void {
  fillRect(x + 7, y, 6, 20, c);
  fillRect(x, y + 7, 20, 6, c);
}

function iconBars(x: number, y: number, c: RGB): void {
  fillRect(x, y + 12, 4, 8, c);
  fillRect(x + 6, y + 7, 4, 13, c);
  fillRect(x + 12, y + 2, 4, 18, c);
  fillRect(x + 18, y - 4, 4, 24, c);
}

// ------------------------------------------- lead illustration: ship at sea
function drawLeadScene(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  circle(x + w - 52, y + 42, 26, SUN);
  // distant clouds
  fillRect(x + 18, y + 26, 70, 12, WHITE);
  fillRect(x + 34, y + 16, 44, 12, WHITE);
  fillRect(x + w - 150, y + 84, 60, 10, WHITE);
  // sea
  const seaTop = y + Math.floor(h * 0.52);
  fillRect(x, seaTop, w, h - (seaTop - y), SEA);
  // waves
  for (let i = 0; i < 5; i++) {
    const wy = seaTop + 14 + i * 18;
    for (let wx = x + 8; wx < x + w - 8; wx += 26) {
      line(wx, wy, wx + 12, wy - 4, SEA_DARK);
      line(wx + 12, wy - 4, wx + 24, wy, SEA_DARK);
    }
  }
  // ship: hull, bow, deck, funnel, mast, flag
  const hy = seaTop + 34;
  fillRect(x + 56, hy, 190, 26, SHIP);
  tri(x + 246, hy, x + 300, hy, x + 246, hy + 26, SHIP);
  fillRect(x + 76, hy - 22, 130, 22, SHIP);
  fillRect(x + 96, hy - 44, 22, 22, FIRE);
  fillRect(x + 150, hy - 52, 10, 30, SHIP);
  line(x + 155, hy - 52, x + 155, hy - 70, SHIP);
  tri(x + 155, hy - 70, x + 155, hy - 58, x + 178, hy - 64, RED);
  // portholes
  for (let i = 0; i < 5; i++) circle(x + 76 + i * 34, hy + 13, 4, GOLD);
  // explosion burst above the stern
  const ex = x + 92;
  const ey = hy - 78;
  for (let a = 0; a < 12; a++) {
    const rad = (a * Math.PI) / 6;
    const x1 = Math.round(ex + 44 * Math.cos(rad));
    const y1 = Math.round(ey + 44 * Math.sin(rad));
    const x2 = Math.round(ex + 14 * Math.cos(rad + 0.26));
    const y2 = Math.round(ey + 14 * Math.sin(rad + 0.26));
    const x3 = Math.round(ex + 14 * Math.cos(rad - 0.26));
    const y3 = Math.round(ey + 14 * Math.sin(rad - 0.26));
    tri(x1, y1, x2, y2, x3, y3, FIRE);
  }
  circle(ex, ey, 20, FIRE_Y);
  circle(ex, ey, 11, FIRE);
  // smoke
  circle(x + 108, hy - 62, 9, GREY);
  circle(x + 122, hy - 74, 11, GREY);
  // two drones overhead
  fillRect(x + 210, y + 30, 10, 4, INK);
  fillRect(x + 214, y + 26, 2, 12, INK);
  fillRect(x + 258, y + 52, 10, 4, INK);
  fillRect(x + 262, y + 48, 2, 12, INK);
  rectOutline(x, y, w, h, 3, NAVY);
}

// ------------------------------------------------------------- story grid
type Story = {
  kicker: string;
  color: RGB;
  headline: string;
  body: string;
  source: string;
  icon: (x: number, y: number, c: RGB) => void;
};

const STORIES: Story[] = [
  {
    kicker: 'CYBERATTACK',
    color: NAVY,
    headline: 'CIA HIT BY CYBERATTACK',
    body: 'CNN reports the CIA and the Office of the Director of National Intelligence were hit by a breach of classified systems.',
    source: 'SOURCE: CNN',
    icon: iconLaptop,
  },
  {
    kicker: 'US JUSTICE',
    color: RED,
    headline: 'HUAWEI FOUND GUILTY',
    body: 'A New York jury convicts Huawei on 10 of 12 counts, including trade-secret theft and bank fraud, after a three-month trial.',
    source: 'SOURCE: US DOJ',
    icon: iconCourt,
  },
  {
    kicker: 'CLIMATE',
    color: [42, 122, 74],
    headline: 'COP31 COLLAPSES',
    body: 'The UN climate summit in Antalya ends with no final deal as oil and gas producers block fossil-fuel phase-out language.',
    source: 'SOURCE: BD GLOBAL TIMES',
    icon: iconGlobe,
  },
  {
    kicker: 'MIDDLE EAST',
    color: [122, 74, 42],
    headline: 'HOUTHIS HIT RIYADH TOWER',
    body: 'A Houthi strike hits Riyadh\'s tallest tower. Eleven people are wounded, Saudi civil defence says.',
    source: 'SOURCE: REUTERS',
    icon: iconTower,
  },
  {
    kicker: 'HEALTH',
    color: [140, 32, 64],
    headline: 'EBOLA STAFF EVACUATED',
    body: 'WHO pulls health workers from a hospital in DR Congo\'s Ituri province amid fighting. Outbreak toll: 5,775 dead of 11,762 cases.',
    source: 'SOURCE: WHO',
    icon: iconCross,
  },
  {
    kicker: 'THE TOLL',
    color: NAVY,
    headline: '700,000+ RUSSIAN DEAD',
    body: 'A new analysis finds more than 700,000 Russian soldiers killed in nearly five years of war in Ukraine.',
    source: 'SOURCE: RFE/RL',
    icon: iconBars,
  },
];

function drawStoryPanel(s: Story, x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, WHITE);
  rectOutline(x, y, w, h, 2, NAVY);
  fillRect(x, y, w, 30, s.color);
  drawText(s.kicker, x + 12, y + 8, 2, WHITE);
  s.icon(x + w - 34, y + 5, WHITE);
  const headLines = wrap(s.headline, w - 24, 3);
  let yy = drawBlock(headLines, x + 12, y + 42, 3, INK, 4);
  yy += 4;
  const bodyLines = wrap(s.body, w - 24, 2);
  drawBlock(bodyLines.slice(0, 6), x + 12, yy, 2, INK, 3);
  drawText(s.source, x + 12, y + h - 24, 2, GREY);
}

// ------------------------------------------------------------ PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ------------------------------------------------------------------ page
function buildPage(): void {
  fillRect(0, 0, W, H, PAPER);
  rectOutline(6, 6, W - 12, H - 12, 4, NAVY);

  // masthead
  fillRect(16, 16, W - 32, 100, NAVY);
  circleOutline(72, 66, 32, 3, GOLD);
  line(40, 66, 104, 66, GOLD);
  line(72, 34, 72, 98, GOLD);
  line(48, 42, 52, 90, GOLD);
  line(96, 42, 92, 90, GOLD);
  drawTextCentered('THE WORLD IN ONE DAY', 540, 34, 5, WHITE);
  drawTextCentered('WEDNESDAY, 25 NOVEMBER 2026', 540, 80, 3, GOLD);
  fillRect(16, 122, W - 32, 6, RED);

  // lead story
  drawLeadScene(24, 140, 356, 252);
  const lx = 404;
  drawText('WAR IN UKRAINE - LEAD STORY', lx, 148, 2, RED);
  drawBlock(wrap('UKRAINE HITS RUSSIAN SHIPS IN TWO SEAS', 584, 4), lx, 178, 4, INK, 6);
  drawBlock(
    wrap(
      'President Zelenskiy confirms drone strikes on a cargo ship in the Gulf of Finland and a warship sunk off Benghazi, Libya. Moscow calls the attacks terrorism and vows consequences.',
      584,
      2,
    ),
    lx,
    262,
    2,
    INK,
    4,
  );
  fillRect(lx, 356, 584, 3, RED);
  drawText('TWO SEAS, ONE DAY: BALTIC AND MEDITERRANEAN', lx, 368, 2, NAVY);

  // story grid: 3 columns x 2 rows
  const gw = 312;
  const gh = 256;
  const gx0 = 24;
  const gy0 = 412;
  const gap = 12;
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawStoryPanel(STORIES[i], gx0 + col * (gw + gap), gy0 + row * (gh + gap), gw, gh);
  }

  // footer ticker
  fillRect(16, 946, W - 32, 46, NAVY);
  drawBlock(
    wrap(
      'ALSO: NATO TO SEND EARLY-WARNING AIRCRAFT TO POLAND - ENGLAND BEAT AUSTRALIA BY 8 WICKETS IN 2ND T20I - SARKOZY CORRUPTION CASE ORDERED TO TRIAL',
      W - 64,
      2,
    ),
    32,
    954,
    2,
    WHITE,
    3,
  );
  drawTextCentered('SOURCES: REUTERS - CNN - RFE/RL - AFP - AP', 512, 998, 2, GREY);
}

// ------------------------------------------------------------------- main
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
buildPage();
writeFileSync(join(outDir, 'entry.png'), encodePNG());
