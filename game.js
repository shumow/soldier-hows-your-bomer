'use strict';

/* ==========================================================================
 * SOLDIER, HOW'S YOUR BOMER?
 * A 16-bit style arena shooter. Zero dependencies, one canvas.
 *
 * - You are the soldier. Robots come for you from both sides.
 * - Every shot costs one round. Robots sometimes drop blue ammo cells.
 * - Your bullets look like this:  8==D
 *
 * File layout (top to bottom):
 *   1. Config & helpers      5. Entities (player, robots, bullets, drops)
 *   2. Bitmap font           6. Game state / update
 *   3. Pixel-art sprites     7. Rendering
 *   4. Audio                 8. Input & main loop
 * ========================================================================== */

/* ---------------------------------------------------------------------- */
/* 1. Config & helpers                                                     */
/* ---------------------------------------------------------------------- */

const W = 320;               // logical canvas width
const H = 180;               // logical canvas height
const GROUND_Y = 152;        // top of the floor tiles
const GRAVITY = 0.32;

const PLAYER = {
  speed: 1.35,
  jump: -5.3,
  startAmmo: 12,
  maxAmmo: 99,
  maxHp: 3,
  invulnFrames: 90,
  fireCooldown: 9,
};

const AMMO_PER_CELL = 6;      // rounds in one blue circle
const DROP_CHANCE = 0.4;      // chance a dying robot drops a cell
const CELL_LIFETIME = 600;    // frames before a cell fades away

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const chance = (p) => Math.random() < p;
const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---------------------------------------------------------------------- */
/* 2. Bitmap font (5x7, one byte per row, MSB is the leftmost pixel)       */
/* ---------------------------------------------------------------------- */

