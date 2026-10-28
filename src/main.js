// 시작점: 화면(씬) 전환, 입력, 게임 루프, 사건 → 연출·소리 연결
// 디버그용 주소 옵션: ?debug=1 (FPS·시드·최단 경로), ?seed=1234 (같은 미로 재현), ?play=easy|normal|hard (준비 화면 건너뛰기)

import '@fontsource/jua';
import './styles/main.css';
import './styles/title.css';
import './styles/character-animation.css';
import {
  DEFAULT_SETTINGS,
  DIFFICULTIES,
  ITEMS,
  LOOP,
  MENU_KEYS,
  PLAYERS,
  READY_START_DELAY,
  RESULT_IDLE_RETURN,
  RESULT_INPUT_DELAY,
} from './config.js';
import { createAudio } from './core/audio.js';
import { itemSlotOf, screenDirOf, toCommand } from './core/controls.js';
import { createInput } from './core/input.js';
import { startLoop } from './core/loop.js';
import { createMazeDeck } from './core/mazeDeck.js';
import { randomSeed } from './core/rng.js';
import { load, save } from './core/storage.js';
import { distanceAt } from './game/maze.js';
import { createMatch, pauseMatch, resumeMatch, updateMatch } from './game/match.js';
import { createSeries, recordResult, seriesWinner, startNextRound } from './game/series.js';
import { MAZE_POOL } from './data/mazePool.js';
import { CHARACTERS, preloadCharacters } from './render/characters.js';
import { createRenderer } from './render/renderer.js';
import { createVfx, handleVfxEvent, updateVfx } from './render/vfx.js';
import { errorScreen } from './ui/error.js';
import { howtoScreen } from './ui/howto.js';
import { createOverlay } from './ui/overlay.js';
import { pauseScreen } from './ui/pause.js';
import { resultScreen } from './ui/result.js';
import { GRID_COLUMNS, selectScreen } from './ui/select.js';
import { titleScreen } from './ui/title.js';

const params = new URLSearchParams(window.location.search);
const DEBUG = params.has('debug');
const FIXED_SEED = params.has('seed') ? Number(params.get('seed')) >>> 0 : null;
const PLAY_NOW = DIFFICULTIES[params.get('play')] ? params.get('play') : null;

// 1P/2P 색은 config.js 한 곳에서 정하고 CSS에 넘겨 줍니다.
PLAYERS.forEach((p, i) => {
  document.documentElement.style.setProperty(`--p${i + 1}`, p.color);
  document.documentElement.style.setProperty(`--p${i + 1}-soft`, p.soft);
});
preloadCharacters();

const settings = loadSettings();
const app = {
  scene: 'title', // 'title' | 'howto' | 'setup' | 'game' | 'paused' | 'result' | 'error'
  sceneSince: 0,
  match: null,
  series: null,
  select: null, // 준비 화면 { cursors, ready, readySince }
  lastInput: performance.now(),
  shownIdle: null,
  heartbeatIn: 0,
  bumps: [null, null],
};

const audio = createAudio({ muted: load('muted', false) });
const renderer = createRenderer(document.getElementById('game'), { debug: DEBUG });
const overlay = createOverlay(document.getElementById('overlay'), (action) => {
  app.lastInput = performance.now();
  runAction(action);
});
const input = createInput({ onBlur: () => runAction('pause') });
let vfx = createVfx();
const mazeDeck = createMazeDeck(MAZE_POOL);
const backdrop = createMatch({ difficulty: 'easy', seed: MAZE_POOL.easy[0].seed });

const soundButton = document.getElementById('sound-toggle');
soundButton.addEventListener('click', () => {
  soundButton.blur();
  runAction('mute');
});
const debugBox = document.getElementById('debug');
debugBox.hidden = !DEBUG;
if (DEBUG) window.__app = app; // 개발자 도구에서 상태를 확인하기 위한 연결 고리
updateSoundButton();

