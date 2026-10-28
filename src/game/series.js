// 단판승 / 3판 2선승 점수 관리. 무승부는 점수에 들어가지 않습니다.

export function createSeries(bestOf = 1) {
  return { bestOf, wins: [0, 0], round: 1, draws: 0 };
}

export function winsNeeded(series) {
  return Math.ceil(series.bestOf / 2);
}

/** 한 판 결과를 기록합니다. winner가 null이면 무승부 */
export function recordResult(series, winner) {
  if (winner === null) series.draws += 1;
  else series.wins[winner] += 1;
}

/** 시리즈 최종 승자 (아직 안 끝났으면 null) */
export function seriesWinner(series) {
  const need = winsNeeded(series);
  const index = series.wins.findIndex((w) => w >= need);
  return index >= 0 ? index : null;
}

export function startNextRound(series) {
  series.round += 1;
}
