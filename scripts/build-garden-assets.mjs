// imagegen 원본을 게임용 WebP로 변환합니다.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
for (const [name, width, quality] of [['backdrop',1536,84],['floor',512,88],['hedge',512,90]]) {
  await sharp(fileURLToPath(new URL('../ref/generated-originals/garden-'+name+'.png', import.meta.url))).resize({width}).webp({quality}).toFile(fileURLToPath(new URL('../src/assets/garden/'+name+'.webp', import.meta.url)));
}

await sharp(fileURLToPath(new URL('../ref/generated-originals/victory-podium.png', import.meta.url))).trim({threshold:10}).resize({width:720}).webp({quality:88,alphaQuality:100}).toFile(fileURLToPath(new URL('../src/assets/garden/victory-podium.webp', import.meta.url)));

await sharp(fileURLToPath(new URL('../ref/generated-originals/selection-plinth.png', import.meta.url))).trim({threshold:10}).resize({width:600}).webp({quality:88,alphaQuality:100}).toFile(fileURLToPath(new URL('../src/assets/garden/selection-plinth.webp', import.meta.url)));

await sharp(fileURLToPath(new URL('../ref/generated-originals/seodaejeon-school.png', import.meta.url))).trim().resize({width:900,withoutEnlargement:true}).webp({quality:92,alphaQuality:100}).toFile(fileURLToPath(new URL('../src/assets/garden/school-campus.webp', import.meta.url)));
