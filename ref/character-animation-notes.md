# 캐릭터 애니메이션 적용 기록

## 제작물

- 기존 캐릭터 16종을 참조해 built-in image_gen으로 각각 4열 × 2행 시트를 제작했습니다.
- 캐릭터마다 대기 4프레임(호흡·눈 깜빡임·작은 자세 변화), 걷기 4프레임으로 총 128프레임입니다.
- 원본은 `ref/character-animation-originals/<id>.png`, 게임용 시트는 `src/assets/animations/<id>.webp`에 있습니다.
- WebP는 각각 1024×512, 프레임은 256×256이며 전체 용량은 2,590,866 bytes입니다.
- 원본 생성 프롬프트와 참조 경로는 `ref/character-animation-prompts.json`에 기록했습니다.
- 기존 캐릭터와 같은 정면에 가까운 시점을 사용하며, 왼쪽 이동은 수평 반전으로 표현합니다.

## 게임 연결

- `src/render/character-animation.js`에서 대기·이동·묶임·동작 줄이기 상태에 따라 프레임을 선택합니다.
- 걷기는 실제 이동 칸 수와 현재 칸의 이동 진행률에 연결해 속도 효과에도 발걸음이 맞도록 했습니다.
- 게임 시각을 사용하므로 일시정지하면 같은 프레임을 유지합니다.
- 얼음·거미줄에 묶인 상태와 동작 줄이기 설정에서는 첫 프레임을 사용합니다.
- 타이틀, 선택된 캐릭터, 결과 화면에서도 시트의 대기 프레임을 재생합니다.
- 시트를 아직 불러오지 못했거나 불러오기에 실패하면 기존 정지 그림을 보여 줍니다.
- Canvas 프레임은 표시 크기와 화면 배율별로 캐시합니다. 이동·충돌·아이템 규칙은 변경하지 않았습니다.

## 재가공과 미리보기

```sh
npm run animations
npm run animations:preview
```

- `ref/character-animation-preview.html`: 16종의 대기·걷기 전환을 확인할 수 있는 HTML
- `ref/character-motion-demo.webp`: 16종이 함께 움직이는 반복 애니메이션
- `ref/character-motion-all.png`: 전체 캐릭터 걷기 화면 캡처
- `ref/character-motion-title.png`: 타이틀 적용 캡처
- `ref/character-motion-game.png`: 실제 게임 적용 캡처
- `ref/character-animation-build.json`: 시트별 프레임 수·크기·용량

빌드 과정은 투명 알파 채널과 각 프레임의 몸체를 확인한 뒤 크기와 발밑 기준선을 정렬합니다.
서로 동일한 대기 구간은 미리보기 WebP 인코더가 합쳐 저장할 수 있으며 재생 시간은 유지됩니다.

## 검증

- 전체 자동 테스트 97개 통과: `npm test -- --pool=threads --maxWorkers=1 --testTimeout=60000`
- 브라우저에서 16종 모두 8개의 서로 다른 Canvas 프레임으로 읽히는지 확인했습니다.
- 타이틀의 CSS 애니메이션이 4개의 다른 위치로 프레임을 전환하는지 확인했습니다.
- 실제 게임에서 이동 중 4·5·6·7번 걷기 프레임 재생 및 일시정지 시각·프레임 고정을 확인했습니다.
