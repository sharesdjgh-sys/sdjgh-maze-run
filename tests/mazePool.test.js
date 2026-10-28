import { describe, expect, it } from 'vitest';
import { DIFFICULTY_ORDER } from '../src/config.js';
import { createMazeDeck } from '../src/core/mazeDeck.js';
import { createRng } from '../src/core/rng.js';
import { MAZE_POOL } from '../src/data/mazePool.js';
import { mazeStats } from '../src/game/analysis.js';
import { rollItem } from '../src/game/items.js';
import { createMatch } from '../src/game/match.js';

describe('미로 목록 (src/data/mazePool.js)', () => {
  it.each(DIFFICULTY_ORDER)('%s: 50개이고 번호가 겹치지 않는다', (difficulty) => {
    const seeds = MAZE_POOL[difficulty].map((m) => m.seed);
    expect(seeds).toHaveLength(50);
    expect(new Set(seeds).size).toBe(50);
  });

  it.each(DIFFICULTY_ORDER)('%s: 저장된 번호로 지금도 똑같은 미로가 만들어진다', (difficulty) => {
    const changed = MAZE_POOL[difficulty].filter(({ seed, shortest, wander }) => {
      const stats = mazeStats(createMatch({ difficulty, seed }).maze);
      return stats.shortest !== shortest || stats.wander !== wander;
    });
    // 실패하면: 미로 생성 방식이나 난이도 수치가 바뀐 것입니다. `npm run maze-pool`로 목록을 다시 만드세요.
    expect(changed.map((m) => m.seed)).toEqual([]);
  });

  it.each(DIFFICULTY_ORDER)('%s: 모두 보물 쪽으로만 가면 최단 경로의 3배 넘게 헤매는 미로다', (difficulty) => {
    for (const { shortest, wander } of MAZE_POOL[difficulty]) expect(wander / shortest).toBeGreaterThan(3);
  });
});

describe('미로 고르기 (섞어서 차례대로)', () => {
  const memoryStorage = () => {
    const data = {};
    return {
      data,
      load: (key, fallback) => (key in data ? JSON.parse(data[key]) : fallback),
      save: (key, value) => {
        data[key] = JSON.stringify(value);
      },
    };
  };
  const seededRandom = (seed) => createRng(seed).next;

  it('50판을 다 할 때까지 같은 미로가 다시 나오지 않는다', () => {
    const deck = createMazeDeck(MAZE_POOL, { storage: memoryStorage(), random: seededRandom(1) });
    const numbers = Array.from({ length: 50 }, () => deck.next('normal').number);
    expect(new Set(numbers).size).toBe(50);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(50);
  });

  it('다 쓰고 새로 섞을 때 방금 한 미로가 바로 다시 나오지 않는다', () => {
    for (let s = 1; s <= 30; s++) {
      const deck = createMazeDeck(MAZE_POOL, { storage: memoryStorage(), random: seededRandom(s) });
      let last = null;
      for (let i = 0; i < 50; i++) last = deck.next('easy').number;
      expect(deck.next('easy').number).not.toBe(last);
    }
  });

  it('브라우저에 순서를 저장해서 껐다 켜도 이어서 나온다', () => {
    const storage = memoryStorage();
    const first = createMazeDeck(MAZE_POOL, { storage, random: seededRandom(2) });
    const a = Array.from({ length: 10 }, () => first.next('hard').number);
    const second = createMazeDeck(MAZE_POOL, { storage, random: seededRandom(99) });
    const b = Array.from({ length: 40 }, () => second.next('hard').number);
    expect(new Set([...a, ...b]).size).toBe(50);
  });

  it('난이도마다 따로 섞고, 저장된 값이 망가져 있어도 새로 섞는다', () => {
    const storage = memoryStorage();
    storage.save('maze-deck', { easy: { order: [1, 2, 'x'], pos: 9 }, normal: 'garbage' });
    const deck = createMazeDeck(MAZE_POOL, { storage, random: seededRandom(3) });
    const pick = deck.next('easy');
    expect(MAZE_POOL.easy[pick.index].seed).toBe(pick.seed);
    expect(deck.next('normal').number).toBeGreaterThanOrEqual(1);
  });
});

describe('같은 미로, 다른 아이템', () => {
  it('미로·상자·함정은 seed로만 정해지고, 아이템은 itemSeed에 따라 달라진다', () => {
    const a = createMatch({ difficulty: 'easy', seed: MAZE_POOL.easy[0].seed, itemSeed: 1 });
    const b = createMatch({ difficulty: 'easy', seed: MAZE_POOL.easy[0].seed, itemSeed: 2 });
    expect(b.maze.walls).toEqual(a.maze.walls);
    expect(b.boxes).toEqual(a.boxes);
    expect(b.traps.kind).toEqual(a.traps.kind);
    const rolls = (m) => Array.from({ length: 20 }, () => rollItem(m.rng));
    expect(rolls(b)).not.toEqual(rolls(a));
  });
});
