// imagegen 원본을 게임용 WebP로 변환합니다.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
for (const [name, width, quality] of [['backdrop',1536,84],['floor',512,88],['hedge',512,90]]) {
  await sharp(fileURLToPath(new URL('../ref/generated-originals/garden-'+name+'.png', import.meta.url))).resize({width}).webp({quality}).toFile(fileURLToPath(new URL('../src/assets/garden/'+name+'.webp', import.meta.url)));
}
