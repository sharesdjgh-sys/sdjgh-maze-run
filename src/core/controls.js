// 키 입력 → 플레이어 명령 (이동 방향, 아이템 칸)
// 빙글빙글(조작키 반대)에 걸리면 방향을 뒤집습니다.

import { DIR_NAMES } from '../game/dir.js';

const FLIP = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function screenDirOf(keys, code) {
  return DIR_NAMES.find((dir) => keys[dir].includes(code)) ?? null;
}

/** 아이템 키면 칸 번호(0, 1), 아니면 -1 */
export function itemSlotOf(keys, code) {
  if (keys.item1.includes(code)) return 0;
  if (keys.item2.includes(code)) return 1;
  return -1;
}

/**
 * heldCodes: 누르고 있는 키 (최근에 누른 것부터), presses: 이번에 새로 누른 키
 * keys: 플레이어 키 설정, reversed: 빙글빙글 효과 중인지
 * 반환: { held, pressed, items } — 방향 이름 목록과 사용할 아이템 칸 번호 목록
 */
export function toCommand({ heldCodes, presses, keys, reversed = false }) {
  const toDir = (code) => {
    const dir = screenDirOf(keys, code);
    return dir && reversed ? FLIP[dir] : dir;
  };
  const held = [...new Set(heldCodes.map(toDir).filter(Boolean))];
  const pressed = presses.map(toDir).filter(Boolean);
  const items = presses.map((code) => itemSlotOf(keys, code)).filter((slot) => slot >= 0);
  return { held, pressed, items };
}
