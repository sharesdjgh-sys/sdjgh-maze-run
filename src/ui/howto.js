// 정원 안내서: 승리 조건, 조작, 아이템, 함정을 같은 디자인으로 안내합니다.
import { DEFAULT_SETTINGS, ITEMS, ITEM_RULES, PLAYERS, TRAPS } from '../config.js';
import { characterImg, getCharacter, iconImg } from '../render/characters.js';

const kbds = keys => keys.map(key => `<kbd>${key}</kbd>`).join('');

// 숫자는 설정에서 읽고, 안내 문장만 짧게 정리합니다.
function itemSummary(id, item) {
  const summaries = {
    speedUp: `${item.duration}초간 내 이동 속도 ${item.multiplier}배!`,
    flashlight: `${item.duration}초간 시야가 넓어지고 먹구름도 걷혀요`,
    slowDown: `${item.duration}초간 상대 이동 속도 ${item.multiplier}배`,
    freeze: `상대를 ${item.duration}초간 얼려요`,
    reverse: `상대가 어질어질! ${item.duration}초간 방향키가 반대예요`,
    dark: `${item.duration}초간 상대가 자기 주변만 보게 해요`,
  };
  return summaries[id] ?? item.desc;
}

export function howtoScreen({ characters = DEFAULT_SETTINGS.characters } = {}) {
  const players = PLAYERS.map((p, i) => {
    const character = getCharacter(characters[i]);
    return `<article class="guide-player p${i + 1}" aria-label="${p.label} 조작법">
      <div class="guide-player-heading"><b class="guide-player-badge">${p.label}</b>${characterImg(character.id, 'guide-character')}<strong>${character.name}</strong></div>
      <div class="guide-player-controls">
        <div><span class="guide-control-label">이동</span><div class="guide-direction-keys" aria-label="이동 키 ${p.keyLabels.move.join(' ')}">${kbds(p.keyLabels.move)}</div></div>
        <div class="guide-item-keys"><span class="guide-control-label">아이템 사용</span><div>${kbds([p.keyLabels.item1, p.keyLabels.item2])}</div><small>${i === 0 ? '원하는 순간에 눌러요' : '숫자패드 1·2<br />노트북은 . · /'}</small></div>
      </div>
    </article>`;
  }).join('');
  const items = Object.entries(ITEMS).map(([id, item]) =>
    `<li class="guide-item${item.target === 'enemy' ? ' is-attack' : ''}">${iconImg(id, 'guide-item-icon')}<div><div class="guide-item-heading"><strong>${item.name}</strong><span>${item.target === 'self' ? '나에게' : '상대에게'}</span></div><p>${itemSummary(id, item)}</p></div></li>`
  ).join('');
  const traps = Object.entries(TRAPS).map(([id, trap]) =>
    `<li class="guide-item guide-trap">${iconImg(id, 'guide-item-icon')}<div><strong>${trap.name}</strong><p>${id === 'ice' ? '빠르게 미끄러져요. 멈추거나 뒤로 돌 수 없고, 갈림길에선 옆으로 꺾어요.' : trap.desc}</p></div></li>`
  ).join('');
  return `<main class="garden-guide howto-card" aria-labelledby="guide-title">
    <header class="guide-header">
      <button class="garden-back" data-action="title">돌아가기 <kbd>Esc</kbd></button>
      <p class="garden-eyebrow">처음이어도 괜찮아요. 함께 읽고 출발해요!</p>
      <h1 id="guide-title">이렇게 놀아요</h1>
      <p class="guide-intro">학교에 들렀다가, 내 집에 먼저 도착하면 승리!</p>
    </header>
    <div class="guide-body" tabindex="0" role="region" aria-label="놀이 방법 안내">
      <div class="guide-spread">
        <div class="guide-column">
          <section class="guide-section guide-goal" aria-labelledby="guide-goal-title">
            <h2 id="guide-goal-title"><span>01</span>학교 들렀다가, 집으로!</h2>
            <ol class="guide-journey">
              <li><span class="guide-step-number">1</span>${iconImg('school', 'guide-destination')}<strong>학교에 등교!</strong><p>먼저 미로 한가운데<br />학교에 들러요</p><span class="guide-route-arrow" aria-hidden="true">→</span></li>
              <li><span class="guide-step-number">2</span>${iconImg('home', 'guide-destination')}<strong>내 집에 하교!</strong><p>학교를 다녀온 뒤<br />내 집에 먼저 도착해요</p></li>
            </ol>
            <div class="guide-home-labels"><span class="p1">1P 집</span><span class="p2">2P 집</span><p>이름표를 보고 내 집을 찾아요</p></div>
            <p class="guide-fairness">출발 자리와 집은 매판 달라져도, 두 사람의 거리는 같아요.</p>
          </section>
          <section class="guide-section" aria-labelledby="guide-controls-title">
            <h2 id="guide-controls-title"><span>02</span>키보드 하나로 둘이서</h2>
            <div class="guide-players">${players}</div>
          </section>
        </div>
        <div class="guide-column">
          <section class="guide-section" aria-labelledby="guide-items-title">
            <h2 id="guide-items-title"><span>03</span>${iconImg('box', 'guide-heading-icon')}상자 속 아이템을 써요</h2>
            <p class="guide-section-intro">최대 ${ITEM_RULES.bagSize}개까지 챙겨 두고, 원하는 순간에 사용해요.</p>
            <ul class="guide-items">${items}</ul>
          </section>
          <section class="guide-section" aria-labelledby="guide-traps-title">
            <h2 id="guide-traps-title"><span>04</span>발밑의 함정을 조심해요</h2>
            <ul class="guide-items guide-traps">${traps}</ul>
            <p class="guide-fog-note">${iconImg('flashlight', 'guide-note-icon')}<span>안개를 켜면 내 주변만 보여요. 지나온 길도 다시 어두워지니 잘 기억해요!</span></p>
          </section>
        </div>
      </div>
    </div>
    <footer class="guide-footer">
      <div class="guide-footer-tools"><p>게임 중 <kbd>Esc</kbd> 잠깐 멈춤</p><button class="guide-quiet" data-action="mute">소리 켜기·끄기 <kbd>M</kbd></button></div>
      <button class="garden-primary" data-action="setup">친구 고르러 가기 <kbd>Enter</kbd></button>
    </footer>
  </main>`;
}
