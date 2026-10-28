// 미로를 끝내 만들지 못했을 때의 안내 (기획서 기능 1, 단계 5)

export function errorScreen() {
  return `
    <div class="card">
      <h2>미로를 만들지 못했어요 😢</h2>
      <p>다시 시작을 눌러 주세요.</p>
      <div class="menu">
        <button class="primary" data-action="start">다시 시작 <kbd>Enter</kbd></button>
        <button data-action="title">처음으로</button>
      </div>
    </div>`;
}
