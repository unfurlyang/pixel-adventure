
'use strict'; window.__m = ["script-start"];
window.addEventListener("error", (e) => { window.__loadErr = (e.message || "?") + " @line " + (e.lineno || "?"); });
/* ============================================================
 * 像素冒险：勇者之旅 —— 2D 像素横版闯关（零依赖单文件）
 * v2: 选关界面 · 中英双语 · 马里奥风像素画 · 二段跳 · ?砖块 · 水管
 * 架构预留：怪物、战斗、生命值、关卡系统
 * ============================================================ */

/* ---------- 双语字典 ---------- */
const I18N = {
  zh: {
    title: "像素冒险", subtitle: "勇 者 之 旅",
    goal: "收集金币，抵达旗帜，成为真正的勇者！",
    press: "按 回车 / 空格 开始",
    keys: ["← → / A D 移动", "↑ / W / 空格 跳跃(可二段跳)", "R 重玩本关", "M 音效"],
    select: "选择关卡", locked: "未解锁",
    clear: "关卡完成！", clearCoins: (a, b, c) => `本关金币 ${a} / ${b} · 累计 ${c}`,
    unlocked: (n) => `🔓 解锁新关卡：${n}`,
    next: (n) => `即将进入 ${n} …`,
    winTitle: "通 关 ！", winSub: "恭喜勇者凯旋 🏆",
    winStats: (a, d) => `总金币 ${a} · 死亡 ${d} 次`,
    winFuture: "后续冒险：怪物 · 战斗 · 生命值 · 更多关卡（制作中）",
    winBack: "按 回车 返回标题",
    pause: "⏸ 暂 停", pauseHint: "按 P / Esc 继续", resume: "继续游戏",
    hud: "🏰", coin: "🪙",
    lvlNames: [["1-1 草原入口", "1-1 Green Plains"], ["1-2 幽暗森林", "1-2 Dark Forest"]],
  },
  en: {
    title: "PIXEL ADVENTURE", subtitle: "H E R O ' S   J O U R N E Y",
    goal: "Collect coins, reach the flag, become a true hero!",
    press: "Press Enter / Space to start",
    keys: ["← → / A D Move", "↑ / W / Space Jump (double jump!)", "R Retry level", "M Sound"],
    select: "SELECT LEVEL", locked: "Locked",
    clear: "Level Clear!", clearCoins: (a, b, c) => `Coins ${a} / ${b} · Total ${c}`,
    unlocked: (n) => `🔓 New level unlocked: ${n}`,
    next: (n) => `Entering ${n} …`,
    winTitle: "Y O U   W I N !", winSub: "The hero returns 🏆",
    winStats: (a, d) => `Total coins ${a} · Deaths ${d}`,
    winFuture: "Coming soon: Monsters · Combat · HP · More levels",
    winBack: "Press Enter for title",
    pause: "⏸ P A U S E", pauseHint: "Press P / Esc to resume", resume: "Resume",
    hud: "🏰", coin: "🪙",
    lvlNames: [["1-1 Green Plains", "1-1 Green Plains"], ["1-2 Dark Forest", "1-2 Dark Forest"]],
  }
};
let LANG = localStorage.getItem("pa.lang") || "zh";
const t = (k) => I18N[LANG][k];

/* ---------- 基础 ---------- */
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const $ = (sel) => document.querySelector(sel);
const VW = 480, VH = 270, TILE = 16;
ctx.imageSmoothingEnabled = false;

const COL = {
  skyGrass0: "#7ec8e8", skyGrass1: "#cdeffc",
  skyForest0: "#2c3a5e", skyForest1: "#5a7a94",
  ground: "#b5732e", groundDark: "#7a4a1c", groundEdge: "#5c3a14",
  grass: "#3fae4a", grassDark: "#2c7d38",
  forestGround: "#6b5a3e", forestGroundDark: "#4a3c28", forestCap: "#3f7a3a", forestCapDark: "#2c5c2a",
  brick: "#c05a20", brickDark: "#8a3c12", brickLight: "#e08a4a",
  qblock: "#e8a020", qblockDark: "#a06808",
  usedBlock: "#8a5a33",
  pipe: "#2fae4a", pipeDark: "#1c7a30", pipeLight: "#7ad87a",
  wood: "#a5692f", woodDark: "#7c4c20",
  coin: "#ffd23f", coinDark: "#d9a010",
  flagPole: "#cfd6dd", flagCloth: "#e84d4d",
  cloud: "#ffffff", hill: "#5db85f", hillDark: "#489a4c",
  treeDark: "#1f2f4a", treeMid: "#2a4066",
};

