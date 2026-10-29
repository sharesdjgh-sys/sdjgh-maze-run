// 제공된 승리 영상의 자주색 배경을 제거해 투명 WebP 애니메이션을 만듭니다.
// 필요 도구: PATH의 ffmpeg, 프로젝트의 sharp. 원본 MP4는 수정하지 않습니다.
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { VICTORY_SOURCES } from '../src/data/victory.js';

const root = new URL('../', import.meta.url);
const path = relative => fileURLToPath(new URL(relative, root));
const width = 640, height = 360, fps = 12, size = 256;
const only = process.argv.slice(2);
await fs.mkdir(path('src/assets/victory/'), { recursive: true });
let report = [];
if (only.length) {
  try { report = JSON.parse(await fs.readFile(path('ref/victory-animation-build.json'), 'utf8')).filter(row => !only.includes(row.id)); } catch {}
}

function decode(source) {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', source, '-an', '-vf', `fps=${fps},scale=${width}:${height}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { windowsHide: true });
    const chunks = [], errors = [];
    process.stdout.on('data', chunk => chunks.push(chunk));
    process.stderr.on('data', chunk => errors.push(chunk));
    process.on('error', reject);
    process.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(Buffer.concat(errors).toString())));
  });
}

for (const [id, name] of Object.entries(VICTORY_SOURCES)) {
  if (only.length && !only.includes(id)) continue;
  const input = await decode(path(`ref/VictoryVideos/${name}.mp4`));
  const frameBytes = width * height * 3;
  const count = input.length / frameBytes;
  if (!Number.isInteger(count) || !count) throw new Error(`${id}: 잘못된 프레임 수`);
  const frames = [];
  let left = width, top = height, right = 0, bottom = 0;
  for (let f = 0; f < count; f++) {
    const rgb = input.subarray(f * frameBytes, (f + 1) * frameBytes);
    const rgba = Buffer.alloc(width * height * 4);
    // 화면 모서리에서 각 프레임의 실제 키 색을 읽어 영상 압축에 따른 차이를 반영합니다.
    const kr = rgb[0], kg = rgb[1], kb = rgb[2];
    for (let p = 0; p < width * height; p++) {
      const i = p * 3, o = p * 4;
      const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
      const distance = Math.hypot(r - kr, g - kg, b - kb);
      const alpha = Math.max(0, Math.min(1, (distance - 14) / 65));
      rgba[o + 3] = Math.round(alpha * 255);
      if (!alpha) continue;
      // 경계 픽셀에 섞인 키 색을 빼서 털 주변의 자주색 테두리를 줄입니다.
      rgba[o] = Math.max(0, Math.min(255, (r - kr * (1 - alpha)) / alpha));
      rgba[o + 1] = Math.max(0, Math.min(255, (g - kg * (1 - alpha)) / alpha));
      rgba[o + 2] = Math.max(0, Math.min(255, (b - kb * (1 - alpha)) / alpha));
    }
    // 떠다니는 반짝이나 먼지를 크기 기준에 넣지 않고, 가장 큰 몸체만 찾습니다.
    const visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
    let largest = 0, body = null;
    for (let start = 0; start < visited.length; start++) {
      if (visited[start] || rgba[start * 4 + 3] < 200) continue;
      let head = 0, tail = 1, x0 = width, x1 = 0, y0 = height, y1 = 0;
      queue[0] = start; visited[start] = 1;
      while (head < tail) {
        const p = queue[head++], x = p % width, y = Math.floor(p / width);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const next of [x ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y ? p - width : -1, y < height - 1 ? p + width : -1]) {
          if (next >= 0 && !visited[next] && rgba[next * 4 + 3] >= 200) { visited[next] = 1; queue[tail++] = next; }
        }
      }
      if (tail > largest) { largest = tail; body = { x0, x1, y0, y1 }; }
    }
    if (body && body.x1 - body.x0 < width * 0.85) {
      left = Math.min(left, body.x0); right = Math.max(right, body.x1);
      top = Math.min(top, body.y0); bottom = Math.max(bottom, body.y1);
    }
    // 영상 압축으로 생긴 경계의 자주색 번짐을 얇게 정리합니다.
    const matte = Buffer.from(rgba);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const o = (y * width + x) * 4;
        if (!rgba[o + 3]) continue;
        let minimum = 255;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) minimum = Math.min(minimum, rgba[((y + dy) * width + x + dx) * 4 + 3]);
        matte[o + 3] = Math.round((rgba[o + 3] + minimum) / 2);
        if (minimum < 250 && rgba[o] > rgba[o + 1] * 1.25 && rgba[o + 2] > rgba[o + 1] * 1.25) {
          matte[o + 2] = Math.min(rgba[o + 2], Math.round((rgba[o] + rgba[o + 1]) / 2));
        }
      }
    }
    frames.push(matte);
  }
  // 모든 프레임의 공통 영역으로 잘라 동작마다 크기나 발 위치가 달라지지 않게 합니다.
  if (left >= right || top >= bottom) throw new Error(`${id}: 캐릭터 영역을 찾지 못했습니다.`);
  left = Math.max(0, left - 9); top = Math.max(0, top - 9);
  right = Math.min(width - 1, right + 9); bottom = Math.min(height - 1, bottom + 9);
  const region = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const resized = [];
  for (const frame of frames) {
    resized.push(await sharp(frame, { raw: { width, height, channels: 4 } }).extract(region)
      .resize(size, size, { fit: 'contain', position: 'bottom', background: '#00000000' }).raw().toBuffer());
  }
  const result = await sharp(Buffer.concat(resized), { raw: { width: size, height: size * count, channels: 4, pageHeight: size } })
    .webp({ quality: 82, alphaQuality: 95, effort: 3, loop: 0, delay: Array.from({ length: count }, (_, f) => Math.round((f + 1) * 1000 / fps) - Math.round(f * 1000 / fps)) })
    .toFile(path(`src/assets/victory/${id}.webp`));
  report.push({ id, source: `${name}.mp4`, frames: count, fps, bytes: result.size, crop: region });
  console.log(`${id}: ${count}프레ーム / ${(result.size / 1024).toFixed(0)} KB`);
}
report.sort((a, b) => Object.keys(VICTORY_SOURCES).indexOf(a.id) - Object.keys(VICTORY_SOURCES).indexOf(b.id));
await fs.writeFile(path('ref/victory-animation-build.json'), JSON.stringify(report, null, 2) + '\n');
