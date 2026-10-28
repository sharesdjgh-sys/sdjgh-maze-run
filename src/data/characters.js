// 공부캐 16종. 이름은 ref/공부캐 이름2.jpg의 전체 이름표를 기준으로 합니다.
// 원본 그림은 ref/character-originals/<file>.png 입니다.
// 게임에서 쓰는 작은 그림(src/assets/characters/<id>.webp)은 `npm run characters`로 다시 만들 수 있습니다.
// 준비 화면에는 이 순서대로 4줄(청각·운동·촉각·시각)로 놓입니다.
// type은 원본 파일 이름에 담긴 유형입니다. (감각 · 혼자/함께 · 계획/유연)

export const CHARACTERS = [
  { id: 'cat', name: '멜로', file: 'auditory-solo-flexible', type: '청각 · 혼자 · 유연' },
  { id: 'fennec', name: '소리', file: 'auditory-solo-planned', type: '청각 · 혼자 · 계획' },
  { id: 'parrot', name: '리프', file: 'auditory-team-flexible', type: '청각 · 함께 · 유연' },
  { id: 'dog', name: '토크', file: 'auditory-team-planned', type: '청각 · 함께 · 계획' },
  { id: 'rabbit', name: '바니', file: 'motion-solo-flexible', type: '운동 · 혼자 · 유연' },
  { id: 'penguin', name: '페이스', file: 'motion-solo-planned', type: '운동 · 혼자 · 계획' },
  { id: 'quokka', name: '스킵', file: 'motion-team-flexible', type: '운동 · 함께 · 유연' },
  { id: 'husky', name: '루카', file: 'motion-team-planned', type: '운동 · 함께 · 계획' },
  { id: 'raccoon', name: '몽', file: 'tactile-solo-flexible', type: '촉각 · 혼자 · 유연' },
  { id: 'beaver', name: '토리', file: 'tactile-solo-planned', type: '촉각 · 혼자 · 계획' },
  { id: 'otter', name: '조이', file: 'tactile-team-flexible', type: '촉각 · 함께 · 유연' },
  { id: 'bear', name: '블록', file: 'tactile-team-planned', type: '촉각 · 함께 · 계획' },
  { id: 'fox', name: '모아', file: 'visual-solo-flexible', type: '시각 · 혼자 · 유연' },
  { id: 'owl', name: '루미', file: 'visual-solo-planned', type: '시각 · 혼자 · 계획' },
  { id: 'chameleon', name: '피코', file: 'visual-team-flexible', type: '시각 · 함께 · 유연' },
  { id: 'deer', name: '루트', file: 'visual-team-planned', type: '시각 · 함께 · 계획' },
];
