# 귀염뽀짝 미로 레이스 🐱💎🐶

한 컴퓨터에서 두 친구가 키보드를 나눠 쓰며, 화면 가득한 안개 낀 랜덤 미로(16:9)의 양 끝에서 출발해 가운데 보물을 먼저 차지하는 2인 대결 웹게임입니다.

- 기획서: [`ref/미로찾기 게임_기획서.md`](ref/미로찾기%20게임_기획서.md)

## 조작법

| | 1P (왼쪽 화면) | 2P (오른쪽 화면) |
|---|---|---|
| 이동 | `W` `A` `S` `D` | 방향키 |
| 아이템 1번 / 2번 | `Q` / `E` | 숫자패드 `1` / `2` (노트북은 `.` / `/`) |

- `Esc` 일시정지 · `M` 소리 끄기/켜기 · 타이틀에서 `H` 조작법, `F` 전체화면
- 두 사람이 화면 하나를 같이 봅니다. 1P는 왼쪽 위, 2P는 오른쪽 아래에서 출발합니다.

## 실행하기 (내 컴퓨터)

[Node.js](https://nodejs.org/) LTS가 설치되어 있어야 합니다.

```bash
npm install      # 처음 한 번만
npm run dev      # http://localhost:5173 을 브라우저로 열기
```

끄려면 터미널에서 `Ctrl + C`를 누릅니다.

## 캐릭터 그림 바꾸기

1. `ref/character-originals/`에 원본 PNG(투명 배경)를 넣거나 바꿉니다.
2. `src/data/characters.js`에서 캐릭터 이름과 파일 이름을 맞춥니다.
3. `npm run characters`를 실행하면 `src/assets/characters/`에 게임용 그림(256px WebP)이 만들어집니다.

## 테스트

```bash
npm test
```

## 배포하기 (링크로 접속)

1. 이 폴더를 GitHub 저장소에 올립니다.
2. [vercel.com](https://vercel.com)에 GitHub 계정으로 로그인하고, **Add New → Project**에서 저장소를 고릅니다.
3. Vite 프로젝트가 자동으로 인식됩니다. (빌드 명령 `npm run build`, 출력 폴더 `dist`) **Deploy**를 누르면 링크가 나옵니다.

배포된 게임은 한 번 접속하면 브라우저에 저장되어(PWA), 행사 중 인터넷이 끊겨도 다시 열 수 있습니다.

## 인터넷 없이 USB로 실행하기

```bash
npm run build:offline
```

`dist-offline/index.html` 파일 하나가 만들어집니다. USB에 복사한 뒤 행사장 컴퓨터에서 **더블클릭**하면 Chrome·Edge·웨일에서 바로 실행됩니다.

## 개발용 주소 옵션

- `?debug=1`: FPS, 미로 번호(시드), 최단 경로 표시
- `?seed=1234`: 같은 미로를 다시 만들기
- `?play=easy` (`normal`, `hard`): 준비 화면을 건너뛰고 바로 시작

## 사용한 자료

- 글꼴: [주아(Jua)](https://fonts.google.com/specimen/Jua), SIL Open Font License 1.1 (`@fontsource/jua`)
- 캐릭터 그림: `ref/character-originals`의 원본 16종 → `npm run characters`로 게임용 WebP로 변환
- 보물·아이템·함정 그림: 운영체제에 들어 있는 이모지
- 효과음: Web Audio로 코드에서 직접 만듦 (음원 파일 없음)
- 개발: Claude Code
