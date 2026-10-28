// 결과 화면: 승자(또는 무승부), 시간, 3판 2선승 점수, 통계 (기획서 기능 6)

import { DIFFICULTIES, PLAYERS } from '../config.js';
import { seriesWinner } from '../game/series.js';
import { characterImg, getCharacter, iconImg } from '../render/characters.js';
import { formatTime } from './format.js';

export function resultScreen({ match, series, idleLeft }) {
  const { result } = match;
  const diff = DIFFICULTIES[match.difficulty];
  const characters = match.players.map((p) => getCharacter(p.character));
  const champion = seriesWinner(series);
  const final = champion !== null;
  const badge = (i) => `<span class="badge p${i + 1}">${PLAYERS[i].label}</span>`;
  const hero = (id) => characterImg(id, 'hero-avatar');

  let headline;
  let heroHtml;
  if (final && series.bestOf > 1) {
    heroHtml = `${iconImg('trophy', 'hero-avatar')}${hero(characters[champion].id)}`;
    headline = `${badge(champion)} ${characters[champion].name} 최종 승리!`;
  } else if (result.winner === null) {
    heroHtml = characters.map((c) => hero(c.id)).join('');
    headline = '동시 도착! 무승부';
  } else {
    heroHtml = hero(characters[result.winner].id);
    headline = `${badge(result.winner)} ${characters[result.winner].name} ${series.bestOf > 1 ? '이번 판 승리!' : '승리!'}`;
  }

  const score =
    series.bestOf > 1
      ? `<p class="result-score">${badge(0)} ${series.wins[0]} : ${series.wins[1]} ${badge(1)}
         <small>${final ? '3판 2선승 끝!' : `${series.round}판째 · 먼저 2승하면 우승`}</small></p>`
      : '';

  const rows = [
    ['이동한 칸', (s) => `${s.moves}칸`],
    ['헤맨 칸', (s) => `${s.wandered}칸`],
    ['아이템 사용', (s) => `${s.itemsUsed}개 (명중 ${s.itemsHit})`],
    ['함정에 걸림', (s) => `${s.trapsHit}번`],
  ]
    .map(([label, value]) => `<tr><th>${label}</th>${result.players.map((s) => `<td>${value(s)}</td>`).join('')}</tr>`)
    .join('');

  const nextLabel = final ? '재도전' : series.bestOf > 1 ? '다음 판' : '다시 한 판';
  return `
    <div class="card result-card">
      <div class="result-hero">${heroHtml}</div>
      <h2>${headline}</h2>
      <p class="result-time">⏱ ${formatTime(result.time)} · ${diff.label}${match.mazeNumber ? ` 미로 ${match.mazeNumber}번` : ` ${diff.width}×${diff.height}`}${match.fog ? ' · 안개' : ''}</p>
      ${score}
      <table class="stats">
        <thead><tr><th></th>${[0, 1].map((i) => `<th>${badge(i)} ${characterImg(characters[i].id, 'inline-avatar')}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">이번 미로의 최단 거리: ${result.players[0].shortest}칸</p>
      <div class="menu row">
        <button class="primary" data-action="next">${nextLabel} <kbd>Enter</kbd></button>
        <button data-action="setup">캐릭터 다시 고르기 <kbd>C</kbd></button>
        <button data-action="title">처음으로 <kbd>Esc</kbd></button>
      </div>
      ${final && idleLeft !== null ? `<p class="note">${idleLeft}초 동안 아무것도 누르지 않으면 처음 화면으로 돌아가요</p>` : ''}
    </div>`;
}