/* ---------- 音效 ---------- */
let AC = null, muted = localStorage.getItem("pa.muted") === "1";
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === "suspended") AC.resume();
  return AC;
}
function beep(freq0, freq1, dur, type, vol) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || "square";
  o.frequency.setValueAtTime(freq0, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, freq1), a.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.12, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime + dur);
}
const SFX = {
  jump:  () => beep(300, 620, 0.14, "square", 0.10),
  jump2: () => { beep(500, 900, 0.12, "square", 0.10); setTimeout(() => beep(700, 1100, 0.10, "square", 0.08), 60); },
  coin:  () => { beep(880, 880, 0.07, "square", 0.10); setTimeout(() => beep(1318, 1318, 0.16, "square", 0.10), 70); },
  pop:   () => beep(600, 1000, 0.12, "square", 0.11),
  clear: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, f, 0.16, "square", 0.11), i * 130)),
  die:   () => beep(420, 90, 0.5, "sawtooth", 0.13),
  win:   () => [784, 988, 1175, 1568, 1318, 1568].forEach((f, i) => setTimeout(() => beep(f, f, 0.18, "square", 0.11), i * 150)),
};

/* ---------- 输入 ---------- */
const keys = {};
window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === "KeyM") { muted = !muted; localStorage.setItem("pa.muted", muted ? "1" : "0"); toast(muted ? "音效 OFF" : "音效 ON"); }
  if ((e.code === "KeyP" || e.code === "Escape") && (G.state === "play" || G.state === "pause")) {
    G.state = G.state === "play" ? "pause" : "play";
    showScreen(G.state === "pause" ? "pauseScreen" : null);
    if (G.state === "pause") renderPause();
  }
  if (e.code === "KeyR" && G.state === "play") loadLevel(G.level);
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") player.buffer = 0.12;
  // 标题屏: 左右切换选关, Enter 进入
  if (G.state === "title") {
    if (e.code === "ArrowLeft" || e.code === "KeyA") { selIdx = Math.max(0, selIdx - 1); renderTitle(); }
    if (e.code === "ArrowRight" || e.code === "KeyD") { selIdx = Math.min(maxUnlocked(), selIdx + 1); renderTitle(); }
    if (e.code === "Enter") startGame(selIdx);
  }
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

function showScreen(id) {
  ["titleScreen", "clearScreen", "winScreen", "pauseScreen"].forEach(s =>
    document.getElementById(s).classList.toggle("hidden", s !== id));
  if (!id) ["titleScreen", "clearScreen", "winScreen", "pauseScreen"].forEach(s =>
    document.getElementById(s).classList.add("hidden"));
}

function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);" +
    "background:rgba(0,0,0,.8);color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;z-index:99;" +
    "font-family:'Microsoft YaHei',sans-serif;transition:opacity .4s";
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; }, 900);
  setTimeout(() => el.remove(), 1400);
}

/* ---------- 解锁进度 ---------- */
function maxUnlocked() { return parseInt(localStorage.getItem("pa.unlock") || "0", 10); }
function unlockTo(n) {
  if (n > maxUnlocked()) { localStorage.setItem("pa.unlock", String(n)); return true; }
  return false;
}

/* ---------- 关卡数据（代码化生成，保证可通关） ---------- */
function makeLevel(cfg) {
  const COLS = cfg.cols, ROWS = 17;
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill("."));
  const coins = [];
  const qblocks = [];
  const pipes = [];
  const set = (x, y, ch) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) g[y][x] = ch; };
  const ground = (x0, x1, hTop) => { for (let x = x0; x <= x1; x++) for (let y = hTop; y < ROWS; y++) set(x, y, "#"); };
  const plat = (x0, x1, y) => { for (let x = x0; x <= x1; x++) set(x, y, "P"); };
  const coinRow = (x0, n, y) => { for (let i = 0; i < n; i++) { set(x0 + i, y, "C"); coins.push([x0 + i, y]); } };
  const coinArc = (x0, n, yBase) => {
    for (let i = 0; i < n; i++) {
      const y = yBase - Math.round(Math.sin((i + 0.5) / n * Math.PI) * 2);
      set(x0 + i, y, "C"); coins.push([x0 + i, y]);
    }
  };
  const qblock = (x, y) => { set(x, y, "?"); qblocks.push([x, y]); };
  const pipe = (x, h, gTop) => {
    pipes.push({ x, h, gTop });
    for (let y = gTop - h; y < gTop; y++) { set(x, y, "#"); set(x + 1, y, "#"); }
  };
  cfg.build({ ground, plat, coinRow, coinArc, set, qblock, pipe });
  return { grid: g, chars: cfg.gridChars || g, cols: COLS, rows: ROWS, coins,
           qblocks, pipes, spawn: cfg.spawn, theme: cfg.theme, name: cfg.name, flagX: cfg.flagX };
}