// ── 설정·기록 ──
function loadSettings() {
  const s = { ...DEFAULT_SETTINGS, ...load('settings', {}) };
  if (!DIFFICULTIES[s.difficulty]) s.difficulty = DEFAULT_SETTINGS.difficulty;
  if (![1, 3].includes(s.bestOf)) s.bestOf = DEFAULT_SETTINGS.bestOf;
  s.fog = Boolean(s.fog);
  const ids = CHARACTERS.map((c) => c.id);
  const valid = Array.isArray(s.characters) && s.characters.length === 2 && s.characters.every((id) => ids.includes(id));
  if (!valid || s.characters[0] === s.characters[1]) s.characters = [...DEFAULT_SETTINGS.characters];
  if (PLAY_NOW) s.difficulty = PLAY_NOW;
  return s;
}

function saveSettings() {
  save('settings', settings);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadRecord() {
  const record = load('record', null);
  return record?.date === today() ? record : { date: today(), matches: 0, wins: {} };
}

function addToRecord(match) {
  const record = loadRecord();
  record.matches += 1;
  const { winner } = match.result;
  if (winner !== null) {
    const id = match.players[winner].character;
    record.wins[id] = (record.wins[id] ?? 0) + 1;
  }
  save('record', record);
}

// ── 화면 전환 ──
function setScene(scene) {
  app.scene = scene;
  app.sceneSince = performance.now();
  // 게임 중에는 소리 버튼이 미로 오른쪽 아래(2P 출발점)를 가리지 않게 숨깁니다. (M 키는 계속 동작)
  soundButton.hidden = scene === 'game';
}

function clearGame() {
  app.match = null;
  renderer.setMaze(backdrop.maze, backdrop.traps); // 메뉴 뒤에는 장식용 미로를 깔아 둠
}

function showTitle() {
  clearGame();
  app.series = null;
  overlay.show(titleScreen({ settings, muted: audio.muted, record: loadRecord() }));
  setScene('title');
}

function showSetup() {
  clearGame();
  const cursors = settings.characters.map((id) => CHARACTERS.findIndex((c) => c.id === id));
  app.select = { cursors, ready: [false, false], readySince: null };
  overlay.show(selectScreen({ settings, ...app.select }));
  setScene('setup');
}

function refreshSetup() {
  const { ready } = app.select;
  app.select.readySince = ready[0] && ready[1] ? performance.now() : null;
  overlay.update(selectScreen({ settings, ...app.select }));
}

function startSeries() {
  if (app.select) settings.characters = app.select.cursors.map((i) => CHARACTERS[i].id);
  saveSettings();
  app.series = createSeries(settings.bestOf);
  startMatch();
}

function startMatch() {
  try {
    // 미로는 골라 둔 목록에서 섞어서 꺼냅니다. (?seed=로 정하면 그 미로)
    const pick = FIXED_SEED !== null ? { seed: FIXED_SEED, number: null } : mazeDeck.next(settings.difficulty);
    app.match = createMatch({
      difficulty: settings.difficulty,
      seed: pick.seed,
      mazeNumber: pick.number,
      itemSeed: randomSeed(),
      characters: settings.characters,
      fog: settings.fog,
    });
  } catch (error) {
    console.error(error);
    clearGame();
    overlay.show(errorScreen());
    setScene('error');
    return;
  }
  if (DEBUG) console.info(`[미로] ${app.match.mazeNumber ?? '-'}번 seed=${app.match.seed} 생성 시도=${app.match.attempts}회`);
  vfx = createVfx();
  app.heartbeatIn = 0;
  renderer.setMaze(app.match.maze, app.match.traps);
  renderer.setSeries(app.series);
  overlay.hide();
  setScene('game');
}

function showResult({ animate }) {
  const final = seriesWinner(app.series) !== null;
  const idleLeft = final ? Math.max(0, Math.ceil(RESULT_IDLE_RETURN - (performance.now() - app.lastInput) / 1000)) : null;
  app.shownIdle = idleLeft;
  const html = resultScreen({ match: app.match, series: app.series, idleLeft });
  if (animate) overlay.show(html, { delay: RESULT_INPUT_DELAY });
  else overlay.update(html);
}

function finishMatch() {
  recordResult(app.series, app.match.result.winner);
  addToRecord(app.match);
  renderer.celebrate(app.match.result.winner);
  app.lastInput = performance.now();
  showResult({ animate: true });
  setScene('result');
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

function updateSoundButton() {
  soundButton.textContent = audio.muted ? '🔇' : '🔊';
  soundButton.title = audio.muted ? '소리 켜기 (M)' : '소리 끄기 (M)';
}

// ── 동작 ──
function runAction(action) {
  const [name, a, b] = action.split(':');
  const inMenu = app.scene !== 'game';
  if (inMenu && name !== 'mute') audio.play('click');
  switch (name) {
    case 'mute':
      save('muted', audio.toggleMute());
      updateSoundButton();
      if (app.scene === 'title') overlay.update(titleScreen({ settings, muted: audio.muted, record: loadRecord() }));
      break;
    case 'fullscreen':
      toggleFullscreen();
      break;
    case 'howto':
      overlay.show(howtoScreen());
      setScene('howto');
      break;
    case 'title':
      showTitle();
      break;
    case 'setup':
      showSetup();
      break;
    case 'difficulty':
      if (app.scene !== 'setup' || !DIFFICULTIES[a]) return;
      settings.difficulty = a;
      refreshSetup();
      break;
    case 'bestOf':
      if (app.scene !== 'setup') return;
      settings.bestOf = settings.bestOf === 1 ? 3 : 1;
      refreshSetup();
      break;
    case 'fog':
      if (app.scene !== 'setup') return;
      settings.fog = !settings.fog;
      refreshSetup();
      break;
    case 'pick': {
      const [p, k] = [Number(a), Number(b)];
      const { cursors, ready } = app.select ?? {};
      if (app.scene !== 'setup' || ready[p] || cursors[1 - p] === k) return;
      cursors[p] = k;
      refreshSetup();
      break;
    }
    case 'ready': {
      if (app.scene !== 'setup') return;
      const p = Number(a);
      app.select.ready[p] = !app.select.ready[p];
      refreshSetup();
      break;
    }
    case 'start':
      if (app.scene === 'setup') startSeries();
      else if (app.scene === 'error') app.series ? startMatch() : startSeries();
      break;
    case 'pause':
      if (app.scene !== 'game') return;
      pauseMatch(app.match);
      overlay.show(pauseScreen());
      setScene('paused');
      break;
    case 'resume':
      if (app.scene !== 'paused') return;
      resumeMatch(app.match);
      overlay.hide();
      setScene('game');
      break;
    case 'restart':
      if (app.scene === 'paused') startMatch();
      break;
    case 'next':
      if (app.scene !== 'result') return;
      if (seriesWinner(app.series) !== null) {
        startSeries();
      } else {
        startNextRound(app.series);
        startMatch();
      }
      break;
  }
}

function handleMenuKeys(presses) {
  // 결과 화면이 뜬 직후에는 실수로 넘어가지 않도록 잠깐 키를 무시합니다.
  if (app.scene === 'result' && performance.now() - app.sceneSince < RESULT_INPUT_DELAY) return;
  const keymap = { ...MENU_KEYS.global, ...(MENU_KEYS[app.scene] ?? {}) };
  const code = presses.find((c) => keymap[c]);
  if (code) runAction(keymap[code]);
}

// 준비 화면: 두 사람이 각자 키로 캐릭터를 고르고 준비합니다.
function handleSetupKeys(presses) {
  const { cursors, ready } = app.select;
  let changed = false;
  PLAYERS.forEach((player, p) => {
    for (const code of presses) {
      const dir = screenDirOf(player.keys, code);
      if (dir && !ready[p]) changed = moveCursor(p, dir) || changed;
      const slot = itemSlotOf(player.keys, code);
      if (slot === 0 && !ready[p]) ready[p] = changed = true;
      if (slot === 1 && ready[p]) {
        ready[p] = false;
        changed = true;
      }
    }
  });
  if (changed) {
    audio.play('click');
    refreshSetup();
  }
  if (ready[0] && ready[1] && performance.now() - app.select.readySince >= READY_START_DELAY * 1000) startSeries();
}

function moveCursor(p, dir) {
  const { cursors } = app.select;
  const step = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
  const rows = Math.ceil(CHARACTERS.length / GRID_COLUMNS);
  let col = cursors[p] % GRID_COLUMNS;
  let row = Math.floor(cursors[p] / GRID_COLUMNS);
  // 상대가 고른 캐릭터는 건너뜁니다.
  for (let tries = 0; tries < GRID_COLUMNS; tries++) {
    col += step[0];
    row += step[1];
    if (col < 0 || col >= GRID_COLUMNS || row < 0 || row >= rows) return false;
    const next = row * GRID_COLUMNS + col;
    if (next >= CHARACTERS.length) return false;
    if (next !== cursors[1 - p]) {
      cursors[p] = next;
      return true;
    }
  }
  return false;
}

// ── 사건 → 연출·소리 ──
function soundFor(event) {
  switch (event.type) {
    case 'countdown':
    case 'go':
    case 'pickup':
    case 'gem':
    case 'bagFull':
    case 'immune':
      return event.type;
    case 'use':
      return ITEMS[event.item].target === 'enemy' ? 'shoot' : null;
    case 'effect':
      return event.item;
    case 'effectEnd':
      return event.effect === 'freeze' ? 'shatter' : null;
    case 'trap':
      return event.trap;
    case 'boxRespawn':
      return 'respawn';
    case 'near':
      return 'heartbeat';
    case 'finish':
      return event.winner === null ? 'draw' : 'win';
    default:
      return null;
  }
}

function processEvents(dt) {
  const { match } = app;
  for (const event of match.events.splice(0)) {
    handleVfxEvent(vfx, event, match);
    const sound = soundFor(event);
    if (sound) audio.play(sound);
  }
  match.players.forEach((player, i) => {
    if (player.bump && player.bump !== app.bumps[i]) audio.play('bump');
    app.bumps[i] = player.bump;
  });
  // 누군가 보석을 들고 집 근처에 오면 두근두근
  if (match.phase === 'playing' && match.near.some(Boolean)) {
    app.heartbeatIn -= dt;
    if (app.heartbeatIn <= 0) {
      audio.play('heartbeat');
      app.heartbeatIn = 0.9;
    }
  }
}

// ── 루프 ──
function update(dt) {
  const presses = input.takePresses();
  if (presses.length > 0) app.lastInput = performance.now();
  handleMenuKeys(presses);

  if (app.scene === 'setup') handleSetupKeys(presses);

  if (app.scene === 'result' && seriesWinner(app.series) !== null) {
    const idleLeft = Math.ceil(RESULT_IDLE_RETURN - (performance.now() - app.lastInput) / 1000);
    if (idleLeft <= 0) showTitle();
    else if (idleLeft !== app.shownIdle) showResult({ animate: false });
  }

  if (app.scene !== 'game') return;
  const heldCodes = input.heldCodes();
  const commands = PLAYERS.map((p, i) =>
    toCommand({
      heldCodes,
      presses,
      keys: p.keys,
      reversed: app.match.players[i].effects.reverse > 0,
    }),
  );
  updateMatch(app.match, dt, commands);
  processEvents(dt);
  if (app.match.phase === 'result') finishMatch();
}

let lastFrame = null;
let fpsFrames = 0;
let fpsSince = performance.now();
function updateDebugBox(nowMs) {
  fpsFrames++;
  if (nowMs - fpsSince < 500) return;
  const fps = Math.round((fpsFrames * 1000) / (nowMs - fpsSince));
  fpsFrames = 0;
  fpsSince = nowMs;
  const m = app.match;
  debugBox.textContent = m
    ? `FPS ${fps} · 미로 ${m.mazeNumber ?? '-'}번 · seed ${m.seed} · ${m.maze.width}×${m.maze.height} · 최단 ${distanceAt(m.maze, 0, 0)}칸 · 생성 ${m.attempts}회 · ${m.phase}`
    : `FPS ${fps} · ${app.scene}`;
}

startLoop({
  step: LOOP.step,
  maxFrame: LOOP.maxFrame,
  update,
  render(alpha, now) {
    const frameDt = lastFrame === null ? 0 : Math.min(0.1, now - lastFrame);
    lastFrame = now;
    if (app.scene === 'game' || app.scene === 'result') updateVfx(vfx, frameDt);
    renderer.render(app.match, app.scene === 'game' ? alpha : 0, now, vfx, frameDt);
    if (DEBUG) updateDebugBox(now * 1000);
  },
});

// 글꼴(Jua)이 준비된 뒤에 첫 화면을 띄워서 글자 모양이 바뀌며 덜컹거리지 않게 합니다. (최대 0.8초 기다림)
if (PLAY_NOW) startSeries();
else {
  Promise.race([document.fonts?.load('32px Jua'), new Promise((r) => setTimeout(r, 800))])
    .catch(() => {})
    .then(() => {
      if (app.scene === 'title') showTitle();
    });
}