const FONT = {
  A: [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11], B: [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  C: [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E], D: [0x1E,0x11,0x11,0x11,0x11,0x11,0x1E],
  E: [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F], F: [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  G: [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F], H: [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  I: [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E], J: [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  K: [0x11,0x12,0x14,0x18,0x14,0x12,0x11], L: [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  M: [0x11,0x1B,0x15,0x15,0x11,0x11,0x11], N: [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  O: [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E], P: [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  Q: [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D], R: [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  S: [0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E], T: [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  U: [0x11,0x11,0x11,0x11,0x11,0x11,0x0E], V: [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  W: [0x11,0x11,0x11,0x15,0x15,0x1B,0x11], X: [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  Y: [0x11,0x11,0x0A,0x04,0x04,0x04,0x04], Z: [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E], '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x02,0x04,0x08,0x1F], '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02], '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E], '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E], '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  ' ': [0,0,0,0,0,0,0],
  ':': [0x00,0x0C,0x0C,0x00,0x0C,0x0C,0x00], '=': [0x00,0x00,0x1F,0x00,0x1F,0x00,0x00],
  '!': [0x04,0x04,0x04,0x04,0x04,0x00,0x04], '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x0C,0x0C], '>': [0x08,0x04,0x02,0x01,0x02,0x04,0x08],
  '/': [0x01,0x02,0x02,0x04,0x08,0x08,0x10], "'": [0x04,0x04,0x00,0x00,0x00,0x00,0x00],
  ',': [0x00,0x00,0x00,0x00,0x0C,0x04,0x08], '?': [0x0E,0x11,0x01,0x02,0x04,0x00,0x04],
};
const GLYPH_W = 5, GLYPH_H = 7, GLYPH_ADV = 6;

const glyphCache = new Map();
function glyphCanvas(ch, color) {
  const key = ch + '|' + color;
  let c = glyphCache.get(key);
  if (c) return c;
  const rows = FONT[ch.toUpperCase()] || FONT['?'];
  c = document.createElement('canvas');
  c.width = GLYPH_W; c.height = GLYPH_H;
  const g = c.getContext('2d');
  g.fillStyle = color;
  for (let y = 0; y < GLYPH_H; y++) {
    for (let x = 0; x < GLYPH_W; x++) {
      if (rows[y] & (0x10 >> x)) g.fillRect(x, y, 1, 1);
    }
  }
  glyphCache.set(key, c);
  return c;
}

function textWidth(str, scale = 1) {
  return (str.length * GLYPH_ADV - 1) * scale;
}

function drawText(str, x, y, color = '#f8f8f8', scale = 1) {
  x = Math.round(x); y = Math.round(y);
  for (const ch of str) {
    const g = glyphCanvas(ch, color);
    ctx.drawImage(g, 0, 0, GLYPH_W, GLYPH_H, x, y, GLYPH_W * scale, GLYPH_H * scale);
    x += GLYPH_ADV * scale;
  }
}

function drawTextCentered(str, y, color, scale = 1) {
  drawText(str, (W - textWidth(str, scale)) / 2, y, color, scale);
}

/* ---------------------------------------------------------------------- */
/* 3. Pixel-art sprites                                                    */
/* ---------------------------------------------------------------------- */

// Palette: one character per color, '.' is transparent.
const PAL = {
  k: '#101018', w: '#f8f8f8', s: '#e8b088', e: '#2a1a10',
  g: '#4f8a3c', G: '#2f5a25', h: '#3a4a2a',
  m: '#8c8ca0', M: '#c8c8d8', d: '#50505c',
  r: '#ff3b3b', y: '#ffd23f', o: '#ff8c1a',
  b: '#3b8bff', B: '#a8d4ff', n: '#1e4fa8',
};

const SPRITES = {
  soldierStand: [
    '....hhhhh...',
    '...hhhhhhh..',
    '...hhhhhhh..',
    '...sssssss..',
    '...ssssekk..',
    '....sssss...',
    '...gGggGg...',
    '..ggGggGgkkk',
    '..ggGggGgsk.',
    '..GGGGGGG...',
    '...GGGGG....',
    '...gg.gg....',
    '...gg.gg....',
    '...kk.kk....',
    '...kk.kk....',
    '..kkk.kkk...',
  ],
  soldierWalk: [
    '....hhhhh...',
    '...hhhhhhh..',
    '...hhhhhhh..',
    '...sssssss..',
    '...ssssekk..',
    '....sssss...',
    '...gGggGg...',
    '..ggGggGgkkk',
    '..ggGggGgsk.',
    '..GGGGGGG...',
    '...GGGGG....',
    '..gg...gg...',
    '.gg.....gg..',
    '.kk.....kk..',
    'kk.......kk.',
    'kk.......kk.',
  ],
  soldierJump: [
    '....hhhhh...',
    '...hhhhhhh..',
    '...hhhhhhh..',
    '...sssssss..',
    '...ssssekk..',
    '....sssss...',
    '...gGggGg...',
    '..ggGggGgkkk',
    '..ggGggGgsk.',
    '..GGGGGGG...',
    '...GGGGG....',
    '..gg..gg....',
    '.kk...gg....',
    '.kk....kk...',
    '.......kk...',
    '............',
  ],
  walker: [
    '...mmmmmmmm...',
    '..mMMMMMMMMm..',
    '..mMrrMMrrMm..',
    '..mMMMMMMMMm..',
    '..mmmMMMMmmm..',
    '.....mmmm.....',
    '..mmmmmmmmmm..',
    '.mMMMMMMMMMMm.',
    '.mMMyyyyyyMMm.',
    '.mMMMMMMMMMMm.',
    '..mmmmmmmmmm..',
    '...dd....dd...',
    '...dd....dd...',
    '...dd....dd...',
    '..ddd....ddd..',
    '..mmm....mmm..',
  ],
  walker2: [
    '...mmmmmmmm...',
    '..mMMMMMMMMm..',
    '..mMrrMMrrMm..',
    '..mMMMMMMMMm..',
    '..mmmMMMMmmm..',
    '.....mmmm.....',
    '..mmmmmmmmmm..',
    '.mMMMMMMMMMMm.',
    '.mMMyyyyyyMMm.',
    '.mMMMMMMMMMMm.',
    '..mmmmmmmmmm..',
    '..dd......dd..',
    '.dd........dd.',
    '.dd........dd.',
    'ddd........ddd',
    'mmm........mmm',
  ],
  drone: [
    '...mmmmmm...',
    '..mMMMMMMm..',
    '.mMrrMMMrrM.',
    '.mMMMMMMMMm.',
    '..mmmyymmm..',
    '...m....m...',
    '..mmm..mmm..',
  ],
  cell: [
    '...bbb...',
    '.bbBBBbb.',
    '.bBBBbbb.',
    'bBBbbbbbb',
    'bBbbbbbbb',
    'bbbbbbbbn',
    '.bbbbbbn.',
    '.bbbnnnn.',
    '...nnn...',
  ],
};

const spriteCache = new Map();
function spriteCanvas(name) {
  let c = spriteCache.get(name);
  if (c) return c;
  const rows = SPRITES[name];
  c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PAL[row[x]];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  });
  spriteCache.set(name, c);
  return c;
}

// Draw a sprite; flip = true mirrors it horizontally (facing left).
function drawSprite(name, x, y, flip = false) {
  const c = spriteCanvas(name);
  x = Math.round(x); y = Math.round(y);
  if (!flip) { ctx.drawImage(c, x, y); return; }
  ctx.save();
  ctx.translate(x + c.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

// The signature bullet: "8==D" rendered in the bitmap font, pre-baked to a
// canvas per color so it can be stamped (and mirrored) cheaply.
const BULLET_TEXT = '8==D';
const bulletCache = new Map();
function bulletCanvas(color) {
  let c = bulletCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = textWidth(BULLET_TEXT); c.height = GLYPH_H;
  const g = c.getContext('2d');
  let x = 0;
  for (const ch of BULLET_TEXT) {
    g.drawImage(glyphCanvas(ch, color), x, 0);
    x += GLYPH_ADV;
  }
  bulletCache.set(color, c);
  return c;
}

/* ---------------------------------------------------------------------- */
/* 4. Audio (tiny synth, created on first key press)                       */
/* ---------------------------------------------------------------------- */

let audioCtx = null;
function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  catch (e) { audioCtx = null; }
}

function beep({ freq = 440, end = freq, dur = 0.08, type = 'square', vol = 0.08 }) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

const SFX = {
  shoot:   () => beep({ freq: 900, end: 300, dur: 0.09, type: 'square' }),
  empty:   () => beep({ freq: 200, end: 120, dur: 0.05, type: 'triangle', vol: 0.05 }),
  hit:     () => beep({ freq: 400, end: 200, dur: 0.06, type: 'sawtooth', vol: 0.05 }),
  boom:    () => beep({ freq: 220, end: 40, dur: 0.3, type: 'sawtooth', vol: 0.1 }),
  pickup:  () => { beep({ freq: 660, end: 990, dur: 0.08 }); setTimeout(() => beep({ freq: 990, end: 1320, dur: 0.1 }), 70); },
  hurt:    () => beep({ freq: 300, end: 80, dur: 0.25, type: 'square', vol: 0.1 }),
  laser:   () => beep({ freq: 1200, end: 600, dur: 0.07, type: 'sawtooth', vol: 0.03 }),
  start:   () => { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => beep({ freq: f, dur: 0.12 }), i * 90)); },
};

// ---- Soundtrack ---------------------------------------------------------
// Two mixes of "Marching Through the Pain". The title screen loops mix 1;
// gameplay alternates between the two so a long run hears both. Browsers
// refuse to start audio before a user gesture, so playback begins on the
// first key press (see the keydown handler). M toggles music on and off.

const MUSIC = {
  tracks: [
    { src: 'audio/marching-through-the-pain-mix-1.mp3', name: 'MIX 1' },
    { src: 'audio/marching-through-the-pain-mix-2.mp3', name: 'MIX 2' },
  ],
  els: [],
  current: -1,
  unlocked: false,         // true once a key press has happened
  enabled: localStorage.getItem('bomer.music') !== 'off',
  volume: 0.55,
  mode: 'title',           // 'title' (loop mix 1) or 'play' (alternate)
  nowPlayingTimer: 0,
};

function initMusic() {
  if (MUSIC.els.length) return;
  MUSIC.els = MUSIC.tracks.map((t, i) => {
    const a = new Audio(t.src);
    a.preload = 'auto';
    a.volume = MUSIC.volume;
    a.addEventListener('ended', () => {
      // In play mode, hand off to the other mix; in title mode, loop.
      if (MUSIC.mode === 'play') playTrack((i + 1) % MUSIC.tracks.length);
      else playTrack(i);
    });
    return a;
  });
}

function playTrack(i) {
  initMusic();
  for (const a of MUSIC.els) { if (a !== MUSIC.els[i]) { a.pause(); a.currentTime = 0; } }
  MUSIC.current = i;
  if (!MUSIC.unlocked || !MUSIC.enabled) return;
  setMusicVolume(MUSIC.volume); // also undoes any game-over ducking
  const a = MUSIC.els[i];
  const p = a.play();
  if (p && p.catch) p.catch(() => { /* autoplay refused; retried on next key press */ });
  MUSIC.nowPlayingTimer = 180;
}

function setMusicMode(mode) {
  MUSIC.mode = mode;
  // Title always starts mix 1; gameplay starts on mix 2 so the title song
  // and the fight song differ, then they alternate.
  playTrack(mode === 'title' ? 0 : 1);
}

function setMusicVolume(v) {
  for (const a of MUSIC.els) a.volume = v;
}

function toggleMusic() {
  MUSIC.enabled = !MUSIC.enabled;
  try { localStorage.setItem('bomer.music', MUSIC.enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
  if (MUSIC.enabled) playTrack(MUSIC.current < 0 ? 0 : MUSIC.current);
  else for (const a of MUSIC.els) a.pause();
  showMessage(MUSIC.enabled ? 'MUSIC ON' : 'MUSIC OFF', 60);
}

/* ---------------------------------------------------------------------- */
/* 5. Entities                                                             */
/* ---------------------------------------------------------------------- */

function makePlayer() {
  return {
    x: W / 2 - 6, y: GROUND_Y - 16, w: 12, h: 16,
    vx: 0, vy: 0, facing: 1, onGround: true,
    hp: PLAYER.maxHp, ammo: PLAYER.startAmmo,
    invuln: 0, cooldown: 0, animTimer: 0, emptyFlash: 0,
  };
}

// type: 'walker' (ground, melee + occasional shot) or 'drone' (flying gunner)
function makeRobot(type, difficulty) {
  const fromLeft = chance(0.5);
  const r = {
    type, fromLeft,
    x: fromLeft ? -16 : W + 2,
    vx: 0, vy: 0, animTimer: 0, hitFlash: 0,
    fireTimer: rand(60, 150),
  };
  if (type === 'walker') {
    r.w = 14; r.h = 16; r.y = GROUND_Y - 16;
    r.hp = 2; r.score = 100;
    r.speed = 0.4 + difficulty * 0.05;
  } else {
    r.w = 12; r.h = 7; r.y = rand(40, 100); r.baseY = r.y;
    r.hp = 1; r.score = 150;
    r.speed = 0.6 + difficulty * 0.06;
    r.phase = rand(0, Math.PI * 2);
  }
  return r;
}

function makeBullet(p) {
  const c = bulletCanvas('#ffd23f');
  return {
    x: p.facing > 0 ? p.x + p.w : p.x - c.width,
    y: p.y + 6,
    w: c.width, h: c.height,
    vx: 4.2 * p.facing, dir: p.facing, life: 120,
  };
}

function makeEnemyBullet(x, y, tx, ty, speed) {
  const dx = tx - x, dy = ty - y;
  const d = Math.hypot(dx, dy) || 1;
  return { x, y, w: 3, h: 2, vx: dx / d * speed, vy: dy / d * speed, life: 240 };
}

function makeCell(x, y) {
  return { x: x - 4, y, w: 9, h: 9, vy: -1.5, life: CELL_LIFETIME, bob: rand(0, Math.PI * 2) };
}

function spawnParticles(list, x, y, n, colors) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(0.5, 2.5);
    list.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      life: rand(15, 40), color: colors[i % colors.length], size: chance(0.3) ? 2 : 1,
    });
  }
}

/* ---------------------------------------------------------------------- */
/* 6. Game state                                                           */
/* ---------------------------------------------------------------------- */

const game = {
  state: 'title',          // 'title' | 'play' | 'over'
  paused: false,
  frame: 0,
  score: 0,
  best: Number(localStorage.getItem('bomer.best') || 0),
  kills: 0,
  player: makePlayer(),
  bullets: [], enemyBullets: [], robots: [], cells: [], particles: [],
  spawnTimer: 90,
  shake: 0,
  message: '', messageTimer: 0,
};

function difficulty() {
  // Rises roughly one level every 20 seconds of play.
  return Math.floor(game.frame / 1200);
}

function startGame() {
  game.state = 'play';
  game.paused = false;
  game.frame = 0;
  game.score = 0;
  game.kills = 0;
  game.player = makePlayer();
  game.bullets = []; game.enemyBullets = []; game.robots = [];
  game.cells = []; game.particles = [];
  game.spawnTimer = 90;
  game.shake = 0;
  showMessage('GO!', 60);
  SFX.start();
  setMusicMode('play');
}

function endGame() {
  game.state = 'over';
  setMusicVolume(MUSIC.volume * 0.4); // duck the music under the game-over screen
  if (game.score > game.best) {
    game.best = game.score;
    try { localStorage.setItem('bomer.best', String(game.best)); } catch (e) { /* ignore */ }
  }
}

function showMessage(text, frames) {
  game.message = text;
  game.messageTimer = frames;
}

function hurtPlayer(p, fromX) {
  if (p.invuln > 0) return;
  p.hp -= 1;
  p.invuln = PLAYER.invulnFrames;
  p.vx = fromX < p.x ? 2.5 : -2.5;
  p.vy = -2.5;
  p.onGround = false;
  game.shake = 10;
  SFX.hurt();
  spawnParticles(game.particles, p.x + p.w / 2, p.y + p.h / 2, 10, ['#ff3b3b', '#f8f8f8']);
  if (p.hp <= 0) endGame();
}

function killRobot(r) {
  game.score += r.score;
  game.kills += 1;
  SFX.boom();
  game.shake = Math.max(game.shake, 4);
  spawnParticles(game.particles, r.x + r.w / 2, r.y + r.h / 2, 18, ['#ff8c1a', '#ffd23f', '#f8f8f8', '#8c8ca0']);
  if (chance(DROP_CHANCE)) game.cells.push(makeCell(r.x + r.w / 2, r.y));
}

function updatePlayer(p) {
  // Horizontal movement
  const left = keys.has('ArrowLeft') || keys.has('a');
  const right = keys.has('ArrowRight') || keys.has('d');
  if (p.invuln < PLAYER.invulnFrames - 12) { // brief knockback lockout after a hit
    if (left && !right) { p.vx = -PLAYER.speed; p.facing = -1; }
    else if (right && !left) { p.vx = PLAYER.speed; p.facing = 1; }
    else p.vx *= 0.6;
  }

  // Jump
  const jumpPressed = justPressed.has(' ') || justPressed.has('ArrowUp') || justPressed.has('w');
  if (jumpPressed && p.onGround) {
    p.vy = PLAYER.jump;
    p.onGround = false;
  }

  // Physics
  p.vy += GRAVITY;
  p.x = clamp(p.x + p.vx, 0, W - p.w);
  p.y += p.vy;
  if (p.y + p.h >= GROUND_Y) { p.y = GROUND_Y - p.h; p.vy = 0; p.onGround = true; }

  // Fire
  if (p.cooldown > 0) p.cooldown--;
  // Count a key tapped and released between two frames as well as a held key.
  const fireTapped = justPressed.has('j') || justPressed.has('x') || justPressed.has('z');
  const firePressed = fireTapped || keys.has('j') || keys.has('x') || keys.has('z');
  if (firePressed && p.cooldown === 0) {
    if (p.ammo > 0) {
      p.ammo -= 1;
      p.cooldown = PLAYER.fireCooldown;
      game.bullets.push(makeBullet(p));
      SFX.shoot();
      spawnParticles(game.particles, p.facing > 0 ? p.x + p.w + 2 : p.x - 2, p.y + 9, 3, ['#ffd23f', '#f8f8f8']);
    } else if (fireTapped) {
      p.cooldown = 12;
      p.emptyFlash = 30;
      SFX.empty();
    }
  }

  if (p.invuln > 0) p.invuln--;
  if (p.emptyFlash > 0) p.emptyFlash--;
  if (Math.abs(p.vx) > 0.2 && p.onGround) p.animTimer++;
}

function updateRobots() {
  const p = game.player;
  const diff = difficulty();
  for (const r of game.robots) {
    r.animTimer++;
    if (r.hitFlash > 0) r.hitFlash--;
    const towardX = Math.sign((p.x + p.w / 2) - (r.x + r.w / 2)) || 1;

    if (r.type === 'walker') {
      // Walk toward the player, stop and shoot when at mid range.
      const dist = Math.abs((p.x + p.w / 2) - (r.x + r.w / 2));
      const wantsToShoot = dist > 50 && dist < 130 && r.fireTimer < 25;
      r.vx = wantsToShoot ? 0 : towardX * r.speed;
      r.x += r.vx;
      r.fireTimer--;
      if (r.fireTimer <= 0) {
        if (dist < 160) {
          game.enemyBullets.push(makeEnemyBullet(r.x + r.w / 2, r.y + 8, p.x + p.w / 2, p.y + p.h / 2, 1.5 + diff * 0.1));
          SFX.laser();
        }
        r.fireTimer = rand(110, 200) - diff * 8;
      }
    } else {
      // Drone: glide toward the player's x, bob vertically, fire down at them.
      r.phase += 0.05;
      r.vx = towardX * r.speed;
      // Keep a little distance so it hovers above the player instead of parking.
      if (Math.abs((p.x + p.w / 2) - (r.x + r.w / 2)) < 8) r.vx = 0;
      r.x += r.vx;
      r.y = r.baseY + Math.sin(r.phase) * 8;
      r.fireTimer--;
      if (r.fireTimer <= 0) {
        game.enemyBullets.push(makeEnemyBullet(r.x + r.w / 2, r.y + r.h, p.x + p.w / 2, p.y + p.h / 2, 1.7 + diff * 0.1));
        SFX.laser();
        r.fireTimer = rand(90, 160) - diff * 6;
      }
    }

    // Touching the soldier hurts.
    if (overlap(r, p)) hurtPlayer(p, r.x);
  }
}

function updateBullets() {
  const p = game.player;

  // Player bullets vs robots
  for (const b of game.bullets) {
    b.x += b.vx;
    b.life--;
    for (const r of game.robots) {
      if (r.hp > 0 && overlap(b, r)) {
        r.hp -= 1;
        r.hitFlash = 6;
        b.life = 0;
        SFX.hit();
        spawnParticles(game.particles, b.dir > 0 ? b.x + b.w : b.x, b.y + 3, 4, ['#ffd23f', '#c8c8d8']);
        if (r.hp <= 0) killRobot(r);
        break;
      }
    }
  }
  game.bullets = game.bullets.filter(b => b.life > 0 && b.x + b.w > -4 && b.x < W + 4);
  game.robots = game.robots.filter(r => r.hp > 0);

  // Enemy bullets vs player
  for (const b of game.enemyBullets) {
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.y + b.h >= GROUND_Y) { b.life = 0; spawnParticles(game.particles, b.x, GROUND_Y, 2, ['#ff3b3b']); }
    if (b.life > 0 && overlap(b, p) && p.invuln === 0) {
      hurtPlayer(p, b.x);
      b.life = 0;
    }
  }
  game.enemyBullets = game.enemyBullets.filter(b => b.life > 0 && b.x > -8 && b.x < W + 8 && b.y > -8);
}

function updateCells() {
  const p = game.player;
  for (const c of game.cells) {
    c.vy += GRAVITY * 0.6;
    c.y += c.vy;
    if (c.y + c.h >= GROUND_Y) { c.y = GROUND_Y - c.h; c.vy = 0; }
    c.bob += 0.1;
    c.life--;
    if (overlap(c, p)) {
      c.life = 0;
      p.ammo = Math.min(PLAYER.maxAmmo, p.ammo + AMMO_PER_CELL);
      SFX.pickup();
      showMessage('+' + AMMO_PER_CELL + ' AMMO', 45);
      spawnParticles(game.particles, c.x + 4, c.y + 4, 8, ['#3b8bff', '#a8d4ff']);
    }
  }
  game.cells = game.cells.filter(c => c.life > 0);
}

function updateParticles() {
  for (const q of game.particles) {
    q.x += q.vx; q.y += q.vy; q.vy += 0.08; q.life--;
    if (q.y > GROUND_Y) { q.y = GROUND_Y; q.vy *= -0.4; }
  }
  game.particles = game.particles.filter(q => q.life > 0);
}

function updateSpawns() {
  const diff = difficulty();
  game.spawnTimer--;
  const cap = 3 + Math.min(diff, 6);
  if (game.spawnTimer <= 0 && game.robots.length < cap) {
    const droneChance = Math.min(0.5, 0.15 + diff * 0.05);
    game.robots.push(makeRobot(chance(droneChance) ? 'drone' : 'walker', diff));
    game.spawnTimer = Math.max(40, 130 - diff * 12) + rand(0, 30);
  }
}

function update() {
  if (justPressed.has('m')) toggleMusic();
  if (MUSIC.nowPlayingTimer > 0) MUSIC.nowPlayingTimer--;
  if (game.state === 'title') {
    if (justPressed.has('Enter')) startGame();
    return;
  }
  if (game.state === 'over') {
    if (justPressed.has('Enter')) startGame();
    // Let the dust settle on the game-over screen.
    updateParticles();
    return;
  }
  if (justPressed.has('p') || justPressed.has('Escape')) game.paused = !game.paused;
  if (game.paused) return;

  game.frame++;
  if (game.messageTimer > 0) game.messageTimer--;
  if (game.shake > 0) game.shake--;

  updatePlayer(game.player);
  updateRobots();
  updateBullets();
  updateCells();
  updateParticles();
  updateSpawns();
}

/* ---------------------------------------------------------------------- */
/* 7. Rendering                                                            */
/* ---------------------------------------------------------------------- */

// Static background baked once: banded night sky, moon, skyline, floor.
let bgCanvas = null;
function buildBackground() {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = W; bgCanvas.height = H;
  const g = bgCanvas.getContext('2d');

  // Sky bands (16-bit games loved horizontal gradient bands)
  const bands = ['#0a0a2a', '#10103a', '#16164a', '#1c1c5c', '#24246a', '#2c2c78', '#3a2c7c', '#4a3078'];
  const bandH = Math.ceil(GROUND_Y / bands.length);
  bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bandH, W, bandH); });

  // Stars
  g.fillStyle = '#c8c8d8';
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 45; i++) g.fillRect(Math.floor(next() * W), Math.floor(next() * 90), 1, 1);

  // Moon
  g.fillStyle = '#f0e8c0'; g.fillRect(250, 22, 14, 14);
  g.fillRect(248, 24, 18, 10); g.fillRect(252, 20, 10, 18);
  g.fillStyle = '#d8d0a8'; g.fillRect(254, 26, 3, 3); g.fillRect(259, 30, 2, 2);

  // Distant skyline
  seed = 3;
  let x = 0;
  while (x < W) {
    const bw = 10 + Math.floor(next() * 22);
    const bh = 20 + Math.floor(next() * 50);
    g.fillStyle = '#12122c';
    g.fillRect(x, GROUND_Y - bh, bw, bh);
    g.fillStyle = '#ffd23f';
    for (let wy = GROUND_Y - bh + 4; wy < GROUND_Y - 6; wy += 6) {
      for (let wx = x + 2; wx < x + bw - 2; wx += 4) {
        if (next() < 0.35) g.fillRect(wx, wy, 2, 2);
      }
    }
    x += bw + 2 + Math.floor(next() * 6);
  }

  // Nearer silhouette strip
  g.fillStyle = '#0a0a1c';
  for (let sx = 0; sx < W; sx += 16) {
    const h = 6 + Math.floor(next() * 10);
    g.fillRect(sx, GROUND_Y - h, 16, h);
  }

  // Floor
  g.fillStyle = '#3a3a4c'; g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  g.fillStyle = '#6a6a80'; g.fillRect(0, GROUND_Y, W, 2);
  g.fillStyle = '#2a2a3a';
  for (let tx = 0; tx < W; tx += 16) {
    g.fillRect(tx, GROUND_Y + 2, 1, H - GROUND_Y);
    g.fillRect(tx + 8, GROUND_Y + 10, 1, H - GROUND_Y);
  }
  g.fillRect(0, GROUND_Y + 10, W, 1); g.fillRect(0, GROUND_Y + 20, W, 1);
}

