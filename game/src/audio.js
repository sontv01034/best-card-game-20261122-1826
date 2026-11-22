// Sound, synthesized live with WebAudio — no audio files, no network.
// One file, one job: a handful of tiny blips for plays, hits and wins.

let ctx = null;

function audio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, dur, type, gain, when = 0) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ac.currentTime + when);
  amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + dur);
}

export const sfx = {
  play() { blip(520, 0.12, 'triangle', 0.12); blip(780, 0.1, 'triangle', 0.08, 0.05); },
  attack() { blip(180, 0.15, 'sawtooth', 0.1); },
  hurt() { blip(140, 0.2, 'square', 0.08); },
  draw() { blip(660, 0.07, 'sine', 0.06); },
  win() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.12, i * 0.12)); },
  lose() { [400, 340, 280, 200].forEach((f, i) => blip(f, 0.25, 'triangle', 0.1, i * 0.14)); },
  error() { blip(110, 0.12, 'square', 0.07); },
};
