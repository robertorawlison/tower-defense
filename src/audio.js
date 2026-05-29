const MUTE_KEY = 'castelo-defesa-muted';

// Sons em MP3. Troque os arquivos (mesmos nomes) ou ajuste os caminhos.
// Se um arquivo não existir, o som simplesmente não toca (kill tem fallback sintetizado).
const SOUND_URLS = {
  kill: 'assets/audio/ai-lula-ejaculula-lula-ai-kleberiano.mp3',
  nextRound: 'assets/audio/audio-proxima-rodada.mp3',
  hard: 'assets/audio/fase-dificil.mp3',
  easy: 'assets/audio/quando-for-facil.mp3',
  upgrade: 'assets/audio/quando-dar-upgrade.mp3',
  castleHit: 'assets/audio/quando-o-castelo-tomar-dano.mp3',
  waveStart: 'assets/audio/quando-os-barbaros-atacarem.mp3',
  win: 'assets/audio/ao-ganhar.mp3',
  lose: 'assets/audio/ao-perder.mp3',
};

// Melodia medieval simples em Lá menor. Cada nota: [frequência Hz, batidas].
const BEAT = 0.4;
const MELODY = [
  [329.63, 1], [440.00, 1], [523.25, 1], [493.88, 1],
  [440.00, 1], [392.00, 1], [329.63, 1], [0, 1],
  [293.66, 1], [349.23, 1], [440.00, 1], [392.00, 1],
  [329.63, 1], [261.63, 1], [329.63, 1], [0, 1],
];
// Baixo/drone: troca a cada 4 batidas (Lá menor → Fá → Sol → Lá menor).
const BASS = [
  [110.00, 4], [87.31, 4], [98.00, 4], [110.00, 4],
];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
    this.musicPlaying = false;
    this.musicTimer = null;
    this.buffers = {};
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.20;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
    this._loadSounds();
  }

  async _loadSounds() {
    for (const [name, url] of Object.entries(SOUND_URLS)) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.arrayBuffer();
        this.buffers[name] = await this.ctx.decodeAudioData(data);
      } catch {
        /* arquivo ausente ou inválido: ignora */
      }
    }
  }

  _playBuffer(name) {
    const buf = this.buffers[name];
    if (!this.ctx || !buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.sfxGain);
    src.start();
    return true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  _note(freq, time, dur, type, gain, target) {
    if (!freq) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(target || this.sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this._scheduleLoop();
  }

  _scheduleLoop() {
    if (!this.musicPlaying) return;
    const start = this.ctx.currentTime + 0.1;
    let t = start;
    for (const [freq, beats] of MELODY) {
      this._note(freq, t, beats * BEAT * 0.9, 'triangle', 0.5, this.musicGain);
      t += beats * BEAT;
    }
    const loopLen = t - start;
    let bt = start;
    for (const [freq, beats] of BASS) {
      this._note(freq, bt, beats * BEAT * 0.95, 'sine', 0.45, this.musicGain);
      bt += beats * BEAT;
    }
    this.musicTimer = setTimeout(() => this._scheduleLoop(), (loopLen * 1000) - 60);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) clearTimeout(this.musicTimer);
  }

  playKill() {
    if (!this.ctx) return;
    if (this._playBuffer('kill')) return;
    const t = this.ctx.currentTime;
    this._note(880, t, 0.08, 'square', 0.35, this.sfxGain);
    this._note(440, t + 0.06, 0.12, 'square', 0.3, this.sfxGain);
  }

  playNextRound() {
    this._playBuffer('nextRound');
  }

  playDifficulty(difficulty) {
    this._playBuffer(difficulty === 'hard' ? 'hard' : 'easy');
  }

  playUpgrade() {
    this._playBuffer('upgrade');
  }

  playCastleHit() {
    this._playBuffer('castleHit');
  }

  playWaveStart() {
    this._playBuffer('waveStart');
  }

  playResult(victory) {
    if (!this.ctx) return;
    if (this._playBuffer(victory ? 'win' : 'lose')) return;
    const t = this.ctx.currentTime;
    if (victory) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this._note(f, t + i * 0.14, 0.3, 'square', 0.4, this.sfxGain);
      });
    } else {
      [392.0, 311.13, 261.63, 196.0].forEach((f, i) => {
        this._note(f, t + i * 0.18, 0.4, 'sawtooth', 0.35, this.sfxGain);
      });
    }
  }
}
