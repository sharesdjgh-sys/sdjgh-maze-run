import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, DIFFICULTIES, DIFFICULTY_ORDER, VISION } from '../src/config.js';
import { CHARACTERS } from '../src/data/characters.js';

describe('캐릭터', () => {
  it('16종 모두 id가 겹치지 않고, 원본 그림과 게임용 그림이 있다', () => {
    expect(CHARACTERS).toHaveLength(16);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(16);
    for (const c of CHARACTERS) {
      expect(existsSync(`ref/character-originals/${c.file}.png`), c.file).toBe(true);
      expect(existsSync(`src/assets/characters/${c.id}.webp`), c.id).toBe(true);
    }
  });

  it('기본 캐릭터가 목록에 있다', () => {
    for (const id of DEFAULT_SETTINGS.characters) expect(CHARACTERS.some((c) => c.id === id)).toBe(true);
  });
});
import { computeLayout, figure } from '../src/render/renderer.js';
import { formatTime } from '../src/ui/format.js';

describe('시간 표시', () => {
  it('분:초.0 형식', () => {
    expect(formatTime(0)).toBe('00:00.0');
    expect(formatTime(83.47)).toBe('01:23.4');
    expect(formatTime(0.3)).toBe('00:00.3');
    expect(formatTime(600)).toBe('10:00.0');
  });
});

describe('화면 배치', () => {
  const SCREENS = [
    [1920, 1080], // 큰 모니터·프로젝터
    [1366, 768], // 학교 노트북
    [1280, 1024], // 5:4 모니터
    [1024, 768], // 4:3 프로젝터
  ];

  it.each(SCREENS)('%i×%i: 모든 난이도에서 미로가 화면 안에 들어간다', (w, h) => {
    for (const diff of Object.values(DIFFICULTIES)) {
      const { maze: m } = computeLayout(w, h, diff.width, diff.height);
      expect(m.width).toBe(m.cell * diff.width);
      expect(m.height).toBe(m.cell * diff.height);
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x + m.width).toBeLessThanOrEqual(w);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y + m.height).toBeLessThanOrEqual(h);
    }
  });

  it('16:9 화면에서는 미로가 화면을 거의 꽉 채운다 (가로나 세로의 93% 이상)', () => {
    for (const [w, h] of [[1920, 1080], [1366, 768]]) {
      for (const diff of Object.values(DIFFICULTIES)) {
        const { maze: m } = computeLayout(w, h, diff.width, diff.height);
        const fill = Math.max(m.width / w, m.height / h);
        expect(fill).toBeGreaterThan(0.93);
      }
    }
  });

  it('1920×1080에서 칸 크기: 쉬움 66px 이상, 보통 58px 이상, 어려움 46px 이상 (v11: 칸 수를 줄여 칸을 키움)', () => {
    const cell = (d) => computeLayout(1920, 1080, d.width, d.height).cell;
    expect(cell(DIFFICULTIES.easy)).toBeGreaterThanOrEqual(66);
    expect(cell(DIFFICULTIES.normal)).toBeGreaterThanOrEqual(58);
    expect(cell(DIFFICULTIES.hard)).toBeGreaterThanOrEqual(46);
  });

  it('캐릭터는 칸보다 조금만 커서 주변 벽을 가리지 않는다 (그림 1.4칸 이하, 머리는 위 칸으로 1/4칸까지만)', () => {
    for (const cell of [34, 48, 68]) {
      const f = figure(cell);
      expect(f.size / cell).toBeLessThanOrEqual(1.4);
      expect(f.headDy / cell).toBeGreaterThanOrEqual(-0.75);
    }
  });
});

describe('난이도', () => {
  const levels = DIFFICULTY_ORDER.map((key) => DIFFICULTIES[key]);
  const trapTotal = (d) => d.traps.web + d.traps.ice;

  it('어려울수록 미로가 크고, 시야가 좁고, 지나온 길이 빨리 사라지고, 함정이 많다', () => {
    for (let i = 1; i < levels.length; i++) {
      const [easier, harder] = [levels[i - 1], levels[i]];
      expect(harder.width * harder.height).toBeGreaterThan(easier.width * easier.height);
      expect(harder.vision.radius).toBeLessThan(easier.vision.radius);
      expect(harder.vision.trailFade).toBeLessThan(easier.vision.trailFade);
      expect(trapTotal(harder)).toBeGreaterThan(trapTotal(easier));
    }
  });

  it('가장 좁은 시야도 바로 옆 칸은 보인다 (먹구름 시야보다 넓다)', () => {
    for (const d of levels) expect(d.vision.radius).toBeGreaterThan(VISION.darkRadius + 0.5);
  });
});
