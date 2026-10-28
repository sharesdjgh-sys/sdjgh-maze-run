// 준비 화면: 하나의 공용 명단에서 두 사람이 각자 친구를 고릅니다.
import { DIFFICULTIES, DIFFICULTY_ORDER, PLAYERS } from '../config.js';
import selectionPlinthUrl from '../assets/garden/selection-plinth.webp';
import { CHARACTERS, characterImg, animatedCharacterImg } from '../render/characters.js';

export const GRID_COLUMNS = 4;
const kbds = (keys) => keys.map(key => `<kbd>${key}</kbd>`).join('');

export function selectScreen({ settings, cursors, ready, activePlayer = 0 }) {
  const active = activePlayer === 1 ? 1 : 0;
  const bothReady = ready.every(Boolean);
  const player = (index) => {
    const config = PLAYERS[index], c = CHARACTERS[cursors[index]];
    return `<section class="recruit-player p${index + 1}${ready[index] ? ' is-ready' : ''}" aria-label="${config.label} 캐릭터">
      <button class="recruit-player-label" data-action="select-player:${index}" aria-pressed="${active === index}"><b>${config.label}</b><span>${ready[index] ? '함께 갈 준비 끝!' : '나의 모험 친구'}</span></button>
      <button class="recruit-portrait" data-action="select-player:${index}" aria-label="${config.label} 고르기">
        <span class="recruit-halo" aria-hidden="true"></span>
        <img class="recruit-plinth" src="${selectionPlinthUrl}" alt="" draggable="false" />
        ${animatedCharacterImg(c.id, 'recruit-avatar')}
        ${ready[index] ? '<span class="recruit-ready-seal">준비 완료</span>' : ''}
      </button>
      <h2 class="recruit-name">${c.name}</h2>
      <p class="recruit-move">${kbds(config.keyLabels.move)}<span>고르기</span></p>
      <button class="recruit-ready" data-action="ready:${index}" aria-pressed="${ready[index]}">${ready[index] ? '준비 취소' : '이 친구로 준비!'} <kbd>${ready[index] ? config.keyLabels.item2 : config.keyLabels.item1}</kbd></button>
      <p class="recruit-key-note">${index === 0 ? '다시 고르기 E' : '숫자패드 1·2 / 노트북 .·/'}</p>
    </section>`;
  };
  const roster = CHARACTERS.map((c, index) => {
    const pickedBy = cursors.indexOf(index);
    const taken = pickedBy === 1 - active;
    return `<button class="roster-character${pickedBy >= 0 ? ` is-picked p${pickedBy + 1}` : ''}${cursors[active] === index ? ' is-active' : ''}" data-action="pick:${active}:${index}" aria-label="${c.name} 선택" aria-pressed="${cursors[active] === index}" title="${c.name}" ${taken || ready[active] ? 'disabled' : ''}>
      ${pickedBy >= 0 ? `<span class="roster-player-tag">${PLAYERS[pickedBy].label}</span>` : ''}
      ${characterImg(c.id, 'roster-avatar')}
    </button>`;
  }).join('');
  const difficulties = DIFFICULTY_ORDER.map((id, index) =>
    `<button class="course-choice${settings.difficulty === id ? ' is-chosen' : ''}" data-action="difficulty:${id}" aria-pressed="${settings.difficulty === id}" aria-keyshortcuts="${index + 1}">${DIFFICULTIES[id].label}</button>`
  ).join('');
  return `<main class="garden-select select-card" aria-labelledby="recruit-title">
    <header class="recruit-header">
      <button class="garden-back" data-action="title">돌아가기 <kbd>Esc</kbd></button>
      <p class="garden-eyebrow">오늘의 등하굣길, 누구와 달려 볼까요?</p>
      <h1 id="recruit-title">함께 달릴 친구를 골라요</h1>
      <p class="recruit-instruction" aria-live="polite">${bothReady ? '둘 다 준비 완료! 곧 출발해요!' : '마음에 드는 친구를 고르고, 준비 버튼을 눌러요'}</p>
    </header>
    <div class="recruitment-layout">
      ${player(0)}
      <section class="recruit-board" aria-label="캐릭터 명단">
        <div class="recruit-mouse-tabs" role="group" aria-label="마우스로 고를 플레이어">
          ${PLAYERS.map((p, i) => `<button class="p${i + 1}${active === i ? ' is-active' : ''}" data-action="select-player:${i}" aria-pressed="${active === i}">${p.label} 고르기</button>`).join('')}
        </div>
        <div class="recruit-roster" role="group" aria-label="16명의 모험 친구">${roster}</div>
        <p class="roster-hint">${ready[active] ? `${PLAYERS[active].label} 준비 완료! 다시 고르려면 준비를 취소해요` : `클릭하면 ${PLAYERS[active].label}의 친구가 바뀌어요`}</p>
      </section>
      ${player(1)}
    </div>
    <footer class="recruit-footer">
      <div class="recruit-rules" aria-label="대결 설정">
        <div class="course-options"><span>난이도</span><div role="group" aria-label="난이도">${difficulties}</div></div>
        <button class="garden-setting" data-action="bestOf" aria-keyshortcuts="4">${settings.bestOf === 1 ? '한 판 승부' : '3판 2선승'} <span>변경</span></button>
        <button class="garden-setting" data-action="fog" aria-pressed="${settings.fog}" aria-keyshortcuts="5">안개 ${settings.fog ? '켬' : '끔'} <span>변경</span></button>
      </div>
      <button class="garden-primary recruit-start" data-action="start">이대로 출발! <kbd>Enter</kbd></button>
    </footer>
  </main>`;
}
