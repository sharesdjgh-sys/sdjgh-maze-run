import { describe, expect, it } from 'vitest';
import { PLAYERS } from '../src/config.js';
import { toCommand } from '../src/core/controls.js';

describe('키 입력 → 명령', () => {
  const [p1, p2] = PLAYERS;
  const command = (player, heldCodes, presses = [], reversed = false) =>
    toCommand({ heldCodes, presses, keys: player.keys, reversed });

  it('1P는 WASD, 최근에 누른 키가 앞', () => {
    expect(command(p1, ['KeyW', 'KeyD'], ['KeyD'])).toEqual({ held: ['up', 'right'], pressed: ['right'], items: [] });
  });

  it('2P는 방향키가 그대로 방향', () => {
    expect(command(p2, ['ArrowUp', 'ArrowLeft'], ['ArrowDown'])).toEqual({
      held: ['up', 'left'],
      pressed: ['down'],
      items: [],
    });
  });

  it('아이템 키는 칸 번호로, 상대 키는 무시', () => {
    expect(command(p1, ['ArrowUp', 'KeyQ', 'Numpad2'], ['KeyE', 'KeyQ', 'Numpad1'])).toEqual({
      held: [],
      pressed: [],
      items: [1, 0],
    });
    // 2P는 숫자패드 1·2와 노트북용 . / 키 모두 아이템
    expect(command(p2, ['KeyW', 'Numpad1'], ['Numpad2', 'Period', 'Slash', 'KeyQ'])).toEqual({
      held: [],
      pressed: [],
      items: [1, 0, 1],
    });
  });

  it('빙글빙글에 걸리면 방향이 반대가 된다 (아이템 키는 그대로)', () => {
    expect(command(p1, ['KeyW', 'KeyA'], ['KeyQ'], true)).toEqual({ held: ['down', 'right'], pressed: [], items: [0] });
    expect(command(p2, ['ArrowUp'], [], true).held).toEqual(['down']);
  });
});