const LEVELS = [
  { name: ["1-1 草原入口", "1-1 Green Plains"], theme: "grass", cols: 150, spawn: [3, 12], flagX: 143,
    build(b) {
      b.ground(0, 26, 13);
      b.coinRow(8, 5, 11);
      b.qblock(14, 9); b.qblock(15, 9); b.qblock(16, 9);
      b.ground(29, 40, 13);
      b.coinArc(26, 4, 11);
      b.plat(33, 35, 10); b.coinRow(33, 3, 9);
      b.pipe(38, 2, 13);
      b.ground(43, 46, 12);
      b.ground(49, 58, 11);
      b.coinArc(46, 4, 9);
      b.plat(52, 54, 8); b.coinRow(52, 3, 7);
      b.ground(61, 64, 13);
      b.plat(66, 68, 10);
      b.coinRow(66, 3, 9);
      b.ground(71, 82, 12);
      b.coinArc(68, 4, 10);
      b.plat(74, 76, 9); b.coinRow(74, 3, 8);
      b.pipe(80, 3, 12);
      b.ground(85, 88, 11);
      b.ground(91, 100, 10);
      b.coinArc(88, 4, 8);
      b.plat(94, 96, 7); b.coinRow(94, 3, 6);
      b.ground(103, 106, 12);
      b.plat(108, 110, 10);
      b.coinRow(108, 3, 9);
      b.ground(113, 126, 12);
      b.coinRow(116, 6, 10);
      b.plat(120, 122, 9); b.coinRow(120, 3, 8);
      b.qblock(124, 8);
      b.ground(129, 149, 12);
      b.coinRow(132, 6, 10);
      b.pipe(140, 2, 12);
    } },
  { name: ["1-2 幽暗森林", "1-2 Dark Forest"], theme: "forest", cols: 155, spawn: [3, 12], flagX: 148,
    build(b) {
      b.ground(0, 20, 13);
      b.coinRow(7, 4, 11);
      b.plat(12, 14, 10); b.coinRow(12, 3, 9);
      b.plat(17, 19, 8); b.coinRow(17, 3, 7);
      b.qblock(15, 5);
      b.ground(22, 32, 12);
      b.coinArc(19, 4, 7);
      b.plat(25, 27, 9); b.coinRow(25, 3, 8);
      b.pipe(30, 2, 12);
      b.ground(35, 39, 11);
      b.coinArc(32, 4, 9);
      b.plat(42, 44, 8);
      b.coinRow(42, 3, 7);
      b.plat(47, 49, 9);
      b.ground(52, 62, 12);
      b.coinArc(49, 4, 7);
      b.plat(55, 57, 8); b.coinRow(55, 3, 7);
      b.plat(60, 62, 7); b.coinRow(60, 3, 6);
      b.qblock(58, 4);
      b.ground(65, 70, 13);
      b.coinRow(66, 4, 11);
      b.plat(73, 75, 10);
      b.coinRow(73, 3, 9);
      b.plat(78, 80, 8);
      b.coinRow(78, 3, 7);
      b.ground(83, 94, 11);
      b.coinArc(80, 4, 6);
      b.plat(87, 89, 8); b.coinRow(87, 3, 7);
      b.pipe(92, 3, 11);
      b.ground(97, 101, 12);
      b.coinArc(94, 4, 9);
      b.plat(104, 106, 9);
      b.coinRow(104, 3, 8);
      b.plat(109, 111, 8);
      b.coinRow(109, 3, 7);
      b.ground(114, 126, 11);
      b.coinRow(118, 6, 9);
      b.plat(121, 123, 8); b.coinRow(121, 3, 7);
      b.qblock(124, 6);
      b.ground(129, 154, 12);
      b.coinRow(133, 6, 10);
      b.pipe(140, 2);
    } },
];

/* ---------- 世界状态 ---------- */
const G = {
  state: "title",
  level: 0,
  totalCoins: 0,
  deaths: 0,
  world: null,
  time: 0,
  clearTimer: 0,
};

const player = {
  x: 0, y: 0, w: 10, h: 14, vx: 0, vy: 0,
  onGround: false, face: 1, anim: 0,
  coyote: 0, buffer: 0, jumps: 0,
};

let particles = [];
let popCoins = [];            // ?砖块弹出的金币动画
let cam = { x: 0 };
let shake = 0;
let selIdx = 0;

/* ---------- 马里奥风勇者像素画（12×16） ----------
 * R 红(帽/衣)  S 肤  N 棕(发/胡/鞋)  B 蓝(背带裤)  K 眼  Y 纽扣 */
