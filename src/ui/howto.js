// 조작법 · 아이템 · 함정 안내 (행사장에서 설명 없이 이해할 수 있도록)

import { ITEMS, PLAYERS, TRAPS } from '../config.js';
import { iconImg } from '../render/characters.js';

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
  const items = Object.entries(ITEMS)
    .map(([id, it]) => `<li>${iconImg(id, 'howto-icon')}<b>${it.name}</b><small>${it.desc}</small></li>`)
    .join('');
  const traps = Object.entries(TRAPS)
    .map(([id, t]) => `<li>${iconImg(id, 'howto-icon')}<b>${t.name}</b><small>${t.desc}</small></li>`)
    .join('');

  return `
    <div class="card howto-card">
      <h2>이렇게 놀아요</h2>
      <ol class="howto-steps">
        <li>${iconImg('school', 'inline-icon')} 미로 한가운데 <b>학교</b>에 들르고 (등교)</li>
        <li>${iconImg('home', 'inline-icon')} 내 <b>집</b>에 먼저 도착하면 승리! (하교)</li>
      </ol>
      <p class="howto-goal">출발 자리와 집은 판마다 바뀌지만, 두 사람이 가야 하는 거리는 언제나 똑같아요. 안개 때문에 캐릭터 주변만 보이고, 지나온 길은 서서히 어두워져요!</p>
      <div class="howto-players">${players}</div>
      <h3>${iconImg('box', 'inline-icon')} 아이템 상자 <small>최대 2개까지 가방에 넣고, 원할 때 사용 키로 써요</small></h3>
      <ul class="howto-list">${items}</ul>
      <h3>${iconImg('web', 'inline-icon')} 함정 <small>안개 속에 숨어 있다가 가까이 가면 보여요</small></h3>
      <ul class="howto-list">${traps}</ul>
      <p class="note">일시정지 <kbd>Esc</kbd> · 소리 <kbd>M</kbd> · 카운트다운 때 내 캐릭터 발밑이 반짝이고, 집에는 '1P 집'·'2P 집' 이름표가 붙어 있어요</p>
      <div class="menu row"><button class="primary" data-action="title">알겠어요! <kbd>Enter</kbd></button></div>
    </div>`;
}
