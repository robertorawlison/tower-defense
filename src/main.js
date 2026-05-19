import { CFG } from './config.js';
import { loadAssets } from './assets.js';
import { generateMap, CELL_TYPES } from './map.js';
import { Tower } from './tower.js';
import { WaveManager } from './wave.js';
import { UI } from './ui.js';
import { attachCanvasClick, attachCanvasHover } from './input.js';
import { drawSprite, drawGrassCell, drawSlot, drawCastle, drawCastleHPBar, drawRangeIndicator } from './render.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

class Game {
  constructor(sprites) {
    this.sprites = sprites;
    this.ui = new UI(this);
    this.reset();
    this.attachInput();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  reset() {
    this.map = generateMap();
    this.coins = CFG.START_COINS;
    this.castleHP = CFG.CASTLE_HP;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.waveManager = new WaveManager(this.map.waypoints);
    this.state = 'BUILD_PHASE';
    this.hoverCell = null;
    this.selectedTower = null;
    this.time = 0;
    this.ui.hideOverlay();
    this.ui.hidePopup();
    this.ui.refresh();
    this.ui.setInfo('Coloque sua primeira torre de arqueiro próxima ao caminho dos bárbaros e inicie a onda.');
  }

  attachInput() {
    attachCanvasClick(canvas, (info) => this.handleClick(info));
    attachCanvasHover(canvas, (info) => this.hoverCell = info);
  }

  handleClick(info) {
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
    this.ui.setInfo(`${def.name} construída! Restam 💰 ${this.coins}.`);
    this.ui.refresh();
  }

  upgradeTower(tower) {
    if (!tower.canUpgrade()) return;
    const cost = tower.upgradeCost();
    if (this.coins < cost) return;
    this.coins -= cost;
    tower.upgrade();
    this.ui.setInfo(`${tower.def.name} melhorada para nível ${tower.level + 1}!`);
    this.ui.refresh();
  }

  startWave() {
    if (this.state !== 'BUILD_PHASE') return;
    if (!this.waveManager.startNext()) return;
    this.state = 'WAVE_ACTIVE';
    this.ui.hidePopup();
    this.selectedTower = null;
    this.ui.setInfo(`Onda ${this.waveManager.current} iniciada!`);
    this.ui.refresh();
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += dt;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.state !== 'WAVE_ACTIVE' && this.state !== 'BUILD_PHASE') return;
    if (this.state === 'WAVE_ACTIVE') {
      this.waveManager.update(dt, this.enemies);
      for (const e of this.enemies) e.update(dt);
      for (const e of this.enemies) {
        if (e.reachedCastle) {
          this.castleHP -= e.damage;
        }
      }
      for (const t of this.towers) t.update(dt, this.enemies, this.projectiles);
      for (const p of this.projectiles) p.update(dt, this.enemies);
      for (const e of this.enemies) {
        if (!e.alive && !e.reachedCastle && e.hp <= 0) {
          this.coins += e.reward;
        }
      }
      this.enemies = this.enemies.filter((e) => e.alive);
      this.projectiles = this.projectiles.filter((p) => p.alive);

      if (this.castleHP <= 0) {
        this.state = 'GAME_OVER';
        this.ui.showOverlay('💀 Derrota', `Os bárbaros tomaram o castelo na onda ${this.waveManager.current}.`);
        return;
      }
      if (this.waveManager.isComplete(this.enemies)) {
        if (this.waveManager.current >= CFG.WAVES.length) {
          this.state = 'VICTORY';
          this.ui.showOverlay('🏆 Vitória!', 'Você defendeu o castelo de todas as 10 ondas!');
          return;
        }
        this.state = 'BUILD_PHASE';
        this.ui.setInfo(`Onda ${this.waveManager.current} concluída! Construa/upgrade torres e inicie a próxima.`);
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
            ctx.strokeStyle = CFG.COLORS.pathBorder;
            ctx.lineWidth = 1;
            ctx.strokeRect(c * CFG.CELL + 0.5, r * CFG.CELL + 0.5, CFG.CELL - 1, CFG.CELL - 1);
          }
        }
      }
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

    if (this.state === 'BUILD_PHASE' && this.waveManager.current === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(20, canvas.height - 70, 540, 50);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💡 Clique num slot (moldura dourada) para construir uma torre.', 32, canvas.height - 38);
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
