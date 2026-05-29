import { CFG } from './config.js';

const STORAGE_KEY = 'castelo-defesa-ranking-v1';
const MAX_ENTRIES = 8;

export function computeResult(game, victory) {
  const maxHP = CFG.CASTLE_HP;
  const hp = Math.max(0, Math.round(game.castleHP));
  const hpPercent = Math.round((hp / maxHP) * 100);
  return {
    score: victory ? hpPercent : 0,
    hp,
    maxHP,
    victory,
    wave: game.waveManager.current,
    difficulty: game.difficulty,
  };
}

export function gradeFor(percent, victory) {
  if (!victory) return { label: 'Derrota', icon: '💀', cls: 'grade-defeat' };
  if (percent >= 100) return { label: 'PERFEITO', icon: '🏆', cls: 'grade-perfect' };
  if (percent >= 75) return { label: 'Ouro', icon: '🥇', cls: 'grade-gold' };
  if (percent >= 50) return { label: 'Prata', icon: '🥈', cls: 'grade-silver' };
  if (percent >= 25) return { label: 'Bronze', icon: '🥉', cls: 'grade-bronze' };
  return { label: 'Sobreviveu', icon: '🛡️', cls: 'grade-survive' };
}

export function loadRanking() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function compareAttempts(a, b) {
  if (a.victory !== b.victory) return a.victory ? -1 : 1;
  if (b.score !== a.score) return b.score - a.score;
  return b.wave - a.wave;
}

export function recordAttempt(result) {
  const attempt = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    score: result.score,
    victory: result.victory,
    wave: result.wave,
    difficulty: result.difficulty,
    date: Date.now(),
  };
  const ranking = loadRanking();
  ranking.push(attempt);
  ranking.sort(compareAttempts);
  const rank = ranking.findIndex((a) => a.id === attempt.id) + 1;
  const trimmed = ranking.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage indisponível — segue sem persistir */
  }
  return { ranking: trimmed, rank, attemptId: attempt.id, isBest: rank === 1 };
}
