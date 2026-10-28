import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, MAZE } from '../src/config.js';
import { createRng } from '../src/core/rng.js';
import { DIR_LIST } from '../src/game/dir.js';
import {
  MazeGenerationError,
  canMove,
  cellIndex,
  distanceAt,
  generateMaze,
  openingCount,
  shortestPath,
} from '../src/game/maze.js';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

function makeMaze(width, height, seed, braidRatio = 0, windiness = MAZE.windiness) {
  return generateMaze({ ...MAZE, width, height, braidRatio, windiness }, createRng(seed)).maze;
}

const opposite = (dir) => DIR_LIST.find((d) => d.dx === -dir.dx && d.dy === -dir.dy);

// validateMaze와 별개로, 테스트에서 직접 다시 확인합니다.
function independentProblems(maze) {
  const { width, height, walls, treasure, starts } = maze;
  const problems = [];

  // 바깥 테두리는 막혀 있고, 이웃 칸끼리 벽 정보가 일치해야 함
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (const dir of DIR_LIST) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          if ((walls[cellIndex(width, x, y)] & dir.wall) === 0) problems.push(`테두리 열림 (${x},${y})`);
        } else if (canMove(maze, x, y, dir.name) !== canMove(maze, nx, ny, opposite(dir).name)) {
          problems.push(`벽 불일치 (${x},${y})`);
        }
      }
    }
  }

  // 180° 대칭: (x,y)에서 갈 수 있는 방향 = (W-1-x, H-1-y)에서 반대 방향
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (const dir of DIR_LIST) {
        if (canMove(maze, x, y, dir.name) !== canMove(maze, width - 1 - x, height - 1 - y, opposite(dir).name)) {
          problems.push(`비대칭 (${x},${y})`);
        }
      }
    }
  }

  // 모든 칸이 1P 출발점에서 이어져 있어야 함
  const seen = new Set([0]);
  const queue = [{ x: 0, y: 0 }];
  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const dir of DIR_LIST) {
      if (!canMove(maze, x, y, dir.name)) continue;
      const key = cellIndex(width, x + dir.dx, y + dir.dy);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ x: x + dir.dx, y: y + dir.dy });
      }
    }
  }
  if (seen.size !== width * height) problems.push(`연결 안 된 칸 ${width * height - seen.size}개`);

  const [d1, d2] = starts.map((s) => distanceAt(maze, s.x, s.y));
  const manhattan = treasure.x + treasure.y;
  if (d1 !== d2) problems.push(`거리 다름 ${d1} vs ${d2}`);
  if (d1 < manhattan * MAZE.minPathFactor) problems.push(`최단 경로가 너무 짧음 ${d1}`);
  if (openingCount(walls[cellIndex(width, treasure.x, treasure.y)]) < 2) problems.push('보물 칸 출입구 부족');
  return problems;
}

describe.each(Object.entries(DIFFICULTIES))('%s 미로', (_, diff) => {
  it(`${diff.width}×${diff.height}: 시드 200개 모두 연결·대칭·거리 동일·최소 길이를 만족한다`, () => {
    const failures = [];
    for (const seed of SEEDS) {
      const problems = independentProblems(makeMaze(diff.width, diff.height, seed, diff.braidRatio, diff.windiness));
      if (problems.length > 0) failures.push(`seed ${seed}: ${problems.slice(0, 3).join(', ')}`);
    }
    expect(failures).toEqual([]);
  });

  it('16:9에 가까운 가로로 긴 직사각형이다', () => {
    expect(diff.width / diff.height).toBeGreaterThan(1.6);
    expect(diff.width / diff.height).toBeLessThan(1.95);
  });

  it('출발점은 왼쪽 위·오른쪽 아래 모서리, 보물은 정가운데', () => {
    const maze = makeMaze(diff.width, diff.height, 7, diff.braidRatio, diff.windiness);
    expect(maze.starts).toEqual([
      { x: 0, y: 0 },
      { x: diff.width - 1, y: diff.height - 1 },
    ]);
    expect(maze.treasure).toEqual({ x: (diff.width - 1) / 2, y: (diff.height - 1) / 2 });
  });
});

