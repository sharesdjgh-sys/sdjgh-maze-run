// imagegen 원본 시트를 4열 × 2행의 256px 프레임으로 정렬합니다.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHARACTERS } from '../src/data/characters.js';

const originalDir = new URL('../ref/character-animation-originals/', import.meta.url);
const outputDir = new URL('../src/assets/animations/', import.meta.url);
await mkdir(outputDir, { recursive: true });
const SIZE = 256, COLS = 4, ROWS = 2;

// 낮은 알파의 가장자리 노이즈를 기준점으로 삼지 않도록, 몸체와 큰 부속품의 범위를 찾습니다.
// 원본 알파는 수정하지 않고 이 범위를 잘라 크기와 발밑 기준선만 정렬합니다.
function bodyBounds(data, width, height) {
  const seen = new Uint8Array(width * height);
  const parts = [];
  const stack = [];
  for (let i = 0; i < seen.length; i++) {
    if (seen[i] || data[i * 4 + 3] < 96) continue;
    let left = width, right = 0, top = height, bottom = 0, count = 0;
    seen[i] = 1; stack.push(i);
    while (stack.length) {
      const n = stack.pop(), x = n % width, y = Math.floor(n / width);
      count++; left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x > 0 ? n - 1 : -1, x < width - 1 ? n + 1 : -1, y > 0 ? n - width : -1, y < height - 1 ? n + width : -1]) {
        if (next >= 0 && !seen[next] && data[next * 4 + 3] >= 96) {
          seen[next] = 1; stack.push(next);
        }
      }
    }
    parts.push({ left, top, right, bottom, count });
  }
  parts.sort((a, b) => b.count - a.count);
  if (!parts.length || parts[0].count < width * height * 0.04) throw new Error('프레임의 캐릭터 몸체를 찾지 못했습니다.');
  const kept = parts.filter(p => p.count >= parts[0].count * 0.015);
  const left = Math.max(0, Math.min(...kept.map(p => p.left)) - 2);
  const top = Math.max(0, Math.min(...kept.map(p => p.top)) - 2);
  const right = Math.min(width - 1, Math.max(...kept.map(p => p.right)) + 2);
  const bottom = Math.min(height - 1, Math.max(...kept.map(p => p.bottom)) + 2);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

const report = [];
for (const { id } of CHARACTERS) {
  const input = fileURLToPath(new URL(id + '.png', originalDir));
  const meta = await sharp(input).metadata();
  if (!meta.hasAlpha) throw new Error(id + ': 투명 배경이 아닙니다.');
  const frames = [];
  for (let index = 0; index < 8; index++) {
    const col = index % COLS, row = Math.floor(index / COLS);
    const left = Math.round(col * meta.width / COLS), top = Math.round(row * meta.height / ROWS);
    const width = Math.round((col + 1) * meta.width / COLS) - left;
    const height = Math.round((row + 1) * meta.height / ROWS) - top;
    const frame = await sharp(input).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer();
    const bounds = bodyBounds(frame, width, height);
    frames.push({ raw: frame, width, height, bounds });
  }
  const scale = Math.min(232 / Math.max(...frames.map(f => f.bounds.width)), 232 / Math.max(...frames.map(f => f.bounds.height)));
  const layers = [];
  for (let index = 0; index < frames.length; index++) {
    const f = frames[index], w = Math.round(f.bounds.width * scale), h = Math.round(f.bounds.height * scale);
    const data = await sharp(f.raw, { raw: { width: f.width, height: f.height, channels: 4 } })
      .extract(f.bounds).resize(w, h).png().toBuffer();
    layers.push({ input: data, left: (index % COLS) * SIZE + Math.round((SIZE - w) / 2), top: Math.floor(index / COLS) * SIZE + 244 - h });
  }
  const target = fileURLToPath(new URL(id + '.webp', outputDir));
  const { size } = await sharp({ create: { width: SIZE * COLS, height: SIZE * ROWS, channels: 4, background: '#00000000' } })
    .composite(layers).webp({ quality: 88, alphaQuality: 100, effort: 5 }).toFile(target);
  report.push({ id, bytes: size, frames: 8, width: SIZE * COLS, height: SIZE * ROWS });
  console.log(id + ': 8프레임, ' + Math.round(size / 1024) + 'KB');
}
await writeFile(new URL('../ref/character-animation-build.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log('완료: ' + report.length + '종, ' + report.reduce((sum, row) => sum + row.bytes, 0) + 'bytes');
