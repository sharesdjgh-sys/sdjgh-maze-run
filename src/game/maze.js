// 180° 회전 대칭 미로 생성 (기획서 8.3)
// 칸 하나마다 4방향 벽을 비트로 저장합니다. (북=1, 동=2, 남=4, 서=8)
// 가로(width)·세로(height)는 홀수라서 정가운데 칸이 정확히 하나 있고, 그 칸에 보물을 둡니다.
// 화면에 맞게 16:9에 가까운 직사각형 미로를 씁니다. 직사각형도 180° 돌리면 자기 자신과 겹치므로 대칭이 성립합니다.

import { DIR_LIST, DIRS, dirFromDelta, oppositeDir } from './dir.js';

const ALL_WALLS = 15;

export class MazeGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MazeGenerationError';
  }
}

/**
 * 대칭 미로를 만들고 검사까지 통과한 미로를 돌려줍니다.
 * 검사에 실패하면 다시 만들고, maxAttempts번 모두 실패하면 MazeGenerationError를 던집니다.
 */
export function generateMaze(
  { width, height, windiness = 1, braidRatio = 0, minPathFactor = 0, maxAttempts = 20 },
  rng,
) {
  for (const size of [width, height]) {
    if (!Number.isInteger(size) || size < 3 || size % 2 === 0) {
      throw new RangeError(`미로 가로·세로는 3 이상의 홀수여야 해요: ${width}×${height}`);
    }
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const walls = carveSymmetric(width, height, windiness, rng);
    braid(walls, width, height, braidRatio, rng);
    const maze = createMazeFromWalls(width, height, walls);
    if (validateMaze(maze, { minPathFactor }).ok) return { maze, attempts: attempt };
  }
  throw new MazeGenerationError(`미로를 ${maxAttempts}번 만들었지만 검사를 통과하지 못했어요.`);
}

/** 벽 정보로 미로 객체를 만듭니다. (출발점, 보물, 보물까지의 거리 지도 포함) */
export function createMazeFromWalls(width, height, walls) {
  const treasure = { x: (width - 1) / 2, y: (height - 1) / 2 };
  return {
    width,
    height,
    walls,
    treasure,
    starts: [
      { x: 0, y: 0 },
      { x: width - 1, y: height - 1 },
    ],
    distToTreasure: bfs(width, height, walls, treasure),
  };
}

export function cellIndex(width, x, y) {
  return y * width + x;
}

export function inBounds(width, height, x, y) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

/** (x, y) 칸에서 dirName 방향으로 한 칸 갈 수 있는지 */
export function canMove(maze, x, y, dirName) {
  const dir = DIRS[dirName];
  if (!dir || !inBounds(maze.width, maze.height, x + dir.dx, y + dir.dy)) return false;
  return (maze.walls[cellIndex(maze.width, x, y)] & dir.wall) === 0;
}

/** from 칸에서 모든 칸까지의 최단 거리 (칸 번호 → 거리) */
export function distancesFrom(maze, from) {
  return bfs(maze.width, maze.height, maze.walls, from);
}

/** 보물까지 남은 최단 거리 (칸 수) */
export function distanceAt(maze, x, y) {
  return maze.distToTreasure[cellIndex(maze.width, x, y)];
}

/**
 * from 칸에서 보물까지의 최단 경로 (from과 보물 칸 포함)
 * dist를 주면 그 거리표(칸 번호 → 거리)가 0인 칸까지 갑니다. (예: 집까지의 거리표)
 */
export function shortestPath(maze, from, dist = maze.distToTreasure) {
  const at = (x, y) => dist[cellIndex(maze.width, x, y)];
  const path = [{ x: from.x, y: from.y }];
  let { x, y } = from;
  let d = at(x, y);
  if (d < 0) return [];
  while (d > 0) {
    const next = DIR_LIST.find(
      (dir) => canMove(maze, x, y, dir.name) && at(x + dir.dx, y + dir.dy) === d - 1,
    );
    x += next.dx;
    y += next.dy;
    d -= 1;
    path.push({ x, y });
  }
  return path;
}

/** 180° 돌린 칸의 번호: (x, y) → (width-1-x, height-1-y). cellCount = width × height */
export function rotateIndex180(cellCount, i) {
  return cellCount - 1 - i;
}

/** 벽 비트를 180° 돌립니다. (북↔남, 동↔서) */
export function rotateWalls180(bits) {
  return ((bits & 1) << 2) | ((bits & 4) >> 2) | ((bits & 2) << 2) | ((bits & 8) >> 2);
}

export function openingCount(bits) {
  let open = 0;
  for (const dir of DIR_LIST) if ((bits & dir.wall) === 0) open++;
  return open;
}

/**
 * 미로 검사. 하나라도 실패하면 { ok: false, reason }을 돌려줍니다.
 * 이웃 칸 벽 일치, 바깥 테두리, 모든 칸 연결, 180° 대칭, 두 출발점 거리 동일,
 * 보물 칸 출입구 2개 이상, 최단 경로 최소 길이
 */
