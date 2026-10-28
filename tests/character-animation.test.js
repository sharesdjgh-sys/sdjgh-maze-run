import { describe, expect, it } from 'vitest';
import { characterAnimation } from '../src/render/character-animation.js';

const player = (changes = {}) => ({ index: 0, facing: 'right', moveTimer: 0, moveDuration: 1 / 6, stats: { moves: 0 }, effects: { freeze: 0 }, stuck: 0, ...changes });

describe('캐릭터 애니메이션', () => {
  it('대기 중 눈 깜빡임을 포함한 4프레임을 반복한다', () => {
    expect(new Set(Array.from({ length: 12 }, (_, i) => characterAnimation(player(), i * 0.25).frame))).toEqual(new Set([0, 1, 2, 3]));
    expect(characterAnimation(player(), 0)).toEqual(characterAnimation(player(), 3));
  });
  it('두 발걸음 동안 걷기 4프레임을 순서대로 재생한다', () => {
    const frames = [1, 2].flatMap(moves => [0, 0.6].map(progress => characterAnimation(player({ stats: { moves }, moveTimer: (1 - progress) / 6 }), 0).frame));
    expect(frames).toEqual([4, 5, 6, 7]);
  });
  it('속도가 달라도 이동 진행률에 맞춰 발걸음이 바뀐다', () => {
    const slow = characterAnimation(player({ moveDuration: 0.4, moveTimer: 0.1, stats: { moves: 1 } }), 0);
    const fast = characterAnimation(player({ moveDuration: 0.1, moveTimer: 0.025, stats: { moves: 1 } }), 0);
    expect(slow.frame).toBe(fast.frame);
  });
  it('얼음이나 거미줄에 묶이면 걷기 프레임을 재생하지 않는다', () => {
    for (const changes of [{ effects: { freeze: 2 } }, { stuck: 1 }]) {
      expect(characterAnimation(player({ moveTimer: 0.1, ...changes }), 1)).toMatchObject({ frame: 0, walking: false });
    }
  });
  it('정지한 시각을 다시 렌더하면 같은 프레임을 유지한다', () => {
    expect(characterAnimation(player(), 1.5)).toEqual(characterAnimation(player(), 1.5));
    expect(characterAnimation(player({ finished: true, moveTimer: 0.1 }), 0).walking).toBe(false);
  });
  it('왼쪽 방향은 반전하고 동작 줄이기 설정은 첫 프레임으로 고정한다', () => {
    expect(characterAnimation(player({ facing: 'left' }), 0).flip).toBe(true);
    expect(characterAnimation(player({ moveTimer: 0.1 }), 1, 0, { reducedMotion: true })).toMatchObject({ frame: 0, walking: false });
  });
});
