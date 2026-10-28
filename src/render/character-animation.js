// 게임 좌표나 효과를 변경하지 않고 화면에 보여 줄 애니메이션 프레임만 결정합니다.
export const CHARACTER_SHEET = Object.freeze({ columns: 4, rows: 2, frameSize: 256, frames: 8 });
const IDLE = [0, 0, 0, 0, 1, 0, 2, 0, 3, 0, 0, 0];

export function characterAnimation(player, time, extraTime = 0, { reducedMotion = false } = {}) {
  const flip = player.facing === 'left';
  const held = player.effects?.freeze > 0 || player.stuck > 0;
  if (reducedMotion || held) return { frame: 0, flip, walking: false };
  const walking = player.moveTimer > 0 && !player.finished;
  if (walking) {
    const progress = Math.min(1, Math.max(0, 1 - Math.max(0, player.moveTimer - extraTime) / player.moveDuration));
    const steps = Math.max(0, (player.stats?.moves ?? 1) - 1) + progress;
    return { frame: 4 + Math.floor(steps * 2) % 4, flip, walking: true };
  }
  const tick = Math.floor(Math.max(0, time + (player.index ?? 0) * 0.41) * 4);
  return { frame: IDLE[tick % IDLE.length], flip, walking: false };
}
