// 밸런스 수치와 키 설정은 모두 이 파일에서만 조정합니다. (기획서 9장)

// 미로는 화면 하나에 크게 그리므로 16:9에 가까운 직사각형입니다. 가로·세로는 홀수여야 정가운데 칸이 생깁니다.
// 난이도가 오를수록 미로가 커지고, 시야가 좁아지고, 지나온 길이 빨리 사라지고, 함정이 많아집니다.
// v11: 보석을 찍고 집까지 돌아오는 왕복 규칙이 되어, 칸 수를 줄여 칸(과 캐릭터)을 크게 그립니다. (한 판 길이는 비슷하게)
// traps의 숫자는 '대칭 짝' 개수입니다. (거미줄 1 = 2칸, 소용돌이 1 = 서로 이어진 2쌍 4칸, 얼음 1 = 얼음 길 2개)
// vision: 시야 반경(칸)과 지나온 길이 완전히 사라지는 시간(초). 적지 않은 값은 아래 VISION을 따릅니다.
export const DIFFICULTIES = {
  easy: {
    label: '쉬움', width: 27, height: 15, windiness: 0.5, braidRatio: 0.05,
    vision: { radius: 2.0, trailFade: 4 },
    boxPairs: 4, traps: { web: 3, portal: 1, ice: 2 },
  },
  normal: {
    label: '보통', width: 31, height: 17, windiness: 0.5, braidRatio: 0.05,
    vision: { radius: 1.8, trailFade: 3 },
    boxPairs: 5, traps: { web: 4, portal: 2, ice: 3 },
  },
  hard: {
    label: '어려움', width: 39, height: 21, windiness: 0.45, braidRatio: 0.05,
    vision: { radius: 1.6, trailFade: 2 },
    boxPairs: 6, traps: { web: 6, portal: 3, ice: 4 },
  },
};
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

export const DEFAULT_SETTINGS = {
  difficulty: 'easy',
  bestOf: 1, // 1 = 단판승, 3 = 3판 2선승
  fog: true, // 시야 제한(안개)
  characters: ['cat', 'dog'],
};

export const MAZE = {
  // 0.5 = 갈림길과 막다른 길이 많은 미로. 1로 올리면 갈림길이 적고 길게 구불구불한 길(DFS)이 되어
  // 고를 게 적어지므로 조작이 빠른 사람이 유리해집니다. (기획서 8.3 비교표)
  windiness: 0.5,
  minPathFactor: 1.4, // 최단 경로 ≥ 맨해튼 거리 × 1.4 (너무 쉬운 미로 방지)
  maxAttempts: 40, // 검사에 실패하면 다시 만드는 최대 횟수
};

export const MOVE = {
  cellsPerSecond: 6, // 기본 이동 속도 (초당 칸 수)
  bufferTime: 0.15, // 선입력 기억 시간 (초)
  bumpTime: 0.12, // 벽에 부딪혔을 때 튕기는 연출 시간 (초)
};

// 안개(시야 제한): 두 캐릭터 주변만 보이고, 지나온 길은 서서히 어두워집니다.
// radius·trailFade는 난이도마다 다르게 정할 수 있습니다(DIFFICULTIES의 vision). 여기 값은 기본값입니다.
export const VISION = {
  radius: 2.0, // 시야 반경 (칸, 기본값)
  darkRadius: 0.9, // 깜깜 먹구름에 걸렸을 때 시야 반경 (칸) — 자기 칸만 보임
  flashlightRadius: 4.5, // 손전등을 켰을 때 시야 반경 (칸)
  darkCloudRadius: 3.5, // 먹구름에 걸린 캐릭터 주변을 가리는 구름 반경 (칸)
  trailFade: 4, // 지나온 길이 완전히 어두워지기까지 걸리는 시간 (초, 기본값)
  trailStrength: 0.7, // 방금 지나온 길의 밝기 (0~1). 시간이 지나며 0으로 줄어듦
};

// 아이템 6종 (기획서 6장). weight는 상자에서 나올 비율입니다. fogOnly는 안개 모드에서만 상자에서 나옵니다.
export const ITEMS = {
  speedUp: {
    emoji: '⚡', name: '번개 신발', target: 'self', duration: 5, multiplier: 1.5, weight: 20,
    shout: '슝슝!', desc: '5초 동안 내 속도 1.5배',
  },
  flashlight: {
    emoji: '🔦', name: '손전등', target: 'self', duration: 8, weight: 20, fogOnly: true,
    shout: '반짝!', desc: '8초 동안 내 시야가 넓어지고, 걸려 있던 먹구름도 걷혀요',
  },
  slowDown: {
    emoji: '🐌', name: '달팽이 저주', target: 'enemy', duration: 4, multiplier: 0.6, weight: 15,
    shout: '느릿느릿~', desc: '4초 동안 상대 속도 0.6배',
  },
  freeze: {
    emoji: '❄️', name: '꽁꽁 얼음', target: 'enemy', duration: 3, weight: 15,
    shout: '꽁꽁!', desc: '상대를 3초 동안 얼림',
  },
  reverse: {
    emoji: '😵', name: '빙글빙글', target: 'enemy', duration: 5, weight: 15,
    shout: '빙글빙글!', desc: '5초 동안 상대 방향키 반대 + 어질어질',
  },
  dark: {
    emoji: '🌑', name: '깜깜 먹구름', target: 'enemy', duration: 5, weight: 15,
    shout: '깜깜!', desc: '5초 동안 상대 시야를 자기 칸만 보이게 좁힘',
  },
};

