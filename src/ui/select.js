// 준비 화면: 캐릭터 선택(두 사람 동시에, 키보드로), 난이도, 판 수, 안개

import { DIFFICULTIES, DIFFICULTY_ORDER, PLAYERS } from '../config.js';
import { CHARACTERS, characterImg, animatedCharacterImg } from '../render/characters.js';

export const GRID_COLUMNS = 4;

export function selectScreen({ settings, cursors, ready }) {
  const panels = PLAYERS.map((p, i) => {
    const chars = CHARACTERS.map((c, k) => {
      const taken = cursors[1 - i] === k;
      const classes = ['char', cursors[i] === k ? 'selected' : '', taken ? 'taken' : ''].join(' ');
      return `<button class="${classes}" data-action="pick:${i}:${k}" title="${c.name} (${c.type})" ${taken ? 'disabled' : ''}>
          ${(cursors[i] === k ? animatedCharacterImg(c.id, 'char-img') : characterImg(c.id, 'char-img'))}<small>${c.name}</small></button>`;
    }).join('');
    const keys = i === 0
      ? '이동 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · 준비 <kbd>Q</kbd> · 취소 <kbd>E</kbd>'
      : '이동 <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> · 준비 <kbd>1</kbd> · 취소 <kbd>2</kbd>';
    return `
      <section class="select-panel p${i + 1}${ready[i] ? ' ready' : ''}">
        <h3><span class="badge">${p.label}</span> ${characterImg(CHARACTERS[cursors[i]].id, 'inline-avatar')} ${CHARACTERS[cursors[i]].name}</h3>
        <div class="char-grid">${chars}</div>
        <p class="select-keys">${keys}</p>
        <button class="ready-btn" data-action="ready:${i}">${ready[i] ? '✔ 준비 완료!' : '준비하기'}</button>
      </section>`;
  });

  const difficulty = DIFFICULTY_ORDER.map((key, k) => {
    const d = DIFFICULTIES[key];
    return `<button class="choice${key === settings.difficulty ? ' selected' : ''}" data-action="difficulty:${key}">
        <kbd>${k + 1}</kbd><b>${d.label}</b><small>${d.width}×${d.height} · 시야 ${d.vision.radius}칸</small></button>`;
  }).join('');

  const bothReady = ready[0] && ready[1];
  return `
    <div class="card select-card">
      <h2>${bothReady ? '둘 다 준비 완료! 곧 시작해요' : '캐릭터와 규칙을 골라요'}</h2>
      <div class="select-layout">
        ${panels[0]}
        <section class="select-options">
          <h3>난이도</h3>
          <div class="difficulty">${difficulty}</div>
          <h3>판 수</h3>
          <button class="toggle" data-action="bestOf"><kbd>4</kbd> ${settings.bestOf === 1 ? '단판승' : '3판 2선승'}</button>
          <h3>시야</h3>
          <button class="toggle" data-action="fog"><kbd>5</kbd> ${settings.fog ? '안개 켬 (주변만 보임)' : '안개 끔 (미로 전체 보기)'}</button>
        </section>
        ${panels[1]}
      </div>
      <div class="menu row">
        <button data-action="title">뒤로 <kbd>Esc</kbd></button>
        <button class="primary" data-action="start">바로 시작! <kbd>Enter</kbd></button>
      </div>
    </div>`;
}
