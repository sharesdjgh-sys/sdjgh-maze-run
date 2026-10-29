// 결과 화면은 승리 캐릭터와 축하 연출을 중심으로 보여 줍니다.
import { PLAYERS } from '../config.js';
import { seriesWinner, winsNeeded } from '../game/series.js';
import { getCharacter, homeImageUrl, iconImg, animatedCharacterImg, characterImg, victoryAnimationUrl } from '../render/characters.js';
import { HOMES } from '../data/homes.js';
import podiumUrl from '../assets/garden/victory-podium.webp';

export function resultScreen({ match, series, idleLeft }) {
  const champion = seriesWinner(series);
  const final = champion !== null;
  const draw = match.result.winner === null;
  const winner = champion ?? match.result.winner;
  const characters = match.players.map(p => getCharacter(p.character));
  const winnerCharacter = winner === null ? null : characters[winner];
  const headline = draw ? '나란히 도착!' : `${PLAYERS[winner].label} ${winnerCharacter.name} ${final && series.bestOf > 1 ? '최종 우승!' : '승리!'}`;
  const subtitle = draw ? '이번엔 무승부! 다음엔 누가 먼저일까요?' : `${winnerCharacter.name}, 학교 다녀왔습니다!`;
  const hero = (id) => {
    const motion = victoryAnimationUrl(id);
    return motion
      ? `<div class="victory-jump has-victory-motion"><picture class="victory-motion"><source media="(prefers-reduced-motion: no-preference)" type="image/webp" srcset="${motion}" />${characterImg(id, 'victory-avatar')}</picture></div>`
      : `<div class="victory-jump">${animatedCharacterImg(id, 'victory-avatar')}</div>`;
  };
  const score = series.bestOf > 1 ? `<div class="victory-series" aria-label="시리즈 점수 1P ${series.wins[0]}승, 2P ${series.wins[1]}승">
    ${PLAYERS.map((p, i) => `<div class="victory-score-side p${i + 1}"><b>${p.label}</b><span class="victory-score-stars" aria-hidden="true">${Array.from({ length: winsNeeded(series) }, (_, j) => `<span class="${series.wins[i] > j ? 'is-won' : ''}">★</span>`).join('')}</span></div>`).join('<span class="victory-score-divider">:</span>')}
    <span class="victory-series-note">${final ? '먼저 두 번 이겼어요!' : '먼저 두 번 이기면 우승!'}</span>
  </div>` : '';
  return `<main class="garden-result result-card${draw ? ' is-draw' : ` p${winner + 1}`}" data-result-winner="${winner ?? 'draw'}" aria-labelledby="victory-title">
    <span class="victory-warmth" aria-hidden="true"></span>
    <header class="victory-header">
      <p class="garden-eyebrow">${draw ? '마지막까지, 멋진 승부!' : final && series.bestOf > 1 ? '등하굣길 챔피언 탄생!' : '오늘의 레이스 주인공!'}</p>
      <h1 id="victory-title">${headline}</h1>
      <p class="victory-subtitle">${subtitle}</p>
    </header>
    <div class="celebration-stage${draw ? '' : ' victory-homecoming'}">
      <span class="victory-rays" aria-hidden="true"></span>
      <span class="victory-spark victory-spark-one" aria-hidden="true">✦</span><span class="victory-spark victory-spark-two" aria-hidden="true">✦</span><span class="victory-spark victory-spark-three" aria-hidden="true">✧</span>
      ${draw ? '' : `<img class="victory-home" src="${homeImageUrl(winnerCharacter.id)}" alt="${winnerCharacter.name}의 ${HOMES[winnerCharacter.id].name}" draggable="false" />`}
      <img class="victory-podium" src="${podiumUrl}" alt="" draggable="false" />
      <div class="victory-figures${draw ? ' victory-duo' : ''}">${draw ? characters.map(c => hero(c.id)).join('') : hero(winnerCharacter.id)}</div>
      ${draw ? `<div class="victory-trophy" aria-hidden="true">${iconImg('sparkles', 'victory-trophy-icon')}</div>` : ''}
    </div>
    <div class="victory-actions">
      ${score}
      <button class="garden-primary victory-again" data-action="next">${draw ? '다시 대결!' : !final && series.bestOf > 1 ? '다음 판으로!' : '한 판 더!'} <kbd>Enter</kbd></button>
      <div class="victory-secondary">
        <button data-action="setup">캐릭터 바꾸기 <kbd>C</kbd></button>
        <button data-action="title">처음으로 <kbd>Esc</kbd></button>
      </div>
    </div>
    ${final && idleLeft !== null ? `<p class="victory-idle" data-result-idle ${idleLeft > 10 ? 'hidden' : ''}>${idleLeft}초 뒤 처음 화면으로 돌아가요</p>` : ''}
  </main>`;
}