const HERO_PAL = { R: "#d63a2f", S: "#f8c080", N: "#6b3a12", B: "#2b4bd8", K: "#1a1a2e", Y: "#ffd23f" };
const HERO_STAND = [
  "....RRRRRR..",
  "...RRRRRRRR.",
  "...NNNSSKS..",
  "..NSNSSSKSS.",
  "..NSNNSSSSS.",
  "..NNSSNNNN..",
  "....SSSSS...",
  "..RRRBBRR...",
  ".RRRBBBBRR..",
  ".SSRBYBYRSS.",
  ".SSBBBBBBSS.",
  "..BBBBBBBB..",
  "..BBB..BBB..",
  "..BBB..BBB..",
  ".NNN....NNN.",
  ".NNN....NNN.",
];
const HERO_RUN1 = HERO_STAND.slice(0, 12).concat([
  "..BBBBBBB...",
  ".BBB...BBB..",
  "NNN.....BBB.",
  "NNN......NN.",
]);
const HERO_RUN2 = HERO_STAND.slice(0, 12).concat([
  "...BBBBBB...",
  "..BBBBBBB...",
  "..BBB..NNN..",
  ".NNN...NNN..",
]);
const HERO_JUMP = HERO_STAND.slice(0, 8).concat([
  ".SSRRBBRRSS.",
  "SSRRBBBBRRSS",
  "..BBBBYBB...",
  "..BBBBBBBB..",
  "..BBB.BBBB..",
  ".NBB....BB..",
  ".NN.....NNN.",
  "........NN..",
]);

/* ---------- 音符/粒子 ---------- */
let particles = [];
let popCoins = [];
let cam = { x: 0 };
let shake = 0;
let selIdx = 0;

/* ---------- 双语渲染 ---------- */
function applyLang() {
  document.documentElement.lang = LANG === "zh" ? "zh-CN" : "en";
  $("#langBtn").textContent = LANG === "zh" ? "🌐 English" : "🌐 中文";
}

function renderTitle() {
  applyLang();
  $("#tTitle").textContent = t("title");
  $("#tSubtitle").textContent = t("subtitle");
  $("#tGoal").textContent = t("goal");
  $("#tPress").textContent = t("press");
  $("#tKeys").innerHTML = t("keys").map(k => `<span>${k}</span>`).join("");
  const unlocked = maxUnlocked();
  selIdx = Math.min(selIdx, unlocked);
  $("#lvlButtons").innerHTML = LEVELS.map((L, i) => {
    const locked = i > unlocked;
    const nm = LANG === "zh" ? L.name[0] : L.name[1];
    return `<button class="lvl-btn${i === selIdx ? " sel" : ""}${locked ? " locked" : ""}" data-idx="${i}" ${locked ? "disabled" : ""}>
      ${locked ? "🔒 " : ""}${nm}<small>${locked ? t("locked") : (i === selIdx ? "▶ " : "") + t("select")}</small></button>`;
  }).join("");
}

/* ---------- 关卡加载 ---------- */
function loadLevel(idx) {
  G.level = idx;
  const L = makeLevel(LEVELS[idx]);
  const solid = L.grid.map(row => row.map(c => (c === "#" || c === "P" || c === "?") ? 1 : 0));
  const coins = [];
  L.coins.forEach(([x, y]) => coins.push({ x: x * TILE + 4, y: y * TILE + 4, got: false, t: Math.random() * 6 }));
  G.world = { grid: solid, chars: L.grid, cols: L.cols, rows: L.rows, coins,
              qblocks: L.qblocks, pipes: L.pipes, theme: L.theme,
              name: LANG === "zh" ? L.name[0] : L.name[1],
              flag: { x: L.flagX * TILE + 3, y: 0 } };
  for (let y = 0; y < L.rows; y++) {
    if (L.grid[y][L.flagX] === "#" || L.grid[y][L.flagX] === "P") { G.world.flag.y = y * TILE; break; }
  }
  const [sx, sy] = L.spawn;
  player.x = sx * TILE + 3; player.y = sy * TILE;
  player.vx = 0; player.vy = 0; player.onGround = false; player.face = 1; player.jumps = 0;
  particles = []; popCoins = [];
  cam.x = 0;
  refreshHUD();
  G.state = "play";
  showScreen(null);
}

function startGame(idx) {
  ac();
  G.totalCoins = 0; G.deaths = 0;
  selIdx = idx;
  loadLevel(idx);
}

/* ---------- 物理 ---------- */
const GRAV = 1500, MOVE = 130, ACC = 1400, FRICTION = 1600, JUMP = 390, JUMP2 = 360, MAXFALL = 430;

function solidAt(px, py) {
  const w = G.world;
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || x >= w.cols) return 1;
  if (y < 0 || y >= w.rows) return 0;
  return w.grid[y][x];
}

function charAt(px, py) {
  const w = G.world;
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || x >= w.cols || y < 0 || y >= w.rows) return ".";
  return w.chars[y][x];
}

