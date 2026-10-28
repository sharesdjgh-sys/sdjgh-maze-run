// 아이템 상자와 함정 배치 (기획서 기능 3 보완)
// 모든 상자·함정은 180° 대칭 짝으로 놓아서 두 사람에게 똑같은 조건을 줍니다.
// 네 모서리·학교 근처는 비우고, 서로 너무 붙지 않게 간격을 둡니다.
// 판마다 바뀌는 출발점과 집(pickEnds)은 상자·함정을 피해서 고릅니다.

import { ITEM_RULES, PLACEMENT, TRAPS } from '../config.js';
import { DIRS } from './dir.js';
import { canMove, cellIndex, distancesFrom, openingCount, rotateIndex180 } from './maze.js';

export const TRAP = { NONE: 0, WEB: 1, ICE: 2 };

/**
 * counts: { boxPairs, traps: { web, ice } } — 모두 대칭 짝 개수
 * 반환: { boxes: [{ x, y, active, respawnIn }], traps: { kind: Uint8Array } }
 * 자리가 모자라면 가능한 만큼만 놓습니다.
 */
export function placeSpecials(maze, { boxPairs = 0, traps = {} } = {}, rng) {
  const { width, height, walls, starts, homes, distToTreasure } = maze;
  const total = width * height;
  const kind = new Uint8Array(total);
  const occupied = new Uint8Array(total);
  const taken = []; // 간격 확인용 (짝 칸 포함)
  const rot = (i) => rotateIndex180(total, i);
  const xy = (i) => ({ x: i % width, y: Math.floor(i / width) });
  const fromStart = distancesFrom(maze, starts[0]);
  const fromHome = distancesFrom(maze, homes[0]);
  // 가장 가까운 모서리(출발점·집)까지의 거리. 짝 칸(rot)까지 함께 보면 2P 쪽 모서리도 확인됩니다.
  const startDistance = (i) => Math.min(fromStart[i], fromStart[rot(i)], fromHome[i], fromHome[rot(i)]);

  function fitsRules(i) {
    if (i === rot(i) || occupied[i] || occupied[rot(i)]) return false;
    if (startDistance(i) < PLACEMENT.minDistFromStart) return false;
    return distToTreasure[i] >= PLACEMENT.minDistFromTreasure;
  }
  function spacedOut(i) {
    const a = xy(i);
    return taken.every((j) => {
      const b = xy(j);
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) >= PLACEMENT.minSpacing;
    });
  }
  const eligible = (i) => fitsRules(i) && spacedOut(i) && spacedOut(rot(i));
  function occupy(cells) {
    for (const i of cells) {
      occupied[i] = occupied[rot(i)] = 1;
      taken.push(i, rot(i));
    }
  }
  function pickCell(candidates) {
    return rng.shuffle([...candidates]).find(eligible) ?? -1;
  }

  const allCells = Array.from({ length: total }, (_, i) => i);
  const deadEnds = allCells.filter((i) => openingCount(walls[i]) === 1);
  const corridors = allCells.filter((i) => openingCount(walls[i]) === 2);

  // 아이템 상자: 일부는 일부러 막다른 길 끝에 ('돌아가서 먹을까?' 고민)
  const boxes = [];
  const deadEndBoxes = Math.round(boxPairs * ITEM_RULES.deadEndShare);
  for (let k = 0; k < boxPairs; k++) {
    let i = k < deadEndBoxes ? pickCell(deadEnds) : -1;
    if (i < 0) i = pickCell(allCells);
    if (i < 0) break;
    occupy([i]);
    for (const c of [i, rot(i)]) boxes.push({ ...xy(c), active: true, respawnIn: 0 });
  }

  // 거미줄: 길 위(통로)에
  for (let k = 0; k < (traps.web ?? 0); k++) {
    const i = pickCell(corridors);
    if (i < 0) break;
    occupy([i]);
    kind[i] = kind[rot(i)] = TRAP.WEB;
  }

  // 얼음 바닥: 곧게 이어진 길 3~4칸
  for (let k = 0; k < (traps.ice ?? 0); k++) {
    const patch = pickIcePatch();
    if (!patch) break;
    occupy(patch);
    for (const i of patch) kind[i] = kind[rot(i)] = TRAP.ICE;
  }

  function pickIcePatch() {
    const [minLen, maxLen] = TRAPS.ice.length;
    const starts = rng.shuffle([...allCells]);
    for (const s of starts) {
      for (const dirName of rng.shuffle(['right', 'down'])) {
        const length = minLen + rng.int(maxLen - minLen + 1);
        const patch = [s];
        let { x, y } = xy(s);
        while (patch.length < length && canMove(maze, x, y, dirName)) {
          x += DIRS[dirName].dx;
          y += DIRS[dirName].dy;
          patch.push(cellIndex(width, x, y));
        }
        if (patch.length < minLen) continue;
        const mirrored = new Set(patch.map(rot));
        if (patch.some((i) => mirrored.has(i))) continue;
        if (patch.every((i) => fitsRules(i) && spacedOut(i) && spacedOut(rot(i)))) return patch;
      }
    }
    return null;
  }

  return { boxes, traps: { kind } };
}

