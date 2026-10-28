// 게임 화면 그리기 (기획서 4.2, 6.1, 8.6)
// 두 사람이 한 화면을 같이 보고, 16:9 직사각형 미로를 화면 가득 크게 그립니다.
// 미로는 '정원 생울타리 미로'로 그립니다: 흙길 바닥 + 그림자와 옆면이 있는 입체 생울타리 벽. (v10)
// 벽·바닥은 미리 그려 둔 그림을 찍고, 캐릭터·아이템·이펙트는 매 프레임 그립니다.
// 보물·상자·아이템·함정 그림은 3D 아이콘(Microsoft Fluent Emoji, MIT)입니다.

import { ITEMS, ITEM_RULES, LOOP, MATCH, MOVE, PLAYERS, VFX, VISION } from '../config.js';
import { characterAnimation } from './character-animation.js';
import { loadGardenAssets, texturePattern } from './garden.js';
import { DIRS } from '../game/dir.js';
import { shortestPath } from '../game/maze.js';
import { TRAP } from '../game/placement.js';
import { playerRenderPosition } from '../game/player.js';
import { trailBrightness, visionRadius } from '../game/vision.js';
import { clearSpriteCache, getCharacterSprite, getIconSprite } from './characters.js';

const COLORS = {
  sideTints: ['#f7dfe4', '#d9e9f5'],
  frameShadow: 'rgba(40, 70, 40, 0.28)',
  // 흙길 바닥
  floor: '#f1e2c2',
  floorShade: 'rgba(160, 120, 70, 0.10)',
  floorLight: 'rgba(255, 252, 240, 0.35)',
  pebble: 'rgba(150, 115, 80, 0.30)',
  grass: 'rgba(96, 156, 74, 0.40)',
  // 생울타리 벽
  hedgeTop: '#6fbf63',
  hedgeLight: 'rgba(196, 238, 160, 0.75)',
  hedgeSide: '#3e8448',
  hedgeShadow: 'rgba(40, 60, 30, 0.38)',
  leafDark: 'rgba(36, 104, 50, 0.55)',
  leafLight: 'rgba(214, 250, 176, 0.55)',
  // 그 밖
  treasurePad: ['#fff1b8', '#f2c14e'],
  ice: ['#e4f7ff', '#b8e6fb'],
  iceShine: 'rgba(255, 255, 255, 0.9)',
  fogRgb: [24, 30, 50],
  glow: '255, 204, 80',
  shadow: 'rgba(40, 40, 30, 0.28)',
  wall: '#3e5b46',
  ink: '#4a3b5c',
  white: '#ffffff',
};
const BUBBLE_TONES = { warn: '#f0a020', near: '#ffc43d', web: '#9a8fb0', portal: '#9b8cff', ice: '#6fc3f0' };
const CONFETTI_COLORS = ['#ff6b81', '#3fa7f5', '#ffc43d', '#7ed957', '#b48cff', '#ffffff'];
const UI_FONT = '"Jua", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const MIN_PLAYER_RADIUS = 11; // px. 어려움 난이도를 작은 화면에서 해도 캐릭터가 보이도록
const CHARACTER_SCALE = 2.75; // 캐릭터 그림 크기 = 기준 반지름 × 이 값 (발밑 고리 위에 서 있는 크기)

/**
 * 창 크기와 미로 크기(칸 수)로 화면 배치를 계산합니다. (v8)
 * 위쪽 정보 표시줄 없이 미로를 화면 가득 채웁니다. 아이템 칸은 캐릭터 발밑에 그리고, 시간은 결과 화면에만 보여 줍니다.
 */
export function computeLayout(width, height, mazeWidth, mazeHeight) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const margin = Math.round(clamp(Math.min(width, height) * 0.015, 8, 18));
  const availW = Math.max(0, width - margin * 2);
  const availH = Math.max(0, height - margin * 2);
  const cell = Math.max(4, Math.floor(Math.min(availW / mazeWidth, availH / mazeHeight)));
  const mazePxW = cell * mazeWidth;
  const mazePxH = cell * mazeHeight;
  return {
    width,
    height,
    cell,
    maze: {
      x: Math.round((width - mazePxW) / 2),
      y: Math.round((height - mazePxH) / 2),
      width: mazePxW,
      height: mazePxH,
      cell,
    },
  };
}

