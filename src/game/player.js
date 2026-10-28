// 플레이어 이동: 칸 단위 이동, 누르고 있으면 연속 이동, 선입력, 얼음 바닥 미끄러짐 (기획서 3.1, 8.5)
// 방향은 모두 미로 좌표 기준입니다. 화면 회전은 controls.js에서 미리 바꿔서 넘어옵니다.

import { TRAPS } from '../config.js';
import { DIRS } from './dir.js';
import { createEffects, isFrozen, speedMultiplier } from './effects.js';
import { createBag } from './items.js';
import { canMove } from './maze.js';
import { TRAP, trapAt } from './placement.js';
import { createSeen } from './vision.js';

const EPSILON = 1e-9;

export const EMPTY_COMMAND = Object.freeze({ held: [], pressed: [], items: [] });

export function createPlayer(index, start, character, cellCount = 0) {
  return {
    index,
    character,
    x: start.x,
    y: start.y,
    prevX: start.x,
    prevY: start.y,
    facing: 'down',
    moveTimer: 0, // 다음 칸 도착까지 남은 시간 (0 이하이면 멈춰 있음)
    moveDuration: 1, // 지금 이동 한 칸에 걸리는 시간
    settled: true, // 도착한 칸의 처리(아이템·함정·보물)를 마쳤는지
    finished: false, // 보물에 도착했는지
    buffer: null, // 선입력 { dir, time }
    bump: null, // 벽에 부딪힌 연출 { dir, timeLeft }
    slideDir: null, // 얼음 위에서 미끄러지는 방향
    stuck: 0, // 거미줄에 묶인 남은 시간
    effects: createEffects(),
    bag: createBag(),
    seenAt: createSeen(cellCount), // 칸마다 마지막으로 본 시각 (지나온 길이 서서히 어두워지게)
    lastBagFullNotice: -Infinity,
    stats: { moves: 0, itemsPicked: 0, itemsUsed: 0, itemsHit: 0, trapsHit: 0 },
  };
}

/**
 * 플레이어를 한 업데이트만큼 진행합니다.
 * world: { maze, traps, move(MOVE 설정), onArrive(player) — 새 칸에 도착했을 때 호출 }
 * command: { held: 누르고 있는 방향(최근에 누른 것부터), pressed: 이번에 새로 누른 방향 }
 * 반환: 'moving' | 'moved' | 'idle' | 'held'(얼음·거미줄로 못 움직임) | 'finished'(보물 도착)
 */
export function stepPlayer(player, world, command, dt, time) {
  const { maze, move } = world;
  if (player.bump) {
    player.bump.timeLeft -= dt;
    if (player.bump.timeLeft <= 0) player.bump = null;
  }
  if (player.stuck > 0) player.stuck = Math.max(0, player.stuck - dt);
  for (const dir of command.pressed) player.buffer = { dir, time };

  if (player.moveTimer > 0) {
    player.moveTimer -= dt;
    if (player.moveTimer > EPSILON) return 'moving';
  }
  if (!player.settled) {
    player.settled = true;
    world.onArrive?.(player);
  }
  if (player.finished) return 'finished';

  if (isFrozen(player.effects) || player.stuck > 0) {
    player.moveTimer = 0;
    player.prevX = player.x;
    player.prevY = player.y;
    return 'held';
  }

  // 선입력이 살아 있으면 먼저 시도하고, 막혀 있으면 누르고 있는 방향으로 계속 갑니다.
  // 선입력은 지우지 않고 남겨 두었다가 갈림길에 닿는 순간 꺾습니다.
  if (player.buffer && time - player.buffer.time > move.bufferTime + EPSILON) player.buffer = null;
  let candidates = player.buffer ? [player.buffer.dir] : [];
  for (const dir of command.held) if (!candidates.includes(dir)) candidates.push(dir);

  // 얼음 위에서는 멈추거나 뒤로 돌 수 없고 같은 방향으로 계속 미끄러집니다.
  // 갈림길에서 옆으로 꺾는 것만 됩니다. (그래서 얼음이 길을 막아 버리는 일은 없습니다)
  // 벽에 막히면 그때 다시 마음대로 움직일 수 있습니다.
  const sliding = player.slideDir && canMove(maze, player.x, player.y, player.slideDir);
  if (sliding) {
    const along = DIRS[player.slideDir];
    const isTurn = (d) => DIRS[d].dx * along.dx + DIRS[d].dy * along.dy === 0;
    const turn = candidates.find((d) => isTurn(d) && canMove(maze, player.x, player.y, d));
    candidates = [turn ?? player.slideDir];
  } else {
    player.slideDir = null;
  }

  const dir = candidates.find((d) => canMove(maze, player.x, player.y, d));
  if (dir) {
    const slide = sliding ? TRAPS.ice.slideSpeed : 1;
    const interval = 1 / (move.cellsPerSecond * speedMultiplier(player.effects) * slide);
    player.prevX = player.x;
    player.prevY = player.y;
    player.x += DIRS[dir].dx;
    player.y += DIRS[dir].dy;
    // 남은 자투리 시간을 이어 받아서 속도가 프레임에 따라 흔들리지 않게 합니다.
    player.moveTimer = Math.min(0, player.moveTimer) + interval;
    player.moveDuration = interval;
    player.facing = dir;
    player.settled = false;
    player.slideDir = trapAt(world.traps, maze.width, player.x, player.y) === TRAP.ICE ? dir : null;
    if (player.buffer?.dir === dir) player.buffer = null;
    player.stats.moves += 1;
    return 'moved';
  }

  player.moveTimer = 0;
  player.prevX = player.x;
  player.prevY = player.y;
  if (command.pressed.length > 0) {
    player.bump = { dir: command.pressed[command.pressed.length - 1], timeLeft: move.bumpTime };
  }
  return 'idle';
}

/** 순간이동: 칸 사이를 이어 그리지 않고 바로 옮깁니다. */
export function teleportPlayer(player, x, y) {
  player.x = player.prevX = x;
  player.y = player.prevY = y;
  player.moveTimer = 0;
  player.slideDir = null;
}

/** 화면에 그릴 위치 (칸 사이를 부드럽게 이어 줍니다). extraTime은 마지막 업데이트 뒤로 흐른 시간 */
export function playerRenderPosition(player, extraTime = 0) {
  if (player.moveTimer <= 0) return { x: player.x, y: player.y };
  const left = Math.max(0, player.moveTimer - extraTime);
  const t = Math.min(1, Math.max(0, 1 - left / player.moveDuration));
  return {
    x: player.prevX + (player.x - player.prevX) * t,
    y: player.prevY + (player.y - player.prevY) * t,
  };
}
