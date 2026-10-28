import { describe, expect, it } from 'vitest';
import { MOVE } from '../src/config.js';
import { distanceAt } from '../src/game/maze.js';
import { createMatch, pauseMatch, resumeMatch, updateMatch } from '../src/game/match.js';
import { createPlayer, stepPlayer } from '../src/game/player.js';
import {
  DT,
  OPPOSITE,
  buildMaze,
  emptyTraps,
  eventsOf,
  hold,
  idle,
  press,
  run,
  skipCountdown,
  towardTreasure,
} from './helpers.js';

// 맨 윗줄 복도 (0,0)-(1,0)-(2,0)-(3,0)-(4,0)과 (1,0)에서 아래로 내려가는 갈림길 (1,1)
const CORRIDOR = buildMaze(5, 5, [
  [[0, 0], [1, 0]],
  [[1, 0], [2, 0]],
  [[2, 0], [3, 0]],
  [[3, 0], [4, 0]],
  [[1, 0], [1, 1]],
]);
const WORLD = { maze: CORRIDOR, traps: emptyTraps(25), move: MOVE };

function newPlayer() {
  return createPlayer(0, { x: 0, y: 0 }, 'cat', 25);
}

function tick(player, command, state) {
  state.time += DT;
  return stepPlayer(player, WORLD, command, DT, state.time);
}

describe('이동', () => {
  it('벽 쪽으로는 움직이지 않고 튕기는 연출만 생긴다', () => {
    const player = newPlayer();
    const state = { time: 0 };
    tick(player, press('up'), state);
    expect(player).toMatchObject({ x: 0, y: 0 });
    expect(player.bump?.dir).toBe('up');
  });

  it(`키를 누르고 있으면 초당 ${MOVE.cellsPerSecond}칸씩 계속 간다`, () => {
    const player = newPlayer();
    const state = { time: 0 };
    const ticksPerCell = Math.round(1 / MOVE.cellsPerSecond / DT);
    for (let i = 0; i < ticksPerCell * 3; i++) tick(player, hold('right'), state);
    expect(player.x).toBe(3);
    expect(player.stats.moves).toBe(3);
  });

  it('선입력: 이동 중에 잠깐 누른 방향으로 다음 갈림길에서 꺾는다', () => {
    const player = newPlayer();
    const state = { time: 0 };
    tick(player, hold('right'), state); // (0,0) → (1,0) 이동 시작
    for (let i = 0; i < 4; i++) tick(player, hold('right'), state);
    tick(player, press('down'), state); // 도착 0.08초 전에 아래를 톡 누르고 모든 키를 뗌
    for (let i = 0; i < 10; i++) tick(player, idle(), state);
    expect(player).toMatchObject({ x: 1, y: 1 });
  });

  it(`선입력은 ${MOVE.bufferTime}초가 지나면 사라진다`, () => {
    const player = newPlayer();
    const state = { time: 0 };
    tick(player, { held: ['right'], pressed: ['down'], items: [] }, state); // 출발할 때 누른 아래는 너무 이름
    for (let i = 0; i < 12; i++) tick(player, hold('right'), state);
    expect(player).toMatchObject({ x: 2, y: 0 });
  });

  it('여러 방향을 누르고 있으면 최근에 누른 방향을 먼저 시도한다', () => {
    const player = newPlayer();
    const state = { time: 0 };
    tick(player, hold('right'), state);
    for (let i = 0; i < 10; i++) tick(player, hold('down', 'right'), state);
    expect(player).toMatchObject({ x: 1, y: 1 });
  });
});

describe('한 판 진행', () => {
  it('카운트다운 동안에는 움직이지 않고, 3·2·1·GO 사건이 차례로 나온다', () => {
    const match = createMatch({ difficulty: 'easy', seed: 42 });
    run(match, 60, [hold('right', 'down'), hold('left', 'up')]);
    expect(match.phase).toBe('countdown');
    expect(match.players[0]).toMatchObject({ x: 0, y: 0, stats: { moves: 0 } });
    skipCountdown(match);
    expect(match.phase).toBe('playing');
    expect(match.events.filter((e) => e.type === 'countdown').map((e) => e.count)).toEqual([3, 2, 1]);
    expect(eventsOf(match, 'go')).toHaveLength(1);
  });

  it('보물에 먼저 도착한 사람이 이긴다 (함정·상자가 있어도 결국 도착)', () => {
    const match = createMatch({ difficulty: 'normal', seed: 7 });
    skipCountdown(match);
    const shortest = distanceAt(match.maze, 0, 0);
    run(match, 20000, () => [idle(), hold(towardTreasure(match.maze, match.players[1].x, match.players[1].y))]);
    expect(match.phase).toBe('result');
    expect(match.result.winner).toBe(1);
    expect(match.result.players[1].shortest).toBe(shortest);
    expect(eventsOf(match, 'finish')).toEqual([{ type: 'finish', winner: 1 }]);
  });

  it.each([1, 2, 3, 4, 5])('대칭 미로라서 똑같이(대칭으로) 움직이면 같은 순간 도착해 무승부 (seed %i)', (seed) => {
    const match = createMatch({ difficulty: 'normal', seed });
    const { maze } = match;
    const [lastX, lastY] = [maze.width - 1, maze.height - 1];
    skipCountdown(match);
    run(match, 20000, () => {
      const [p1, p2] = match.players;
      // 2P는 '1P가 2P 자리를 180° 돌린 곳에 있다면 갈 방향'의 반대로 움직임 = 완전히 대칭
      const mirrored = towardTreasure(maze, lastX - p2.x, lastY - p2.y);
      return [hold(towardTreasure(maze, p1.x, p1.y)), hold(mirrored && OPPOSITE[mirrored])];
    });
    expect(match.phase).toBe('result');
    expect(match.result.winner).toBeNull();
  });

  it('일시정지 중에는 시간이 흐르지 않고, 다시 하면 원래 상태로 돌아간다', () => {
    const match = createMatch({ difficulty: 'easy', seed: 1 });
    skipCountdown(match);
    run(match, 30);
    const time = match.time;
    pauseMatch(match);
    run(match, 120, [hold('right'), hold('left')]);
    expect(match.time).toBe(time);
    expect(match.players[0]).toMatchObject({ x: 0, y: 0 });
    resumeMatch(match);
    expect(match.phase).toBe('playing');
  });

  it('카운트다운 중에 일시정지해도 카운트다운으로 돌아간다', () => {
    const match = createMatch({ difficulty: 'easy', seed: 1 });
    pauseMatch(match);
    resumeMatch(match);
    expect(match.phase).toBe('countdown');
  });

  it('카운트다운 중에는 아이템을 쓸 수 없다', () => {
    const match = createMatch({ difficulty: 'easy', seed: 1 });
    match.players[0].bag[0] = 'freeze';
    updateMatch(match, DT, [{ held: [], pressed: [], items: [0] }, idle()]);
    expect(match.players[0].bag[0]).toBe('freeze');
  });

});