export function createRenderer(canvas, { debug = false } = {}) {
  const ctx = canvas.getContext('2d');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let dpr = 1;
  let layout = null;
  let maze = null;
  let traps = null;
  let trapCells = [];
  let mazeImage = null;
  let fogLayer = null;
  let confetti = [];
  let series = null; // 3판 2선승 점수 (카운트다운 때 보여 줌)
  const slotPops = [[null, null], [null, null]]; // 아이템 칸에 새 아이템이 들어온 시각 (튀어나오는 연출)

  const garden = loadGardenAssets(() => { if (layout) relayout(); });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { innerWidth: w, innerHeight: h } = window;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    clearSpriteCache();
    relayout();
  }

  function relayout() {
    layout = computeLayout(window.innerWidth, window.innerHeight, maze?.width ?? 33, maze?.height ?? 19);
    mazeImage = maze ? buildMazeImage(maze, traps, layout.cell, dpr, garden) : null;
  }

  function setMaze(nextMaze, nextTraps = null) {
    maze = nextMaze;
    traps = nextTraps;
    trapCells = [];
    if (maze && traps) {
      for (let i = 0; i < traps.kind.length; i++) {
        const kind = traps.kind[i];
        if (kind === TRAP.WEB || kind === TRAP.PORTAL) {
          trapCells.push({ x: i % maze.width, y: Math.floor(i / maze.width), kind });
        }
      }
    }
    confetti = [];
    relayout();
  }

  function render(match, alpha, now, vfx, frameDt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, layout.width, 0);
    bg.addColorStop(0, COLORS.sideTints[0]);
    bg.addColorStop(1, COLORS.sideTints[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, layout.width, layout.height);
    if (garden.backdrop) {
      const image = garden.backdrop;
      const scale = Math.max(layout.width / image.width, layout.height / image.height);
      const w = image.width * scale, h = image.height * scale;
      ctx.drawImage(image, (layout.width - w) / 2, (layout.height - h) / 2, w, h);
      if (match) {
        ctx.fillStyle = 'rgba(33, 56, 43, 0.24)';
        ctx.fillRect(0, 0, layout.width, layout.height);
      }
    }
    if (match && mazeImage) {
      const extraTime = match.phase === 'playing' ? alpha * LOOP.step : 0;
      drawScene(match, extraTime, now, vfx);
      drawProjectiles(match, extraTime);
    } else if (maze && mazeImage && !garden.backdrop) {
      drawBackdrop(now);
    }
    updateConfetti(frameDt);
    drawConfetti();
  }

  // 메뉴 화면 뒤에 깔리는 장식용 미로 (main.js가 setMaze로 넘겨 줌)
  function drawBackdrop(now) {
    const m = layout.maze;
    ctx.fillStyle = COLORS.frameShadow;
    ctx.beginPath();
    ctx.roundRect(m.x - 4, m.y + 3, m.width + 8, m.height + 8, m.cell * 0.4);
    ctx.fill();
    ctx.drawImage(mazeImage.canvas, m.x - mazeImage.pad, m.y - mazeImage.pad, mazeImage.cssWidth, mazeImage.cssHeight);
    drawTraps(m.cell, now);
    drawTreasure(toPx(maze.treasure.x, maze.treasure.y), m.cell, now, { phase: 'menu', near: [false, false] });
  }

  function toPx(x, y) {
    const m = layout.maze;
    return { x: m.x + (x + 0.5) * m.cell, y: m.y + (y + 0.5) * m.cell };
  }

  function drawScene(match, extraTime, now, vfx) {
    const m = layout.maze;
    const { cell } = m;

    ctx.fillStyle = COLORS.frameShadow;
    ctx.beginPath();
    ctx.roundRect(m.x - 4, m.y + 3, m.width + 8, m.height + 8, cell * 0.4);
    ctx.fill();
    ctx.drawImage(mazeImage.canvas, m.x - mazeImage.pad, m.y - mazeImage.pad, mazeImage.cssWidth, mazeImage.cssHeight);

    drawTraps(cell, now);
    drawBoxes(match, cell, now);
    if (debug) drawDebugPaths(match, cell);
    drawFog(match, extraTime);
    drawDarkClouds(match, cell, extraTime);
    drawFlashlights(match, cell, extraTime);
    drawTreasure(toPx(match.maze.treasure.x, match.maze.treasure.y), cell, now, match);
    for (const player of match.players) drawPlayer(player, cell, extraTime, now, match.time + extraTime);
    for (const player of match.players) drawItemSlots(player, cell, extraTime, now);
    if (vfx) {
      drawParticles(vfx, cell);
      drawBubbles(vfx, match, cell, extraTime);
    }
    drawCountdown(match, m);
  }

  // ── 캐릭터 발밑의 아이템 칸 2개 (v8: 위쪽 표시줄 대신) ──
  function slotPositions(player, cell, extraTime) {
    const p = toPxOf(player, extraTime);
    const r = Math.max(cell * 0.44, MIN_PLAYER_RADIUS);
    const size = Math.max(cell * 0.56, 22);
    const gap = size * 0.16;
    let y = p.y + r + size * 0.62;
    // 화면 아래 끝이라 칸이 잘리면 캐릭터 머리 위(1P/2P 배지 위)로 올립니다.
    if (y + size / 2 > layout.height - 2) y = p.y - r * 2.25 - size * 0.9;
    return [-1, 1].map((side) => ({ x: p.x + (side * (size + gap)) / 2, y, size }));
  }

  function drawItemSlots(player, cell, extraTime, now) {
    const config = PLAYERS[player.index];
    const slots = slotPositions(player, cell, extraTime);
    player.bag.forEach((item, s) => {
      const { x, y, size } = slots[s];
      // 새 아이템이 들어오면 톡 튀어나오는 연출
      const pop = slotPops[player.index];
      if (pop[s]?.item !== item) pop[s] = { item, at: now };
      const t = item ? Math.min(1, (now - pop[s].at) / 0.3) : 1;
      const scale = 0.6 + 0.4 * (1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2);

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = item ? 0.96 : 0.45;
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.25);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, size * 0.09);
      ctx.strokeStyle = config.color;
      if (!item) ctx.setLineDash([size * 0.16, size * 0.12]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (item) drawSprite(getIconSprite(item, size * 0.8, dpr), 0, 0);

      // 사용 키 (1P: Q·E, 2P: 1·2)
      const label = s === 0 ? config.keyLabels.item1 : config.keyLabels.item2;
      const fontSize = Math.max(9, size * 0.36);
      ctx.font = `${fontSize}px ${UI_FONT}`;
      const w = ctx.measureText(label).width + fontSize * 0.55;
      const h = fontSize * 1.15;
      ctx.globalAlpha = item ? 1 : 0.6;
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.roundRect(size / 2 - w * 0.7, size / 2 - h * 0.6, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, size / 2 - w * 0.2, size / 2 - h * 0.6 + h / 2 + fontSize * 0.05);
      ctx.restore();
    });
  }

  function setSeries(nextSeries) {
    series = nextSeries;
  }

  function drawSprite(sprite, x, y, scale = 1, opacity = 1) {
    const s = (sprite.width / dpr) * scale;
    ctx.globalAlpha = opacity;
    ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }

  function drawTraps(cell, now) {
    const web = getIconSprite('web', cell * 0.82, dpr);
    const portal = getIconSprite('portal', cell * 0.8, dpr);
    for (const t of trapCells) {
      const p = toPx(t.x, t.y);
      if (t.kind === TRAP.WEB) {
        drawSprite(web, p.x, p.y, 1, 0.9);
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(now * 2.5);
        drawSprite(portal, 0, 0);
        ctx.restore();
      }
    }
  }

  function drawBoxes(match, cell, now) {
    const sprite = getIconSprite('box', cell * 0.74, dpr);
    for (const box of match.boxes) {
      const p = toPx(box.x, box.y);
      if (box.active) {
        ctx.fillStyle = COLORS.shadow;
        ellipse(p.x, p.y + cell * 0.3, cell * 0.24, cell * 0.07);
        drawSprite(sprite, p.x, p.y + Math.sin(now * 3 + box.x + box.y) * cell * 0.05);
      } else {
        // 다시 생기기까지 남은 시간
        const progress = 1 - box.respawnIn / ITEM_RULES.boxRespawn;
        ctx.strokeStyle = 'rgba(107, 91, 149, 0.35)';
        ctx.lineWidth = Math.max(2, cell * 0.07);
        ctx.beginPath();
        ctx.arc(p.x, p.y, cell * 0.24, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // 안개: 두 캐릭터 주변만 보이고, 지나온 길은 몇 초에 걸쳐 서서히 어두워집니다.
  // (화면을 같이 보므로 두 사람의 시야와 지나온 길을 합쳐서 보여 줌)
  // 칸 하나 = 픽셀 하나인 작은 그림에 안개 진하기를 칠한 뒤 미로 크기로 늘려 덮습니다.
  // (칸마다 사각형을 그리는 것보다 훨씬 가볍고, 늘릴 때 경계가 부드럽게 번집니다)
  function drawFog(match, extraTime) {
    if (!match.fog) return;
    const { width, height } = match.maze;
    if (!fogLayer || fogLayer.width !== width || fogLayer.height !== height) {
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = width;
      layerCanvas.height = height;
      const g = layerCanvas.getContext('2d');
      fogLayer = { width, height, canvas: layerCanvas, g, image: g.createImageData(width, height) };
    }
    const viewers = match.players.map((p) => ({
      pos: playerRenderPosition(p, extraTime),
      radius: visionRadius(p.effects, match.vision),
      seenAt: p.seenAt,
      dark: p.effects.dark > 0, // 먹구름에 걸리면 내가 지나온 길도 안 보임
    }));
    const now = match.time + extraTime;
    const { data } = fogLayer.image;
    const [r, g, b] = COLORS.fogRgb;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let visible = 0;
        for (const v of viewers) {
          visible = Math.max(visible, Math.min(1, v.radius + 0.5 - Math.hypot(x - v.pos.x, y - v.pos.y)));
          if (!v.dark) visible = Math.max(visible, trailBrightness(v.seenAt[i], now, match.vision));
        }
        const k = i * 4;
        data[k] = r;
        data[k + 1] = g;
        data[k + 2] = b;
        data[k + 3] = Math.round(255 * (1 - Math.max(0, visible)));
      }
    }
    fogLayer.g.putImageData(fogLayer.image, 0, 0);
    const m = layout.maze;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fogLayer.canvas, m.x, m.y, m.width, m.height);
  }

  // 깜깜 먹구름: 당한 캐릭터 주변을 먹구름이 따라다니며 가립니다. (안개를 꺼도 동작)
  function drawDarkClouds(match, cell, extraTime) {
    if (!match.players.some((p) => p.effects.dark > 0)) return;
    const [r, g, b] = COLORS.fogRgb;
    const m = layout.maze;
    ctx.save();
    ctx.beginPath();
    ctx.rect(m.x, m.y, m.width, m.height); // 구름은 미로 안에만
    ctx.clip();
    for (const player of match.players) {
      const left = player.effects.dark;
      if (left <= 0) continue;
      const fade = Math.min(1, left / 0.4, (ITEMS.dark.duration - left) / 0.25);
      const pos = playerRenderPosition(player, extraTime);
      const p = toPx(pos.x, pos.y);
      // 가운데(자기 칸)는 뚫려 있고 그 바깥을 구름이 둘러쌈 → 상대 시야가 자기 칸만큼으로 좁아짐
      const radius = cell * VISION.darkCloudRadius;
      const hole = cell * VISION.darkRadius * 0.55;
      const cloud = ctx.createRadialGradient(p.x, p.y, hole, p.x, p.y, radius);
      cloud.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      cloud.addColorStop(0.18, `rgba(${r}, ${g}, ${b}, ${0.96 * fade})`);
      cloud.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, ${0.9 * fade})`);
      cloud.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 손전등: 켠 캐릭터 주변을 따뜻한 빛으로 비춥니다. (시야가 넓어지는 건 drawFog가 처리)
  function drawFlashlights(match, cell, extraTime) {
    for (const player of match.players) {
      const left = player.effects.flashlight;
      if (left <= 0 || player.effects.dark > 0) continue;
      const fade = Math.min(1, left / 0.5, (ITEMS.flashlight.duration - left) / 0.3);
      const p = toPxOf(player, extraTime);
      const radius = cell * (VISION.flashlightRadius + 0.5);
      const light = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      light.addColorStop(0, `rgba(255, 226, 130, ${0.28 * fade})`);
      light.addColorStop(1, 'rgba(255, 226, 130, 0)');
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTreasure(p, cell, now, match) {
    const excited = match.phase === 'playing' && match.near.some(Boolean);
    const pulse = 1 + Math.sin(now * (excited ? 9 : 4)) * (excited ? 0.12 : 0.06);
    const glowR = cell * (excited ? 1.5 : 0.95) * pulse;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
    glow.addColorStop(0, `rgba(${COLORS.glow}, 0.75)`);
    glow.addColorStop(1, `rgba(${COLORS.glow}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    // 보석이 받침 위에서 둥실둥실 떠 있고, 별빛이 반짝임
    ctx.fillStyle = 'rgba(120, 80, 20, 0.25)';
    ellipse(p.x, p.y + cell * 0.3, cell * 0.28, cell * 0.08);
    const bob = Math.sin(now * 2.2) * cell * 0.05;
    drawSprite(getIconSprite('treasure', cell * 0.86, dpr), p.x, p.y - cell * 0.06 + bob, pulse);
    for (let k = 0; k < 2; k++) {
      const a = now * 1.6 + k * Math.PI;
      const twinkle = 0.5 + 0.5 * Math.sin(now * 5 + k * 2);
      drawTwinkle(p.x + Math.cos(a) * cell * 0.42, p.y - cell * 0.12 + Math.sin(a) * cell * 0.22, cell * 0.12 * twinkle);
    }
  }

  // 네 갈래 별빛
  function drawTwinkle(x, y, s) {
    if (s <= 0.5) return;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }

  function drawPlayer(player, cell, extraTime, now, animationTime) {
    const config = PLAYERS[player.index];
    const fx = player.effects;
    const pos = playerRenderPosition(player, extraTime);
    let { x, y } = toPx(pos.x, pos.y);

    // 벽에 부딪히면 그 방향으로 살짝 튕김
    if (player.bump) {
      const t = 1 - player.bump.timeLeft / MOVE.bumpTime;
      const d = DIRS[player.bump.dir];
      const k = Math.sin(t * Math.PI) * cell * 0.14;
      x += d.dx * k;
      y += d.dy * k;
    }
    // 빙글빙글: 어질어질 좌우로 흔들림 (처음엔 크게)
    if (fx.reverse > 0) {
      const elapsed = ITEMS.reverse.duration - fx.reverse;
      const amp = elapsed < VFX.wobbleStrongTime ? VFX.wobbleStrong : VFX.wobbleWeak;
      x += Math.sin(now * 38) * amp * cell;
    }
    const stepT = player.moveTimer > 0 ? 1 - Math.max(0, player.moveTimer - extraTime) / player.moveDuration : 0;
    const pose = characterAnimation(player, animationTime, extraTime, { reducedMotion: motionPreference.matches });
    const hop = pose.walking ? Math.sin(stepT * Math.PI) * cell * 0.06 : 0;
    const r = Math.max(cell * 0.44, MIN_PLAYER_RADIUS);
    const top = y - hop;

    const ringY = y + r * 0.55;
    if (fx.slowDown > 0) {
      ctx.fillStyle = 'rgba(150, 220, 110, 0.6)';
      ellipse(x, ringY, r * 1.2, r * 0.45);
    }
    ctx.fillStyle = COLORS.shadow;
    ellipse(x, ringY + r * 0.06, r * 0.8, r * 0.26);

    if (fx.speedUp > 0 && player.moveTimer > 0) {
      const d = DIRS[player.facing];
      ctx.strokeStyle = 'rgba(255, 200, 40, 0.9)';
      ctx.lineWidth = Math.max(2, cell * 0.07);
      ctx.lineCap = 'round';
      for (const k of [-0.5, 0, 0.5]) {
        const ox = -d.dy * k * r;
        const oy = d.dx * k * r;
        ctx.beginPath();
        ctx.moveTo(x - d.dx * r * 1.15 + ox, top - d.dy * r * 1.15 + oy);
        ctx.lineTo(x - d.dx * r * (1.9 - Math.abs(k) * 0.5) + ox, top - d.dy * r * (1.9 - Math.abs(k) * 0.5) + oy);
        ctx.stroke();
      }
    }

    // 발밑에 1P/2P 색 고리를 깔고 캐릭터가 그 위에 서 있게 그립니다. 얼음 보호 중에는 반짝반짝
    const blink = fx.freezeImmune > 0 ? 0.7 + 0.3 * Math.sin(now * 25) : 1;
    ctx.globalAlpha = 0.55 * blink;
    ctx.fillStyle = config.soft;
    ellipse(x, ringY, r * 0.95, r * 0.36);
    ctx.globalAlpha = blink;
    ctx.lineWidth = Math.max(2, cell * 0.07);
    ctx.strokeStyle = config.color;
    ctx.beginPath();
    ctx.ellipse(x, ringY, r * 0.95, r * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    const sprite = getCharacterSprite(player.character, r * CHARACTER_SCALE, dpr, pose.frame);
    if (sprite) {
      ctx.save();
      ctx.translate(x, top - r * 0.35);
      ctx.scale(pose.flip ? -1 : 1, 1);
      drawSprite(sprite, 0, 0, 1, blink);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (fx.slowDown > 0) drawSprite(getIconSprite('slowDown', r * 0.95, dpr), x + r * 0.95, ringY - r * 0.1);
    if (fx.freeze > 0) drawIceBlock(x, top - r * 0.3, r * 1.1, fx.freeze);
    if (player.stuck > 0) drawSprite(getIconSprite('web', r * 2.3, dpr), x, top - r * 0.25, 1, 0.9);

    let badgeLift = 0;
    if (fx.reverse > 0) {
      ctx.save();
      ctx.translate(x, top - r * 1.75);
      ctx.rotate(now * 4);
      drawSprite(getIconSprite('dizzy', r * 1.05, dpr), 0, 0);
      ctx.restore();
      badgeLift = r * 0.75;
    }
    if (fx.dark > 0) {
      drawSprite(getIconSprite('dark', r * 1.05, dpr), x + Math.sin(now * 2) * r * 0.2, top - r * 1.75);
      badgeLift = r * 0.85;
    }
    drawBadge(config.label, x, top - r * 1.72 - badgeLift, config.color, cell);
  }

  function drawIceBlock(x, y, r, remaining) {
    const s = r * 2.3;
    ctx.fillStyle = 'rgba(190, 232, 255, 0.62)';
    ctx.beginPath();
    ctx.roundRect(x - s / 2, y - s / 2, s, s, s * 0.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.32, y - s * 0.12);
    ctx.lineTo(x - s * 0.12, y - s * 0.32);
    ctx.stroke();
    // 풀릴 때가 다가오면 금이 감
    ctx.strokeStyle = 'rgba(70, 130, 190, 0.85)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    if (remaining < 2) zigzag([[x + s * 0.1, y - s / 2], [x - s * 0.05, y - s * 0.15], [x + s * 0.12, y + s * 0.05], [x - s * 0.02, y + s * 0.3]]);
    if (remaining < 1) zigzag([[x - s / 2, y + s * 0.1], [x - s * 0.2, y + s * 0.02], [x + s * 0.02, y + s * 0.22], [x + s * 0.35, y + s * 0.12]]);
  }

  function zigzag(points) {
    ctx.beginPath();
    points.forEach(([px, py], k) => (k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.stroke();
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBadge(label, x, bottom, color, cell) {
    const fontSize = Math.min(22, Math.max(10, cell * 0.34));
    ctx.font = `${fontSize}px ${UI_FONT}`;
    const w = ctx.measureText(label).width + fontSize * 0.7;
    const h = fontSize * 1.15;
    const top = Math.max(2, bottom - h * 0.75); // 맨 윗줄이어도 화면 밖으로 잘리지 않게
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, top, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, top + h / 2 + fontSize * 0.05);
  }

  function drawParticles(vfx, cell) {
    for (const p of vfx.particles) {
      const pos = toPx(p.x, p.y);
      const s = Math.max(2, p.size * cell);
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      if (p.shape === 'shard') {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(p.spin + p.life * 8);
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBubbles(vfx, match, cell, extraTime) {
    for (const b of vfx.bubbles) {
      const player = match.players[b.player];
      const pos = playerRenderPosition(player, extraTime);
      const p = toPx(pos.x, pos.y);
      const t = 1 - b.life / b.maxLife;
      const scale = t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1;
      const fontSize = Math.min(26, Math.max(13, cell * 0.42)) * scale;
      const r = Math.max(cell * 0.44, MIN_PLAYER_RADIUS);
      ctx.font = `${fontSize}px ${UI_FONT}`;
      const iconSize = b.icon ? fontSize * 1.35 : 0;
      const textW = ctx.measureText(b.text).width;
      const w = textW + fontSize * 1.1 + (b.icon ? iconSize + fontSize * 0.2 : 0);
      const h = fontSize * 1.7;
      const cx = p.x;
      let cy = p.y - r * 1.8 - h * 0.5 - fontSize * 1.4 - t * cell * 0.25;
      // 미로 맨 윗줄 근처라 화면 위로 잘리면 캐릭터 아래(아이템 칸 아래)에 띄웁니다.
      if (cy - h / 2 < 2) cy = p.y + r + Math.max(cell * 0.56, 22) * 1.35 + h * 0.6 + t * cell * 0.25;
      ctx.globalAlpha = b.life < 0.25 ? b.life / 0.25 : 1;
      ctx.save();
      ctx.shadowColor = 'rgba(40, 30, 60, 0.25)';
      ctx.shadowBlur = fontSize * 0.5;
      ctx.shadowOffsetY = fontSize * 0.15;
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = BUBBLE_TONES[b.tone] ?? PLAYERS[b.player].color;
      ctx.lineWidth = Math.max(2, fontSize * 0.13);
      ctx.stroke();
      const textX = cx + (b.icon ? (iconSize + fontSize * 0.2) / 2 : 0);
      if (b.icon) drawSprite(getIconSprite(b.icon, iconSize, dpr), textX - textW / 2 - fontSize * 0.2 - iconSize / 2, cy, 1, ctx.globalAlpha);
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, textX, cy + fontSize * 0.06);
      ctx.globalAlpha = 1;
    }
  }

  function drawCountdown(match, m) {
    let text = null;
    let scale = 1;
    let opacity = 1;
    const counting = match.phase === 'countdown' || match.pausedFrom === 'countdown';
    if (counting) {
      const left = match.countdownLeft;
      const shown = Math.max(1, Math.ceil(left));
      const sinceTick = shown - left; // 숫자가 바뀐 뒤 흐른 시간 (0 → 1)
      text = String(shown);
      scale = 1 + 0.4 * (1 - sinceTick) ** 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(m.x, m.y, m.width, m.height);
      drawRoundInfo(m, match);
    } else if (match.phase === 'playing' && match.time < MATCH.goDisplayTime) {
      const t = match.time / MATCH.goDisplayTime;
      text = 'GO!';
      scale = 1 + t * 0.5;
      opacity = 1 - t;
    }
    if (!text) return;

    const fontSize = Math.min(260, m.height * 0.32) * scale;
    const cx = m.x + m.width / 2;
    const cy = m.y + m.height / 2;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = fontSize * 0.12;
    ctx.strokeStyle = COLORS.wall;
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = COLORS.white;
    ctx.fillText(text, cx, cy);
    ctx.restore();
  }

  // 카운트다운 동안 이번 판 정보를 보여 줍니다. (예: 1P 1 : 0 2P · 2판째 · 미로 17번)
  function drawRoundInfo(m, match) {
    const parts = [];
    if (series && series.bestOf > 1) {
      parts.push(
        { text: PLAYERS[0].label, color: PLAYERS[0].color },
        { text: `  ${series.wins[0]} : ${series.wins[1]}  `, color: COLORS.ink },
        { text: PLAYERS[1].label, color: PLAYERS[1].color },
        { text: `  ·  ${series.round}판째`, color: COLORS.ink },
      );
    }
    if (match.mazeNumber) parts.push({ text: `${parts.length ? '  ·  ' : ''}미로 ${match.mazeNumber}번`, color: COLORS.ink });
    if (parts.length === 0) return;
    const fontSize = Math.min(44, Math.max(18, m.height * 0.045));
    ctx.save();
    ctx.font = `${fontSize}px ${UI_FONT}`;
    ctx.textBaseline = 'middle';
    const widths = parts.map((p) => ctx.measureText(p.text).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const cy = m.y + m.height * 0.2;
    const padX = fontSize * 0.9;
    const h = fontSize * 1.7;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(m.x + m.width / 2 - total / 2 - padX, cy - h / 2, total + padX * 2, h, h / 2);
    ctx.fill();
    let x = m.x + m.width / 2 - total / 2;
    ctx.textAlign = 'left';
    parts.forEach((p, i) => {
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, x, cy + fontSize * 0.05);
      x += widths[i];
    });
    ctx.restore();
  }

  function drawDebugPaths(match, cell) {
    ctx.save();
    ctx.lineWidth = Math.max(2, cell * 0.12);
    ctx.setLineDash([cell * 0.2, cell * 0.2]);
    ctx.globalAlpha = 0.6;
    for (const player of match.players) {
      const path = shortestPath(match.maze, player);
      ctx.strokeStyle = PLAYERS[player.index].color;
      ctx.beginPath();
      path.forEach((c, k) => {
        const p = toPx(c.x, c.y);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  // 아이템이 내 캐릭터 발밑의 아이템 칸에서 튀어나와 포물선을 그리며 상대 캐릭터에게 날아감
  function drawProjectiles(match, extraTime) {
    const size = Math.max(26, layout.cell * 0.8);
    for (const shot of match.projectiles) {
      const from = match.players[shot.from];
      const target = match.players[shot.to];
      const start = slotPositions(from, layout.cell, extraTime)[shot.slot];
      const end = toPxOf(target, extraTime);
      const ctrl = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - layout.height * 0.15 };
      const sprite = getIconSprite(shot.item, size, dpr);
      const t = Math.min(1, (shot.t + extraTime) / shot.duration);
      for (let k = 3; k >= 0; k--) {
        const tt = Math.max(0, t - k * 0.07);
        const u = 1 - tt;
        const x = u * u * start.x + 2 * u * tt * ctrl.x + tt * tt * end.x;
        const y = u * u * start.y + 2 * u * tt * ctrl.y + tt * tt * end.y;
        if (k === 0) {
          // 어두운 안개 위에서도 잘 보이도록 하얀 빛을 깔아 줌
          const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 0.75);
          glow.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
        drawSprite(sprite, x, y, 1 - k * 0.18, k === 0 ? 1 : 0.22);
      }
    }
  }

  function toPxOf(player, extraTime) {
    const pos = playerRenderPosition(player, extraTime);
    return toPx(pos.x, pos.y);
  }

  /** 승리 꽃가루. 이긴 사람 쪽(1P 왼쪽, 2P 오른쪽)에 더 많이 뿌립니다. 무승부면 고르게 */
  function celebrate(winner) {
    for (let i = 0; i < 220; i++) {
      let x = Math.random() * layout.width;
      if (winner !== null && i % 3 !== 0) x = (winner === 0 ? 0 : layout.width / 2) + Math.random() * (layout.width / 2);
      confetti.push({
        x,
        y: -20 - Math.random() * layout.height * 0.6,
        vx: (Math.random() - 0.5) * 140,
        vy: 140 + Math.random() * 200,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 12,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 8 + Math.random() * 7,
        h: 5 + Math.random() * 4,
      });
    }
  }

  function updateConfetti(dt = 0) {
    if (confetti.length === 0) return;
    for (const c of confetti) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
    }
    confetti = confetti.filter((c) => c.y < layout.height + 40);
  }

  function drawConfetti() {
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
  }

  window.addEventListener('resize', resize);
  resize();
  return { setMaze, setSeries, render, celebrate };
}

/** 칸 번호 등으로 정해지는 0~1 사이 값 (매번 같은 무늬가 나오도록) */
function hash(n) {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * 벽·바닥·얼음 바닥을 한 번 그려 둡니다. (v10: 정원 생울타리 미로)
 * - 바닥: 따뜻한 흙길. 칸마다 밝기가 조금씩 다르고 자갈·풀이 드문드문
 * - 벽: 생울타리. 바닥 그림자 → 아래로 보이는 옆면 → 윗면 → 빛 받는 윗부분 → 잎사귀 무늬 순서로 겹쳐서 입체감
 */
function buildMazeImage(maze, traps, cell, dpr, garden) {
  const { width, height, walls, starts, treasure } = maze;
  const thick = Math.max(4, cell * 0.26); // 생울타리 두께
  const depth = thick * 0.42; // 아래로 보이는 옆면 높이
  const pad = Math.ceil(thick / 2 + depth + thick * 0.6 + 2);
  const cssWidth = width * cell + pad * 2;
  const cssHeight = height * cell + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(cssWidth * dpr);
  canvas.height = Math.ceil(cssHeight * dpr);
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  g.translate(pad, pad);
  const W = width * cell;
  const H = height * cell;

  // ── 바닥: 흙길 ──
  g.fillStyle = texturePattern(g, garden.floor, cell * 5) ?? COLORS.floor;
  g.beginPath();
  g.roundRect(0, 0, W, H, cell * 0.3);
  g.fill();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = hash(i);
      g.fillStyle = v < 0.5 ? COLORS.floorShade : COLORS.floorLight;
      g.globalAlpha = Math.abs(v - 0.5) * 1.6;
      g.fillRect(x * cell, y * cell, cell, cell);
      g.globalAlpha = 1;
      // 자갈
      if (hash(i * 7 + 1) < 0.35) {
        g.fillStyle = COLORS.pebble;
        const px = (x + 0.2 + hash(i * 7 + 2) * 0.6) * cell;
        const py = (y + 0.2 + hash(i * 7 + 3) * 0.6) * cell;
        g.beginPath();
        g.ellipse(px, py, cell * 0.05, cell * 0.035, hash(i * 7 + 4) * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
      // 풀 한 포기
      if (hash(i * 7 + 5) < 0.18) {
        g.strokeStyle = COLORS.grass;
        g.lineWidth = Math.max(1, cell * 0.025);
        g.lineCap = 'round';
        const gx = (x + 0.15 + hash(i * 7 + 6) * 0.7) * cell;
        const gy = (y + 0.75) * cell;
        g.beginPath();
        for (const lean of [-0.6, 0, 0.6]) {
          g.moveTo(gx, gy);
          g.quadraticCurveTo(gx + lean * cell * 0.04, gy - cell * 0.07, gx + lean * cell * 0.08, gy - cell * 0.13);
        }
        g.stroke();
      }
    }
  }

  // 출발점: 1P/2P 색 발판
  starts.forEach((s, i) => {
    const cx = (s.x + 0.5) * cell;
    const cy = (s.y + 0.5) * cell;
    g.fillStyle = PLAYERS[i].soft;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.ellipse(cx, cy + cell * 0.1, cell * 0.38, cell * 0.24, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = PLAYERS[i].color;
    g.lineWidth = Math.max(1.5, cell * 0.04);
    g.setLineDash([cell * 0.08, cell * 0.06]);
    g.stroke();
    g.setLineDash([]);
  });

  // 보물 자리: 금빛 받침
  {
    const cx = (treasure.x + 0.5) * cell;
    const cy = (treasure.y + 0.5) * cell;
    const pad = g.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.45);
    pad.addColorStop(0, COLORS.treasurePad[0]);
    pad.addColorStop(1, COLORS.treasurePad[1]);
    g.fillStyle = pad;
    g.beginPath();
    g.ellipse(cx, cy + cell * 0.12, cell * 0.42, cell * 0.28, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(190, 130, 30, 0.6)';
    g.lineWidth = Math.max(1.5, cell * 0.04);
    g.stroke();
  }

  // 얼음 바닥
  if (traps) {
    for (let i = 0; i < width * height; i++) {
      if (traps.kind[i] !== TRAP.ICE) continue;
      const x = (i % width) * cell;
      const y = Math.floor(i / width) * cell;
      const ice = g.createLinearGradient(x, y, x + cell, y + cell);
      ice.addColorStop(0, COLORS.ice[0]);
      ice.addColorStop(1, COLORS.ice[1]);
      g.fillStyle = ice;
      g.beginPath();
      g.roundRect(x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.12);
      g.fill();
      g.strokeStyle = COLORS.iceShine;
      g.lineWidth = Math.max(1.5, cell * 0.05);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + cell * 0.22, y + cell * 0.5);
      g.lineTo(x + cell * 0.5, y + cell * 0.22);
      g.moveTo(x + cell * 0.5, y + cell * 0.78);
      g.lineTo(x + cell * 0.78, y + cell * 0.5);
      g.stroke();
    }
  }

  // ── 벽: 생울타리 ──
  const segments = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bits = walls[y * width + x];
      const px = x * cell;
      const py = y * cell;
      if (bits & 1) segments.push([px, py, px + cell, py]);
      if (bits & 8) segments.push([px, py, px, py + cell]);
      if (x === width - 1 && bits & 2) segments.push([px + cell, py, px + cell, py + cell]);
      if (y === height - 1 && bits & 4) segments.push([px, py + cell, px + cell, py + cell]);
    }
  }
  const hedge = new Path2D();
  for (const [x1, y1, x2, y2] of segments) {
    hedge.moveTo(x1, y1);
    hedge.lineTo(x2, y2);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const strokeHedge = (color, lineWidth, dx, dy, blur = 0) => {
    g.save();
    if (blur) g.filter = `blur(${blur}px)`;
    g.translate(dx, dy);
    g.strokeStyle = color;
    g.lineWidth = lineWidth;
    g.stroke(hedge);
    g.restore();
  };
  strokeHedge(COLORS.hedgeShadow, thick * 1.05, thick * 0.12, depth + thick * 0.28, thick * 0.35); // 바닥 그림자
  strokeHedge(COLORS.hedgeSide, thick, 0, depth); // 옆면
  strokeHedge(texturePattern(g, garden.hedge, cell * 1.7) ?? COLORS.hedgeTop, thick, 0, 0); // 윗면
  if (!garden.hedge) strokeHedge(COLORS.hedgeLight, thick * 0.42, -thick * 0.06, -thick * 0.14); // 빛 받는 윗부분

  // 잎사귀 무늬
  if (!garden.hedge) {
  let k = 0;
  for (const [x1, y1, x2, y2] of segments) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const leaves = Math.max(2, Math.round(len / (thick * 0.55)));
    for (let j = 0; j < leaves; j++, k++) {
      const t = (j + hash(k * 3 + 11)) / leaves;
      const off = (hash(k * 3 + 12) - 0.5) * thick * 0.6;
      const nx = (y2 - y1) / len;
      const ny = -(x2 - x1) / len;
      const lx = x1 + (x2 - x1) * t + nx * off;
      const ly = y1 + (y2 - y1) * t + ny * off;
      g.fillStyle = hash(k * 3 + 13) < 0.55 ? COLORS.leafDark : COLORS.leafLight;
      g.beginPath();
      g.ellipse(lx, ly, thick * 0.13, thick * 0.09, hash(k) * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }
  }
  return { canvas, cssWidth, cssHeight, pad };
}
