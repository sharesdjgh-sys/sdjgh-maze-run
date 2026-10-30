// 아이템 효과의 적용·중첩·만료 (기획서 6.3)
// - 같은 효과를 다시 맞으면 남은 시간만 처음으로 초기화 (쌓이지 않음)
// - 속도 증가와 감소가 함께 걸리면 두 배율을 곱함
// - 얼어 있는 동안과 풀린 뒤 잠깐은 얼음이 통하지 않음
// - 손전등을 켜면 걸려 있던 먹구름이 걷힘

import { ITEMS, ITEM_RULES } from '../config.js';

const EPSILON = 1e-9;
export const EFFECT_KEYS = ['speedUp', 'flashlight', 'slowDown', 'freeze', 'reverse', 'dark', 'compass', 'ghost'];

export function createEffects() {
  return { speedUp: 0, flashlight: 0, slowDown: 0, freeze: 0, reverse: 0, dark: 0, compass: 0, ghost: 0, freezeImmune: 0 };
}

/** 효과를 겁니다. 반환: 'applied'(새로 걸림) | 'refreshed'(시간 초기화) | 'immune'(안 통함) */
export function applyEffect(effects, key) {
  if (key === 'freeze' && (effects.freeze > 0 || effects.freezeImmune > 0)) return 'immune';
  if (key === 'flashlight') effects.dark = 0;
  const had = effects[key] > 0;
  effects[key] = ITEMS[key].duration;
  return had ? 'refreshed' : 'applied';
}

/** 시간을 흘려보내고 이번에 끝난 효과 목록을 돌려줍니다. */
export function tickEffects(effects, dt) {
  if (effects.freezeImmune > 0) effects.freezeImmune = Math.max(0, effects.freezeImmune - dt);
  const ended = [];
  for (const key of EFFECT_KEYS) {
    if (effects[key] <= 0) continue;
    effects[key] -= dt;
    if (effects[key] <= EPSILON) {
      effects[key] = 0;
      ended.push(key);
    }
  }
  if (ended.includes('freeze')) effects.freezeImmune = ITEM_RULES.freezeImmunity;
  return ended;
}

export function speedMultiplier(effects) {
  return (
    (effects.speedUp > 0 ? ITEMS.speedUp.multiplier : 1) * (effects.slowDown > 0 ? ITEMS.slowDown.multiplier : 1)
  );
}

export function isFrozen(effects) {
  return effects.freeze > 0;
}