export const ITEM_RULES = {
  bagSize: 2,
  boxRespawn: 10, // 먹은 상자가 다시 생기는 시간 (초)
  deadEndShare: 0.5, // 상자 중 막다른 길 끝에 두는 비율
  freezeImmunity: 2, // 얼음이 풀린 뒤 얼음이 통하지 않는 시간 (초)
  projectileTime: 0.4, // 아이템이 상대에게 날아가는 시간 (초)
  bagFullNotice: 1.5, // "가방이 가득 찼어요!" 반복 간격 (초)
  catchUp: { enabled: true, minGap: 4, attackBoost: 1.5 }, // 승리까지 남은 거리(보석 → 집)가 4칸 이상 뒤처지면 공격 아이템 확률 1.5배
};

// 함정 3종. 안개 속에 숨어 있다가 가까이 가면 보입니다.
export const TRAPS = {
  web: { emoji: '🕸️', name: '거미줄', stuckTime: 1.2, shout: '끈적!', desc: '밟으면 1.2초 동안 묶여요' },
  portal: { emoji: '🌀', name: '소용돌이', shout: '슈웅~', desc: '막다른 길 끝에 숨어 있어요. 들어가면 짝꿍 소용돌이로 순간이동! 지름길일까, 함정일까?' },
  ice: { emoji: '🧊', name: '얼음 바닥', slideSpeed: 1.8, length: [3, 4], shout: '미끄덩!', desc: '빠르게 미끄러져서 멈추거나 뒤로 돌 수 없어요. 갈림길에서 옆으로 꺾는 것만 가능!' },
};

export const PLACEMENT = {
  minDistFromStart: 3, // 상자·함정은 출발점에서 이 칸 수 이상 떨어진 곳에
  minDistFromTreasure: 2, // 보물에서 이 칸 수 이상 떨어진 곳에
  minSpacing: 3, // 상자·함정끼리 최소 간격 (가로+세로 칸 수)
};

export const MATCH = {
  countdown: 3, // 3-2-1 카운트다운 (초)
  goDisplayTime: 0.7, // "GO!" 표시 시간 (초)
  nearDistance: 5, // 보석을 들고 집까지 이 칸 수 이내로 오면 두근두근 연출
};

export const VFX = {
  wobbleStrong: 0.18, // 빙글빙글 처음 캐릭터 흔들림 (칸)
  wobbleWeak: 0.06, // 이후 계속되는 약한 흔들림 (칸)
  wobbleStrongTime: 0.5, // 강하게 흔들리는 시간 (초)
  bubbleTime: 1.1, // 말풍선 표시 시간 (초)
};

export const LOOP = {
  step: 1 / 60, // 게임 규칙 업데이트 간격 (초)
  maxFrame: 0.25, // 한 프레임이 이보다 길면 잘라냄 (탭 전환 후 순간이동 방지)
};

// 1P는 미로 왼쪽 위, 2P는 오른쪽 아래에서 출발합니다.
// 키는 반드시 event.code 값으로 적습니다. (기획서 8.7) 준비 화면에서는 item1 = 준비, item2 = 취소입니다.
export const PLAYERS = [
  {
    label: '1P',
    color: '#ff6b81',
    soft: '#ffd6dd',
    keys: {
      up: ['KeyW'],
      down: ['KeyS'],
      left: ['KeyA'],
      right: ['KeyD'],
      item1: ['KeyQ'],
      item2: ['KeyE'],
    },
    keyLabels: { move: ['W', 'A', 'S', 'D'], item1: 'Q', item2: 'E' },
  },
  {
    label: '2P',
    color: '#3fa7f5',
    soft: '#cde8ff',
    keys: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      item1: ['Numpad1', 'Period'], // 숫자패드 없는 노트북은 . 키
      item2: ['Numpad2', 'Slash'], // 숫자패드 없는 노트북은 / 키
    },
    keyLabels: { move: ['↑', '←', '↓', '→'], item1: '1', item2: '2' },
  },
];

// 화면별 메뉴 단축키 (event.code → 동작). M(소리)은 모든 화면에서 동작합니다.
export const MENU_KEYS = {
  global: { KeyM: 'mute' },
  title: { Enter: 'setup', NumpadEnter: 'setup', KeyH: 'howto', KeyF: 'fullscreen' },
  howto: { Escape: 'title', Enter: 'title', NumpadEnter: 'title', KeyH: 'title' },
  setup: {
    Enter: 'start',
    NumpadEnter: 'start',
    Escape: 'title',
    Digit1: 'difficulty:easy',
    Digit2: 'difficulty:normal',
    Digit3: 'difficulty:hard',
    Digit4: 'bestOf',
    Digit5: 'fog',
  },
  game: { Escape: 'pause' },
  paused: { Escape: 'resume', KeyR: 'restart', KeyT: 'title' },
  result: { Enter: 'next', NumpadEnter: 'next', KeyC: 'setup', Escape: 'title' },
  error: { Enter: 'start', NumpadEnter: 'start', Escape: 'title' },
};

export const RESULT_INPUT_DELAY = 600; // 결과 화면이 뜬 직후 실수로 넘어가지 않도록 입력을 막는 시간 (밀리초)
export const RESULT_IDLE_RETURN = 30; // 최종 결과 화면에서 입력이 없으면 타이틀로 돌아가는 시간 (초)
export const READY_START_DELAY = 0.8; // 둘 다 '준비'하면 이 시간 뒤 자동 시작 (초)
