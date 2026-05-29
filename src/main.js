import { CFG } from './config.js';
import { loadAssets } from './assets.js';
import { generateMap, CELL_TYPES } from './map.js';
import { Tower } from './tower.js';
import { WaveManager } from './wave.js';
import { UI } from './ui.js';
import { attachCanvasClick, attachCanvasHover } from './input.js';
import { drawSprite, drawGrassCell, drawSlot, drawCastle, drawCastleHPBar, drawRangeIndicator, drawSpawnIndicator } from './render.js';
import { computeResult, recordAttempt } from './score.js';
import { AudioManager } from './audio.js';

const SCREEN_TIMEOUTS = {
  TITLE: 12,
  ATTRACT: 25,
  HIGHSCORES: 10,
  RESULT: 12,
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

class Game {
  constructor(sprites) {
    this.sprites = sprites;
    this.difficulty = CFG.DIFFICULTY_DEFAULT;
    this.debugPath = false;
    this.screen = 'TITLE';
    this.screenTimer = SCREEN_TIMEOUTS.TITLE;
    this.botTimer = 0;
    this.speed = 1;
    this.audio = new AudioManager();
    this.ui = new UI(this);
    this.reset();
    this.attachInput();
    this.attachGlobalInput();
    this.ui.refreshMuteBtn();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    this.setScreen('TITLE');
  }

  startNewGame(difficulty) {
    this.difficulty = difficulty;
    this.reset();
    this.setScreen('PLAYING');
    this.audio.startMusic();
    this.audio.playDifficulty(difficulty);
  }

  setScreen(screen) {
    this.screen = screen;
    this.ui.titleOverlay.classList.toggle('hidden', screen !== 'TITLE');
    this.ui.highscoresOverlay.classList.toggle('hidden', screen !== 'HIGHSCORES');
    if (screen !== 'RESULT') this.ui.hideOverlay();
    if (screen !== 'DIFFICULTY') this.ui.hideDifficultyOverlay();
    if (screen !== 'PLAYING') { this.ui.hidePopup(); this.selectedTower = null; }

    switch (screen) {
      case 'TITLE': this.screenTimer = SCREEN_TIMEOUTS.TITLE; break;
      case 'ATTRACT': this.screenTimer = SCREEN_TIMEOUTS.ATTRACT; this.startAttract(); break;
      case 'HIGHSCORES': this.screenTimer = SCREEN_TIMEOUTS.HIGHSCORES; this.ui.renderHighscores(); break;
      case 'RESULT': this.screenTimer = SCREEN_TIMEOUTS.RESULT; break;
      default: this.screenTimer = Infinity;
    }
  }

  advanceAttractLoop() {
    switch (this.screen) {
      case 'TITLE': this.setScreen('ATTRACT'); break;
      case 'ATTRACT': this.setScreen('HIGHSCORES'); break;
      case 'HIGHSCORES': this.setScreen('TITLE'); break;
      case 'RESULT': this.goToTitle(); break;
    }
  }

  goToTitle() {
    this.reset();
    this.setScreen('TITLE');
  }

  startAttract() {
    this.difficulty = 'easy';
    this.reset();
    this.botTimer = 1.0;
  }

  beginStartFlow() {
    this.setScreen('DIFFICULTY');
    this.ui.showDifficultyOverlay((diff) => this.startNewGame(diff));
  }

  primeAudio() {
    this.audio.init();
    this.audio.resume();
    this.audio.startMusic();
  }

  handleGlobalInteraction() {
    this.primeAudio();
    switch (this.screen) {
      case 'TITLE': this.beginStartFlow(); break;
      case 'ATTRACT':
      case 'HIGHSCORES':
      case 'RESULT': this.goToTitle(); break;
    }
  }

  reset() {
    this.map = generateMap(this.difficulty);
    this.coins = CFG.START_COINS;
    this.castleHP = CFG.CASTLE_HP;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.waveManager = new WaveManager(this.map.waypoints, this.difficulty);
    this.state = 'BUILD_PHASE';
    this.hoverCell = null;
    this.selectedTower = null;
    this.time = 0;
    this.ui.hideOverlay();
    this.ui.hidePopup();
    this.ui.refresh();
    this.ui.setInfo('Coloque sua primeira torre de arqueiro próxima ao caminho dos bárbaros e inicie a onda.');
  }

  regenerateMap() {
    if (this.state !== 'BUILD_PHASE') return false;
    let refund = 0;
    for (const t of this.towers) {
      for (let lvl = 0; lvl <= t.level; lvl++) {
        refund += t.def.levels[lvl].cost;
      }
    }
    const preservedWave = this.waveManager.waveIndex;
    this.map = generateMap(this.difficulty);
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.selectedTower = null;
    this.waveManager = new WaveManager(this.map.waypoints, this.difficulty);
    this.waveManager.waveIndex = preservedWave;
    this.coins += refund;
    this.ui.hidePopup();
    if (refund > 0) {
      this.ui.setInfo(`Mapa regenerado. Torres removidas e 💰 ${refund} reembolsados.`);
    } else {
      this.ui.setInfo('Mapa regenerado.');
    }
    this.ui.refresh();
    return true;
  }

  requestNewGame() {
    this.setScreen('DIFFICULTY');
    this.ui.showDifficultyOverlay((diff) => this.startNewGame(diff));
  }

  attachInput() {
    attachCanvasClick(canvas, (info) => this.handleClick(info));
    attachCanvasHover(canvas, (info) => this.hoverCell = info);
  }

  attachGlobalInput() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        this.primeAudio();
        this.audio.toggleMute();
        this.ui.refreshMuteBtn();
        return;
      }
      if (this.screen === 'PLAYING') {
        if (e.key === 'd' || e.key === 'D') this.debugPath = !this.debugPath;
        return;
      }
      if (this.screen === 'DIFFICULTY') return;
      this.handleGlobalInteraction();
    });
    document.addEventListener('click', (e) => {
      if (this.screen === 'PLAYING' || this.screen === 'DIFFICULTY') return;
      if (e.target.closest('#title-content button') || e.target.closest('#highscores-content button')) return;
      this.handleGlobalInteraction();
    });
  }

  handleClick(info) {
    if (this.screen !== 'PLAYING') return;
    if (this.state !== 'BUILD_PHASE' && this.state !== 'WAVE_ACTIVE') return;
    const { col, row, clientX, clientY } = info;
    if (col < 0 || row < 0 || col >= this.map.cols || row >= this.map.rows) return;

    const towerHere = this.towers.find((t) => t.col === col && t.row === row);
    if (towerHere) {
      this.selectedTower = towerHere;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left + 16;
      const py = clientY - rect.top + 16;
      this.ui.showTowerPopup(towerHere, px, py);
      return;
    }
    if (this.state !== 'BUILD_PHASE') {
      this.ui.hidePopup();
      this.selectedTower = null;
      return;
    }
    const cell = this.map.grid[row][col];
    if (cell.type === CELL_TYPES.BUILD_SLOT) {
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left + 16;
      const py = clientY - rect.top + 16;
      this.ui.showBuildPopup(col, row, px, py);
    } else {
      this.ui.hidePopup();
      this.selectedTower = null;
    }
  }

  buildTower(kind, col, row) {
    const def = CFG.TOWERS[kind];
    if (!def) return;
    if (this.waveManager.current < def.unlockWave) return;
    const cost = def.levels[0].cost;
    if (this.coins < cost) return;
    if (this.towers.some((t) => t.col === col && t.row === row)) return;
    this.coins -= cost;
    this.towers.push(new Tower(kind, col, row));
    if (this.screen === 'PLAYING') this.audio.playUpgrade();
    this.ui.setInfo(`${def.name} construída! Restam 💰 ${this.coins}.`);
    this.ui.refresh();
  }

  upgradeTower(tower) {
    if (!tower.canUpgrade()) return;
    const cost = tower.upgradeCost();
    if (this.coins < cost) return;
    this.coins -= cost;
    tower.upgrade();
    if (this.screen === 'PLAYING') this.audio.playUpgrade();
    this.ui.setInfo(`${tower.def.name} melhorada para nível ${tower.level + 1}!`);
    this.ui.refresh();
  }

  startWave() {
    if (this.state !== 'BUILD_PHASE') return;
    if (!this.waveManager.startNext()) return;
    this.state = 'WAVE_ACTIVE';
    this.ui.hidePopup();
    this.selectedTower = null;
    if (this.screen === 'PLAYING') this.audio.playWaveStart();
    this.ui.setInfo(`Onda ${this.waveManager.current} iniciada!`);
    this.ui.refresh();
  }

  toggleSpeed() {
    this.speed = this.speed >= 3 ? 1 : this.speed + 1;
    this.ui.refreshSpeedBtn();
  }

  finishGame(victory) {
    if (this.screen === 'ATTRACT') {
      this.startAttract();
      return;
    }
    const result = computeResult(this, victory);
    const record = recordAttempt(result);
    this.audio.playResult(victory);
    this.ui.showResultOverlay(result, record);
    this.setScreen('RESULT');
  }

  attractBotUpdate(dt) {
    this.botTimer -= dt;
    if (this.botTimer > 0) return;
    this.botTimer = 0.35;
    if (this.state === 'BUILD_PHASE') {
      if (!this.botTryBuildOrUpgrade()) this.startWave();
    }
  }

  botTryBuildOrUpgrade() {
    const emptySlots = [];
    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        if (this.map.grid[r][c].type !== CELL_TYPES.BUILD_SLOT) continue;
        if (this.towers.some((t) => t.col === c && t.row === r)) continue;
        emptySlots.push({ c, r });
      }
    }
    const affordableKinds = Object.entries(CFG.TOWERS)
      .filter(([, def]) => this.waveManager.current >= def.unlockWave && this.coins >= def.levels[0].cost)
      .map(([key]) => key);
    if (emptySlots.length && affordableKinds.length) {
      const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
      const kind = affordableKinds[affordableKinds.length - 1];
      this.buildTower(kind, slot.c, slot.r);
      return true;
    }
    const upgradable = this.towers.filter((t) => t.canUpgrade() && this.coins >= t.upgradeCost());
    if (upgradable.length) {
      this.upgradeTower(upgradable[Math.floor(Math.random() * upgradable.length)]);
      return true;
    }
    return false;
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += dt;
    this.updateScreenTimer(dt);
    const steps = this.screen === 'PLAYING' ? this.speed : 1;
    for (let i = 0; i < steps; i++) this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  updateScreenTimer(dt) {
    if (!Number.isFinite(this.screenTimer)) return;
    this.screenTimer -= dt;
    if (this.screenTimer <= 0) this.advanceAttractLoop();
  }

  update(dt) {
    if (this.screen !== 'PLAYING' && this.screen !== 'ATTRACT') return;
    if (this.screen === 'ATTRACT') this.attractBotUpdate(dt);
    if (this.state !== 'WAVE_ACTIVE' && this.state !== 'BUILD_PHASE') return;
    if (this.state === 'WAVE_ACTIVE') {
      this.waveManager.update(dt, this.enemies);
      for (const e of this.enemies) e.update(dt);
      let castleHit = false;
      for (const e of this.enemies) {
        if (e.reachedCastle) {
          this.castleHP -= e.damage;
          castleHit = true;
        }
      }
      if (castleHit && this.screen === 'PLAYING') this.audio.playCastleHit();
      for (const t of this.towers) t.update(dt, this.enemies, this.projectiles);
      for (const p of this.projectiles) p.update(dt, this.enemies);
      for (const e of this.enemies) {
        if (!e.alive && !e.reachedCastle && e.hp <= 0) {
          this.coins += e.reward;
          this.audio.playKill();
        }
      }
      this.enemies = this.enemies.filter((e) => e.alive);
      this.projectiles = this.projectiles.filter((p) => p.alive);

      if (this.castleHP <= 0) {
        this.state = 'GAME_OVER';
        this.finishGame(false);
        return;
      }
      if (this.waveManager.isComplete(this.enemies)) {
        if (this.waveManager.current >= CFG.WAVES.length) {
          this.state = 'VICTORY';
          this.finishGame(true);
          return;
        }
        this.state = 'BUILD_PHASE';
        this.ui.setInfo(`Onda ${this.waveManager.current} concluída! Construa/upgrade torres e inicie a próxima.`);
        if (this.screen === 'PLAYING') this.audio.playNextRound();
      }
      this.ui.refresh();
    }
  }

  render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        drawGrassCell(ctx, c, r, this.sprites?.grass);
      }
    }

    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        const cell = this.map.grid[r][c];
        if (cell.type === CELL_TYPES.PATH) {
          const sprite = this.sprites?.path?.[cell.pathTile] || null;
          if (sprite) {
            ctx.drawImage(sprite, c * CFG.CELL, r * CFG.CELL, CFG.CELL, CFG.CELL);
          } else {
            ctx.fillStyle = CFG.COLORS.path;
            ctx.fillRect(c * CFG.CELL, r * CFG.CELL, CFG.CELL, CFG.CELL);
          }
        }
      }
    }

    if (this.debugPath) {
      ctx.save();
      for (let r = 0; r < this.map.rows; r++) {
        for (let c = 0; c < this.map.cols; c++) {
          const cell = this.map.grid[r][c];
          if (!cell.pathConn) continue;
          const cx = c * CFG.CELL + CFG.CELL / 2;
          const cy = r * CFG.CELL + CFG.CELL / 2;
          const half = CFG.CELL / 2;
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          if (cell.pathConn.n) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - half); }
          if (cell.pathConn.s) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + half); }
          if (cell.pathConn.e) { ctx.moveTo(cx, cy); ctx.lineTo(cx + half, cy); }
          if (cell.pathConn.w) { ctx.moveTo(cx, cy); ctx.lineTo(cx - half, cy); }
          ctx.stroke();

          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.fillStyle = '#ffff00';
          ctx.strokeText(cell.pathTile || '?', cx, cy);
          ctx.fillText(cell.pathTile || '?', cx, cy);
        }
      }
      ctx.restore();
    }

    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        const cell = this.map.grid[r][c];
        if (cell.decor) {
          const sprite = this.sprites?.decorations?.[cell.decor] || null;
          if (sprite) {
            ctx.drawImage(sprite, c * CFG.CELL, r * CFG.CELL, CFG.CELL, CFG.CELL);
          } else {
            ctx.fillStyle = decorFallbackColor(cell.decor);
            ctx.beginPath();
            ctx.arc(c * CFG.CELL + CFG.CELL / 2, r * CFG.CELL + CFG.CELL / 2, CFG.CELL * 0.28, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    const cArea = this.map.castleArea;
    drawCastle(ctx, cArea.col, cArea.row, this.sprites?.castle);
    drawCastleHPBar(ctx, cArea, this.castleHP, CFG.CASTLE_HP);

    if (this.state === 'BUILD_PHASE') {
      for (let r = 0; r < this.map.rows; r++) {
        for (let c = 0; c < this.map.cols; c++) {
          const cell = this.map.grid[r][c];
          if (cell.type === CELL_TYPES.BUILD_SLOT) {
            const hasTower = this.towers.some((t) => t.col === c && t.row === r);
            if (!hasTower) drawSlot(ctx, c, r, this.sprites?.slots?.slot, this.time);
          }
        }
      }
    }

    if (this.selectedTower) {
      drawRangeIndicator(ctx, this.selectedTower.cx, this.selectedTower.cy, this.selectedTower.stats.range);
    }
    if (this.hoverCell && this.state === 'BUILD_PHASE') {
      const { col, row } = this.hoverCell;
      if (col >= 0 && row >= 0 && col < this.map.cols && row < this.map.rows) {
        const hoverTower = this.towers.find((t) => t.col === col && t.row === row);
        if (hoverTower && hoverTower !== this.selectedTower) {
          drawRangeIndicator(ctx, hoverTower.cx, hoverTower.cy, hoverTower.stats.range);
        }
      }
    }

    for (const t of this.towers) t.render(ctx, this.sprites);

    const sorted = [...this.enemies].sort((a, b) => a.y - b.y);
    for (const e of sorted) e.render(ctx, this.sprites);

    for (const p of this.projectiles) p.render(ctx);

    if (this.state === 'BUILD_PHASE') {
      for (const path of this.map.waypoints) drawSpawnIndicator(ctx, path, this.time);
    }

    if (this.screen === 'PLAYING' && this.state === 'BUILD_PHASE' && this.waveManager.current === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(20, canvas.height - 70, 540, 50);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💡 Clique num slot (moldura dourada) para construir uma torre.', 32, canvas.height - 38);
    }

    if (this.screen === 'ATTRACT') {
      const pulse = 0.55 + 0.25 * Math.sin(this.time * 3);
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${pulse})`;
      ctx.fillRect(canvas.width / 2 - 240, 24, 480, 64);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▶ MODO DEMONSTRAÇÃO', canvas.width / 2, 46);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('Pressione qualquer tecla ou clique para sair', canvas.width / 2, 72);
      ctx.restore();
    }
  }
}

function decorFallbackColor(kind) {
  switch (kind) {
    case 'tree_pine': return '#2d6e2d';
    case 'tree_oak':  return '#3a8a3a';
    case 'rock':      return '#7a7a7a';
    case 'bush':      return '#4a8c4a';
    case 'stump':     return '#6b4a2a';
    case 'barrel':    return '#8b5a2b';
    case 'crate':     return '#a07040';
    case 'logs':      return '#704a2a';
    case 'fence':     return '#aa8a5a';
    case 'fire':      return '#e94e1b';
    case 'sign':      return '#9a7a4a';
    case 'banner':    return '#2c5d8a';
    default:          return '#888';
  }
}

async function bootstrap() {
  const sprites = await loadAssets();
  new Game(sprites);
}

bootstrap();
