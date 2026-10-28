// 시트 검토용 HTML과 16종이 함께 움직이는 WebP를 만듭니다.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHARACTERS } from '../src/data/characters.js';

const assetDir = new URL('../src/assets/animations/', import.meta.url);
const refDir = new URL('../ref/', import.meta.url);
const idle = [0,0,0,0,1,0,2,0,3,0,0,0];
const sequence = [...idle,4,5,6,7,4,5,6,7];
const sheets = await Promise.all(CHARACTERS.map(c => sharp(fileURLToPath(new URL(c.id+'.webp',assetDir))).raw().toBuffer({resolveWithObject:true})));
const frames = [];
for (const index of sequence) {
  const layers = await Promise.all(sheets.map(async (sheet,i) => ({
    input: await sharp(sheet.data,{raw:{width:sheet.info.width,height:sheet.info.height,channels:4}})
      .extract({left:(index%4)*256,top:Math.floor(index/4)*256,width:256,height:256}).resize(128,128).png().toBuffer(),
    left: (i%4)*128, top: Math.floor(i/4)*128
  })));
  frames.push(await sharp({create:{width:512,height:512,channels:4,background:'#eee8d5'}}).composite(layers).raw().toBuffer());
}
await sharp(Buffer.concat(frames),{raw:{width:512,height:512*frames.length,channels:4,pageHeight:512}})
  .webp({quality:82,loop:0,delay:sequence.map((_,i)=>i<idle.length?250:110),effort:3})
  .toFile(fileURLToPath(new URL('character-motion-demo.webp',refDir)));

const cards = CHARACTERS.map(c => '<article><span class="char-animation" data-animation-ready="true" data-motion="idle" role="img" aria-label="'+c.name+'"><img class="character-atlas" src="../src/assets/animations/'+c.id+'.webp" alt="" /></span><h2>'+c.name+'</h2></article>').join('');
const html = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>캐릭터 움직임 미리보기</title><link rel="icon" href="data:,"><link rel="stylesheet" href="../src/styles/character-animation.css"><style>body{margin:0;padding:28px;color:#35513c;background:#e8ebdc;font-family:"Malgun Gothic",sans-serif}main{max-width:1080px;margin:auto}h1{font-size:24px;margin:0 0 8px}p{margin:0 0 18px}nav{display:flex;gap:10px;margin-bottom:20px}button{padding:10px 22px;border:1px solid #849879;border-radius:8px;background:#fff9e9;color:#35513c;cursor:pointer}button[aria-pressed=true]{background:#355b3f;color:#fff5d7}.grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:14px}article{background:#fff9e9;border:1px solid #d7dcc7;border-radius:14px;text-align:center;padding:10px}.char-animation{width:150px;height:150px}h2{font-size:15px;margin:4px 0 6px}@media(max-width:700px){.grid{grid-template-columns:repeat(2,1fr)}body{padding:16px}.char-animation{width:130px;height:130px}}</style><main><h1>캐릭터 움직임 미리보기</h1><p>16종 각각 대기 4프레임 · 걷기 4프레임</p><nav><button data-state="idle" aria-pressed="true">대기 · 눈 깜빡임</button><button data-state="walk" aria-pressed="false">걷기</button></nav><section class="grid">'+cards+'</section></main><script>document.querySelectorAll("button").forEach(button=>button.onclick=()=>{document.querySelectorAll("[data-motion]").forEach(sprite=>sprite.dataset.motion=button.dataset.state);document.querySelectorAll("button").forEach(other=>other.setAttribute("aria-pressed",String(other===button)));});</script></html>';
await fs.writeFile(new URL('character-animation-preview.html',refDir),html);
console.log('저장: ref/character-motion-demo.webp, ref/character-animation-preview.html');
console.log(await sharp(fileURLToPath(new URL('character-motion-demo.webp',refDir)),{animated:true}).metadata());
