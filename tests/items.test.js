import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, ITEMS, ITEM_RULES, MAZE, PLACEMENT, TRAPS, VISION } from '../src/config.js';
import { createRng } from '../src/core/rng.js';
import { applyEffect, createEffects, speedMultiplier, tickEffects } from '../src/game/effects.js';
import { ITEM_KEYS, addToBag, createBag, rollItem, takeFromBag } from '../src/game/items.js';
import { canMove, cellIndex, distanceAt, distancesFrom, generateMaze, rotateIndex180 } from '../src/game/maze.js';
import { useItem } from '../src/game/match.js';
import { TRAP, placeSpecials } from '../src/game/placement.js';
import { createSeries, recordResult, seriesWinner } from '../src/game/series.js';
import { trailBrightness, visionRadius } from '../src/game/vision.js';
import { DT, buildMaze, corridorMatch, eventsOf, hold, idle, run, useSlot } from './helpers.js';

const ticks = (seconds) => Math.round(seconds / DT);

describe('가방', () => {
  it('빈 칸 중 앞 번호에 넣고, 꺼내도 다른 칸은 자리를 옮기지 않는다', () => {
    const bag = createBag();
    expect(addToBag(bag, 'freeze')).toBe(0);
    expect(addToBag(bag, 'dark')).toBe(1);
    expect(addToBag(bag, 'reverse')).toBe(-1);
    expect(takeFromBag(bag, 0)).toBe('freeze');
    expect(bag).toEqual([null, 'dark']);
    expect(takeFromBag(bag, 0)).toBeNull();
    expect(addToBag(bag, 'speedUp')).toBe(0);
    expect(bag).toEqual(['speedUp', 'dark']);
  });

  it('상자에서 나오는 아이템 비율이 설정과 비슷하고, 뒤처지면 공격 아이템이 더 나온다', () => {
    const rng = createRng(9);
    const count = (behind) => {
      const tally = Object.fromEntries(ITEM_KEYS.map((k) => [k, 0]));
      for (let i = 0; i < 20000; i++) tally[rollItem(rng, { behind })] += 1;
      return tally;
    };
    const normal = count(false);
    const totalWeight = ITEM_KEYS.reduce((sum, k) => sum + ITEMS[k].weight, 0);
    for (const k of ITEM_KEYS) expect(normal[k] / 20000).toBeCloseTo(ITEMS[k].weight / totalWeight, 1);
    expect(count(true).speedUp).toBeLessThan(normal.speedUp * 0.85);
  });
});

describe('효과 규칙', () => {
  it('같은 효과를 다시 맞으면 시간만 초기화된다', () => {
    const e = createEffects();
    expect(applyEffect(e, 'slowDown')).toBe('applied');
    tickEffects(e, 3);
    expect(applyEffect(e, 'slowDown')).toBe('refreshed');
    expect(e.slowDown).toBe(ITEMS.slowDown.duration);
  });

  it('속도 증가와 감소가 함께 걸리면 배율을 곱한다', () => {
    const e = createEffects();
    applyEffect(e, 'speedUp');
    applyEffect(e, 'slowDown');
    expect(speedMultiplier(e)).toBeCloseTo(ITEMS.speedUp.multiplier * ITEMS.slowDown.multiplier);
  });

  it('얼어 있는 동안과 풀린 뒤 잠깐은 얼음이 통하지 않는다', () => {
    const e = createEffects();
    expect(applyEffect(e, 'freeze')).toBe('applied');
    expect(applyEffect(e, 'freeze')).toBe('immune');
    expect(tickEffects(e, ITEMS.freeze.duration)).toEqual(['freeze']);
    expect(applyEffect(e, 'freeze')).toBe('immune');
    tickEffects(e, ITEM_RULES.freezeImmunity + 0.01);
    expect(applyEffect(e, 'freeze')).toBe('applied');
  });

  it('먹구름에 걸리면 시야가 좁아진다', () => {
    const e = createEffects();
    expect(visionRadius(e)).toBe(VISION.radius);
    applyEffect(e, 'dark');
    expect(visionRadius(e)).toBe(VISION.darkRadius);
  });

  it('손전등을 켜면 시야가 넓어지고, 걸려 있던 먹구름이 걷힌다', () => {
    const e = createEffects();
    applyEffect(e, 'dark');
    applyEffect(e, 'flashlight');
    expect(e.dark).toBe(0);
    expect(visionRadius(e)).toBe(VISION.flashlightRadius);
    // 손전등을 켠 상태에서 먹구름을 맞으면 먹구름이 이김
    applyEffect(e, 'dark');
    expect(visionRadius(e)).toBe(VISION.darkRadius);
    expect(VISION.darkRadius).toBeLessThan(VISION.radius);
    expect(VISION.flashlightRadius).toBeGreaterThan(VISION.radius);
  });

  it('안개를 끈 판에서는 손전등이 상자에서 나오지 않는다', () => {
    const rng = createRng(3);
    const items = new Set(Array.from({ length: 3000 }, () => rollItem(rng, { fog: false })));
    expect(items.has('flashlight')).toBe(false);
    expect(items.size).toBe(ITEM_KEYS.length - 1);
  });
});