function drawPlayer(p) {
  if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return; // flicker
  let name = 'soldierStand';
  if (!p.onGround) name = 'soldierJump';
  else if (Math.abs(p.vx) > 0.2 && Math.floor(p.animTimer / 8) % 2 === 1) name = 'soldierWalk';
  drawSprite(name, p.x, p.y, p.facing < 0);
}

function drawRobot(r) {
  let name;
  if (r.type === 'walker') name = Math.floor(r.animTimer / 10) % 2 === 0 ? 'walker' : 'walker2';
  else name = 'drone';
  const flip = r.vx > 0; // sprites face left by default; mirror when heading right
  if (r.hitFlash > 0) {
    // White-out flash on hit: draw sprite, then overlay a white silhouette.
    drawSprite(name, r.x, r.y, flip);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(r.x), Math.round(r.y), r.w, r.h);
    ctx.restore();
  } else {
    drawSprite(name, r.x, r.y, flip);
  }
  if (r.type === 'drone') {
    // Little thruster glow
    ctx.fillStyle = Math.floor(r.animTimer / 3) % 2 ? '#ff8c1a' : '#ffd23f';
    ctx.fillRect(Math.round(r.x) + 3, Math.round(r.y) + 7, 2, 1);
    ctx.fillRect(Math.round(r.x) + 7, Math.round(r.y) + 7, 2, 1);
  }
}

