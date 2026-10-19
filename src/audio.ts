/**
 * Procedural Web Audio API Sound Engine for Car Simulator
 * Zero external mp3 dependencies - 100% reliable, zero 404s
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineRunning: boolean = false;

  // Tire screech nodes
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechNoiseSource: AudioBufferSourceNode | null = null;

  // Blinker sound state
  private blinkerInterval: number | null = null;

  constructor() {
    // Initialized lazily upon user interaction
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.setupTireScreech();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public unlockAudio() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  public startEngine() {
    this.unlockAudio();
    if (!this.ctx || !this.masterGain || this.engineRunning) return;

    // Play starter motor crank sequence
    this.playStarterSequence();

    // Setup continuous engine oscillators
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    // Warm low-pass filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Three harmonic oscillators for a throaty multi-cylinder engine rumble
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(32, this.ctx.currentTime);

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(64, this.ctx.currentTime);

    this.osc3 = this.ctx.createOscillator();
    this.osc3.type = 'square';
    this.osc3.frequency.setValueAtTime(16, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.osc3.connect(subGain);
    subGain.connect(this.engineFilter);

    this.osc1.connect(this.engineFilter);
    this.osc2.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
    this.osc3.start();

    // Fade engine in after starter fires
    setTimeout(() => {
      if (this.ctx && this.engineGain) {
        this.engineGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 0.4);
      }
    }, 400);

    this.engineRunning = true;
  }

  private playStarterSequence() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 3 quick starter chugs
    for (let i = 0; i < 3; i++) {
      const crankOsc = this.ctx.createOscillator();
      const crankGain = this.ctx.createGain();
      crankOsc.type = 'sawtooth';
      crankOsc.frequency.setValueAtTime(70 + i * 15, now + i * 0.12);

      crankGain.gain.setValueAtTime(0.2, now + i * 0.12);
      crankGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.09);

      crankOsc.connect(crankGain);
      crankGain.connect(this.masterGain);

      crankOsc.start(now + i * 0.12);
      crankOsc.stop(now + i * 0.12 + 0.1);
    }

    // Ignition roar
    const ignOsc = this.ctx.createOscillator();
    const ignGain = this.ctx.createGain();
    ignOsc.type = 'triangle';
    ignOsc.frequency.setValueAtTime(140, now + 0.38);
    ignOsc.frequency.exponentialRampToValueAtTime(60, now + 0.7);

    ignGain.gain.setValueAtTime(0.4, now + 0.38);
    ignGain.gain.exponentialRampToValueAtTime(0.02, now + 0.7);

    ignOsc.connect(ignGain);
    ignGain.connect(this.masterGain);

    ignOsc.start(now + 0.38);
    ignOsc.stop(now + 0.7);
  }

  public stopEngine() {
    if (!this.engineRunning) return;
    if (this.ctx && this.engineGain) {
      this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    }
    setTimeout(() => {
      try {
        this.osc1?.stop();
        this.osc2?.stop();
        this.osc3?.stop();
      } catch {
        // already stopped
      }
      this.engineRunning = false;
    }, 280);
  }

  public updateEngineSound(rpm: number, throttle: number) {
    if (!this.engineRunning || !this.ctx || !this.engineFilter || !this.osc1 || !this.osc2 || !this.osc3) return;

    // RPM ranges from 850 (idle) to 7500 (redline)
    const normalizedRPM = Math.max(0, Math.min(1, (rpm - 850) / (7200 - 850)));
    const baseFreq = 26 + normalizedRPM * 110;

    const now = this.ctx.currentTime;
    this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.osc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.05);
    this.osc3.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

    // Filter frequency opens up with throttle and high RPM
    const filterFreq = 300 + normalizedRPM * 1600 + throttle * 1200;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

    // Volume increases with throttle load and RPM
    const targetVol = 0.28 + normalizedRPM * 0.25 + throttle * 0.22;
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(targetVol, now, 0.05);
    }
  }

  private setupTireScreech() {
    if (!this.ctx || !this.masterGain) return;
    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    whiteNoise.start();
    this.screechNoiseSource = whiteNoise;
  }

  public updateTireScreech(intensity: number) {
    if (!this.screechGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    const targetGain = clamped > 0.08 ? clamped * 0.35 : 0;
    this.screechGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
  }

  public playGearShift() {
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Metallic notch clunk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playCollisionSound(intensity: number = 0.5) {
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const strength = Math.min(1, Math.max(0.1, intensity));

    // Low heavy thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(strength * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Crunch noise
    const noiseCount = Math.floor(this.ctx.sampleRate * 0.15);
    const buf = this.ctx.createBuffer(1, noiseCount, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < noiseCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseCount * 0.3));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(strength * 0.45, now);
    noiseSource.connect(nGain);
    nGain.connect(this.masterGain);
    noiseSource.start(now);
  }

  public playCheckpointSound() {
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.22);
    });
  }

  public playButtonClick() {
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playHorn() {
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = [415, 510];
    freqs.forEach(f => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }
}

export const soundEngine = new SoundEngine();