// 안개 속에서 '보물 쪽으로만' 가려는 사람 흉내: 갈림길마다 보물에 가까워지는 쪽부터 가 보고, 막히면 되돌아옴.
// 걸은 칸 수(되돌아온 칸 포함)를 돌려줍니다.
function greedyWalk(maze) {
  const { width, treasure } = maze;
  const seen = new Uint8Array(width * maze.height);
  let steps = 0;
  const far = (x, y) => Math.abs(x - treasure.x) + Math.abs(y - treasure.y);
  function go(x, y) {
    seen[y * width + x] = 1;
    if (x === treasure.x && y === treasure.y) return true;
    const dirs = DIR_LIST.filter((d) => canMove(maze, x, y, d.name) && !seen[(y + d.dy) * width + x + d.dx]).sort(
      (a, b) => far(x + a.dx, y + a.dy) - far(x + b.dx, y + b.dy),
    );
    for (const d of dirs) {
      steps++;
      if (go(x + d.dx, y + d.dy)) return true;
      steps++;
    }
    return false;
  }
  go(0, 0);
  return steps;
}

describe('미로 난이도 (조작이 빠른 사람이 아니라 길을 잘 찾는 사람이 이기도록)', () => {
  it.each(Object.entries(DIFFICULTIES))('%s: 보물 쪽으로만 가면 평균적으로 최단 경로의 3배 넘게 헤맨다', (_, diff) => {
    let walked = 0;
    let shortest = 0;
    for (const seed of SEEDS.slice(0, 40)) {
      const maze = makeMaze(diff.width, diff.height, seed, diff.braidRatio, diff.windiness);
      walked += greedyWalk(maze);
      shortest += distanceAt(maze, 0, 0);
    }
    expect(walked / shortest).toBeGreaterThan(3);
  });

  it.each(Object.entries(DIFFICULTIES))('%s: 막다른 칸이 전체의 15% 이상', (_, diff) => {
    const maze = makeMaze(diff.width, diff.height, 11, diff.braidRatio, diff.windiness);
    const deadEnds = maze.walls.filter((bits) => openingCount(bits) === 1).length;
    expect(deadEnds / (diff.width * diff.height)).toBeGreaterThan(0.15);
  });
});

describe('미로 생성', () => {
  it('같은 시드는 같은 미로, 다른 시드는 다른 미로', () => {
    expect(makeMaze(33, 19, 42).walls).toEqual(makeMaze(33, 19, 42).walls);
    expect(makeMaze(33, 19, 42).walls).not.toEqual(makeMaze(33, 19, 43).walls);
  });

  it('순환로 비율을 높이면 막다른 길이 줄어든다', () => {
    const deadEnds = (maze) => maze.walls.filter((bits) => openingCount(bits) === 1).length;
    let plain = 0;
    let braided = 0;
    for (const seed of SEEDS.slice(0, 20)) {
      plain += deadEnds(makeMaze(33, 19, seed, 0));
      braided += deadEnds(makeMaze(33, 19, seed, 0.2));
    }
    expect(braided).toBeLessThan(plain * 0.9);
  });

  it('짝수나 너무 작은 크기는 거부한다', () => {
    expect(() => generateMaze({ width: 10, height: 11 }, createRng(1))).toThrow(RangeError);
    expect(() => generateMaze({ width: 11, height: 12 }, createRng(1))).toThrow(RangeError);
    expect(() => generateMaze({ width: 1, height: 11 }, createRng(1))).toThrow(RangeError);
  });

  it('검사를 계속 통과하지 못하면 정해진 횟수만큼 다시 만든 뒤 오류를 낸다', () => {
    expect(() =>
      generateMaze({ width: 11, height: 7, minPathFactor: 100, maxAttempts: 3 }, createRng(1)),
    ).toThrow(MazeGenerationError);
  });

  it('최단 경로는 실제로 걸어갈 수 있고 길이가 거리와 같다', () => {
    const maze = makeMaze(33, 19, 5, 0.15);
    const path = shortestPath(maze, maze.starts[0]);
    expect(path.length - 1).toBe(distanceAt(maze, 0, 0));
    expect(path.at(-1)).toEqual(maze.treasure);
    for (let i = 1; i < path.length; i++) {
      const dir = DIR_LIST.find((d) => d.dx === path[i].x - path[i - 1].x && d.dy === path[i].y - path[i - 1].y);
      expect(canMove(maze, path[i - 1].x, path[i - 1].y, dir.name)).toBe(true);
    }
  });
});
