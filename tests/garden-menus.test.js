import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/config.js';
import { selectScreen } from '../src/ui/select.js';
import { resultScreen } from '../src/ui/result.js';

const match = winner => ({ players: [{ character: 'cat' }, { character: 'dog' }], result: { winner } });
const series = (wins = [0, 0], bestOf = 1) => ({ wins, bestOf, round: 1, draws: 0 });

describe('선택 화면의 공용 캐릭터 명단', () => {
  it('16개 선택 버튼을 한 번만 표시하고 두 사람의 선택을 구분한다', () => {
    const html = selectScreen({ settings: DEFAULT_SETTINGS, cursors: [0, 3], ready: [false, false] });
    expect(html.match(/data-action="pick:/g)).toHaveLength(16);
    expect(html).toContain('data-action="pick:0:1"');
    expect(html).toContain('aria-label="멜로 선택" aria-pressed="true"');
    expect(html.match(/class="roster-player-tag"/g)).toHaveLength(2);
  });
  it('마우스의 선택 주체를 2P로 바꾸고 준비된 사람의 선택은 잠근다', () => {
    const html = selectScreen({ settings: DEFAULT_SETTINGS, cursors: [0, 3], ready: [false, true], activePlayer: 1 });
    expect(html).toContain('data-action="pick:1:1"');
    expect(html.match(/title="[^"]+" disabled>/g)).toHaveLength(16);
    expect(html).toContain('2P 준비 완료! 다시 고르려면 준비를 취소해요');
    expect(html).toContain('data-action="ready:1" aria-pressed="true"');
  });
});

describe('축하 화면의 승패와 재대결', () => {
  it.each([0, 1])('%i번 승자를 올바르게 강조하고 통계표를 제거한다', winner => {
    const wins = winner === 0 ? [1, 0] : [0, 1];
    const html = resultScreen({ match: match(winner), series: series(wins), idleLeft: 30 });
    expect(html).toContain('data-result-winner="' + winner + '"');
    expect(html).toContain(`<h1 id="victory-title">${winner + 1}P ${winner === 0 ? '멜로' : '토크'} 승리!</h1>`);
    expect(html).toContain('data-action="next"');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('헤맨 칸');
  });
  it('무승부는 두 캐릭터와 재대결을 표시한다', () => {
    const html = resultScreen({ match: match(null), series: series(), idleLeft: null });
    expect(html).toContain('data-result-winner="draw"');
    expect(html).toContain('나란히 도착!');
    expect(html).toContain('victory-duo');
    expect(html.match(/class="victory-jump(?: has-victory-motion)?"/g)).toHaveLength(2);
    expect(html).toContain('다시 대결!');
    expect(html).not.toContain('data-result-idle');
  });
  it('시리즈 진행 중에는 다음 판, 종료 시에는 우승과 재도전을 표시한다', () => {
    const round = resultScreen({ match: match(0), series: series([1, 0], 3), idleLeft: null });
    expect(round).toContain('다음 판으로!');
    expect(round).toContain('시리즈 점수 1P 1승, 2P 0승');
    expect(round).not.toContain('최종 우승!');
    const final = resultScreen({ match: match(1), series: series([1, 2], 3), idleLeft: 9 });
    expect(final).toContain('<h1 id="victory-title">2P 토크 최종 우승!</h1>');
    expect(final).toContain('data-result-winner="1"');
    expect(final).toContain('한 판 더!');
    expect(final).toContain('data-result-idle >9초');
  });
});
