// 일시정지 화면 (Esc, 또는 창 전환 시 자동)

export function pauseScreen() {
  return `
    <div class="card pause-card">
      <h2>잠깐 멈춤</h2>
      <div class="menu">
        <button class="primary" data-action="resume">계속하기 <kbd>Esc</kbd></button>
        <button data-action="restart">새 미로로 이번 판 다시 <kbd>R</kbd></button>
        <button data-action="title">처음으로 <kbd>T</kbd></button>
      </div>
    </div>`;
}
