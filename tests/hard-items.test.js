import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.js';
import { rollItem } from '../src/game/items.js';
import { createMatch, compassDirection, useItem } from '../src/game/match.js';
import { canMove, cellIndex } from '../src/game/maze.js';
import { DIRS } from '../src/game/dir.js';
import { corridorMatch, run, hold } from './helpers.js';

describe('어려움 전용 아이템', () => {
  it.each(['easy', 'normal', 'hard'])('%s의 상자에 난이도별 아이템만 나온다', difficulty => {
    const rng = createRng(82);
    const found = new Set(Array.from({length: 5000}, () => rollItem(rng, {difficulty})));
    expect(found.has('compass')).toBe(difficulty === 'hard');
    expect(found.has('ghost')).toBe(difficulty === 'hard');
  });
  it('등교 전후에 현재 목표로 가는 실제 통로를 안내한다', () => {
    const m = createMatch({difficulty: 'hard', seed: 42});
    const p = m.players[0];
    for (const visitedSchool of [false, true]) {
      p.visitedSchool = visitedSchool;
      const direction = compassDirection(m, 0);
      expect(canMove(m.maze, p.x, p.y, direction)).toBe(true);
      const d = DIRS[direction];
      const dist = visitedSchool ? m.homeDist[0] : m.maze.distToTreasure;
      expect(dist[cellIndex(m.maze.width, p.x+d.dx, p.y+d.dy)])
        .toBe(dist[cellIndex(m.maze.width,p.x,p.y)]-1);
    }
  });
  it('망토는 통로에서는 유지되고, 내부 벽 하나를 넘으면 소모된다', () => {
    const m = corridorMatch(); const p = m.players[0];
    p.bag[0] = 'ghost'; useItem(m,0,0);
    run(m,12,[hold('right')]);
    expect(p.x).toBeGreaterThan(0);
    expect(p.effects.ghost).toBeGreaterThan(0);
    run(m,30,[hold('down')]);
    expect(p.y).toBe(1);
    expect(p.effects.ghost).toBe(0);
  });
  it('망토로 바깥벽을 넘지 못하고, 사용하지 않으면 만료된다', () => {
    const m = corridorMatch(); const p = m.players[0];
    p.bag[0] = 'ghost'; useItem(m,0,0);
    run(m,30,[hold('up')]);
    expect(p.y).toBe(0); expect(p.effects.ghost).toBeGreaterThan(0);
    run(m,310); expect(p.effects.ghost).toBe(0);
  });
  it.each(['easy', 'normal', 'hard'])('실제 %s 판의 상자도 난이도를 반영한다', difficulty => {
    const m = corridorMatch({boxes: [[1,0]]});
    m.difficulty = difficulty; m.rng = {next: () => 0};
    run(m,12,[hold('right')]);
    expect(m.players[0].bag[0]).toBe(difficulty === 'hard' ? 'compass' : 'speedUp');
  });
  it('망토로 벽 너머 집에 도착해도 정상적으로 승리한다', () => {
    const m = corridorMatch(); const p = m.players[0];
    m.homes[0] = {x:0,y:1}; p.visitedSchool = true;
    p.bag[0] = 'ghost'; useItem(m,0,0);
    run(m,20,[hold('down')]);
    expect(m.phase).toBe('result'); expect(m.result.winner).toBe(0);
  });
  it('나침반은 사용 즉시 적용되고 3초 뒤 만료된다', () => {
    const m = corridorMatch(); const p = m.players[0];
    p.bag[0]='compass'; useItem(m,0,0);
    expect(p.effects.compass).toBe(3);
    run(m,181); expect(p.effects.compass).toBe(0);
  });
});
