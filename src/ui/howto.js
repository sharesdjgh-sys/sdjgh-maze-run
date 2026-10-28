// 조작법 · 아이템 · 함정 안내 (행사장에서 설명 없이 이해할 수 있도록)

import { ITEMS, PLAYERS, TRAPS } from '../config.js';
import { TREASURE_EMOJI } from '../render/characters.js';

const kbds = (keys) => keys.map((k) => `<kbd>${k}</kbd>`).join('');

export function howtoScreen() {
  const players = PLAYERS.map(
    (p, i) => `
      <div class="howto-player p${i + 1}">
        <span class="badge">${p.label}</span>
        <p>이동 ${kbds(p.keyLabels.move)}</p>
        <p>아이템 ${kbds([p.keyLabels.item1, p.keyLabels.item2])}${i === 1 ? ' <small>(숫자패드, 노트북은 <kbd>.</kbd><kbd>/</kbd>)</small>' : ''}</p>
      </div>`,
  ).join('');
  const items = Object.values(ITEMS)
    .map((it) => `<li><span class="big">${it.emoji}</span><b>${it.name}</b><small>${it.desc}</small></li>`)
    .join('');
  const traps = Object.values(TRAPS)
    .map((t) => `<li><span class="big">${t.emoji}</span><b>${t.name}</b><small>${t.desc}</small></li>`)
    .join('');

  return `
    <div class="card howto-card">
      <h2>이렇게 놀아요</h2>
      <p class="howto-goal">${TREASURE_EMOJI} 미로 한가운데 보물에 먼저 닿으면 승리! 안개 때문에 캐릭터 주변만 보이고, 지나온 길은 다시 어두워져요. 막다른 길이 많으니 길을 잘 기억하세요!</p>
      <div class="howto-players">${players}</div>
      <h3>🎁 아이템 상자 <small>최대 2개까지 가방에 넣고, 원할 때 사용 키로 써요</small></h3>
      <ul class="howto-list">${items}</ul>
      <h3>⚠️ 함정 <small>안개 속에 숨어 있다가 가까이 가면 보여요</small></h3>
      <ul class="howto-list">${traps}</ul>
      <p class="note">일시정지 <kbd>Esc</kbd> · 소리 <kbd>M</kbd> · 1P는 왼쪽 위, 2P는 오른쪽 아래에서 출발해요. 길의 모양은 서로 똑같이(대칭) 생겼어요</p>
      <div class="menu row"><button class="primary" data-action="title">알겠어요! <kbd>Enter</kbd></button></div>
    </div>`;
}
