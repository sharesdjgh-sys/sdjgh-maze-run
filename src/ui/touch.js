// 터치 방향키: 손가락마다 입력을 관리해 두 사람이 동시에 이동·아이템을 사용할 수 있습니다.
import { PLAYERS } from '../config.js';
import { touchCodeOf } from '../core/controls.js';

const DIRECTIONS = { up: ['▲', '위'], left: ['◀', '왼쪽'], down: ['▼', '아래'], right: ['▶', '오른쪽'] };

export function createTouchControls({ input, onAction, onLayout }) {
  const root = document.createElement('section');
  root.className = 'touch-controls';
  root.setAttribute('aria-label', '터치 조작판');
  root.hidden = true;
  root.innerHTML = PLAYERS.map((p, i) => `
    <div class="touch-player p${i + 1}" aria-label="${p.label} 터치 조작">
      <strong>${p.label}</strong>
      <div class="touch-dpad">${Object.entries(DIRECTIONS).map(([dir, [symbol, label]]) => `<button type="button" class="touch-direction touch-${dir}" data-control="${dir}" data-code="${p.keys[dir][0]}" aria-label="${p.label} 내 기준 ${label} 이동">${symbol}</button>`).join('')}</div>
      <div class="touch-items">${[0, 1].map(slot => `<button type="button" data-control="item${slot + 1}" data-code="${p.keys[`item${slot + 1}`][0]}" aria-label="${p.label} 아이템 ${slot + 1} 사용"><small>아이템</small>${slot + 1}</button>`).join('')}
        <button class="touch-pause" type="button" data-touch-action="pause" aria-label="${p.label} 일시정지">Ⅱ 멈춤</button>
      </div>
    </div>`).join('');
  document.body.append(root);
  const pointers = new Map();
  const touchDevice = window.matchMedia('(any-pointer: coarse)');
  const landscape = window.matchMedia('(orientation: landscape)');
  let inGame = false;

  function release(pointerId) {
    const button = pointers.get(pointerId);
    input.release(`touch:${pointerId}`);
    pointers.delete(pointerId);
    if (button && ![...pointers.values()].includes(button)) button.classList.remove('is-held');
    if (button?.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
  }

  function reset() {
    for (const id of [...pointers.keys()]) release(id);
  }

  root.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-code]');
    if (root.hidden || !button || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button);
    button.classList.add('is-held');
    input.press(button.dataset.code, `touch:${event.pointerId}`);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    root.addEventListener(type, event => release(event.pointerId));
  }
  root.addEventListener('contextmenu', event => event.preventDefault());
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-touch-action]')?.dataset.touchAction;
    if (action) onAction(action);
    // 보조 기술이나 키보드로 버튼을 활성화한 경우에도 한 번 입력합니다.
    const button = event.target.closest('[data-code]');
    if (button && event.detail === 0 && !root.hidden) {
      input.press(button.dataset.code, 'touch:activation');
      input.release('touch:activation');
    }
  });

  function layout() {
    if (root.hidden) return onLayout({});
    const pads = [...root.querySelectorAll('.touch-player')];
    pads.forEach((pad, i) => {
      for (const button of pad.querySelectorAll('[data-control]')) {
        button.dataset.code = touchCodeOf(PLAYERS[i].keys, button.dataset.control, i === 1 && !landscape.matches);
      }
    });
    const [first, second] = pads.map(pad => pad.getBoundingClientRect());
    if (landscape.matches) {
      onLayout({ left: first.right, right: window.innerWidth - second.left });
    } else {
      onLayout({ top: second.bottom, bottom: window.innerHeight - first.top });
    }
  }

  function refresh() {
    reset();
    root.hidden = !inGame || !(touchDevice.matches || navigator.maxTouchPoints > 0);
    layout();
  }
  touchDevice.addEventListener('change', refresh);
  window.addEventListener('resize', () => { reset(); layout(); });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  new ResizeObserver(layout).observe(root);
  return { setScene(scene) { inGame = scene === 'game'; refresh(); } };
}
