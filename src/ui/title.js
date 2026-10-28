// 정원 풍경 위에 놓이는 타이틀 화면
import { CHARACTERS, characterImg, iconImg, animatedCharacterImg } from '../render/characters.js';

/** record: 오늘의 전적 { matches, wins: { 캐릭터id: 승수 } } */
export function titleScreen({ settings, muted, record }) {
  const [c1, c2] = settings.characters;
  return `
    <main class="title-screen" aria-labelledby="garden-title">
      <nav class="title-tools" aria-label="화면과 소리 설정">
        <button data-action="fullscreen">전체화면 <kbd>F</kbd></button>
        <button data-action="mute" aria-pressed="${!muted}">소리 ${muted ? '꺼짐' : '켜짐'} <kbd>M</kbd></button>
      </nav>

      <header class="title-brand">
        <p class="title-eyebrow"><span></span>둘이서 떠나는 정원 속 보물찾기<span></span></p>
        <h1 id="garden-title" class="title-wordmark">귀염뽀짝<span>미로 레이스</span></h1>
        <p class="title-description">한가운데 보석을 찜하고 집까지 먼저 돌아오면 승리!</p>
      </header>

      <figure class="title-companion title-companion-left">
        <div class="title-companion-art">${animatedCharacterImg(c1, 'title-character')}</div>
        <figcaption><b>1P</b><span>W A S D</span></figcaption>
      </figure>
      <figure class="title-companion title-companion-right">
        <div class="title-companion-art">${animatedCharacterImg(c2, 'title-character')}</div>
        <figcaption><b>2P</b><span>방향키</span></figcaption>
      </figure>

      <div class="title-actions">
        <div class="title-treasure" aria-hidden="true"><span></span>${iconImg('treasure', 'title-treasure-image')}<span></span></div>
        <button class="title-start" data-action="setup"><span>시작하기</span><kbd>Enter</kbd></button>
        <button class="title-howto" data-action="howto">놀이 방법 <kbd>H</kbd></button>
      </div>

      <footer class="title-footer">${recordLine(record)}</footer>
    </main>`;
}

function recordLine(record) {
  const known = Object.entries(record?.wins ?? {}).filter(([id]) => CHARACTERS.some((c) => c.id === id));
  if (!record || record.matches === 0) return '<p>키보드 하나, 친구 둘. 함께 보물을 찾아 떠나요!</p>';
  const top = known
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, wins]) => `${characterImg(id, 'inline-avatar')} ${wins}승`)
    .join(' · ');
  return `<p>오늘의 전적 (${record.matches}판)${top ? ` · ${top}` : ''}</p>`;
}
