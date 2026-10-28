// 미로 목록에서 다음 미로 고르기
// 난이도마다 50개를 섞어 두고 차례대로 꺼냅니다. 50판을 다 할 때까지 같은 미로가 다시 나오지 않고,
// 다 쓰면 새로 섞습니다(방금 한 미로가 바로 다시 나오지 않게). 순서는 브라우저에 저장해 두어 껐다 켜도 이어집니다.

import { load, save } from './storage.js';

const STORAGE_KEY = 'maze-deck';

/** pool: { 난이도: [{ seed }, ...] } */
export function createMazeDeck(pool, { storage = { load, save }, random = Math.random } = {}) {
  const state = storage.load(STORAGE_KEY, {}) ?? {};

  function shuffled(count, avoidFirst) {
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (count > 1 && order[0] === avoidFirst) [order[0], order[1]] = [order[1], order[0]];
    return order;
  }

  function isValid(deck, count) {
    return (
      deck &&
      Array.isArray(deck.order) &&
      deck.order.length === count &&
      Number.isInteger(deck.pos) &&
      deck.pos >= 0 &&
      deck.pos < count &&
      deck.order.every((i) => Number.isInteger(i) && i >= 0 && i < count)
    );
  }

  /** 다음 미로: { seed, number(1부터), index } */
  function next(difficulty) {
    const list = pool[difficulty];
    let deck = state[difficulty];
    if (!isValid(deck, list.length)) {
      const last = Array.isArray(deck?.order) ? deck.order[deck.order.length - 1] : undefined;
      deck = { order: shuffled(list.length, last), pos: 0 };
    }
    const index = deck.order[deck.pos];
    deck.pos += 1;
    state[difficulty] = deck;
    storage.save(STORAGE_KEY, state);
    return { seed: list[index].seed, number: index + 1, index };
  }

  return { next };
}