/* ?砖块头顶撞击 → 弹出金币 */
function hitQBlock(tx, ty) {
  const key = tx + "," + ty;
  if (G.world.usedQ) { if (G.world.usedQ.has(key)) return; } else { G.world.usedQ = new Set(); }
  G.world.usedQ.add(key);
  const cx = tx * TILE + 8;
  popCoins.push({ x: cx, y: ty * TILE, vy: -230, life: 0.55 });
  G.totalCoins++;
  SFX.pop();
  spawnSpark(cx, ty * TILE - 4);
}

function movePlayer(dt) {
  const left = keys["ArrowLeft"] || keys["KeyA"];
  const right = keys["ArrowRight"] || keys["KeyD"];
  const jumpHeld = keys["Space"] || keys["ArrowUp"] || keys["KeyW"];

  if (left && !right) { player.vx -= ACC * dt; player.face = -1; }
  else if (right && !left) { player.vx += ACC * dt; player.face = 1; }
  else {
    const f = (player.onGround ? FRICTION : FRICTION * 0.35) * dt;
    if (Math.abs(player.vx) <= f) player.vx = 0; else player.vx -= Math.sign(player.vx) * f;
  }
  player.vx = Math.max(-MOVE, Math.min(MOVE, player.vx));

  // 跳跃: 土狼 + 缓冲 + 二段跳
  player.coyote = player.onGround ? 0.1 : Math.max(0, player.coyote - dt);
  player.buffer = Math.max(0, player.buffer - dt);
  if (player.buffer > 0) {
    if (player.coyote > 0) {
      player.vy = -JUMP; player.jumps = 1;
      player.coyote = 0; player.buffer = 0;
      SFX.jump();
      spawnDust(player.x + player.w / 2, player.y + player.h, 4);
    } else if (player.jumps < 2) {
      player.vy = -JUMP2; player.jumps = 2; player.buffer = 0;
      SFX.jump2();
      spawnRing(player.x + player.w / 2, player.y + player.h);
    }
  }
  if (!jumpHeld && player.vy < -160 && player.jumps === 1) player.vy = -160;

  player.vy = Math.min(player.vy + GRAV * dt, MAXFALL);

  const w = G.world;
  let nx = player.x + player.vx * dt;
  if (player.vx > 0) {
    if (solidAt(nx + player.w, player.y + 1) || solidAt(nx + player.w, player.y + player.h - 1)) {
      nx = Math.floor((nx + player.w) / TILE) * TILE - player.w - 0.01; player.vx = 0;
    }
  } else if (player.vx < 0) {
    if (solidAt(nx, player.y + 1) || solidAt(nx, player.y + player.h - 1)) {
      nx = (Math.floor(nx / TILE) + 1) * TILE + 0.01; player.vx = 0;
    }
  }
  player.x = nx;

  let ny = player.y + player.vy * dt;
  player.onGround = false;
  if (player.vy > 0) {
    if (solidAt(player.x + 1, ny + player.h) || solidAt(player.x + player.w - 1, ny + player.h)) {
      ny = Math.floor((ny + player.h) / TILE) * TILE - player.h - 0.01;
      if (player.vy > 260) spawnDust(player.x + player.w / 2, ny + player.h, 6);
      player.vy = 0; player.onGround = true; player.jumps = 0;
    }
  } else if (player.vy < 0) {
    const hitL = solidAt(player.x + 1, ny), hitR = solidAt(player.x + player.w - 1, ny);
    if (hitL || hitR) {
      ny = (Math.floor(ny / TILE) + 1) * TILE + 0.01; player.vy = 0;
      // ?砖块头顶撞击
      const ty = Math.floor(ny / TILE) - 1;
      for (const txOff of [player.x + 1, player.x + player.w - 1]) {
        const tx = Math.floor(txOff / TILE);
        if (ty >= 0 && ty < w.rows && w.chars[ty] && w.chars[ty][tx] === "?") hitQBlock(tx, ty);
      }
    }
  }
  player.y = ny;

  if (player.y > G.world.rows * TILE + 40) {
    G.deaths++;
    SFX.die();
    loadLevel(G.level);
  }

  const pr = { x: player.x - 2, y: player.y - 2, w: player.w + 4, h: player.h + 4 };
  G.world.coins.forEach(c => {
    if (!c.got && c.x < pr.x + pr.w && c.x + 8 > pr.x && c.y < pr.y + pr.h && c.y + 8 > pr.y) {
      c.got = true;
      G.totalCoins++;
      SFX.coin();
      spawnSpark(c.x + 4, c.y + 4);
    }
  });

  const f = G.world.flag;
  if (player.x + player.w > f.x && player.x < f.x + 10 &&
      player.y + player.h > f.y - 16) {
    SFX.clear();
    const got = G.world.coins.filter(c => c.got).length;
    G.state = "clear"; G.clearTimer = 2.4;
    const unlockedNew = unlockTo(G.level + 1);
    const nextName = G.level + 1 < LEVELS.length
      ? (LANG === "zh" ? LEVELS[G.level + 1].name[0] : LEVELS[G.level + 1].name[1]) : null;
    $("#clearTitle").textContent = t("clear") + " " + G.world.name;
    $("#clearCoins").textContent = t("clearCoins")(got, G.world.coins.length, G.totalCoins);
    $("#clearUnlock").textContent = unlockedNew && nextName ? t("unlocked")(nextName) : "";
    $("#clearNext").textContent = nextName ? t("next")(nextName) : "";
    showScreen("clearScreen");
  }

  player.anim += Math.abs(player.vx) * dt * 0.25;
}