export function validateMaze(maze, { minPathFactor = 0 } = {}) {
  const { width, height, walls, treasure, starts, distToTreasure } = maze;
  const count = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bits = walls[cellIndex(width, x, y)];
      for (const dir of DIR_LIST) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        const closed = (bits & dir.wall) !== 0;
        if (!inBounds(width, height, nx, ny)) {
          if (!closed) return { ok: false, reason: 'open-border' };
        } else if (closed !== ((walls[cellIndex(width, nx, ny)] & oppositeDir(dir).wall) !== 0)) {
          return { ok: false, reason: 'wall-mismatch' };
        }
      }
    }
  }

  for (let i = 0; i < count; i++) {
    if (distToTreasure[i] < 0) return { ok: false, reason: 'disconnected' };
    if (walls[rotateIndex180(count, i)] !== rotateWalls180(walls[i])) return { ok: false, reason: 'asymmetric' };
  }

  const [d1, d2] = starts.map((s) => distanceAt(maze, s.x, s.y));
  if (d1 !== d2) return { ok: false, reason: 'unequal-distance' };

  const manhattan = Math.abs(starts[0].x - treasure.x) + Math.abs(starts[0].y - treasure.y);
  if (d1 < manhattan * minPathFactor) return { ok: false, reason: 'too-short' };

  if (openingCount(walls[cellIndex(width, treasure.x, treasure.y)]) < 2) {
    return { ok: false, reason: 'treasure-closed' };
  }
  return { ok: true };
}

// 성장 트리(growing tree) 방식으로 길을 뚫되, 벽 하나를 허물 때마다 180° 돌린 짝 벽도 함께 허뭅니다.
// windiness가 1이면 가장 최근 칸에서 계속 뻗어 나가는 DFS라 길이 길고 구불구불해지고,
// 낮을수록 아무 칸에서나 갈라져 나가 짧은 갈림길이 많아집니다.
// 칸과 짝 칸을 함께 '방문'으로 표시하므로 1P 쪽 나무와 2P 쪽 나무가 대칭으로 자라고,
// 두 나무는 자기 자신이 짝인 정가운데 칸(보물)에서 만납니다.
function carveSymmetric(width, height, windiness, rng) {
  const count = width * height;
  const walls = new Uint8Array(count).fill(ALL_WALLS);
  const visited = new Uint8Array(count);
  const visit = (i) => {
    visited[i] = 1;
    visited[rotateIndex180(count, i)] = 1;
  };

  visit(0);
  const active = [0];
  while (active.length > 0) {
    const k = rng.next() < windiness ? active.length - 1 : rng.int(active.length);
    const i = active[k];
    const x = i % width;
    const y = (i - x) / width;
    const options = DIR_LIST.filter(
      (d) => inBounds(width, height, x + d.dx, y + d.dy) && !visited[cellIndex(width, x + d.dx, y + d.dy)],
    );
    if (options.length === 0) {
      active.splice(k, 1);
      continue;
    }
    const dir = rng.pick(options);
    const j = cellIndex(width, x + dir.dx, y + dir.dy);
    carveBetween(walls, width, i, j);
    carveBetween(walls, width, rotateIndex180(count, i), rotateIndex180(count, j));
    visit(j);
    active.push(j);
  }
  return walls;
}

// 막다른 칸의 일정 비율(ratio)을 골라 벽 하나를 허물어 순환로를 만듭니다. 짝 칸도 똑같이 허뭅니다.
function braid(walls, width, height, ratio, rng) {
  if (ratio <= 0) return;
  const count = width * height;
  const isDeadEnd = (i) => openingCount(walls[i]) === 1;
  const countDeadEnds = () => {
    let total = 0;
    for (let i = 0; i < count; i++) if (isDeadEnd(i)) total++;
    return total;
  };

  const deadEnds = [];
  for (let i = 0; i < count; i++) if (isDeadEnd(i)) deadEnds.push(i);
  const goal = Math.round(deadEnds.length * (1 - ratio));
  let remaining = deadEnds.length;
  rng.shuffle(deadEnds);

  for (const i of deadEnds) {
    if (remaining <= goal) break;
    if (!isDeadEnd(i)) continue;
    const x = i % width;
    const y = (i - x) / width;
    const closed = DIR_LIST.filter((d) => (walls[i] & d.wall) !== 0 && inBounds(width, height, x + d.dx, y + d.dy));
    if (closed.length === 0) continue;
    // 옆 칸도 막다른 칸이면 그쪽을 먼저 허물어 막다른 길을 한 번에 둘 없앱니다.
    const preferred = closed.filter((d) => isDeadEnd(cellIndex(width, x + d.dx, y + d.dy)));
    const dir = rng.pick(preferred.length > 0 ? preferred : closed);
    const j = cellIndex(width, x + dir.dx, y + dir.dy);
    carveBetween(walls, width, i, j);
    carveBetween(walls, width, rotateIndex180(count, i), rotateIndex180(count, j));
    remaining = countDeadEnds();
  }
}

function carveBetween(walls, width, a, b) {
  const ax = a % width;
  const ay = (a - ax) / width;
  const bx = b % width;
  const by = (b - bx) / width;
  const dir = dirFromDelta(bx - ax, by - ay);
  walls[a] &= ~dir.wall;
  walls[b] &= ~oppositeDir(dir).wall;
}

function bfs(width, height, walls, from) {
  const count = width * height;
  const dist = new Int32Array(count).fill(-1);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const start = cellIndex(width, from.x, from.y);
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    const y = (i - x) / width;
    for (const dir of DIR_LIST) {
      if ((walls[i] & dir.wall) !== 0) continue;
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (!inBounds(width, height, nx, ny)) continue;
      const j = cellIndex(width, nx, ny);
      if (dist[j] < 0) {
        dist[j] = dist[i] + 1;
        queue[tail++] = j;
      }
    }
  }
  return dist;
}
