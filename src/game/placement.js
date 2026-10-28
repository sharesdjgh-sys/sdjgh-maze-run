// 아이템 상자와 함정 배치 (기획서 기능 3 보완)
// 모든 상자·함정은 180° 대칭 짝으로 놓아서 두 사람에게 똑같은 조건을 줍니다.
// 출발점·보물 근처는 비우고, 서로 너무 붙지 않게 간격을 둡니다.

import { ITEM_RULES, PLACEMENT, TRAPS } from '../config.js';
import { DIRS } from './dir.js';
import { canMove, cellIndex, distancesFrom, openingCount, rotateIndex180 } from './maze.js';

export const TRAP = { NONE: 0, WEB: 1, PORTAL: 2, ICE: 3 };

/**
 * counts: { boxPairs, traps: { web, portal, ice } } — 모두 대칭 짝 개수
 * 반환: { boxes: [{ x, y, active, respawnIn }], traps: { kind: Uint8Array, portalTo: Int32Array } }
 * 자리가 모자라면 가능한 만큼만 놓습니다.
 */
export function placeSpecials(maze, { boxPairs = 0, traps = {} } = {}, rng) {
  const { width, height, walls, starts, distToTreasure } = maze;
  const total = width * height;
  const kind = new Uint8Array(total);
  const portalTo = new Int32Array(total).fill(-1);
  const occupied = new Uint8Array(total);
  const taken = []; // 간격 확인용 (짝 칸 포함)
  const rot = (i) => rotateIndex180(total, i);
  const xy = (i) => ({ x: i % width, y: Math.floor(i / width) });
  const fromStart = distancesFrom(maze, starts[0]);
  const startDistance = (i) => Math.min(fromStart[i], fromStart[rot(i)]);

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
  // 소용돌이: 서로 멀리 떨어진 막다른 길 끝 두 곳 a↔b를 잇고, 짝인 rot(a)↔rot(b)도 잇습니다.
  // 꼭 지나가야 하는 길에 놓으면 밟을 때마다 날아가서 보물에 못 가게 되므로 막다른 길 끝에만 둡니다.
  // 막다른 길이 모자랄 수 있어서 상자보다 먼저 자리를 잡습니다.
  for (let k = 0; k < (traps.portal ?? 0); k++) {
    const link = pickPortalLink();
    if (!link) break;
    occupy(link);
    const [a, b] = link;
    for (const [p, q] of [[a, b], [rot(a), rot(b)]]) {
      kind[p] = kind[q] = TRAP.PORTAL;
      portalTo[p] = q;
      portalTo[q] = p;
    }
  }

  function pickPortalLink() {
    for (const a of rng.shuffle(deadEnds.filter(eligible))) {
      occupy([a]); // b의 간격 확인을 위해 잠깐 차지
      const fromA = distancesFrom(maze, xy(a));
      const b = pickCell(deadEnds.filter((i) => fromA[i] >= (width + height) / 2 && i !== rot(a)));
      occupied[a] = occupied[rot(a)] = 0;
      taken.splice(-2, 2);
      if (b >= 0) return [a, b];
    }
    return null;
  }

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

  return { boxes, traps: { kind, portalTo } };
}

export function trapAt(traps, width, x, y) {
  return traps ? traps.kind[cellIndex(width, x, y)] : TRAP.NONE;
}
