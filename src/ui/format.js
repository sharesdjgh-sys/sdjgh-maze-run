/** 초 → "분:초.0" (예: 83.47 → "01:23.4") */
export function formatTime(seconds) {
  const tenths = Math.floor(Math.max(0, seconds) * 10 + 1e-6);
  const minutes = Math.floor(tenths / 600);
  const secs = Math.floor((tenths % 600) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths % 10}`;
}
