import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInput } from '../src/core/input.js';
import { toCommand } from '../src/core/controls.js';
import { PLAYERS } from '../src/config.js';

describe('키보드와 여러 손가락의 입력', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('document', new EventTarget());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('두 사람이 이동하면서 아이템을 한 번씩 사용할 수 있다', () => {
    const input = createInput();
    input.press('KeyD', 'touch:1');
    input.press('ArrowUp', 'touch:2');
    input.press('KeyQ', 'touch:3');
    input.press('Numpad2', 'touch:4');
    const presses = input.takePresses();
    const commands = PLAYERS.map(p => toCommand({ keys: p.keys, presses, heldCodes: input.heldCodes() }));
    expect(commands[0]).toEqual({ held: ['right'], pressed: ['right'], items: [0] });
    expect(commands[1]).toEqual({ held: ['up'], pressed: ['up'], items: [1] });
    input.press('KeyQ', 'touch:3');
    expect(input.takePresses()).toEqual([]);
    input.release('touch:1');
    expect(input.heldCodes()).toContain('ArrowUp');
    expect(input.heldCodes()).not.toContain('KeyD');
  });

  it('같은 방향의 키보드·터치 중 하나만 떼어도 다른 입력은 유지한다', () => {
    const input = createInput();
    const down = new Event('keydown');
    Object.assign(down, { code: 'KeyW' });
    window.dispatchEvent(down);
    input.press('KeyW', 'touch:1');
    input.press('KeyW', 'touch:2');
    input.release('touch:1');
    input.release('touch:2');
    expect(input.heldCodes()).toEqual(['KeyW']);
    const up = new Event('keyup');
    Object.assign(up, { code: 'KeyW' });
    window.dispatchEvent(up);
    expect(input.heldCodes()).toEqual([]);
  });

  it.each(['blur', 'visibilitychange', 'scene'])('%s 이후에는 이동과 대기 중인 아이템 입력을 비운다', reason => {
    const onBlur = vi.fn();
    const input = createInput({ onBlur });
    input.press('KeyD', 'touch:1');
    input.press('KeyQ', 'touch:2');
    if (reason === 'scene') input.reset();
    else if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    else {
      document.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    }
    expect(input.heldCodes()).toEqual([]);
    expect(input.takePresses()).toEqual([]);
    if (reason !== 'scene') expect(onBlur).toHaveBeenCalledOnce();
  });
});
