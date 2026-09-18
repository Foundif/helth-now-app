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
