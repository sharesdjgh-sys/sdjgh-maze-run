// 게임 좌표나 효과를 변경하지 않고 화면에 보여 줄 애니메이션 프레임만 결정합니다.
export const CHARACTER_SHEET = Object.freeze({ columns: 4, rows: 2, frameSize: 256, frames: 8 });
// 가만히 있을 때는 기본 자세에서 가끔 눈만 깜빡입니다. (자세가 바뀌는 1·3번 프레임은 툭툭 튀어 보여서 쓰지 않음)
// 숨쉬는 듯한 움직임은 renderer.js에서 그림 크기를 부드럽게 바꿔서 표현합니다.
const IDLE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0];

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
