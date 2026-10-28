import { LOOP, MATCH } from '../src/config.js';
import { createRng } from '../src/core/rng.js';
import { DIR_LIST } from '../src/game/dir.js';
import { canMove, cellIndex, createMazeFromWalls, distanceAt } from '../src/game/maze.js';
import { assembleMatch, updateMatch } from '../src/game/match.js';
import { TRAP } from '../src/game/placement.js';

export const DT = LOOP.step;
export const hold = (...dirs) => ({ held: dirs, pressed: [], items: [] });
export const press = (...dirs) => ({ held: [], pressed: dirs, items: [] });
export const useSlot = (...slots) => ({ held: [], pressed: [], items: slots });
export const idle = () => ({ held: [], pressed: [], items: [] });

/** 칸 사이 벽을 허무는 테스트용 미로 */
export function buildMaze(width, height, openings) {
  const walls = new Uint8Array(width * height).fill(15);
  for (const [[ax, ay], [bx, by]] of openings) {
    const dir = DIR_LIST.find((d) => d.dx === bx - ax && d.dy === by - ay);
    const back = DIR_LIST.find((d) => d.dx === -dir.dx && d.dy === -dir.dy);
    walls[cellIndex(width, ax, ay)] &= ~dir.wall;
    walls[cellIndex(width, bx, by)] &= ~back.wall;
  }
  return createMazeFromWalls(width, height, walls);
}

export function emptyTraps(cellCount) {
  return { kind: new Uint8Array(cellCount), portalTo: new Int32Array(cellCount).fill(-1) };
}

/** 7×7 미로의 맨 윗줄 복도 (0,0)~(6,0). 2P는 (6,6)에 갇혀 있어서 움직이지 않습니다. */
export function corridorMatch({ boxes = [], traps = {} } = {}) {
  const n = 7;
  const openings = [];
  for (let x = 0; x < n - 1; x++) openings.push([[x, 0], [x + 1, 0]]);
  const maze = buildMaze(n, n, openings);
  const trapData = emptyTraps(n * n);
  for (const [x, y] of traps.web ?? []) trapData.kind[cellIndex(n, x, y)] = TRAP.WEB;
  for (const [x, y] of traps.ice ?? []) trapData.kind[cellIndex(n, x, y)] = TRAP.ICE;
  for (const [[ax, ay], [bx, by]] of traps.portal ?? []) {
    const a = cellIndex(n, ax, ay);
    const b = cellIndex(n, bx, by);
    trapData.kind[a] = trapData.kind[b] = TRAP.PORTAL;
    trapData.portalTo[a] = b;
    trapData.portalTo[b] = a;
  }
  const match = assembleMatch({
    maze,
    boxes: boxes.map(([x, y]) => ({ x, y, active: true, respawnIn: 0 })),
    traps: trapData,
    rng: createRng(1),
  });
  match.phase = 'playing';
  return match;
}

/** commands를 넣어 ticks번 진행. commands는 [1P, 2P] 또는 (tick) => [1P, 2P] */
export function run(match, ticks, commands = [idle(), idle()]) {
  for (let i = 0; i < ticks; i++) updateMatch(match, DT, typeof commands === 'function' ? commands(i) : commands);
}

export function skipCountdown(match) {
  run(match, Math.ceil(MATCH.countdown / DT) + 1);
}

/** 보물 쪽으로 한 칸 가까워지는 방향 */
export function towardTreasure(maze, x, y) {
  const d = distanceAt(maze, x, y);
  return DIR_LIST.find((dir) => canMove(maze, x, y, dir.name) && distanceAt(maze, x + dir.dx, y + dir.dy) === d - 1)
    ?.name;
}

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function eventsOf(match, type) {
  return match.events.filter((e) => e.type === type);
}
