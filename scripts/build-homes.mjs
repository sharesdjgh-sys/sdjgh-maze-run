// 생성한 투명 PNG 원본을 게임용 WebP로 변환하고 비교용 HTML을 만듭니다.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHARACTERS } from '../src/data/characters.js';
import { HOMES } from '../src/data/homes.js';

const root = new URL('../', import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));
await fs.mkdir(path('src/assets/homes/'), { recursive: true });
let total = 0;
for (const c of CHARACTERS) {
  const source = path(`ref/home-originals/${c.id}.png`);
  const { channels } = await sharp(source).metadata();
  const stats = await sharp(source).stats();
  if (channels !== 4 || stats.channels[3].min !== 0) throw new Error(`${c.id}: 투명 배경이 필요합니다.`);
  const result = await sharp(source).trim({ threshold: 10 }).resize(236, 236, { fit: 'contain', background: '#00000000' })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#00000000' })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path(`src/assets/homes/${c.id}.webp`));
  total += result.size;
  console.log(`${c.id}: ${(result.size / 1024).toFixed(1)} KB`);
}

const cards = CHARACTERS.map((c, i) => {
  const h = HOMES[c.id];
  const image = `../src/assets/homes/${c.id}.webp`;
  return `<article data-group="${c.type.split(' · ')[0]}">
    <header><span class="number">${String(i + 1).padStart(2, '0')}</span><div><h2>${c.name}</h2><p>${c.type}</p></div></header>
    <div class="stage"><img class="character" src="../src/assets/characters/${c.id}.webp" alt="${c.name} 캐릭터"><img class="home" src="${image}" alt="${h.name}"></div>
    <h3>${h.name}</h3><p class="detail">${h.detail}</p>
    <footer><span>게임 크기</span><img width="32" height="32" src="${image}" alt="32px 집"><small>32px</small><img width="48" height="48" src="${image}" alt="48px 집"><small>48px</small><a href="../ref/home-originals/${c.id}.png" target="_blank" rel="noopener">원본 ↗</a></footer>
  </article>`;
}).join('\n');
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>공부캐 16종 · 우리 집 미리보기</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f1e8;color:#303d36;font-family:'Malgun Gothic',sans-serif}main{max-width:1560px;margin:auto;padding:40px 28px}.intro{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:24px}.eyebrow{font-size:12px;font-weight:700;letter-spacing:3px;color:#64816b}h1{font-size:34px;letter-spacing:-1.5px;margin:10px 0}p{margin:0;line-height:1.7}.intro p{color:#6c786d;font-size:14px}.tools{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}button{padding:10px 17px;border:1px solid #cad3c5;border-radius:24px;background:#fff;color:#405543;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#345d45;color:white;border-color:#345d45}.backgrounds{margin-left:auto;display:flex;gap:8px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}article{min-width:0;background:#fffdf8;border:1px solid #dfdfd1;border-radius:20px;overflow:hidden;padding:18px}article[hidden]{display:none}header{display:flex;gap:12px;align-items:center}.number{font-size:12px;color:#8c9b85;font-weight:bold}h2{font-size:19px;margin:0}header p{font-size:11px;color:#7d8778}.stage{height:200px;display:flex;align-items:center;justify-content:center;gap:0;margin:14px -8px;border-radius:12px;background-color:var(--stage,#e7eddd)}.character{width:34%;height:140px;object-fit:contain}.home{width:63%;height:190px;object-fit:contain}h3{font-size:16px;margin:0 0 7px}.detail{font-size:11px;color:#788373;min-height:36px}footer{border-top:1px solid #e9e9dd;margin-top:12px;padding-top:10px;display:flex;align-items:center;gap:6px;height:64px}footer span,small{font-size:10px;color:#8a9383}footer img{object-fit:contain}footer a{margin-left:auto;color:#57795c;font-size:11px;text-decoration:none}.note{font-size:12px;color:#7f8b79;margin-top:24px}.dark{--stage:#273d39}.checker .stage{background-color:#fff;background-image:conic-gradient(#e2e5df 25%,transparent 0 50%,#e2e5df 0 75%,transparent 0);background-size:20px 20px}@media(min-width:1800px){main{max-width:1800px}.stage{height:230px}.home{height:220px}}@media(max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){main{padding:24px 14px}.intro{display:block}h1{font-size:27px}.grid{grid-template-columns:1fr}.backgrounds{margin-left:0}.stage{height:240px}.home{height:225px}}@media print{.tools{display:none}.grid{grid-template-columns:repeat(4,1fr)}article{break-inside:avoid}.stage{height:140px}.home{height:135px}.character{height:110px}}
</style></head><body><main><div class="intro"><div><span class="eyebrow">공부캐 마을 / HOME COLLECTION</span><h1>열여섯 친구, 열여섯 집.</h1><p>동물의 생김새와 학습 성향을 담은 캐릭터별 전용 집</p></div><p>16종 · 투명 WebP · 256 × 256<br>캐릭터와 나란히 보고 작은 크기도 확인하세요.</p></div>
<nav class="tools" aria-label="미리보기 설정"><button data-filter="전체" aria-pressed="true">전체 16</button><button data-filter="청각" aria-pressed="false">청각</button><button data-filter="운동" aria-pressed="false">운동</button><button data-filter="촉각" aria-pressed="false">촉각</button><button data-filter="시각" aria-pressed="false">시각</button><div class="backgrounds"><button data-bg="garden" aria-pressed="true">정원</button><button data-bg="dark" aria-pressed="false">어두운 배경</button><button data-bg="checker" aria-pressed="false">투명 확인</button></div></nav>
<div class="grid">${cards}</div><p class="note">큰 이미지는 전용 집 에셋이며, 아래 32px · 48px는 축소 표시입니다. 원본 링크로 생성된 투명 PNG를 볼 수 있습니다. 게임에서는 선택한 캐릭터의 집에 1P / 2P 이름표가 붙습니다.</p></main>
<script>document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x===b));document.querySelectorAll('article').forEach(x=>x.hidden=b.dataset.filter!=='전체'&&x.dataset.group!==b.dataset.filter)});document.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{document.body.className=b.dataset.bg;document.querySelectorAll('[data-bg]').forEach(x=>x.setAttribute('aria-pressed',x===b))});</script></body></html>`;
await fs.writeFile(path('ref/character-homes-preview.html'), html, 'utf8');
console.log(`완료: ${CHARACTERS.length}종, ${(total / 1024).toFixed(0)} KB / ref/character-homes-preview.html`);