describe('지나온 길 (서서히 어두워짐)', () => {
  it('방금 본 칸은 밝고, 시간이 지날수록 어두워지다가 사라진다', () => {
    expect(trailBrightness(10, 10)).toBeCloseTo(VISION.trailStrength);
    expect(trailBrightness(10, 10 + VISION.trailFade / 2)).toBeCloseTo(VISION.trailStrength / 2);
    expect(trailBrightness(10, 10 + VISION.trailFade)).toBe(0);
    expect(trailBrightness(-Infinity, 5)).toBe(0); // 본 적 없는 칸
  });

  it('걸어가면 지나온 칸은 예전 시각, 지금 칸은 방금 본 시각으로 기록된다', () => {
    const match = corridorMatch();
    run(match, ticks(0.9), [hold('right'), idle()]);
    const p = match.players[0];
    const width = match.maze.width;
    expect(p.x).toBeGreaterThanOrEqual(5);
    expect(p.seenAt[0 * width + p.x]).toBeCloseTo(match.time);
    expect(p.seenAt[0]).toBeLessThan(match.time - 0.3); // 출발점(0,0)은 한참 전에 봄
    expect(trailBrightness(p.seenAt[0], match.time)).toBeLessThan(VISION.trailStrength);
  });
});

describe('아이템 상자', () => {
  it('상자를 밟으면 가방 빈 칸에 아이템이 들어가고 상자는 10초 뒤 다시 생긴다', () => {
    const match = corridorMatch({ boxes: [[2, 0]] });
    run(match, ticks(0.5), [hold('right'), idle()]);
    expect(match.players[0].bag[0]).not.toBeNull();
    expect(match.boxes[0].active).toBe(false);
    expect(eventsOf(match, 'pickup')).toHaveLength(1);
    run(match, ticks(ITEM_RULES.boxRespawn) + 2);
    expect(match.boxes[0].active).toBe(true);
    expect(eventsOf(match, 'boxRespawn')).toHaveLength(1);
  });

  it('가방이 가득 차면 아이템을 받지 못하고 상자는 그 자리에 남는다', () => {
    const match = corridorMatch({ boxes: [[2, 0]] });
    match.players[0].bag = ['freeze', 'dark'];
    run(match, ticks(0.5), [hold('right'), idle()]);
    expect(match.players[0].bag).toEqual(['freeze', 'dark']);
    expect(match.boxes[0].active).toBe(true);
    expect(eventsOf(match, 'bagFull')).toHaveLength(1);
  });
});

