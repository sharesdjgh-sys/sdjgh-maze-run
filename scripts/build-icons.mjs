// Microsoft Fluent Emoji(3D, MIT 라이선스)에서 게임 아이콘을 받아
// 게임용 작은 그림(src/assets/icons/<id>.webp, 128px)으로 바꿉니다. 인터넷 연결이 필요합니다.
// 실행: npm run icons

import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { ICONS } from '../src/data/icons.js';

const BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main';
const OUTPUT = 'src/assets/icons';
const SIZE = 128;

await mkdir(OUTPUT, { recursive: true });
await mkdir('licenses', { recursive: true });

const license = await fetch(`${BASE}/LICENSE`);
if (!license.ok) throw new Error(`라이선스를 받지 못했어요: ${license.status}`);
await writeFile(
  'licenses/fluentui-emoji.txt',
  `게임 아이콘(src/assets/icons)은 Microsoft Fluent Emoji (https://github.com/microsoft/fluentui-emoji)의 3D 그림을 줄여서 썼습니다.\n\n${await license.text()}`,
);

let total = 0;
for (const [id, path] of Object.entries(ICONS)) {
  const url = `${BASE}/assets/${path.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${id}: ${url} → ${response.status}`);
  const output = join(OUTPUT, `${id}.webp`);
  await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 95, effort: 6 })
    .toFile(output);
  const { size } = await stat(output);
  total += size;
  console.log(`${id.padEnd(10)} ${path} → ${output} (${(size / 1024).toFixed(1)} KB)`);
}
console.log(`완료: ${Object.keys(ICONS).length}개, 합계 ${(total / 1024).toFixed(0)} KB`);
