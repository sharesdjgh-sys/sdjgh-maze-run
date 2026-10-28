// 안개(시야 제한): 캐릭터 주변만 보이고, 지나온 길은 몇 초에 걸쳐 서서히 어두워집니다. (그리기는 renderer.js)
// 칸마다 '마지막으로 본 시각'을 기록해 두고, 그 뒤로 시간이 지날수록 흐리게 그립니다.
// vision에는 판마다(난이도마다) 정한 시야 설정 { radius, trailFade, trailStrength, ... }이 들어옵니다.

import { VISION } from '../config.js';

/** 지금 이 플레이어의 시야 반경. 먹구름이 가장 우선이고, 그다음 손전등, 아니면 난이도별 기본 시야 */
export function visionRadius(effects, vision = VISION) {
  if (effects.dark > 0) return vision.darkRadius;
  if (effects.flashlight > 0) return vision.flashlightRadius;
  return vision.radius;
}

/** 칸 수만큼의 '마지막으로 본 시각' 기록 (처음엔 본 적 없음) */
export function createSeen(cellCount) {
  return new Float32Array(cellCount).fill(-Infinity);
}

/** (cx, cy)에서 radius 안에 또렷하게 보이는 칸을 time에 본 것으로 기록합니다. */
export function markSeen(seenAt, maze, cx, cy, radius, time) {
  const { width, height } = maze;
  const r = Math.ceil(radius);
  const limit = radius * radius;
  for (let y = Math.max(0, cy - r); y <= Math.min(height - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(width - 1, cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= limit) seenAt[y * width + x] = time;
    }
  }
}

/** 지나온 길의 남은 밝기 (0~trailStrength). 방금 본 칸일수록 밝고, trailFade초가 지나면 0 */
export function trailBrightness(seenAt, now, vision = VISION) {
  const age = now - seenAt;
  if (!(age < vision.trailFade)) return 0;
  return vision.trailStrength * (1 - Math.max(0, age) / vision.trailFade);
}

/** 난이도의 시야 설정을 기본값(VISION)과 합칩니다. */
export function visionFor(difficulty) {
  return { ...VISION, ...(difficulty?.vision ?? {}) };
}
