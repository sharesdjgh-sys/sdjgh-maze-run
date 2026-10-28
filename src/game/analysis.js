// 미로 평가: 미로 목록(mazePool)을 고를 때와 테스트에서 씁니다.

import { DIR_LIST } from './dir.js';
import { canMove, distanceAt, openingCount } from './maze.js';

/**
 * 안개 속에서 '보물 쪽으로만' 가려는 사람 흉내.
 * 갈림길마다 보물에 가까워지는 쪽부터 가 보고, 막히면 되돌아옵니다.
 * 걸은 칸 수(되돌아온 칸 포함)를 돌려줍니다. 클수록 길 찾기가 까다로운 미로입니다.
 */
export function greedyWalk(maze, from = maze.starts[0]) {
  const { width, treasure } = maze;
  const seen = new Uint8Array(width * maze.height);
  const far = (x, y) => Math.abs(x - treasure.x) + Math.abs(y - treasure.y);
  let steps = 0;
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
  go(from.x, from.y);
  return steps;
}

/** 미로 한 개의 지표: 최단 경로, 보물 쪽으로만 가면 걷는 칸, 그 배수, 막다른 칸 수 */
export function mazeStats(maze) {
  const shortest = distanceAt(maze, maze.starts[0].x, maze.starts[0].y);
  const wander = greedyWalk(maze);
  const deadEnds = maze.walls.reduce((n, bits) => n + (openingCount(bits) === 1 ? 1 : 0), 0);
  return { shortest, wander, ratio: wander / shortest, deadEnds };
}
