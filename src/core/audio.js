// 효과음: 음원 파일 없이 Web Audio로 코드에서 직접 만듭니다. (저작권 걱정 없음)
// 브라우저 정책상 첫 키 입력이나 클릭이 있어야 소리가 켜집니다.

const VOLUME = 0.5;

export function createAudio({ muted = false } = {}) {
  let ctx = null;
  let master = null;
  let isMuted = muted;

  function ensure() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = isMuted ? 0 : VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  window.addEventListener('keydown', ensure);
  window.addEventListener('pointerdown', ensure);

  function tone({ freq, to = freq, time = 0.12, type = 'sine', gain = 0.25, delay = 0 }) {
    const c = ensure();
    if (!c || isMuted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + time);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
    osc.connect(env).connect(master);
    osc.start(t0);
    osc.stop(t0 + time + 0.03);
  }

  function noise({ time = 0.2, gain = 0.2, freq = 1200, to = freq, type = 'bandpass', delay = 0 }) {
    const c = ensure();
    if (!c || isMuted) return;
    const t0 = c.currentTime + delay;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * time), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, t0 + time);
    const env = c.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
    src.connect(filter).connect(env).connect(master);
    src.start(t0);
  }

  const notes = (freqs, { gap = 0.1, ...opts }) => freqs.forEach((freq, i) => tone({ freq, delay: i * gap, ...opts }));

  const SOUNDS = {
    click: () => tone({ freq: 660, time: 0.06, type: 'triangle', gain: 0.15 }),
    ready: () => notes([523, 659, 784], { gap: 0.065, time: 0.15, type: 'triangle', gain: 0.16 }),
    countdown: () => tone({ freq: 523, time: 0.16, type: 'square', gain: 0.12 }),
    go: () => notes([784, 1047], { gap: 0.06, time: 0.3, type: 'square', gain: 0.12 }),
    bump: () => tone({ freq: 150, to: 90, time: 0.08, type: 'triangle', gain: 0.2 }),
    pickup: () => notes([660, 990], { gap: 0.07, time: 0.12, type: 'triangle', gain: 0.22 }),
    school: () => notes([659, 523, 587, 392], { gap: 0.16, time: 0.3, type: 'triangle', gain: 0.2 }), // 딩동댕동 학교 종
    bagFull: () => tone({ freq: 190, time: 0.2, type: 'sawtooth', gain: 0.1 }),
    shoot: () => noise({ time: 0.3, freq: 500, to: 3200, gain: 0.14 }),
    speedUp: () => tone({ freq: 380, to: 1300, time: 0.3, type: 'sawtooth', gain: 0.1 }),
    flashlight: () => notes([880, 1320, 1760], { gap: 0.06, time: 0.18, type: 'triangle', gain: 0.14 }),
    slowDown: () => tone({ freq: 520, to: 110, time: 0.55, type: 'triangle', gain: 0.25 }),
    freeze: () => notes([1568, 2093, 2637], { gap: 0.05, time: 0.28, gain: 0.13 }),
    shatter: () => noise({ time: 0.25, freq: 3500, type: 'highpass', gain: 0.18 }),
    reverse: () => notes([450, 300, 450, 300], { gap: 0.08, time: 0.09, type: 'square', gain: 0.09 }),
    dark: () => tone({ freq: 170, to: 55, time: 0.65, type: 'sawtooth', gain: 0.16 }),
    immune: () => tone({ freq: 280, to: 640, time: 0.16, type: 'square', gain: 0.1 }),
    web: () => noise({ time: 0.28, freq: 380, type: 'lowpass', gain: 0.3 }),
    ice: () => noise({ time: 0.4, freq: 2600, to: 700, gain: 0.12 }),
    respawn: () => tone({ freq: 880, time: 0.06, gain: 0.05 }),
    heartbeat: () => {
      tone({ freq: 72, time: 0.12, gain: 0.5 });
      tone({ freq: 62, time: 0.14, gain: 0.4, delay: 0.18 });
    },
    // 짧은 팡파르와 마지막 화음으로 도착의 순간을 강조합니다.
    win: () => {
      const melody = [523, 523, 523, 659, 784, 1047];
      const delays = [0, 0.14, 0.28, 0.5, 0.68, 0.87];
      melody.forEach((freq, i) => tone({ freq, delay: delays[i], time: i === 5 ? 0.6 : 0.17, type: 'triangle', gain: 0.21 }));
      [262, 330, 392].forEach(freq => tone({ freq, delay: 0.87, time: 0.65, type: 'triangle', gain: 0.08 }));
    },
    draw: () => notes([523, 523], { gap: 0.2, time: 0.25, type: 'triangle', gain: 0.2 }),
  };

  return {
    play(name) {
      SOUNDS[name]?.();
    },
    get muted() {
      return isMuted;
    },
    toggleMute() {
      isMuted = !isMuted;
      if (master) master.gain.value = isMuted ? 0 : VOLUME;
      return isMuted;
    },
  };
}
