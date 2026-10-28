// 게임 화면 위에 덮는 메뉴 창(타이틀, 준비, 일시정지, 결과 등)을 보여 주고 버튼 클릭을 동작으로 넘깁니다.

export function createOverlay(root, onAction) {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    button.blur(); // 버튼에 포커스가 남아 있으면 Enter 키가 버튼을 또 누르게 됨
    onAction(button.dataset.action);
  });

  return {
    /** 새 창을 띄웁니다. (등장 애니메이션 포함) */
    show(html, { delay = 0 } = {}) {
      root.classList.remove('static');
      root.innerHTML = html;
      root.style.setProperty('--enter-delay', `${delay}ms`);
      root.classList.add('show');
    },
    /** 지금 창의 내용만 바꿉니다. (애니메이션 없이) */
    update(html) {
      root.classList.add('static');
      root.innerHTML = html;
    },
    hide() {
      root.classList.remove('show', 'static');
      root.innerHTML = '';
    },
  };
}