function drawBullet(b) {
  const c = bulletCanvas('#ffd23f');
  const x = Math.round(b.x), y = Math.round(b.y);
  if (b.dir > 0) { ctx.drawImage(c, x, y); return; }
  ctx.save();
  ctx.translate(x + c.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

function drawCell(c) {
  const blinking = c.life < 120 && Math.floor(c.life / 6) % 2 === 0;
  if (blinking) return;
  const y = c.y + (c.vy === 0 ? Math.round(Math.sin(c.bob) * 1.5) : 0);
  // Soft glow ring behind the cell
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(c.bob * 2);
  ctx.fillStyle = '#3b8bff';
  ctx.fillRect(Math.round(c.x) - 1, Math.round(y) - 1, c.w + 2, c.h + 2);
  ctx.restore();
  drawSprite('cell', c.x, y);
}

function drawHUD(p) {
  // Ammo (with the blue cell as an icon)
  drawSprite('cell', 4, 3);
  const ammoColor = p.ammo === 0 ? (p.emptyFlash > 0 && Math.floor(p.emptyFlash / 4) % 2 ? '#ff3b3b' : '#ff8c1a') : '#f8f8f8';
  drawText(String(p.ammo).padStart(2, '0'), 16, 4, ammoColor);
  if (p.ammo === 0) drawText('NO AMMO', 34, 4, '#ff3b3b');

  // Hearts
  for (let i = 0; i < PLAYER.maxHp; i++) {
    ctx.fillStyle = i < p.hp ? '#ff3b3b' : '#50505c';
    const hx = 4 + i * 8, hy = 14;
    ctx.fillRect(hx, hy, 2, 2); ctx.fillRect(hx + 3, hy, 2, 2);
    ctx.fillRect(hx, hy + 1, 5, 2); ctx.fillRect(hx + 1, hy + 3, 3, 1); ctx.fillRect(hx + 2, hy + 4, 1, 1);
  }

  // Score & level
  const s = 'SCORE ' + String(game.score).padStart(6, '0');
  drawText(s, W - textWidth(s) - 4, 4, '#f8f8f8');
  const l = 'LVL ' + (difficulty() + 1);
  drawText(l, W - textWidth(l) - 4, 13, '#a8d4ff');

  // Transient message
  if (game.messageTimer > 0) {
    drawTextCentered(game.message, 40, '#ffd23f');
  }
}

function drawTitle() {
  drawTextCentered('SOLDIER,', 30, '#f8f8f8', 2);
  drawTextCentered("HOW'S YOUR BOMER?", 50, '#ffd23f', 1);

  // A little diorama
  drawSprite('soldierStand', 110, GROUND_Y - 16);
  drawBullet({ x: 128 + (renderFrame % 60) * 1.5, y: GROUND_Y - 10, dir: 1 });
  drawSprite('walker', 220, GROUND_Y - 16, false);
  drawSprite('drone', 190, 90 + Math.sin(renderFrame / 20) * 4);
  drawSprite('cell', 240, GROUND_Y - 9 + Math.round(Math.sin(renderFrame / 10) * 1.5));

  if (Math.floor(renderFrame / 30) % 2 === 0) drawTextCentered('PRESS ENTER', 80, '#f8f8f8');
  // Dark band so the instructions stay legible over the skyline.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 96, W, 36);
  drawTextCentered('SHOOT ROBOTS. GRAB BLUE CELLS FOR AMMO.', 100, '#a8d4ff');
  drawTextCentered('MOVE: ARROWS/WASD  JUMP: SPACE  FIRE: J/X/Z', 110, '#8c8ca0');
  drawTextCentered('M: MUSIC ' + (MUSIC.enabled ? 'ON' : 'OFF'), 120, '#8c8ca0');
  if (game.best > 0) drawTextCentered('BEST ' + String(game.best).padStart(6, '0'), 136, '#ffd23f');
  drawNowPlaying();
}

// Small "now playing" tag in the bottom-right corner while a track starts.
function drawNowPlaying() {
  if (!MUSIC.enabled) {
    drawText('MUSIC OFF', W - textWidth('MUSIC OFF') - 3, H - 9, '#8c8ca0');
    return;
  }
  if (MUSIC.nowPlayingTimer <= 0 || MUSIC.current < 0) return;
  const t = '> MARCHING THROUGH THE PAIN ' + MUSIC.tracks[MUSIC.current].name;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W - textWidth(t) - 6, H - 11, textWidth(t) + 6, 11);
  drawText(t, W - textWidth(t) - 3, H - 9, '#a8d4ff');
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  drawTextCentered('GAME OVER', 50, '#ff3b3b', 2);
  drawTextCentered('SCORE ' + String(game.score).padStart(6, '0'), 80, '#f8f8f8');
  drawTextCentered('ROBOTS SCRAPPED: ' + game.kills, 92, '#c8c8d8');
  drawTextCentered('BEST ' + String(game.best).padStart(6, '0'), 104, '#ffd23f');
  if (Math.floor(renderFrame / 30) % 2 === 0) drawTextCentered('PRESS ENTER TO RETRY', 130, '#f8f8f8');
}

let renderFrame = 0;
function render() {
  renderFrame++;
  if (!bgCanvas) buildBackground();

  ctx.save();
  if (game.shake > 0) {
    ctx.translate(Math.round(rand(-game.shake / 3, game.shake / 3)), Math.round(rand(-game.shake / 3, game.shake / 3)));
  }
  ctx.drawImage(bgCanvas, 0, 0);

  if (game.state === 'title') {
    drawTitle();
    ctx.restore();
    return;
  }

  for (const c of game.cells) drawCell(c);
  for (const r of game.robots) drawRobot(r);
  drawPlayer(game.player);
  for (const b of game.bullets) drawBullet(b);
  ctx.fillStyle = '#ff3b3b';
  for (const b of game.enemyBullets) ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
  for (const q of game.particles) {
    ctx.fillStyle = q.color;
    ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
  }
  ctx.restore();

  drawHUD(game.player);
  drawNowPlaying();

  if (game.state === 'over') drawGameOver();
  else if (game.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered('PAUSED', 80, '#f8f8f8', 2);
    drawTextCentered('PRESS P TO RESUME', 104, '#c8c8d8');
  }
}

/* ---------------------------------------------------------------------- */
/* 8. Input, scaling & main loop                                           */
/* ---------------------------------------------------------------------- */

const keys = new Set();
const justPressed = new Set();
const GAME_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']);

function normalizeKey(k) {
  return k.length === 1 ? k.toLowerCase() : k;
}

window.addEventListener('keydown', (e) => {
  initAudio();
  if (!MUSIC.unlocked) {
    MUSIC.unlocked = true;
    setMusicMode(game.state === 'play' ? 'play' : 'title');
  }
  const k = normalizeKey(e.key);
  if (GAME_KEYS.has(k)) e.preventDefault(); // stop the page from scrolling
  if (!keys.has(k)) justPressed.add(k);
  keys.add(k);
});
window.addEventListener('keyup', (e) => keys.delete(normalizeKey(e.key)));
window.addEventListener('blur', () => keys.clear());

function fitCanvas() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / W, (window.innerHeight - 40) / H)));
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Fixed 60 Hz simulation, rendered once per animation frame.
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function loop(now) {
  acc += Math.min(now - last, 100); // cap so a background tab doesn't fast-forward
  last = now;
  while (acc >= STEP) {
    update();
    justPressed.clear();
    acc -= STEP;
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Expose a little debug handle for the console / tests.
window.__bomer = { game, startGame, PLAYER, MUSIC };
