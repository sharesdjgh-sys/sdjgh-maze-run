// 미로 좌표 기준 방향. x는 오른쪽, y는 아래쪽이 + 입니다.
// wall은 칸마다 저장하는 벽 비트입니다. (북=1, 동=2, 남=4, 서=8)

export const DIRS = {
  up: { name: 'up', dx: 0, dy: -1, wall: 1 },
  right: { name: 'right', dx: 1, dy: 0, wall: 2 },
  down: { name: 'down', dx: 0, dy: 1, wall: 4 },
  left: { name: 'left', dx: -1, dy: 0, wall: 8 },
};

export const DIR_LIST = [DIRS.up, DIRS.right, DIRS.down, DIRS.left];
export const DIR_NAMES = DIR_LIST.map((d) => d.name);

export function dirFromDelta(dx, dy) {
  return DIR_LIST.find((d) => d.dx === dx && d.dy === dy) ?? null;
}

export function oppositeDir(dir) {
  return dirFromDelta(-dir.dx, -dir.dy);
}