/* ---------- 粒子 ---------- */
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) particles.push({
    x, y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 50 - 10,
    life: 0.35 + Math.random() * 0.2, c: "#cfd8dc", s: 2
  });
}
function spawnSpark(x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 2 * i / 8;
    particles.push({ x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 30,
      life: 0.4, c: "#ffd23f", s: 2 });
  }
}
function spawnRing(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * 2 * i / 10;
    particles.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 40,
      life: 0.3, c: "#9be7ff", s: 2 });
  }
}
function updateParticles(dt) {
  particles = particles.filter(p => (p.life -= dt) > 0);
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; });
  popCoins = popCoins.filter(c => (c.life -= dt) > 0);
  popCoins.forEach(c => { c.y += c.vy * dt; c.vy += 900 * dt; });
}

/* ---------- 渲染 ---------- */
function drawBG(theme) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  if (theme === "grass") {
    g.addColorStop(0, COL.skyGrass0); g.addColorStop(1, COL.skyGrass1);
  } else {
    g.addColorStop(0, COL.skyForest0); g.addColorStop(1, COL.skyForest1);
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const par = cam.x * 0.3;
  if (theme === "grass") {
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (let i = 0; i < 6; i++) {
      const cx0 = ((i * 137 - par * 0.5) % (VW + 120) + VW + 120) % (VW + 120) - 60;
      const cy0 = 28 + (i % 3) * 24;
      ctx.fillRect(cx0, cy0, 42, 10); ctx.fillRect(cx0 + 10, cy0 - 7, 26, 8);
    }
    ctx.fillStyle = "rgba(93,184,95,.9)";
    for (let i = 0; i < 8; i++) {
      const hx = ((i * 160 - par) % (VW + 320) + VW + 320) % (VW + 320) - 160;
      ctx.beginPath(); ctx.arc(hx, VH - 58, 80, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = "rgba(72,154,76,.9)";
    for (let i = 0; i < 6; i++) {
      const hx = ((i * 200 - par * 1.2) % (VW + 400) + VW + 400) % (VW + 400) - 200;
      ctx.beginPath(); ctx.arc(hx, VH - 30, 100, Math.PI, 0); ctx.fill();
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,.5)";
    for (let i = 0; i < 40; i++) {
      const sx0 = ((i * 53 - par * 0.2) % VW + VW) % VW;
      const sy0 = (i * 37) % (VH * 0.6);
      ctx.fillRect(sx0, sy0, 2, 2);
    }
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? COL.treeDark : COL.treeMid;
      const p = par * (0.4 + layer * 0.25);
      for (let i = 0; i < 10; i++) {
        const tx = ((i * 110 - p) % (VW + 220) + VW + 220) % (VW + 220) - 110;
        const th = 120 + layer * 30 + (i % 3) * 18;
        ctx.fillRect(tx + 14, VH - 70 - th, 10, th);
        ctx.beginPath(); ctx.moveTo(tx - 16, VH - 70 - th);
        ctx.lineTo(tx + 19, VH - 96 - th); ctx.lineTo(tx + 54, VH - 70 - th);
        ctx.closePath(); ctx.fill();
      }
    }
  }
}

function drawTiles() {
  const w = G.world;
  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const x1 = Math.min(w.cols - 1, Math.ceil((cam.x + VW) / TILE));
  for (let x = x0; x <= x1; x++) {
    for (let y = 0; y < w.rows; y++) {
      const c = w.chars[y][x];
      if (c === "#") {
        const px = x * TILE, py = y * TILE;
        const topOpen = y === 0 || w.chars[y - 1][x] === ".";
        if (w.theme === "grass") {
          ctx.fillStyle = COL.ground; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = COL.groundDark;
          ctx.fillRect(px + 2, py + 5, 3, 3); ctx.fillRect(px + 10, py + 10, 4, 3);
          ctx.fillStyle = COL.groundEdge; ctx.fillRect(px, py, TILE, 1);
          if (topOpen) { ctx.fillStyle = COL.grass; ctx.fillRect(px, py, TILE, 5);
            ctx.fillStyle = COL.grassDark; ctx.fillRect(px, py + 5, TILE, 2);
            ctx.fillRect(px + 3, py - 2, 4, 2); ctx.fillRect(px + 11, py - 2, 3, 2); }
        } else {
          ctx.fillStyle = COL.forestGround; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = COL.forestGroundDark;
          ctx.fillRect(px + 3, py + 8, 4, 3); ctx.fillRect(px + 10, py + 3, 3, 3);
          ctx.fillStyle = COL.groundEdge; ctx.fillRect(px, py, TILE, 1);
          if (topOpen) { ctx.fillStyle = COL.forestCap; ctx.fillRect(px, py, TILE, 5);
            ctx.fillStyle = COL.forestCapDark; ctx.fillRect(px, py + 5, TILE, 2); }
        }
      } else if (c === "P") {
        const px = x * TILE, py = y * TILE;
        ctx.fillStyle = COL.brick; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COL.brickDark;
        ctx.fillRect(px, py + 7, TILE, 1); ctx.fillRect(px, py + 15, TILE, 1);
        ctx.fillRect(px + 7, py, 1, 7); ctx.fillRect(px + 3, py + 8, 1, 7); ctx.fillRect(px + 11, py + 8, 1, 7);
        ctx.fillStyle = COL.brickLight; ctx.fillRect(px, py, TILE, 1);
      } else if (c === "?") {
        const key = x + "," + y;
        const used = w.usedQ && w.usedQ.has(key);
        const px = x * TILE, py = y * TILE;
        ctx.fillStyle = used ? COL.usedBlock : COL.qblock;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COL.brickDark; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py + 15, TILE, 1);
        if (!used) {
          ctx.fillStyle = COL.brickDark;
          ctx.fillRect(px + 2, py + 2, 2, 2); ctx.fillRect(px + 12, py + 2, 2, 2);
          ctx.fillRect(px + 2, py + 12, 2, 2); ctx.fillRect(px + 12, py + 12, 2, 2);
          ctx.fillStyle = "#5c3a08";
          ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("?", px + 8, py + 8 + Math.sin(G.time * 5) * 1.2);
        }
      }
    }
  }
  // 水管
  w.pipes.forEach(p => {
    const px = p.x * TILE, top = (p.gTop - p.h) * TILE;
    ctx.fillStyle = COL.pipe; ctx.fillRect(px + 2, top + 8, 28, p.h * TILE - 8);
    ctx.fillStyle = COL.pipeLight; ctx.fillRect(px + 4, top + 8, 5, p.h * TILE - 8);
    ctx.fillStyle = COL.pipeDark; ctx.fillRect(px + 22, top + 8, 5, p.h * TILE - 8);
    ctx.fillStyle = COL.pipe; ctx.fillRect(px, top, 32, 10);
    ctx.fillStyle = COL.pipeDark; ctx.fillRect(px, top, 32, 2); ctx.fillRect(px, top + 10, 32, 2);
    ctx.fillStyle = COL.pipeLight; ctx.fillRect(px + 2, top + 2, 6, 6);
  });
  // ?砖块弹出的金币
  popCoins.forEach(c => {
    ctx.fillStyle = COL.coin; ctx.fillRect(c.x - 3, c.y - 4, 7, 8);
    ctx.fillStyle = COL.coinDark; ctx.fillRect(c.x - 3, c.y + 2, 7, 2);
  });
}

