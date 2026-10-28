// 키보드 입력. 반드시 event.code로 판별합니다. (기획서 8.7)
// event.key를 쓰면 한글 입력 상태에서 W가 'ㅈ'이 되고,
// NumLock이 꺼지면 숫자패드 2가 ArrowDown이 되어 2P가 움직이는 버그가 생깁니다.

import { MENU_KEYS, PLAYERS } from '../config.js';

// 브라우저 기본 동작(스크롤, 빠른 찾기 등)을 막을 키
const CAPTURED_CODES = new Set([
  ...PLAYERS.flatMap((p) => Object.values(p.keys).flat()),
  ...Object.values(MENU_KEYS).flatMap((keys) => Object.keys(keys)),
  'Space',
]);

export function createInput({ onBlur } = {}) {
  const held = new Map(); // code → 누른 순서 번호
  let order = 0;
  let presses = [];

  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return; // 브라우저 단축키는 건드리지 않음
    if (CAPTURED_CODES.has(event.code)) event.preventDefault();
    if (event.repeat) {
      // 자동 반복 입력은 새 입력으로 치지 않습니다. 창 전환으로 초기화된 경우에만 다시 기록합니다.
      if (!held.has(event.code)) held.set(event.code, ++order);
      return;
    }
    held.set(event.code, ++order);
    presses.push(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  // 창을 벗어나면 keyup을 못 받아서 키가 눌린 채로 남으므로 모두 초기화합니다.
  function onLeave() {
    held.clear();
    presses = [];
    onBlur?.();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onLeave();
  });

  return {
    /** 지난번 호출 이후 새로 누른 키 (누른 순서대로) */
    takePresses() {
      const taken = presses;
      presses = [];
      return taken;
    },
    /** 지금 누르고 있는 키 (최근에 누른 것부터) */
    heldCodes() {
      return [...held.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code);
    },
  };
}
