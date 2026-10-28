// 한 판 진행: 카운트다운 → 진행 → 결과 (기획서 기능 2~6)
// 아이템 줍기·사용·발사, 함정, 효과, 상자 재생성, 승리·무승부 판정을 처리합니다.
// 화면·소리는 match.events에 쌓인 사건을 main.js가 꺼내 가서 처리합니다. (이 파일은 그리지 않음)

import { DIFFICULTIES, ITEMS, ITEM_RULES, MATCH, MAZE, MOVE, TRAPS } from '../config.js';
import { createRng } from '../core/rng.js';
import { applyEffect, tickEffects } from './effects.js';
import { addToBag, rollItem, takeFromBag } from './items.js';
import { cellIndex, distanceAt, generateMaze } from './maze.js';
import { TRAP, placeSpecials } from './placement.js';
import { EMPTY_COMMAND, createPlayer, stepPlayer, teleportPlayer } from './player.js';
import { markSeen, visionFor, visionRadius } from './vision.js';

const EPSILON = 1e-9;

/**
 * 새 판을 만듭니다. 미로를 만들지 못하면 MazeGenerationError를 던집니다.
 * seed: 미로·상자·함정 배치를 정하는 번호 (같은 seed = 같은 미로)
 * itemSeed: 상자에서 나오는 아이템을 정하는 번호. 같은 미로라도 판마다 아이템이 다르게 나오도록 따로 둡니다.
 * mazeNumber: 미로 목록(src/data/mazePool.js)에서 몇 번째 미로인지 (화면 표시용)
 */
export function createMatch({
  difficulty = 'easy',
  seed = 1,
  itemSeed = seed,
  mazeNumber = null,
  characters = ['cat', 'dog'],
  fog = true,
} = {}) {
  const diff = DIFFICULTIES[difficulty];
  if (!diff) throw new RangeError(`알 수 없는 난이도예요: ${difficulty}`);
  const rng = createRng(seed);
  const { maze, attempts } = generateMaze(
    { ...MAZE, width: diff.width, height: diff.height, windiness: diff.windiness ?? MAZE.windiness, braidRatio: diff.braidRatio },
    rng,
  );
  const { boxes, traps } = placeSpecials(maze, diff, rng);
  return assembleMatch({
    difficulty,
    seed,
    mazeNumber,
    fog,
    attempts,
    maze,
    boxes,
    traps,
    rng: createRng(itemSeed ^ 0x5bd1e995),
    characters,
    vision: visionFor(diff),
  });
}

/** 미로·상자·함정이 준비된 상태에서 판을 조립합니다. (테스트에서 직접 만든 미로로 판을 만들 때도 사용) */
export function assembleMatch({
  maze,
  boxes,
  traps,
  rng,
  characters = ['cat', 'dog'],
  fog = true,
  vision = visionFor(null),
  ...info
}) {
  const players = maze.starts.map((start, i) => createPlayer(i, start, characters[i], maze.width * maze.height));
  for (const p of players) markSeen(p.seenAt, maze, p.x, p.y, visionRadius(p.effects, vision), 0);

  const match = {
    ...info,
    fog,
    vision, // 이 판의 시야 설정 (난이도별 시야 반경, 지나온 길이 사라지는 시간)
    maze,
    boxes,
    traps,
    rng,
    phase: 'countdown', // 'countdown' | 'playing' | 'paused' | 'result'
    pausedFrom: null,
    countdownLeft: MATCH.countdown,
    countdownShown: null,
    time: 0, // GO 이후 흐른 시간 (일시정지 시간 제외)
    players,
    projectiles: [], // 날아가는 중인 아이템 { from, to, item, slot, t, duration }
    near: [false, false], // 보물까지 nearDistance 이내로 들어온 적이 있는지
    events: [],
    result: null,
  };
  match.world = {
    maze,
    traps,
    move: MOVE,
    onArrive: (player) => handleArrival(match, player),
  };
  return match;
}

