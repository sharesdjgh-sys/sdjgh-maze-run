// 브라우저 저장소(localStorage). 사생활 보호 모드 등에서 막혀 있어도 게임은 그대로 돌아가야 합니다.

const PREFIX = 'maze-race:';

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 저장이 안 돼도 게임 진행에는 문제없음
  }
}
