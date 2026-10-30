// 기존 게임 로고와 정원 배경으로 브라우저 아이콘·공유 이미지를 재현합니다.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const icon = await readFile(new URL('../public/favicon.svg', import.meta.url));
const root = new URL('../public/', import.meta.url);
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(icon).resize(size, size).png().toFile(fileURLToPath(new URL(file, root)));
}

// 여러 해상도의 PNG를 담은 ICO: 오래된 브라우저와 /favicon.ico 요청도 지원합니다.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(icon).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((data, i) => {
  const entry = 6 + i * 16;
  header[entry] = header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(data.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += data.length;
});
await writeFile(new URL('favicon.ico', root), Buffer.concat([header, ...images]));

const background = await sharp('src/assets/garden/backdrop.webp').resize(1200, 630, {fit: 'cover'}).blur(2).toBuffer();
const wash = Buffer.from('<svg width="1200" height="630"><rect width="1200" height="630" fill="#fff8e7" opacity="0.70"/><rect x="24" y="24" width="1152" height="582" rx="30" fill="none" stroke="#456b42" stroke-width="2" opacity="0.5"/></svg>');
const logo = await sharp('src/assets/branding/studycrew-x-mazerun-garden.webp').resize(960, 470, {fit: 'inside'}).toBuffer();
const {width, height} = await sharp(logo).metadata();
const caption = Buffer.from(`<svg width="1200" height="100"><rect x="250" y="8" width="700" height="68" rx="34" fill="#234c38"/><text x="600" y="52" text-anchor="middle" font-family="Malgun Gothic, sans-serif" font-size="27" font-weight="bold" fill="#fff6db">둘이서 떠나는 등하굣길 미로 대결</text></svg>`);
await sharp(background).composite([
  {input: wash, left: 0, top: 0},
  {input: logo, left: Math.round((1200-width)/2), top: Math.round(48+(470-height)/2)},
  {input: caption, left: 0, top: 514},
]).jpeg({quality: 90, mozjpeg: true}).toFile('public/og-studycrew-mazerun.jpg');
console.log('브라우저·앱 아이콘 5종과 1200×630 공유 이미지 생성 완료');
