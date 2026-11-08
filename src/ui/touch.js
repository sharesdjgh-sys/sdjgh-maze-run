// 터치 방향키: 손가락마다 입력을 관리해 두 사람이 동시에 이동·아이템을 사용할 수 있습니다.
import { ITEMS, PLAYERS } from '../config.js';
import { touchCodeOf } from '../core/controls.js';
import { iconImg } from '../render/characters.js';

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
      <div class="touch-items">${[0, 1].map(slot => `<button type="button" class="touch-item" data-control="item${slot + 1}" data-code="${p.keys[`item${slot + 1}`][0]}" aria-label="${p.label} 아이템 ${slot + 1} 비어 있음"><span class="touch-slot-number">${slot + 1}</span><span class="touch-item-content"><span class="touch-item-empty">비어 있음</span></span></button>`).join('')}
        <button class="touch-pause" type="button" data-touch-action="pause" aria-label="${p.label} 일시정지">Ⅱ 멈춤</button>
      </div>
    </div>`).join('') + '<p class="touch-landscape-hint">휴대폰을 가로로 돌려 주세요<br /><small>왼쪽 1P · 오른쪽 2P로 미로를 더 넓게 봐요</small></p>';
  document.body.append(root);
  const itemButtons = PLAYERS.map((_, i) => [...root.querySelectorAll(`.p${i + 1} .touch-item`)]);
  const shownItems = PLAYERS.map(() => [undefined, undefined]);
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
    if (root.hidden) return onLayout({}, touchDevice.matches || navigator.maxTouchPoints > 0);
    const pads = [...root.querySelectorAll('.touch-player')];
    pads.forEach((pad, i) => {
      for (const button of pad.querySelectorAll('[data-control]')) {
        button.dataset.code = touchCodeOf(PLAYERS[i].keys, button.dataset.control, i === 1 && !landscape.matches);
      }
    });
    const [first, second] = pads.map(pad => pad.getBoundingClientRect());
    if (landscape.matches) {
      onLayout({ left: first.right, right: window.innerWidth - second.left }, true);
    } else {
      root.style.setProperty('--touch-hint-top', `${second.bottom + 8}px`);
      const hint = root.querySelector('.touch-landscape-hint').getBoundingClientRect();
      onLayout({ top: hint.bottom, bottom: window.innerHeight - first.top }, true);
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
  return {
    setScene(scene) { inGame = scene === 'game'; refresh(); },
    update(match) {
      if (root.hidden || !match) return;
      match.players.forEach((player, i) => player.bag.forEach((item, slot) => {
        if (shownItems[i][slot] === item) return;
        shownItems[i][slot] = item;
        const button = itemButtons[i][slot];
        const name = item ? ITEMS[item].name : '비어 있음';
        // 버튼 자체를 교체하지 않아 이동·아이템을 동시에 누르는 동안에도 캡처를 유지합니다.
        button.querySelector('.touch-item-content').innerHTML = item
          ? `${iconImg(item, 'touch-item-icon')}<span class="touch-item-name">${name}</span>`
          : '<span class="touch-item-empty">비어 있음</span>';
        button.classList.toggle('has-item', Boolean(item));
        button.setAttribute('aria-label', `${PLAYERS[i].label} 아이템 ${slot + 1}: ${name}${item ? ' 사용' : ''}`);
        button.title = item ? `${name}: ${ITEMS[item].desc}` : `아이템 ${slot + 1} 비어 있음`;
      }));
    },
  };
}