function emit(match, type, data = {}) {
  match.events.push({ type, ...data });
}

/** commands[i]: i번 플레이어의 입력 { held, pressed, items } (미로 방향, 아이템 칸 번호) */
export function updateMatch(match, dt, commands = []) {
  if (match.phase === 'countdown') {
    // 카운트다운 중에는 이동·아이템 입력을 받지 않습니다.
    const shown = Math.ceil(match.countdownLeft - EPSILON);
    if (shown !== match.countdownShown && shown > 0) {
      match.countdownShown = shown;
      emit(match, 'countdown', { count: shown });
    }
    match.countdownLeft -= dt;
    if (match.countdownLeft <= EPSILON) {
      match.countdownLeft = 0;
      match.phase = 'playing';
      emit(match, 'go');
    }
    return;
  }
  if (match.phase !== 'playing') return;

  match.time += dt;
  const { players, maze } = match;

  players.forEach((player, i) => {
    for (const effect of tickEffects(player.effects, dt)) emit(match, 'effectEnd', { player: i, effect });
  });
  players.forEach((player, i) => {
    for (const slot of commands[i]?.items ?? []) useItem(match, i, slot);
  });

  // 두 사람을 모두 움직인 뒤에 도착을 확인해야 같은 순간 도착(무승부)을 가려낼 수 있습니다.
  const finished = [];
  players.forEach((player, i) => {
    const status = stepPlayer(player, match.world, commands[i] ?? EMPTY_COMMAND, dt, match.time);
    if (status === 'finished') finished.push(i);
    // 지금 보이는 칸을 '방금 본 칸'으로 기록 → 떠나면 서서히 어두워짐
    markSeen(player.seenAt, maze, player.x, player.y, visionRadius(player.effects, match.vision), match.time);
  });

  updateProjectiles(match, dt);
  updateBoxes(match, dt);
  players.forEach((player, i) => {
    const remaining = distanceAt(maze, player.x, player.y);
    if (!match.near[i] && remaining >= 0 && remaining <= MATCH.nearDistance) {
      match.near[i] = true;
      emit(match, 'near', { player: i });
    }
  });

  if (finished.length > 0) finishMatch(match, finished.length === 1 ? finished[0] : null);
}

/** 새 칸에 도착했을 때: 보물, 아이템 상자, 함정 */
function handleArrival(match, player) {
  const { maze, traps } = match;
  if (player.x === maze.treasure.x && player.y === maze.treasure.y) {
    player.finished = true;
    return;
  }

  const box = match.boxes.find((b) => b.active && b.x === player.x && b.y === player.y);
  if (box) pickUpBox(match, player, box);

  const here = cellIndex(maze.width, player.x, player.y);
  switch (traps.kind[here]) {
    case TRAP.WEB:
      player.stuck = TRAPS.web.stuckTime;
      player.stats.trapsHit += 1;
      emit(match, 'trap', { player: player.index, trap: 'web' });
      break;
    case TRAP.PORTAL: {
      const to = traps.portalTo[here];
      const from = { x: player.x, y: player.y };
      teleportPlayer(player, to % maze.width, Math.floor(to / maze.width));
      player.stats.trapsHit += 1;
      emit(match, 'trap', { player: player.index, trap: 'portal', from, to: { x: player.x, y: player.y } });
      break;
    }
    case TRAP.ICE: {
      const cameFrom = cellIndex(maze.width, player.prevX, player.prevY);
      if (traps.kind[cameFrom] !== TRAP.ICE) {
        player.stats.trapsHit += 1;
        emit(match, 'trap', { player: player.index, trap: 'ice' });
      }
      break;
    }
  }
}

