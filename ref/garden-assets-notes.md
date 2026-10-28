# 정원 에셋 적용 기록

- 적용 전: `before-assets-title.png`, `before-assets-game.png`
- 적용 후: `after-assets-title.png`, `after-assets-game.png`
- 전체 미로 확인용(안개만 일시 해제): `after-assets-maze-overview.png`
- 비교 환경: 1440×900, 쉬움, seed=1234. 상자 속 아이템과 연출 시각은 달라질 수 있습니다.

## 분석과 적용

기존 캐릭터 16종은 유지하고, 단색 길과 선으로 된 벽에 정원 재질을 추가했습니다.
타이틀은 햇살이 드는 정원 일러스트, 실제 미로는 흙길 텍스처와 생울타리 잎사귀 재질을 씁니다.
벽은 실제 walls 비트의 선분에 재질을 입히므로 충돌 위치와 그림이 일치합니다.
안개, 시야 반경, 이동, 난이도, 아이템 규칙은 변경하지 않았습니다.

## 파일

- `src/assets/garden/backdrop.webp`: 메뉴 배경 및 플레이 화면 테두리
- `src/assets/garden/floor.webp`: 반복 흙길 재질
- `src/assets/garden/hedge.webp`: 벽 윗면 반복 재질
- `ref/generated-originals/`: imagegen 원본 PNG 3종
- `ref/garden-asset-prompts.json`: built-in image_gen에 사용한 전체 프롬프트

텍스처는 미로 캐시에 한 번만 합성하고 이미지 로딩 완료 및 창 크기 변경 때 다시 만듭니다.
준비되지 않은 이미지에는 기존 코드 기반 재질을 사용합니다.
원본에서 게임용 WebP를 다시 만들려면 `node scripts/build-garden-assets.mjs`를 실행합니다.

## 첫 화면 재구성

- 흰 카드형 패널을 제거하고 정원 풍경 위에 제목과 메뉴를 배치했습니다.
- 크림색 입체 제목, 양옆 캐릭터와 조작 안내, 금빛 테두리의 녹색 시작 버튼을 적용했습니다.
- 전체화면과 소리 설정은 상단에 배치하고, 기존 키보드 단축키와 오늘의 전적을 유지했습니다.
- 최종 캡처: `title-garden-redesign-1440.png`, `title-garden-redesign-1366.png`, `title-garden-redesign-1024.png`, `title-garden-redesign-390.png`, `title-garden-redesign-800.png`
- 1440×900, 1366×768, 1024×768, 390×844, 800×450에서 배치와 메뉴 잘림을 확인했습니다.
- 시작·도움말 단축키, 소리 토글, USB 단일 HTML 직접 실행 및 시작 화면 이동을 확인했습니다.