function drawCoins(t) {
  G.world.coins.forEach(c => {
    if (c.got) return;
    const wCoin = Math.max(2, Math.abs(Math.cos(t * 4 + c.t)) * 7);
    const bob = Math.sin(t * 3 + c.t) * 1.5;
    ctx.fillStyle = COL.coin;
    ctx.fillRect(c.x + 4 - wCoin / 2, c.y + 1 + bob, wCoin, 7);
    ctx.fillStyle = COL.coinDark;
    ctx.fillRect(c.x + 4 - wCoin / 2, c.y + 6 + bob, wCoin, 2);
    if (wCoin > 5) { ctx.fillStyle = "#fff3c2"; ctx.fillRect(c.x + 5, c.y + 2 + bob, 1.5, 4); }
  });
}

function drawFlag() {
  const f = G.world.flag;
  const px = f.x, base = f.y;
  ctx.fillStyle = COL.flagPole;
  ctx.fillRect(px + 4, base - 46, 3, 46);
  ctx.fillStyle = COL.flagCloth;
  const wave = Math.sin(G.time * 5) * 2;
  ctx.beginPath();
  ctx.moveTo(px + 7, base - 44);
  ctx.lineTo(px + 7 + 16, base - 40 + wave);
  ctx.lineTo(px + 7, base - 32);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = COL.coin;
  ctx.fillRect(px + 3, base - 49, 5, 4);
}