describe('아이템 사용', () => {
  it('빈 칸의 키를 누르면 아무 일도 없다', () => {
    const match = corridorMatch();
    expect(useItem(match, 0, 1)).toBe(false);
    expect(match.events).toEqual([]);
  });

  it('상대용 아이템은 0.4초 동안 날아간 뒤 맞는 순간 효과가 시작된다', () => {
    const match = corridorMatch();
    match.players[0].bag[0] = 'freeze';
    run(match, 1, [useSlot(0), idle()]);
    expect(match.players[0].bag[0]).toBeNull();
    expect(match.projectiles).toHaveLength(1);
    run(match, ticks(ITEM_RULES.projectileTime) - 3);
    expect(match.players[1].effects.freeze).toBe(0);
    run(match, 3);
    expect(match.players[1].effects.freeze).toBeGreaterThan(0);
    expect(match.players[0].stats).toMatchObject({ itemsUsed: 1, itemsHit: 1 });
    expect(eventsOf(match, 'effect')).toEqual([{ type: 'effect', player: 1, item: 'freeze', from: 0, refreshed: false }]);
  });

  it('얼어 있는 상대에게 또 얼음을 쓰면 튕겨 나간다', () => {
    const match = corridorMatch();
    match.players[0].bag = ['freeze', 'freeze'];
    run(match, 1, [useSlot(0), idle()]);
    run(match, ticks(0.5));
    run(match, 1, [useSlot(1), idle()]);
    run(match, ticks(0.5));
    expect(eventsOf(match, 'immune')).toHaveLength(1);
    expect(match.players[0].stats.itemsHit).toBe(1);
  });

  it('번개 신발은 바로 내게 걸리고 더 빨리 움직인다', () => {
    const match = corridorMatch();
    match.players[0].bag[0] = 'speedUp';
    run(match, 1, [useSlot(0), idle()]);
    expect(match.players[0].effects.speedUp).toBeGreaterThan(0);
    run(match, ticks(0.5), [hold('right'), idle()]);
    expect(match.players[0].x).toBe(5); // 6칸/초 × 1.5 = 9칸/초 → 0.5초에 5칸째 출발
  });

  it('얼음에 갇히면 못 움직이지만 아이템은 쓸 수 있다', () => {
    const match = corridorMatch();
    match.players[0].effects.freeze = 1;
    match.players[0].bag[0] = 'dark';
    run(match, ticks(0.5), [{ held: ['right'], pressed: [], items: [0] }, idle()]);
    expect(match.players[0].x).toBe(0);
    expect(match.players[0].bag[0]).toBeNull();
  });
});

describe('함정', () => {
  it(`거미줄을 밟으면 ${TRAPS.web.stuckTime}초 동안 묶인다`, () => {
    const match = corridorMatch({ traps: { web: [[1, 0]] } });
    run(match, ticks(0.2), [hold('right'), idle()]); // (1,0) 거미줄에 도착
    expect(match.players[0].x).toBe(1);
    run(match, ticks(TRAPS.web.stuckTime) - 6, [hold('right'), idle()]);
    expect(match.players[0].x).toBe(1);
    run(match, 10, [hold('right'), idle()]);
    expect(match.players[0].x).toBe(2);
    expect(eventsOf(match, 'trap')[0]).toMatchObject({ trap: 'web', player: 0 });
  });

  it('얼음 바닥에서는 키를 떼도 얼음이 끝날 때까지 미끄러진다', () => {
    const match = corridorMatch({ traps: { ice: [[2, 0], [3, 0], [4, 0]] } });
    run(match, 20, [hold('right'), idle()]); // (2,0) 얼음으로 들어설 때까지만 누름
    expect(match.players[0].x).toBe(2);
    run(match, 8, [hold('left'), idle()]); // 미끄러지는 중에 반대로 눌러도 소용없음
    run(match, 40);
    expect(match.players[0].x).toBe(5);
    expect(eventsOf(match, 'trap').filter((e) => e.trap === 'ice')).toHaveLength(1);
  });

  it('얼음 위에서도 갈림길에서 옆으로는 꺾을 수 있다 (얼음이 길을 막지 않음)', () => {
    const n = 7;
    const openings = [];
    for (let x = 0; x < n - 1; x++) openings.push([[x, 0], [x + 1, 0]]);
    openings.push([[3, 0], [3, 1]]); // (3,0)에서 아래로 갈림길
    const match = corridorMatch({ traps: { ice: [[2, 0], [3, 0], [4, 0]] } });
    match.maze = match.world.maze = buildMaze(n, n, openings);
    run(match, 20, [hold('right'), idle()]);
    run(match, 30, [hold('down'), idle()]);
    expect(match.players[0]).toMatchObject({ x: 3, y: 1 });
  });
});

