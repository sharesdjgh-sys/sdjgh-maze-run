# 귀염뽀짝 미로 레이스

한 컴퓨터에서 두 명이 키보드를 나눠 쓰는 2인 대결 미로 웹게임입니다.

**기준 문서: `ref/미로찾기 게임_기획서.md`.** 규칙, 수치, 구조는 이 문서를 따릅니다. 규칙이나 설계를 바꾸면 문서도 함께 고쳐서 코드와 어긋나지 않게 합니다. 원본 `ref/미로찾기 게임_최종요약.txt`(공모전 제출본)는 수정하지 않습니다.

## 명령어
- `npm run dev`: 개발 서버 (http://localhost:5173)
- `npm test`: 자동 테스트 (Vitest, `tests/`)
- `npm run build`: Vercel 배포용 빌드 (`dist/`, PWA 오프라인 캐시 포함)
- `npm run build:offline`: USB용 HTML 파일 하나 (`dist-offline/index.html`)
- `npm run maze-pool`: 난이도마다 후보 3000개 중 좋은 미로 50개를 골라 `src/data/mazePool.js`에 저장 (약 40초). **미로 생성 방식(`game/maze.js`, `game/placement.js`)이나 난이도 수치를 바꾸면 반드시 다시 실행**합니다. 안 하면 `tests/mazePool.test.js`가 실패합니다.
- `npm run characters`: `ref/character-originals`의 원본 PNG → `src/assets/characters/<id>.webp` (256px). 캐릭터 목록은 `src/data/characters.js`
- `npm run icons`: `src/data/icons.js` 목록대로 Fluent Emoji 3D 아이콘을 받아 `src/assets/icons/<id>.webp` (128px)로 저장 (인터넷 필요)
- `npm run animations`: 캐릭터 걷기·대기 시트 → `src/assets/animations/<id>.webp` (4열 × 2행)
- 주소 옵션: `?debug=1`(FPS·시드·최단 경로 표시, `window.__app`으로 상태 확인), `?seed=1234`(같은 미로 재현), `?play=easy|normal|hard`(준비 화면 건너뛰기)

## 구조 원칙
- `src/game/`은 순수 로직입니다. 미로 좌표만 쓰고 Canvas나 DOM을 건드리지 않습니다. 화면·소리가 필요한 일은 `match.events`에 사건으로 남기고, `main.js`가 꺼내서 `render/vfx.js`와 `core/audio.js`로 넘깁니다.
- 규칙을 바꾸면 `tests/`에 테스트를 추가합니다. 직접 만든 미로로 판을 짜려면 `tests/helpers.js`의 `corridorMatch`와 `game/match.js`의 `assembleMatch`를 씁니다.
- 화면은 하나를 같이 봅니다(v4). 미로는 16:9에 가까운 직사각형(가로·세로 홀수)이고, 크기는 `maze.width`·`maze.height`로 다룹니다. 칸 번호는 `y * width + x`입니다.
- 안개는 두 사람의 시야를 합쳐서 그리고, 지나온 길은 4초에 걸쳐 서서히 어두워집니다(v6, `player.seenAt`에 칸마다 마지막으로 본 시각 기록). 미로는 갈림길·막다른 길이 많아야 합니다(`MAZE.windiness` 0.5). 조작이 빠른 사람이 아니라 길을 잘 찾는 사람이 이기도록 하는 것이 목표이고, `tests/maze.test.js`의 미로 난이도 테스트가 이를 확인합니다. 화면 전체에 거는 효과는 공격한 사람도 피해를 보므로, 효과는 당한 캐릭터 주변에만 겁니다.
- 게임 화면에는 위쪽 정보 표시줄이 없습니다(v8). 미로를 화면 가득 그리고, 아이템 칸은 캐릭터 발밑(`renderer.js`의 `drawItemSlots`)에, 걸린 시간은 결과 화면에만, 3판 2선승 점수는 카운트다운 때만 보여 줍니다.
- 밸런스 수치, 키 설정, 1P/2P 색은 `src/config.js` 한 곳에만 둡니다.
- 판의 미로는 `src/core/mazeDeck.js`가 목록에서 섞어서 꺼냅니다(50판 동안 겹치지 않음, 순서는 localStorage). 미로·상자·함정은 `seed`로, 상자 속 아이템은 `itemSeed`로 따로 정합니다. `?seed=`로 정하면 목록 대신 그 미로가 나옵니다.
- 난이도는 미로 크기뿐 아니라 시야(`DIFFICULTIES.*.vision`), 미로 모양(`windiness`), 함정 수까지 함께 바꿉니다. 판마다의 시야 설정은 `match.vision`에 들어 있고, `visionRadius`·`trailBrightness`에 넘겨 씁니다. `tests/ui.test.js`의 난이도 테스트가 '어려울수록 더 어렵다'를 확인합니다.
- 키는 반드시 `event.code`로 판별합니다. 한글 입력 상태와 NumLock 상태에서도 동작해야 합니다.
- 승리 조건(v11): 보석(`maze.treasure`)을 만지면 `player.hasGem`, 그 뒤 자기 출발점(`maze.starts[i]`)에 닿으면 승리입니다. 보석은 사라지지 않습니다. 남은 거리는 `journeyLeft`(보석 전: 보석까지 + 보석에서 집까지)로 재고, 집까지의 거리표는 `match.homeDist`에 있습니다. 테스트에서는 `tests/helpers.js`의 `towardGoal`로 보석 → 집 순서로 움직입니다.
- 캐릭터는 칸의 약 1.3배로 하얀 테두리를 둘러 그립니다(v11, `renderer.js`의 `figure`). 캐릭터를 더 크게 보이게 하려면 캐릭터만 키우지 말고 미로 칸 수를 줄여 칸을 키웁니다(캐릭터만 키우면 주변 벽을 가림, `tests/ui.test.js`가 확인). 움직이지 않는 배경은 `staticCanvas`에 한 장으로 합쳐 두고, 메뉴 화면은 풍경이 다 나타나면 다시 그리지 않습니다.
- 함정은 보물로 가는 길을 막으면 안 됩니다. 소용돌이는 막다른 길 끝에만 두고, 얼음 위에서도 옆으로는 꺾을 수 있게 합니다.
- 화면 문구와 코드 주석은 한국어로 씁니다.

## 진행 상황 (기획서 10.2)
- [x] 0~3단계 전체, 안개 + 함정(v3), PWA·USB 빌드
- [ ] Vercel 배포, 행사장 PC 테스트(기획서 11.2), 플레이 테스트 후 `config.js` 수치 조정
- [x] 캐릭터를 원본 그림 16종으로 교체
- [ ] 선택 기능: 방어막 아이템, 화면 방향 랜덤, 키 설정 변경, 배경음악
