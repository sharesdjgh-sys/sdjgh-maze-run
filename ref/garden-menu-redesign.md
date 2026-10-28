# 선택·승리 화면 재디자인 (v14)

## 캐릭터 선택

- 반복되던 양쪽 16종 목록을 하나의 공용 4×4 명단으로 합쳤습니다.
- 양쪽에는 큰 캐릭터 미리보기와 이름, 준비 상태를 표시합니다.
- 마우스는 상단 1P/2P 탭이나 캐릭터 미리보기를 눌러 선택 대상을 바꿉니다.
- 키보드는 기존처럼 1P WASD, 2P 방향키로 각자 동시에 고릅니다.
- 준비한 사람의 선택은 잠그고, 준비 취소 후 다시 고를 수 있습니다.
- 두 사람 모두 준비하면 기존과 같이 0.8초 뒤 자동 출발합니다. Enter 바로 출발도 유지합니다.
- 난이도·판 수·안개 설정은 아래쪽으로 모았고 미로 칸 수·시야 반경 등의 수치는 숨겼습니다.
- 좁은 화면은 선택 화면 안에서 스크롤하며 명단과 설정이 겹치지 않습니다.

## 승리 연출

- 통계표, 시간, 미로 번호, 이동·우회·아이템 수치, 최단 거리 안내를 결과 화면에서 제거했습니다.
- 우승 캐릭터를 금빛 정원 시상대 위에 크게 배치하고 점프, 조명, 반짝임, 트로피, 꽃가루로 축하합니다.
- 기존 캐릭터 메뉴의 부드러운 호흡 애니메이션은 유지하고, 바깥 요소에 축하 점프를 더했습니다.
- 승리 시 짧은 팡파르와 마지막 화음을, 준비 시 확인 멜로디를 재생합니다.
- 결과 배경은 안개 낀 경기장 대신 정원 풍경으로 전환합니다.
- 단판 승리·3판 2선승의 중간 승리·최종 우승·무승부를 구분합니다.
- 시리즈 승수는 별로만 간단히 표시하고 재대결 버튼을 가장 크게 배치했습니다.
- 자동 타이틀 복귀는 유지하되 마지막 10초에만 안내합니다. 안내 문구만 갱신해 축하 요소가 매초 재생을 다시 시작하지 않도록 했습니다.
- 동작 줄이기 환경에서는 CSS 움직임과 새로 발생하는 Canvas 꽃가루를 생략합니다.

## 새 에셋

built-in image_gen으로 정원 테마의 투명 배경 에셋을 제작했습니다.

- `src/assets/garden/selection-plinth.webp`: 선택 캐릭터가 서 있는 정원 돌 발판
- `src/assets/garden/victory-podium.webp`: 우승 캐릭터용 금빛 시상대
- 원본: `ref/generated-originals/selection-plinth.png`, `ref/generated-originals/victory-podium.png`
- 전체 프롬프트: [garden-asset-prompts.json](garden-asset-prompts.json)
- 재가공: `node scripts/build-garden-assets.mjs`

## 화면 비교

- 적용 전: `before-selection-redesign.png`, `before-victory-redesign.png`
- 선택 화면: [1440×900](after-selection-redesign-1440.png), `after-selection-redesign-1366.png`, `after-selection-redesign-1024.png`, `after-selection-redesign-800.png`, `after-selection-redesign-390.png`, `after-selection-redesign-mobile-bottom.png`
- 단판 승리: [1440×900](after-victory-redesign-1440.png)
- 시리즈 우승: [1440×900](after-victory-series-1440.png), `after-victory-series-1366.png`, `after-victory-series-1024.png`, `after-victory-series-800.png`, `after-victory-series-390.png`
- 중간 승리·무승부: `after-victory-round.png`, `after-victory-draw.png`

## 검증

- 전체 테스트 109개 통과. 새 테스트는 공용 명단·선택 잠금·1P/2P 승자·무승부·시리즈 진행/종료를 확인합니다.
- 브라우저에서 양쪽 키보드 선택, 마우스 대상 전환, 준비 잠금·취소, 둘 다 준비한 뒤 자동 출발을 확인했습니다.
- 실제 경기 종료 흐름으로 1P 승리·2P 최종 우승·중간 승리·무승부와 다음 판 진행을 확인했습니다.
- 1440×900, 1366×768, 1024×768, 800×450, 390×844에서 제목·캐릭터·승수·버튼의 배치를 확인했습니다.
- 결과 자동 복귀 문구가 갱신돼도 캐릭터 DOM과 애니메이션 시각이 유지되는지 확인했습니다.
- 이동·충돌·아이템·학교/집 승리 조건·난이도 수치와 미로 목록은 변경하지 않았습니다.
- 일반 배포 빌드와 PWA 캐시 생성 완료: 133개 항목, 4502.37 KiB.
- USB 단일 HTML 빌드 완료: 약 6.16MB. file:// 직접 실행에서 선택 발판·승리 시상대가 HTML에 포함돼 표시되는지, 승리 후 재대결까지 동작하는지 확인했습니다.
- git diff --check 통과.

## 최종 반영

- 공부캐 16종은 제공된 전체 이름표의 고유 이름으로 변경했습니다.
- 공용 선택판을 최대 560px로 넓히고 목록에서는 이름을 없앴습니다. 선택한 두 친구의 이름만 큰 미리보기에 표시합니다.
- 손전등 지속 시간은 사용자 의견에 따라 8초에서 3초로 변경했습니다.
- 첫 화면은 서대전여고 캠퍼스를 중앙에 크게 배치하고 두 친구를 학교 바로 양옆에 배치했습니다. [최종 첫 화면](after-title-school-and-friends.png)
- 학교의 투명 배경 원본·생성 프롬프트·참고 사진과 900px 타이틀용/256px 게임용 이미지를 보관합니다.
- 최종 검증: 전체 109개 테스트 통과, 일반/PWA 빌드와 USB 단일 HTML 빌드 성공. 앞의 빌드 크기와 스크린샷은 각 단계의 기록입니다.