function pickUpBox(match, player, box) {
  const opponent = match.players[1 - player.index];
  const gap = distanceAt(match.maze, player.x, player.y) - distanceAt(match.maze, opponent.x, opponent.y);
  const behind = ITEM_RULES.catchUp.enabled && gap >= ITEM_RULES.catchUp.minGap;
  if (!player.bag.includes(null)) {
    // 가방이 가득 차면 상자는 그 자리에 남습니다.
    if (match.time - player.lastBagFullNotice >= ITEM_RULES.bagFullNotice) {
      player.lastBagFullNotice = match.time;
      emit(match, 'bagFull', { player: player.index });
    }
    return;
  }
  const item = rollItem(match.rng, { behind, fog: match.fog });
  const slot = addToBag(player.bag, item);
  box.active = false;
  box.respawnIn = ITEM_RULES.boxRespawn;
  player.stats.itemsPicked += 1;
  emit(match, 'pickup', { player: player.index, item, slot, x: box.x, y: box.y });
}

/** 아이템 사용. 빈 칸이면 아무 일도 없습니다. 상대용 아이템은 날아가서 맞는 순간 효과가 시작됩니다. */
export function useItem(match, playerIndex, slot) {
  if (match.phase !== 'playing') return false;
  const player = match.players[playerIndex];
  const item = takeFromBag(player.bag, slot);
  if (!item) return false;
  player.stats.itemsUsed += 1;
  emit(match, 'use', { player: playerIndex, item, slot });
  if (ITEMS[item].target === 'self') {
    hitWithItem(match, playerIndex, playerIndex, item);
  } else {
    match.projectiles.push({
      from: playerIndex,
      to: 1 - playerIndex,
      item,
      slot,
      t: 0,
      duration: ITEM_RULES.projectileTime,
    });
  }
  return true;
}

function hitWithItem(match, from, to, item) {
  const target = match.players[to];
  const outcome = applyEffect(target.effects, item);
  if (outcome === 'immune') {
    emit(match, 'immune', { player: to, item, from });
    return;
  }
  if (from !== to) match.players[from].stats.itemsHit += 1;
  emit(match, 'effect', { player: to, item, from, refreshed: outcome === 'refreshed' });
}

function updateProjectiles(match, dt) {
  for (const shot of match.projectiles) {
    shot.t += dt;
    if (shot.t >= shot.duration - EPSILON) hitWithItem(match, shot.from, shot.to, shot.item);
  }
  match.projectiles = match.projectiles.filter((shot) => shot.t < shot.duration - EPSILON);
}

function updateBoxes(match, dt) {
  for (const box of match.boxes) {
    if (box.active) continue;
    box.respawnIn -= dt;
    if (box.respawnIn <= EPSILON) {
      box.active = true;
      box.respawnIn = 0;
      emit(match, 'boxRespawn', { x: box.x, y: box.y });
    }
  }
}

export function pauseMatch(match) {
  if (match.phase !== 'countdown' && match.phase !== 'playing') return;
  match.pausedFrom = match.phase;
  match.phase = 'paused';
}

export function resumeMatch(match) {
  if (match.phase !== 'paused') return;
  match.phase = match.pausedFrom;
  match.pausedFrom = null;
}

/** 지금 보물까지 남은 최단 거리 */
export function remainingDistance(match, playerIndex) {
  const p = match.players[playerIndex];
  return distanceAt(match.maze, p.x, p.y);
}

function finishMatch(match, winner) {
  const { maze } = match;
  match.phase = 'result';
  match.projectiles = [];
  match.result = {
    winner, // 무승부면 null
    time: match.time,
    players: match.players.map((player) => {
      const start = maze.starts[player.index];
      const shortest = distanceAt(maze, start.x, start.y);
      const progress = shortest - distanceAt(maze, player.x, player.y);
      return {
        ...player.stats,
        shortest,
        wandered: Math.max(0, player.stats.moves - progress), // 헤맨 칸 = 이동 칸 − 실제로 가까워진 칸
      };
    }),
  };
  emit(match, 'finish', { winner });
}
