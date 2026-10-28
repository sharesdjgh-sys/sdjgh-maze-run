// 원본 캐릭터 그림(ref/character-originals, 1254px PNG, 한 장에 1~2MB)을
// 게임용 작은 그림(src/assets/characters/<id>.webp, 256px, 한 장에 수십 KB)으로 바꿉니다.
// 투명한 여백을 잘라내서 캐릭터가 칸을 꽉 채우게 합니다.
// 실행: npm run characters

import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { CHARACTERS } from '../src/data/characters.js';

const SOURCE = 'ref/character-originals';
const OUTPUT = 'src/assets/characters';
const SIZE = 256;
const PADDING = 6; // 가장자리에 닿지 않게 남기는 여백 (px)
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

await mkdir(OUTPUT, { recursive: true });
let total = 0;
for (const character of CHARACTERS) {
  const input = join(SOURCE, `${character.file}.png`);
  const output = join(OUTPUT, `${character.id}.webp`);
  const trimmed = await sharp(input).trim({ threshold: 1 }).toBuffer();
  await sharp(trimmed)
    .resize(SIZE - PADDING * 2, SIZE - PADDING * 2, { fit: 'contain', background: TRANSPARENT })
    .extend({ top: PADDING, bottom: PADDING, left: PADDING, right: PADDING, background: TRANSPARENT })
    .webp({ quality: 88, alphaQuality: 90, effort: 6 })
    .toFile(output);
  const { size } = await stat(output);
  total += size;
  console.log(`${character.name.padEnd(5, ' ')} ${character.file}.png → ${output} (${(size / 1024).toFixed(1)} KB)`);
}
console.log(`완료: ${CHARACTERS.length}개, 합계 ${(total / 1024).toFixed(0)} KB`);