export function trapAt(traps, width, x, y) {
  return traps ? traps.kind[cellIndex(width, x, y)] : TRAP.NONE;
}

/**
 * 판마다 출발점과 집을 무작위로 정합니다. (v13)
 * 두 사람의 자리는 서로 달라도 되고, '출발점 → 학교' 거리와 '학교 → 집' 거리만 두 사람이 똑같습니다.
 * - 학교(가운데)까지의 거리는 모서리 출발점 거리의 PLACEMENT.endDistance 배 사이
 * - 상자·함정 칸과 그 바로 옆에는 놓지 않음 (출발하자마자 묶이지 않게)
 * - 두 출발점, 두 집, 남의 출발점과 내 집은 서로 PLACEMENT.endsApart 이상 떨어뜨림
 * - 내 집은 내 출발점에서 길로 PLACEMENT.homeFromStart 이상 떨어뜨림 (온 길을 되돌아가기만 하면 되지 않게)
 * - 집은 막다른 길 끝을 먼저 고름 (골목 끝 집)
 * 알맞은 자리를 못 찾으면 기본 모서리(maze.starts, maze.homes)를 씁니다.
 * 반환: { starts: [1P, 2P], homes: [1P, 2P] } (각각 { x, y })
 */
export function pickEnds(maze, { boxes = [], traps = null } = {}, rng) {
  const { width, height, walls, distToTreasure: dist, treasure } = maze;
  const total = width * height;
  const xy = (i) => ({ x: i % width, y: Math.floor(i / width) });
  const apart = (a, b) => {
    const p = xy(a);
    const q = xy(b);
    return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) >= Math.round((width + height) * PLACEMENT.endsApart);
  };
  const base = dist[cellIndex(width, maze.starts[0].x, maze.starts[0].y)];
  const [lo, hi] = PLACEMENT.endDistance.map((k) => Math.round(base * k));

  const blocked = new Uint8Array(total);
  blocked[cellIndex(width, treasure.x, treasure.y)] = 1;
  for (const b of boxes) blocked[cellIndex(width, b.x, b.y)] = 1;
  if (traps) traps.kind.forEach((k, i) => { if (k !== TRAP.NONE) blocked[i] = 1; });
  const neighbors = (i) => {
    const { x, y } = xy(i);
    return Object.keys(DIRS).filter((d) => canMove(maze, x, y, d)).map((d) => cellIndex(width, x + DIRS[d].dx, y + DIRS[d].dy));
  };
  const usable = (i) => dist[i] >= lo && dist[i] <= hi && !blocked[i] && neighbors(i).every((j) => !blocked[j]);
  const cells = Array.from({ length: total }, (_, i) => i).filter(usable);

  // 같은 거리의 칸 둘을 고릅니다. ok(i, k): k번 사람의 자리로 i가 괜찮은지
  function pickPair(candidates, ok) {
    for (const a of rng.shuffle([...candidates])) {
      if (!ok(a, 0)) continue;
      const b = rng.shuffle(cells.filter((j) => dist[j] === dist[a] && j !== a && apart(a, j) && ok(j, 1)))[0];
      if (b !== undefined) return [a, b];
    }
    return null;
  }

  const deadEnds = cells.filter((i) => openingCount(walls[i]) === 1);
  // 출발점에 따라 알맞은 집이 없을 수 있어서, 출발점을 바꿔 가며 몇 번 시도합니다.
  for (let attempt = 0; attempt < 20; attempt++) {
    const starts = pickPair(cells, () => true);
    if (!starts) break;
    const fromStart = starts.map((s) => distancesFrom(maze, xy(s)));
    const homeOk = (i, k) =>
      !starts.includes(i) &&
      fromStart[k][i] >= Math.round(base * PLACEMENT.homeFromStart) &&
      apart(i, starts[1 - k]);
    const homes = pickPair(deadEnds, homeOk) ?? pickPair(cells, homeOk);
    if (homes) return { starts: starts.map(xy), homes: homes.map(xy) };
  }
  return { starts: maze.starts, homes: maze.homes };
}
