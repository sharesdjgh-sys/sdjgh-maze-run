// 게임 루프: 그리기는 매 프레임, 규칙 업데이트는 고정 간격(step)으로 합니다.
// 그래서 화면 주사율이 60Hz든 144Hz든 캐릭터 속도가 같습니다.

export function startLoop({ step, maxFrame, update, render }) {
  let last = performance.now();
  let accumulator = 0;
  let frameId = 0;

  function frame(now) {
    accumulator += Math.min((now - last) / 1000, maxFrame);
    last = now;
    while (accumulator >= step) {
      update(step);
      accumulator -= step;
    }
    render(accumulator / step, now / 1000);
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);
  return {
    stop: () => cancelAnimationFrame(frameId),
  };
}
