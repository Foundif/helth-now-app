/** Short, pleasant confirmation beep (e.g. a successful QR scan). Distinct from the alarm siren. */
export function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const beepCtx = new AudioCtx();
    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.3, beepCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, beepCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(beepCtx.destination);
    osc.start();
    osc.stop(beepCtx.currentTime + 0.15);
    osc.onended = () => {
      gain.disconnect();
      osc.disconnect();
      void beepCtx.close();
    };
  } catch {
    // Web Audio unavailable — nothing more we can do here.
  }
}
let ctx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let beepTimer: number | null = null;

/** Starts a loud, looping alarm beep. Safe to call repeatedly (no-ops if already running). */
export function startAlarm() {
  if (ctx) return;
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AudioCtx();
    oscillator = ctx.createOscillator();
    gainNode = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 1000;
    gainNode.gain.value = 0;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();

    let on = false;
    const toggle = () => {
      if (!ctx || !gainNode) return;
      on = !on;
      gainNode.gain.setTargetAtTime(on ? 0.35 : 0, ctx.currentTime, 0.01);
    };
    toggle();
    beepTimer = window.setInterval(toggle, 280);
  } catch {
    // Web Audio unavailable — nothing more we can do here.
  }
}

/** Plays a short confirmation tone after a QR code is read. */
export function playScanSuccess() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const scanContext = new AudioCtx();
    const scanGain = scanContext.createGain();
    scanGain.gain.setValueAtTime(0.0001, scanContext.currentTime);
    scanGain.gain.exponentialRampToValueAtTime(0.22, scanContext.currentTime + 0.015);
    scanGain.gain.exponentialRampToValueAtTime(0.0001, scanContext.currentTime + 0.24);
    scanGain.connect(scanContext.destination);
    [880, 1320].forEach((frequency, index) => {
      const tone = scanContext.createOscillator();
      tone.type = "sine";
      tone.frequency.value = frequency;
      tone.connect(scanGain);
      tone.start(scanContext.currentTime + index * 0.08);
      tone.stop(scanContext.currentTime + 0.16 + index * 0.08);
    });
    window.setTimeout(() => void scanContext.close(), 400);
    navigator.vibrate?.(80);
  } catch {
    // Audio or vibration is unavailable.
  }
}

/** Stops the alarm and releases audio resources. Safe to call even if not running. */
export function stopAlarm() {
  if (beepTimer !== null) {
    window.clearInterval(beepTimer);
    beepTimer = null;
  }
  if (oscillator) {
    try {
      oscillator.stop();
    } catch {
      // already stopped
    }
    oscillator.disconnect();
    oscillator = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  if (ctx) {
    void ctx.close();
    ctx = null;
  }
}
