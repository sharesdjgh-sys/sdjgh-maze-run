// 난이도마다 후보 미로를 많이 만들어 보고, 그중 좋은 미로 50개를 골라 src/data/mazePool.js에 저장합니다.
// 미로는 시드 번호만 있으면 똑같이 다시 만들어지므로 번호만 저장합니다.
// 미로 생성 방식이나 난이도 수치(src/config.js)를 바꾸면 미로 모양이 달라지므로 이 스크립트를 다시 실행해야 합니다.
// 실행: npm run maze-pool

import { writeFile } from 'node:fs/promises';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../src/config.js';
import { mazeStats } from '../src/game/analysis.js';
import { createMatch } from '../src/game/match.js';

const CANDIDATES = 3000; // 난이도마다 살펴볼 후보 수
const POOL_SIZE = 50; // 난이도마다 고를 미로 수

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(p * (sorted.length - 1))];
};

const pool = {};
const summary = [];
for (const difficulty of DIFFICULTY_ORDER) {
  const rows = [];
  for (let seed = 1; seed <= CANDIDATES; seed++) {
    const { shortest, wander } = mazeStats(createMatch({ difficulty, seed }).maze);
    rows.push({ seed, shortest, wander });
  }
  const shortest = rows.map((r) => r.shortest);
  const wander = rows.map((r) => r.wander);
  // 너무 짧은 미로(하위 35%)와 너무 긴 미로(상위 5%)는 빼고,
  // '보물 쪽으로만 가면 헤매는 정도'가 중간~상위 10% 사이인 미로만 남깁니다.
  const band = {
    shortest: [percentile(shortest, 0.35), percentile(shortest, 0.95)],
    wander: [percentile(wander, 0.5), percentile(wander, 0.9)],
  };
  const target = percentile(wander, 0.7);
  const chosen = rows
    .filter((r) => r.shortest >= band.shortest[0] && r.shortest <= band.shortest[1])
    .filter((r) => r.wander >= band.wander[0] && r.wander <= band.wander[1])
    .sort((a, b) => Math.abs(a.wander - target) - Math.abs(b.wander - target) || a.seed - b.seed)
    .slice(0, POOL_SIZE)
    .sort((a, b) => a.seed - b.seed);
  if (chosen.length < POOL_SIZE) throw new Error(`${difficulty}: 조건에 맞는 미로가 ${chosen.length}개뿐이에요`);
  pool[difficulty] = chosen;
  const avg = (key) => Math.round(chosen.reduce((sum, r) => sum + r[key], 0) / chosen.length);
  summary.push(
    `${DIFFICULTIES[difficulty].label}: 최단 ${band.shortest.join('~')}칸, 헤맴 ${band.wander.join('~')}칸 범위에서 50개 ` +
      `(평균 최단 ${avg('shortest')}칸, 평균 헤맴 ${avg('wander')}칸)`,
  );
}

const lines = [
  '// 자동으로 만든 파일입니다. 직접 고치지 말고 `npm run maze-pool`로 다시 만드세요. (scripts/build-maze-pool.mjs)',
  `// 난이도마다 후보 ${CANDIDATES}개 중 고른 미로 ${POOL_SIZE}개입니다. 미로는 시드 번호만 있으면 똑같이 다시 만들어집니다.`,
  '// shortest(최단 경로)와 wander(보물 쪽으로만 가면 걷는 칸)는 확인용입니다.',
  '// 미로 생성 방식이나 난이도 수치를 바꾸면 값이 달라져서 tests/mazePool.test.js가 다시 만들라고 알려 줍니다.',
  ...summary.map((s) => `// - ${s}`),
  '',
  'export const MAZE_POOL = {',
  ...DIFFICULTY_ORDER.map(
    (d) => `  ${d}: [\n${pool[d].map((r) => `    { seed: ${r.seed}, shortest: ${r.shortest}, wander: ${r.wander} },`).join('\n')}\n  ],`,
  ),
  '};',
  '',
];
await writeFile('src/data/mazePool.js', lines.join('\n'));
console.log(summary.join('\n'));
console.log('저장: src/data/mazePool.js');
