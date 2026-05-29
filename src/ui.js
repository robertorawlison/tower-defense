import { CFG } from './config.js';
import { DIFFICULTY } from './difficulty.js';
import { gradeFor, loadRanking } from './score.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.coinsEl = document.getElementById('hud-coins');
    this.hpEl = document.getElementById('hud-hp');
    this.waveEl = document.getElementById('hud-wave');
    this.stateEl = document.getElementById('hud-state');
    this.shopEl = document.getElementById('shop-list');
    this.infoEl = document.getElementById('info-box');
    this.startBtn = document.getElementById('start-wave-btn');
    this.newGameBtn = document.getElementById('new-game-btn');
    this.mazeAlgoBtn = document.getElementById('maze-algo-btn');
    this.speedBtn = document.getElementById('speed-btn');
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayMsg = document.getElementById('overlay-message');
    this.overlayScore = document.getElementById('overlay-score');
    this.overlayRanking = document.getElementById('overlay-ranking');
    this.overlayBtn = document.getElementById('overlay-btn');
    this.popup = document.getElementById('tower-popup');
    this.popupContent = this.popup.querySelector('.popup-content');
    this.difficultyOverlay = document.getElementById('difficulty-overlay');
    this.titleOverlay = document.getElementById('title-overlay');
    this.highscoresOverlay = document.getElementById('highscores-overlay');
    this.highscoresList = document.getElementById('highscores-list');
    this.muteBtn = document.getElementById('mute-btn');
    this.titlePlayBtn = document.getElementById('title-play-btn');
    this.titleScoresBtn = document.getElementById('title-scores-btn');
    this.highscoresBackBtn = document.getElementById('highscores-back-btn');

    this.startBtn.addEventListener('click', () => this.game.startWave());
    this.newGameBtn.addEventListener('click', () => this.game.requestNewGame());
    this.overlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.goToTitle();
    });
    this.titlePlayBtn.addEventListener('click', () => this.game.handleGlobalInteraction());
    this.titleScoresBtn.addEventListener('click', () => {
      this.game.primeAudio();
      this.game.setScreen('HIGHSCORES');
    });
    this.highscoresBackBtn.addEventListener('click', () => {
      this.game.primeAudio();
      this.game.goToTitle();
    });
    this.muteBtn.addEventListener('click', () => {
      this.game.primeAudio();
      this.game.audio.toggleMute();
      this.refreshMuteBtn();
    });
    if (this.mazeAlgoBtn) {
      this.mazeAlgoBtn.addEventListener('click', () => this.game.regenerateMap());
    }
    if (this.speedBtn) {
      this.speedBtn.addEventListener('click', () => this.game.toggleSpeed());
    }
    if (this.difficultyOverlay) {
      this.difficultyOverlay.querySelectorAll('[data-diff]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const diff = btn.dataset.diff;
          this.hideDifficultyOverlay();
          if (this._pendingDifficultyChoice) {
            const cb = this._pendingDifficultyChoice;
            this._pendingDifficultyChoice = null;
            cb(diff);
          }
        });
      });
    }

    document.addEventListener('click', (ev) => {
      if (!this.popup.classList.contains('hidden')) {
        if (!this.popup.contains(ev.target) && ev.target.id !== 'game-canvas') {
          this.hidePopup();
        }
      }
    });
  }

  refresh() {
    this.coinsEl.textContent = this.game.coins;
    this.hpEl.textContent = Math.max(0, this.game.castleHP);
    this.waveEl.textContent = this.game.waveManager.current;
    if (this.game.state === 'BUILD_PHASE') {
      this.stateEl.textContent = 'Preparar Defesas';
      this.startBtn.disabled = false;
      this.startBtn.textContent = this.game.waveManager.current === 0 ? '▶ Iniciar Onda 1' : `▶ Iniciar Onda ${this.game.waveManager.current + 1}`;
    } else if (this.game.state === 'WAVE_ACTIVE') {
      this.stateEl.textContent = 'Onda em Andamento!';
      this.startBtn.disabled = true;
    } else {
      this.startBtn.disabled = true;
    }
    if (this.mazeAlgoBtn) {
      this.mazeAlgoBtn.disabled = this.game.state !== 'BUILD_PHASE';
    }
    this.renderShop();
  }

  renderShop() {
    const html = [];
    for (const [key, def] of Object.entries(CFG.TOWERS)) {
      const unlocked = this.game.waveManager.current >= def.unlockWave;
      const cost = def.levels[0].cost;
      const canAfford = this.game.coins >= cost;
      const locked = !unlocked;
      const cls = locked ? 'shop-card locked' : 'shop-card';
      const status = locked ? ` (Desbloqueia onda ${def.unlockWave + 1})` : '';
      const stats = def.levels[0];
      html.push(`<div class="${cls}" data-tower="${key}">
        <div class="name">${def.name}${status}</div>
        <div class="stats">Dano ${stats.damage} • Alcance ${stats.range} • ${stats.fireRate}s</div>
        <div class="cost" style="color:${canAfford && !locked ? '#ffd166' : '#888'}">💰 ${cost}</div>
      </div>`);
    }
    this.shopEl.innerHTML = html.join('');
  }

  showTowerPopup(tower, screenX, screenY) {
    const stats = tower.stats;
    const canUpgrade = tower.canUpgrade();
    const upgradeCost = tower.upgradeCost();
    const canAfford = canUpgrade && this.game.coins >= upgradeCost;
    const lvlText = `Nível ${tower.level + 1} / ${tower.def.levels.length}`;
    const nextStats = canUpgrade ? tower.def.levels[tower.level + 1] : null;
    const upgradeBtn = canUpgrade
      ? `<button class="popup-btn upgrade" id="popup-upgrade-btn" ${canAfford ? '' : 'disabled'}>
           ⬆ Upgrade (💰 ${upgradeCost})
         </button>
         <div class="popup-row" style="opacity:0.7"><span>Próximo:</span><span>Dano ${nextStats.damage}, Alcance ${nextStats.range}</span></div>`
      : `<div style="color:#ffd166;text-align:center;margin-top:6px">★ Nível Máximo ★</div>`;

    this.popupContent.innerHTML = `
      <h3>${tower.def.name}</h3>
      <div class="popup-row"><span>Status:</span><span>${lvlText}</span></div>
      <div class="popup-row"><span>Dano:</span><span>${stats.damage}</span></div>
      <div class="popup-row"><span>Alcance:</span><span>${stats.range} células</span></div>
      <div class="popup-row"><span>Cadência:</span><span>${stats.fireRate}s</span></div>
      ${stats.aoe ? `<div class="popup-row"><span>Área:</span><span>${stats.aoe}</span></div>` : ''}
      ${upgradeBtn}
    `;
    this.popup.classList.remove('hidden');
    this.popup.style.left = `${screenX}px`;
    this.popup.style.top = `${screenY}px`;

    const upBtn = document.getElementById('popup-upgrade-btn');
    if (upBtn) upBtn.addEventListener('click', () => {
      this.game.upgradeTower(tower);
      this.hidePopup();
    });
  }

  showBuildPopup(col, row, screenX, screenY) {
    const rows = [];
    for (const [key, def] of Object.entries(CFG.TOWERS)) {
      const unlocked = this.game.waveManager.current >= def.unlockWave;
      const cost = def.levels[0].cost;
      const canAfford = this.game.coins >= cost;
      const disabled = !unlocked || !canAfford;
      const lockText = !unlocked ? ` (Onda ${def.unlockWave + 1})` : '';
      rows.push(`<button class="popup-btn buy" data-buy="${key}" ${disabled ? 'disabled' : ''}>
        ${def.name}${lockText} — 💰 ${cost}
      </button>`);
    }
    this.popupContent.innerHTML = `<h3>Construir Aqui</h3>${rows.join('')}`;
    this.popup.classList.remove('hidden');
    this.popup.style.left = `${screenX}px`;
    this.popup.style.top = `${screenY}px`;
    this.popupContent.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.buy;
        this.game.buildTower(kind, col, row);
        this.hidePopup();
      });
    });
  }

  hidePopup() {
    this.popup.classList.add('hidden');
  }

  showOverlay(title, message) {
    this.overlayTitle.textContent = title;
    this.overlayMsg.textContent = message;
    this.overlayScore.innerHTML = '';
    this.overlayRanking.innerHTML = '';
    this.overlay.classList.remove('hidden');
  }

  showResultOverlay(result, record) {
    const grade = gradeFor(result.score, result.victory);
    this.overlayTitle.textContent = result.victory ? '🏆 Vitória!' : '💀 Derrota';
    this.overlayMsg.textContent = result.victory
      ? 'Você defendeu o castelo de todas as 10 ondas!'
      : `Os bárbaros tomaram o castelo na onda ${result.wave}.`;

    const standing = record.isBest
      ? '<div class="score-best">✨ Novo recorde!</div>'
      : `<div class="score-sub">Posição no ranking: #${record.rank}</div>`;
    this.overlayScore.innerHTML = `
      <div class="score-grade ${grade.cls}">${grade.icon} ${grade.label}</div>
      <div class="score-big">${result.score}<span class="score-pct">%</span></div>
      <div class="score-sub">Vida do castelo preservada (${result.hp}/${result.maxHP})</div>
      ${standing}
    `;
    this.overlayRanking.innerHTML = this.renderRanking(record.ranking, record.attemptId);
    this.overlay.classList.remove('hidden');
  }

  renderRanking(ranking, currentId, title = '🏅 Melhores Tentativas') {
    if (!ranking || !ranking.length) return '';
    const rows = ranking.map((a, i) => {
      const grade = gradeFor(a.score, a.victory);
      const diffLabel = a.difficulty === 'hard' ? 'Difícil' : 'Fácil';
      const progress = a.victory ? 'Onda 10 ✓' : `Onda ${a.wave}`;
      const here = a.id === currentId ? ' current' : '';
      return `<div class="rank-row${here}">
        <span class="rank-pos">#${i + 1}</span>
        <span class="rank-grade">${grade.icon}</span>
        <span class="rank-score">${a.score}%</span>
        <span class="rank-meta">${diffLabel} • ${progress}</span>
      </div>`;
    });
    return `${title ? `<h3 class="rank-title">${title}</h3>` : ''}${rows.join('')}`;
  }

  renderHighscores() {
    const ranking = loadRanking();
    if (!ranking.length) {
      this.highscoresList.innerHTML = '<div class="rank-empty">Nenhuma partida registrada ainda.<br>Jogue para entrar no ranking!</div>';
      return;
    }
    this.highscoresList.innerHTML = this.renderRanking(ranking, null, '');
  }

  refreshMuteBtn() {
    if (!this.muteBtn) return;
    this.muteBtn.textContent = this.game.audio.muted ? '🔇' : '🔊';
  }

  refreshSpeedBtn() {
    if (!this.speedBtn) return;
    this.speedBtn.textContent = `⏩ Velocidade ${this.game.speed}x`;
    this.speedBtn.classList.toggle('active', this.game.speed > 1);
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  showDifficultyOverlay(onChoice) {
    this._pendingDifficultyChoice = onChoice;
    if (this.difficultyOverlay) {
      this.difficultyOverlay.classList.remove('hidden');
    }
  }

  hideDifficultyOverlay() {
    if (this.difficultyOverlay) {
      this.difficultyOverlay.classList.add('hidden');
    }
  }

  setInfo(text) {
    this.infoEl.textContent = text;
  }
}
