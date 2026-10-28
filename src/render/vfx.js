// 연출 상태: 말풍선과 파티클 (기획서 6.1, 8.6)
// 게임 사건(match.events)을 받아 연출을 만듭니다. 위치는 미로 좌표라서 두 화면 모두에 그려집니다.

import { ITEMS, TRAPS, VFX } from '../config.js';

const SPARKLE = ['#ffd84d', '#fff3a3', '#ffb3c6', '#ffffff'];
const SNOW = ['#e8f7ff', '#bfe6ff', '#ffffff'];
const SHARDS = ['#bfe6ff', '#8fd3ff', '#ffffff'];
const SMOKE = ['#4a3b5c', '#2b2140', '#6b5b95'];
const SWIRL = ['#9b8cff', '#6fd3ff', '#ff9bd2'];

export function createVfx() {
  return { particles: [], bubbles: [] };
}

export function updateVfx(vfx, dt) {
  for (const p of vfx.particles) {
    p.life -= dt;
    p.vy += (p.gravity ?? 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  vfx.particles = vfx.particles.filter((p) => p.life > 0);
  for (const b of vfx.bubbles) b.life -= dt;
  vfx.bubbles = vfx.bubbles.filter((b) => b.life > 0);
}

/** 게임 사건 하나를 연출로 바꿉니다. */
export function handleVfxEvent(vfx, event, match) {
  const at = (i) => match.players[i];
  switch (event.type) {
    case 'pickup':
      bubble(vfx, event.player, '획득!', 'normal', event.item);
      burst(vfx, event.x, event.y, { colors: SPARKLE, count: 12, speed: 3 });
      break;
    case 'bagFull':
      bubble(vfx, event.player, '가방이 가득 찼어요!', 'warn', 'box');
      break;
    case 'effect': {
      const target = at(event.player);
      bubble(vfx, event.player, ITEMS[event.item].shout, event.item, event.item);
      if (event.item === 'freeze') burst(vfx, target.x, target.y, { colors: SNOW, count: 16, speed: 2.5 });
      if (event.item === 'dark') burst(vfx, target.x, target.y, { colors: SMOKE, count: 18, speed: 2, size: 0.22 });
      if (event.item === 'speedUp') burst(vfx, target.x, target.y, { colors: SPARKLE, count: 10, speed: 3 });
      if (event.item === 'flashlight') burst(vfx, target.x, target.y, { colors: ['#fff3a3', '#ffe082', '#ffffff'], count: 16, speed: 3.5 });
      if (event.item === 'slowDown') burst(vfx, target.x, target.y, { colors: ['#9be37a', '#c5a3ff'], count: 10, speed: 1.5, gravity: 4 });
      if (event.item === 'reverse') burst(vfx, target.x, target.y, { colors: SWIRL, count: 12, speed: 2.5 });
      break;
    }
    case 'immune':
      bubble(vfx, event.player, '안 통해!', 'normal', event.item);
      break;
    case 'effectEnd':
      if (event.effect === 'freeze') {
        const p = at(event.player);
        burst(vfx, p.x, p.y, { colors: SHARDS, count: 18, speed: 4, gravity: 9, shape: 'shard' });
      }
      break;
    case 'trap':
      bubble(vfx, event.player, TRAPS[event.trap].shout, event.trap, event.trap);
      if (event.trap === 'ice') burst(vfx, at(event.player).x, at(event.player).y, { colors: SNOW, count: 8, speed: 2 });
      break;
    case 'boxRespawn':
      burst(vfx, event.x, event.y, { colors: SPARKLE, count: 6, speed: 1.5 });
      break;
    case 'school':
      bubble(vfx, event.player, '등교 완료! 이제 하교!', 'near', 'school');
      burst(vfx, event.x, event.y, { colors: SPARKLE, count: 22, speed: 4 });
      break;
    case 'near':
      bubble(vfx, event.player, '집이 코앞이야!', 'near', 'home');
      break;
  }
}

/** icon: 말풍선 앞에 붙일 3D 아이콘 이름 (src/data/icons.js) */
function bubble(vfx, player, text, tone = 'normal', icon = null) {
  // 같은 사람 머리 위의 이전 말풍선은 지우고 새로 띄웁니다.
  vfx.bubbles = vfx.bubbles.filter((b) => b.player !== player);
  vfx.bubbles.push({ player, text, tone, icon, life: VFX.bubbleTime, maxLife: VFX.bubbleTime });
}

function burst(vfx, x, y, { colors, count = 10, speed = 2, gravity = 0, size = 0.12, shape = 'dot' }) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    const life = 0.5 + Math.random() * 0.4;
    vfx.particles.push({
      x: x + (Math.random() - 0.5) * 0.3,
      y: y + (Math.random() - 0.5) * 0.3,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - (gravity ? 2 : 0),
      gravity,
      life,
      maxLife: life,
      color: colors[i % colors.length],
      size: size * (0.6 + Math.random() * 0.8),
      shape,
      spin: Math.random() * Math.PI,
    });
  }
}
