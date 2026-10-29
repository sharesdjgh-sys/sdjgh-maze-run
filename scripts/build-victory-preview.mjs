// 실 게임의 결과 화면을 불러와 로컬에서 열 수 있는 승리 연출 미리보기를 만듭니다.
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { CHARACTERS } from '../src/data/characters.js';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { resultScreen } = await server.ssrLoadModule('/src/ui/result.js');
  const scenes = {};
  for (const c of CHARACTERS) {
    for (const winner of [0, 1]) {
      for (const bestOf of [1, 3]) {
        const players = winner === 0 ? [{ character: c.id }, { character: c.id === 'dog' ? 'cat' : 'dog' }] : [{ character: c.id === 'cat' ? 'dog' : 'cat' }, { character: c.id }];
        scenes[`${c.id}:${winner}:${bestOf}`] = resultScreen({ match: { result: { winner }, players }, series: { bestOf, wins: winner === 0 ? [bestOf === 3 ? 2 : 1, 0] : [0, bestOf === 3 ? 2 : 1] }, idleLeft: null }).replaceAll('src="/src/', 'src="../src/').replaceAll('srcset="/src/', 'srcset="../src/');
      }
    }
  }
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>캐릭터별 승리 애니메이션 미리보기</title>
<link rel="stylesheet" href="../node_modules/@fontsource/jua/index.css"><link rel="stylesheet" href="../src/styles/main.css"><link rel="stylesheet" href="../src/styles/garden-menus.css"><link rel="stylesheet" href="../src/styles/character-animation.css">
<style>body{background:url('../src/assets/garden/backdrop.webp') center/cover no-repeat fixed}#overlay{display:grid}.preview-settings{position:fixed;z-index:20;right:12px;top:12px;padding:10px;border-radius:10px;background:#fff9e9ee;color:#35533e;font:13px 'Malgun Gothic',sans-serif}.preview-settings summary{cursor:pointer}.preview-settings label{display:block;margin-top:10px}.preview-settings select{margin-left:8px;padding:4px;max-width:160px}.preview-still .victory-jump,.preview-still .char-idle{animation:none!important}</style></head><body>
<div id="overlay" class="show"></div><details class="preview-settings"><summary>미리보기 설정</summary><label>캐릭터<select id="character">${CHARACTERS.map(c => `<option value="${c.id}" ${c.id === 'deer' ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label><label>플레이어<select id="player"><option value="0">1P</option><option value="1" selected>2P</option></select></label><label>결과<select id="mode"><option value="1">단판 승리</option><option value="3">최종 우승</option></select></label><label><input id="still" type="checkbox"> 정지 그림으로 보기</label></details>
<script>const scenes=${JSON.stringify(scenes).replaceAll('<', '\\u003c')};const character=document.getElementById('character'),player=document.getElementById('player'),mode=document.getElementById('mode'),still=document.getElementById('still');function show(){document.getElementById('overlay').innerHTML=scenes[character.value+':'+player.value+':'+mode.value];document.body.classList.toggle('preview-still',still.checked);if(still.checked)document.querySelectorAll('.victory-motion source').forEach(s=>s.remove());}document.querySelectorAll('.preview-settings select,.preview-settings input').forEach(s=>s.addEventListener('change',show));show();</script></body></html>`;
  await fs.writeFile(new URL('../ref/victory-home-preview.html', import.meta.url), html, 'utf8');
  console.log('ref/victory-home-preview.html: 16종 캐릭터의 승리 애니메이션과 실제 화면 배치');
} finally {
  await server.close();
}
