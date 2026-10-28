import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, MAZE, MOVE } from '../src/config.js';
import { distanceAt, distancesFrom, generateMaze } from '../src/game/maze.js';
import { TRAP, pickEnds, placeSpecials } from '../src/game/placement.js';
import { assembleMatch, createMatch, pauseMatch, resumeMatch, updateMatch } from '../src/game/match.js';
import { createPlayer, stepPlayer } from '../src/game/player.js';
import { createRng } from '../src/core/rng.js';
import {
  DT,
  buildMaze,
  emptyTraps,
  eventsOf,
  hold,
  idle,
  press,
  run,
  skipCountdown,
  towardGoal,
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
    expect(match.players[0]).toMatchObject({ ...match.starts[0], stats: { moves: 0 } });
    skipCountdown(match);
    expect(match.phase).toBe('playing');
    expect(match.events.filter((e) => e.type === 'countdown').map((e) => e.count)).toEqual([3, 2, 1]);
    expect(eventsOf(match, 'go')).toHaveLength(1);
  });

  it('학교에 들렀다가 내 집에 먼저 도착한 사람이 이긴다 (함정·상자가 있어도 결국 도착)', () => {
    const match = createMatch({ difficulty: 'normal', seed: 7 });
    skipCountdown(match);
    // 최단 거리 = 출발점 → 학교 + 학교 → 집
    const [start, home] = [match.starts[1], match.homes[1]];
    const shortest = distanceAt(match.maze, start.x, start.y) + distanceAt(match.maze, home.x, home.y);
    run(match, 40000, () => (match.phase === 'playing' ? [idle(), hold(towardGoal(match, 1))] : [idle(), idle()]));
    expect(match.phase).toBe('result');
    expect(match.result.winner).toBe(1);
    expect(match.result.players[1]).toMatchObject({ shortest, visitedSchool: true });
    expect(eventsOf(match, 'school').map((e) => e.player)).toEqual([1]);
    expect(eventsOf(match, 'finish')).toEqual([{ type: 'finish', winner: 1 }]);
  });

  it('학교에 들르지 않고는 집에 가도 이기지 못하고, 학교는 그 자리에 남는다', () => {
    // 7×7: 왼쪽 줄 (0,0)~(0,6), 학교는 (0,3)에서 오른쪽으로 갈라진 (1,3). 1P 집은 기본 자리 (0,6)
    const n = 7;
    const openings = [[[0, 3], [1, 3]]];
    for (let y = 0; y < n - 1; y++) openings.push([[0, y], [0, y + 1]]);
    const maze = buildMaze(n, n, openings);
    maze.treasure = { x: 1, y: 3 };
    maze.distToTreasure = distancesFrom(maze, maze.treasure);
    const match = assembleMatch({ maze, boxes: [], traps: emptyTraps(n * n), rng: createRng(1) });
    match.phase = 'playing';

    run(match, 80, [hold('down'), idle()]); // 학교 갈림길을 지나 집 (0,6)까지, 등교를 안 했으니 그대로 진행
    expect(match.players[0]).toMatchObject({ x: 0, y: 6, visitedSchool: false, finished: false });
    expect(match.phase).toBe('playing');

    run(match, 25, [hold('up'), idle()]); // (0,3)까지
    run(match, 20, [hold('right'), idle()]); // 학교 (1,3)
    expect(match.players[0].visitedSchool).toBe(true);
    expect(eventsOf(match, 'school')).toHaveLength(1);
    run(match, 15, [hold('left'), idle()]);
    run(match, 50, [hold('down'), idle()]); // 하교해서 집 (0,6) → 승리
    expect(match.phase).toBe('result');
    expect(match.result.winner).toBe(0);
  });

  it('학교에 들른 뒤 집 근처에 오면 두근두근(near) 사건이 한 번 나온다', () => {
    const match = createMatch({ difficulty: 'easy', seed: 3 });
    skipCountdown(match);
    run(match, 40000, () => {
      if (match.phase !== 'playing') return [idle(), idle()];
      return [hold(towardGoal(match, 0)), idle()];
    });
    const near = eventsOf(match, 'near');
    expect(near).toEqual([{ type: 'near', player: 0 }]);
    expect(match.events.indexOf(near[0])).toBeGreaterThan(match.events.indexOf(eventsOf(match, 'school')[0]));
  });

  it.each([1, 2, 3, 4, 5])('거리가 같아서, 함정 없이 둘 다 가장 빠른 길로 가면 같은 순간 도착해 무승부 (seed %i)', (seed) => {
    const diff = DIFFICULTIES.normal;
    const { maze } = generateMaze({ ...MAZE, width: diff.width, height: diff.height, windiness: diff.windiness, braidRatio: diff.braidRatio }, createRng(seed));
    const ends = pickEnds(maze, {}, createRng(seed));
    const match = assembleMatch({ maze, boxes: [], traps: emptyTraps(maze.width * maze.height), rng: createRng(1), ...ends });
    match.phase = 'playing';
    run(match, 40000, () => (match.phase === 'playing' ? [hold(towardGoal(match, 0)), hold(towardGoal(match, 1))] : [idle(), idle()]));
    expect(match.phase).toBe('result');
    expect(match.result.winner).toBeNull();
    expect(match.players.every((p) => p.visitedSchool)).toBe(true);
  });

  it('일시정지 중에는 시간이 흐르지 않고, 다시 하면 원래 상태로 돌아간다', () => {
    const match = createMatch({ difficulty: 'easy', seed: 1 });
    skipCountdown(match);
    run(match, 30);
    const time = match.time;
    pauseMatch(match);
    const before = { x: match.players[0].x, y: match.players[0].y };
    run(match, 120, [hold('right', 'down', 'left', 'up'), hold('left')]);
    expect(match.time).toBe(time);
    expect(match.players[0]).toMatchObject(before);
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

describe('출발점과 집 (판마다 무작위, 거리만 같게)', () => {
  it.each(['easy', 'normal', 'hard'])('%s: 시드 60개 모두 두 사람의 거리가 같고, 상자·함정을 피하고, 서로 떨어져 있다', (difficulty) => {
    const diff = DIFFICULTIES[difficulty];
    const problems = [];
    for (let seed = 1; seed <= 60; seed++) {
      const rng = createRng(seed);
      const { maze } = generateMaze({ ...MAZE, width: diff.width, height: diff.height, windiness: diff.windiness, braidRatio: diff.braidRatio }, rng);
      const specials = placeSpecials(maze, diff, rng);
      const { starts, homes } = pickEnds(maze, specials, createRng(seed * 7));
      const d = (c) => distanceAt(maze, c.x, c.y);
      const key = (c) => `${c.x},${c.y}`;
      const special = new Set(specials.boxes.map(key));
      specials.traps.kind.forEach((k, i) => { if (k !== TRAP.NONE) special.add(`${i % maze.width},${Math.floor(i / maze.width)}`); });
      const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (starts === maze.starts) problems.push(`seed ${seed}: 자리를 못 찾음`);
      if (d(starts[0]) !== d(starts[1])) problems.push(`seed ${seed}: 출발점 → 학교 거리 다름`);
      if (d(homes[0]) !== d(homes[1])) problems.push(`seed ${seed}: 학교 → 집 거리 다름`);
      for (const c of [...starts, ...homes]) if (special.has(key(c))) problems.push(`seed ${seed}: 상자·함정 위`);
      if (manhattan(starts[0], starts[1]) < 2 || manhattan(homes[0], homes[1]) < 2) problems.push(`seed ${seed}: 너무 붙어 있음`);
      for (let k = 0; k < 2; k++) {
        const fromStart = distancesFrom(maze, starts[k]);
        if (fromStart[homes[k].y * maze.width + homes[k].x] < d(maze.starts[0]) * 0.5) problems.push(`seed ${seed}: 집이 출발점에 너무 가까움`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('같은 미로라도 판(itemSeed)마다 출발점과 집이 바뀌고, 같은 itemSeed면 같다', () => {
    const at = (itemSeed) => {
      const m = createMatch({ difficulty: 'easy', seed: 11, itemSeed });
      return JSON.stringify([m.starts, m.homes]);
    };
    expect(at(5)).toBe(at(5));
    expect(new Set([1, 2, 3, 4, 5, 6].map(at)).size).toBeGreaterThan(3);
    const m = createMatch({ difficulty: 'easy', seed: 11, itemSeed: 5 });
    expect(m.players.map((p) => ({ x: p.x, y: p.y }))).toEqual(m.starts);
  });
});