describe('상자·함정 배치', () => {
  it.each(Object.entries(DIFFICULTIES))('%s: 시드 100개 모두 대칭이고 출발점·보물 근처를 비운다', (_, diff) => {
    const failures = [];
    for (let seed = 1; seed <= 100; seed++) {
      const rng = createRng(seed);
      const { maze } = generateMaze({ ...MAZE, width: diff.width, height: diff.height, windiness: diff.windiness, braidRatio: diff.braidRatio }, rng);
      const { boxes, traps } = placeSpecials(maze, diff, rng);
      const { width, height } = maze;
      const count = width * height;
      const rot = (i) => rotateIndex180(count, i);
      const fromStart = distancesFrom(maze, maze.starts[0]);
      const boxSet = new Set(boxes.map((b) => cellIndex(width, b.x, b.y)));
      const problems = [];
      if (boxes.length !== diff.boxPairs * 2) problems.push(`상자 ${boxes.length}개`);
      for (const i of boxSet) if (!boxSet.has(rot(i))) problems.push('상자 비대칭');
      const special = [...boxSet];
      for (let i = 0; i < count; i++) {
        const k = traps.kind[i];
        if (k === TRAP.NONE) continue;
        special.push(i);
        if (boxSet.has(i)) problems.push('상자와 함정 겹침');
        if (traps.kind[rot(i)] !== k) problems.push('함정 비대칭');
      }
      const webs = traps.kind.filter((k) => k === TRAP.WEB).length;
      if (webs !== diff.traps.web * 2) problems.push(`거미줄 ${webs}칸`);
      for (const i of special) {
        const x = i % width;
        const y = Math.floor(i / width);
        if (Math.min(fromStart[i], fromStart[rot(i)]) < PLACEMENT.minDistFromStart) problems.push('출발점에 너무 가까움');
        if (distanceAt(maze, x, y) < PLACEMENT.minDistFromTreasure) problems.push('보물에 너무 가까움');
      }
      if (problems.length) failures.push(`seed ${seed}: ${[...new Set(problems)].join(', ')}`);
    }
    expect(failures).toEqual([]);
  });

  it('얼음 바닥은 곧게 이어진 길 위에 있다', () => {
    const rng = createRng(5);
    const diff = DIFFICULTIES.hard;
    const { maze } = generateMaze({ ...MAZE, width: diff.width, height: diff.height, windiness: diff.windiness, braidRatio: diff.braidRatio }, rng);
    const { traps } = placeSpecials(maze, diff, rng);
    const { width, height } = maze;
    let ice = 0;
    for (let i = 0; i < width * height; i++) {
      if (traps.kind[i] !== TRAP.ICE) continue;
      ice++;
      const x = i % width;
      const y = Math.floor(i / width);
      const neighbors = [['right', 1, 0], ['down', 0, 1], ['left', -1, 0], ['up', 0, -1]].filter(
        ([dir, dx, dy]) => canMove(maze, x, y, dir) && traps.kind[cellIndex(width, x + dx, y + dy)] === TRAP.ICE,
      );
      expect(neighbors.length).toBeGreaterThanOrEqual(1);
    }
    expect(ice).toBeGreaterThanOrEqual(diff.traps.ice * 2 * TRAPS.ice.length[0]);
  });
});

describe('3판 2선승', () => {
  it('먼저 2번 이긴 사람이 최종 승자, 무승부는 점수에 들어가지 않는다', () => {
    const series = createSeries(3);
    recordResult(series, 0);
    recordResult(series, null);
    expect(seriesWinner(series)).toBeNull();
    recordResult(series, 1);
    expect(seriesWinner(series)).toBeNull();
    recordResult(series, 1);
    expect(seriesWinner(series)).toBe(1);
    expect(series).toMatchObject({ wins: [1, 2], draws: 1 });
  });

  it('단판승은 한 번 이기면 끝', () => {
    const series = createSeries(1);
    recordResult(series, 0);
    expect(seriesWinner(series)).toBe(0);
  });
});
