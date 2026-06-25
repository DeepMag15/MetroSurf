/* ==========================================
   METRO SURF - PROCEDURAL AUDIO SYNTHESIZER
   ========================================== */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.musicInterval = null;
    this.musicTempo = 125; // BPM
    this.currentBeat = 0;
    this.isMusicPlaying = false;
  }

  init() {
    if (this.ctx) return;
    
    // Create Audio Context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Create Master Gain Node
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.masterVolume.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else if (this.isMusicPlaying) {
      // Re-trigger music if it should be playing
      this.stopMusic();
      this.startMusic();
    }
  }

  playCoin() {
    if (!this.sfxEnabled) return;
    this.init();
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterVolume);

    // Cute retro coin ding (two quick notes: mid then high)
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playJump() {
    if (!this.sfxEnabled) return;
    this.init();
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterVolume);

    const now = this.ctx.currentTime;
    osc.type = 'triangle';
    
    // Upward pitch sweep
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playSlide() {
    if (!this.sfxEnabled) return;
    this.init();
    this.resume();

    // Create a noise buffer for rolling/sliding friction
    const bufferSize = this.ctx.sampleRate * 0.3; // 0.3s duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it a low rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    noise.start();
  }

  playPowerup() {
    if (!this.sfxEnabled) return;
    this.init();
    this.resume();

    const now = this.ctx.currentTime;
    
    // Play a shiny 4-note ascending chord arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.05, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  playHit() {
    if (!this.sfxEnabled) return;
    this.init();
    this.resume();

    const now = this.ctx.currentTime;
    
    // Bass explosion rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.45);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    
    osc.start(now);
    osc.stop(now + 0.5);

    // White noise crash snap
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.masterVolume);
    
    noise.start(now);
  }

  playGameOver() {
    if (!this.sfxEnabled) return;
    this.init();
    this.resume();

    this.stopMusic();

    const now = this.ctx.currentTime;
    // Disappointed descending notes
    const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.08, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
      
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.45);
    });
  }

  startMusic() {
    if (!this.musicEnabled) {
      this.isMusicPlaying = true; // Flag that game requested music, even if muted
      return;
    }
    if (this.isMusicPlaying && this.musicInterval) return;

    this.init();
    this.resume();
    this.isMusicPlaying = true;
    this.currentBeat = 0;

    const secondsPerBeat = 60 / this.musicTempo;
    const sixteenthNoteTime = secondsPerBeat / 4; // 16th notes

    // Melodic synth loops
    // Simple 8-bar loop
    // Bass note patterns: C2, Eb2, G2, F2
    const bassline = [
      130.81, 130.81, 130.81, 130.81, // C3
      155.56, 155.56, 155.56, 155.56, // Eb3
      196.00, 196.00, 196.00, 196.00, // G3
      174.61, 174.61, 174.61, 174.61  // F3
    ];
    
    // Catchy cyber-arpeggio melody notes
    const melody = [
      523.25, 0, 587.33, 659.25, // C5, -, D5, E5
      783.99, 0, 659.25, 0,      // G5, -, E5, -
      587.33, 587.33, 0, 698.46, // D5, D5, -, F5
      659.25, 523.25, 392.00, 0   // E5, C5, G4, -
    ];

    const playStep = () => {
      const now = this.ctx.currentTime;
      const beatIdx = this.currentBeat % 16;
      
      // Play Bass on every quarter note (step 0, 4, 8, 12)
      if (beatIdx % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassline[beatIdx] / 2, now); // Pitch down an octave
        
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + secondsPerBeat * 0.9);
        
        osc.start(now);
        osc.stop(now + secondsPerBeat * 0.9);
      }

      // Play Lead melody on 16th steps
      const melodyFreq = melody[beatIdx];
      if (melodyFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(melodyFreq, now);
        
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sixteenthNoteTime * 1.5);
        
        osc.start(now);
        osc.stop(now + sixteenthNoteTime * 1.5);
      }

      // Play a tiny synth hihat sound on off-beats (step 2, 6, 10, 14)
      if (beatIdx % 4 === 2) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.type = 'triangle'; // Hihat-ish click
        osc.frequency.setValueAtTime(8000, now);
        
        gain.gain.setValueAtTime(0.008, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        
        osc.start(now);
        osc.stop(now + 0.05);
      }

      this.currentBeat++;
    };

    // Schedule ticks
    let nextTickTime = this.ctx.currentTime;
    const scheduler = () => {
      while (nextTickTime < this.ctx.currentTime + 0.1) {
        playStep();
        nextTickTime += sixteenthNoteTime;
      }
    };
    
    // Run loop
    scheduler();
    this.musicInterval = setInterval(scheduler, 50);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

// Export single instance
export const audio = new AudioEngine();
export default audio;
