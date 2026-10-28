// 캐릭터 그림과 이모지 그림 캐시
// 캐릭터는 src/assets/characters/<id>.webp 그림을 쓰고, 보물·아이템·함정은 이모지를 씁니다.
// 매 프레임 큰 그림을 줄여 그리면 느리고 흐릿하므로, 크기별로 한 번만 곱게 줄여 두고 찍습니다.

import { CHARACTERS } from '../data/characters.js';

export { CHARACTERS };

export const TREASURE_EMOJI = '💎';
export const BOX_EMOJI = '🎁';
export const STAR_EMOJI = '⭐';
export const CLOUD_EMOJI = '🌑';

const imageUrls = import.meta.glob('../assets/characters/*.webp', { eager: true, query: '?url', import: 'default' });

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function characterImageUrl(id) {
  return imageUrls[`../assets/characters/${getCharacter(id).id}.webp`];
}

/** HTML에 넣을 캐릭터 그림 태그 */
export function characterImg(id, className = 'avatar') {
  const c = getCharacter(id);
  return `<img class="${className}" src="${characterImageUrl(c.id)}" alt="${c.name}" draggable="false" />`;
}

// 캔버스용 그림을 미리 불러 둡니다. 다 불러오기 전에는 getCharacterSprite가 null을 돌려줍니다.
const images = new Map();
export function preloadCharacters() {
  return Promise.all(
    CHARACTERS.map(
      (c) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = characterImageUrl(c.id);
          images.set(c.id, img);
        }),
    ),
  );
}

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const spriteCache = new Map();

/** cssSize 크기의 캐릭터 그림 (화면 배율 dpr 반영). 아직 못 불러왔으면 null */
export function getCharacterSprite(id, cssSize, dpr) {
  const img = images.get(id);
  if (!img?.complete || !img.naturalWidth) return null;
  const px = Math.max(8, Math.round(cssSize * dpr));
  const key = `char|${id}|${px}`;
  let sprite = spriteCache.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = px;
    const g = sprite.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, px, px);
    spriteCache.set(key, sprite);
  }
  return sprite;
}

/** cssSize 크기의 이모지 그림 (화면 배율 dpr을 반영한 캔버스) */
export function getEmojiSprite(emoji, cssSize, dpr) {
  const px = Math.max(8, Math.round(cssSize * dpr));
  const key = `${emoji}|${px}`;
  let sprite = spriteCache.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = Math.ceil(px * 1.3);
    const g = sprite.getContext('2d');
    g.font = `${px}px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, sprite.width / 2, sprite.height / 2 + px * 0.06);
    spriteCache.set(key, sprite);
  }
  return sprite;
}

export function clearSpriteCache() {
  spriteCache.clear();
}