/* 马里奥风勇者（像素图绘制, 按朝向镜像） */
function drawHero(t) {
  const air = !player.onGround;
  const run = player.onGround && Math.abs(player.vx) > 20;
  const frame = Math.floor(player.anim) % 2;
  let map = HERO_STAND;
  if (air) map = HERO_JUMP;
  else if (run) map = frame === 0 ? HERO_RUN1 : HERO_RUN2;
  const x0 = Math.round(player.x) - 1;
  const y0 = Math.round(player.y) - 2;
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      ctx.fillStyle = HERO_PAL[ch];
      const gx = player.face === 1 ? c : (row.length - 1 - c);
      ctx.fillRect(x0 + gx, y0 + r, 1, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => { ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
  popCoins.forEach(c => { ctx.fillStyle = COL.coin; ctx.fillRect(c.x - 3, c.y - 4, 7, 8); });
}

/* ---------- HUD / 屏幕 ---------- */
function refreshHUD() {
  $("#hudLevel").textContent = (G.level + 1) + "-1";
  $("#hudCoins").textContent = G.world.coins.filter(c => c.got).length;
  $("#hudCoinsTotal").textContent = G.world.coins.length;
}

const tcv = document.getElementById("titleCoin");
const tctx = tcv.getContext("2d");
function drawTitleCoin(t) {
  tctx.clearRect(0, 0, 10, 10);
  const w = Math.max(2, Math.abs(Math.cos(t * 3)) * 8);
  tctx.fillStyle = "#ffd23f"; tctx.fillRect(5 - w / 2, 1, w, 8);
  tctx.fillStyle = "#d9a010"; tctx.fillRect(5 - w / 2, 7, w, 2);
  if (w > 5) { tctx.fillStyle = "#fff3c2"; tctx.fillRect(5 - w / 2 + 1, 2, 1.5, 5); }
}

/* ---------- 主循环 ---------- */
let last = 0;
function loop(ts) {
  window.__m.push("before-rAF"); requestAnimationFrame(loop);
  const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
  last = ts;
  G.time += dt;
  drawTitleCoin(G.time);
  if (G.state === "play") stepPlay(dt);
  else if (G.state === "clear") advanceClear(dt);
  if (G.world && (G.state === "play" || G.state === "clear" || G.state === "pause")) renderWorld();
}
function stepPlay(dt) {
  movePlayer(dt);
  updateParticles(dt);
  const target = player.x + player.w / 2 - VW / 2.4;
  const maxCam = G.world.cols * TILE - VW;
  cam.x += (Math.max(0, Math.min(maxCam, target)) - cam.x) * Math.min(1, dt * 8);
  if (shake > 0) shake -= dt;
}
function advanceClear(dt) {
  G.clearTimer -= dt;
  if (G.clearTimer <= 0) {
    if (G.level + 1 < LEVELS.length) {
      loadLevel(G.level + 1);
    } else {
      G.state = "win";
      $("#winStats").textContent = t("winStats")(G.totalCoins, G.deaths);
      showScreen("winScreen");
      SFX.win();
    }
  }
}
function renderWorld() {
  drawBG(G.world.theme);
  ctx.save();
  ctx.translate(-Math.round(cam.x) + (shake > 0 ? (Math.random() - 0.5) * 4 : 0), 0);
  drawTiles();
  drawFlag();
  drawCoins(G.time);
  drawHero(G.time);
  drawParticles();
  ctx.restore();
  refreshHUD();
}
requestAnimationFrame(loop);

/* ---------- 调试钩子（供自动化测试） ---------- */
window.GAME = {
  info: () => ({ state: G.state, level: G.level, px: Math.round(player.x), py: Math.round(player.y),
                 jumps: player.jumps,
                 coins: G.world ? G.world.coins.filter(c => c.got).length : 0,
                 coinsTotal: G.world ? G.world.coins.length : 0, deaths: G.deaths }),
  key: (code, down) => { keys[code] = down; },
  setState: (s) => { G.state = s; },
  step: (dt) => { if (G.state === "play") stepPlay(dt); else if (G.state === "clear") advanceClear(dt); },
  renderOnce: () => { if (G.world) renderWorld(); },
};
window.__m.push("script-end");

/* ---------- 初始化 ---------- */
function renderPause() {
  $("#pauseTitle").textContent = t("pause");
  $("#pauseHint").textContent = t("pauseHint");
  $("#btnResume").textContent = t("resume");
}
$("#lvlButtons").addEventListener("click", (e) => {
  const btn = e.target.closest(".lvl-btn");
  if (!btn || btn.disabled) return;
  startGame(parseInt(btn.dataset.idx, 10));
});
$("#langBtn").addEventListener("click", () => {
  LANG = LANG === "zh" ? "en" : "zh";
  localStorage.setItem("pa.lang", LANG);
  renderTitle();
});
$("#btnResume").addEventListener("click", () => { G.state = "play"; showScreen(null); });
renderTitle();
