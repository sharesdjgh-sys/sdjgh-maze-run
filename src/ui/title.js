// 타이틀 화면

import { CHARACTERS, TREASURE_EMOJI, characterImg } from '../render/characters.js';

/** record: 오늘의 전적 { matches, wins: { 캐릭터id: 승수 } } */
export function titleScreen({ settings, muted, record }) {
  const [c1, c2] = settings.characters;
  return `
    <div class="card title-card">
      <p class="title-chars">${characterImg(c1, 'title-avatar')}<span>${TREASURE_EMOJI}</span>${characterImg(c2, 'title-avatar')}</p>
      <h1 class="logo">귀염뽀짝<br /><span>미로 레이스</span></h1>
      <p class="subtitle">안개 낀 미로에서 가운데 보물을 먼저 차지하면 승리!</p>
      <div class="menu">
        <button class="primary" data-action="setup">시작하기 <kbd>Enter</kbd></button>
        <button data-action="howto">조작법 · 아이템 · 함정 <kbd>H</kbd></button>
        <div class="menu row">
          <button data-action="fullscreen">전체화면 <kbd>F</kbd></button>
          <button data-action="mute">${muted ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'} <kbd>M</kbd></button>
        </div>
      </div>
      ${recordLine(record)}
    </div>`;
}

function recordLine(record) {
  const known = Object.entries(record?.wins ?? {}).filter(([id]) => CHARACTERS.some((c) => c.id === id));
  if (!record || record.matches === 0) return '<p class="note">한 컴퓨터에서 두 명이 키보드를 나눠 쓰는 대결 게임이에요</p>';
  const top = known
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, wins]) => `${characterImg(id, 'inline-avatar')} ${wins}승`)
    .join(' · ');
  return `<p class="note">오늘의 전적 (${record.matches}판)${top ? ` · ${top}` : ''}</p>`;
}
