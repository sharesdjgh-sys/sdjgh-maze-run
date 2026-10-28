// 아이템 가방(2칸)과 상자에서 아이템 뽑기 (기획서 기능 3, 4)

import { ITEMS, ITEM_RULES } from '../config.js';

export const ITEM_KEYS = Object.keys(ITEMS);

export function createBag() {
  return Array(ITEM_RULES.bagSize).fill(null);
}

/** 비어 있는 칸 중 앞 번호에 넣습니다. 넣은 칸 번호를 돌려주고, 가득 차 있으면 -1 */
export function addToBag(bag, item) {
  const slot = bag.indexOf(null);
  if (slot >= 0) bag[slot] = item;
  return slot;
}

/** 칸의 아이템을 꺼냅니다. 다른 칸의 아이템은 자리를 옮기지 않습니다. 빈 칸이면 null */
export function takeFromBag(bag, slot) {
  const item = bag[slot] ?? null;
  if (item) bag[slot] = null;
  return item;
}

/**
 * 상자에서 나올 아이템을 뽑습니다. behind(뒤처짐)이면 공격 아이템이 더 잘 나옵니다.
 * 안개를 끈 판(fog: false)에서는 손전등처럼 안개 모드 전용 아이템이 나오지 않습니다.
 */
export function rollItem(rng, { behind = false, fog = true } = {}) {
  const boost = behind ? ITEM_RULES.catchUp.attackBoost : 1;
  const weights = ITEM_KEYS.map((key) => {
    if (ITEMS[key].fogOnly && !fog) return 0;
    return ITEMS[key].weight * (ITEMS[key].target === 'enemy' ? boost : 1);
  });
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ITEM_KEYS.length; i++) {
    r -= weights[i];
    if (r < 0) return ITEM_KEYS[i];
  }
  return ITEM_KEYS[ITEM_KEYS.length - 1];
}
