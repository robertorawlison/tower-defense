import { CFG } from './config.js';
import { Enemy } from './enemy.js';
import { createSpawnSelector, activeSpawnIndices } from './difficulty.js';

export class WaveManager {
  constructor(waypoints, difficulty, rng = Math.random) {
    this.waypoints = waypoints;
    this.difficulty = difficulty;
    this.rng = rng;
    this.selector = createSpawnSelector(difficulty, waypoints.length, rng);
    this.waveIndex = 0;
    this.active = false;
    this.spawnTimer = 0;
    this.toSpawn = 0;
    this.spawned = 0;
    this.types = [];
    this.spawnInterval = 1.0;
    this.hpBoost = 1;
    this.activeIndices = [];
  }

  get current() { return this.waveIndex; }
  get total() { return CFG.WAVES.length; }
  isLastWave() { return this.waveIndex >= CFG.WAVES.length; }

  startNext() {
    if (this.waveIndex >= CFG.WAVES.length) return false;
    const wave = CFG.WAVES[this.waveIndex];
    this.toSpawn = wave.count;
    this.spawned = 0;
    this.types = wave.types;
    this.spawnInterval = wave.spawnInterval;
    this.hpBoost = wave.hpBoost || 1;
    this.spawnTimer = 0.5;
    this.active = true;
    this.waveIndex++;
    this.activeIndices = activeSpawnIndices(this.selector, this.waveIndex);
    return true;
  }

  update(dt, enemies) {
    if (!this.active) return;
    if (this.spawned < this.toSpawn) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const type = this.types[Math.floor(this.rng() * this.types.length)];
        const pathIdx = this.activeIndices[Math.floor(this.rng() * this.activeIndices.length)];
        const path = this.waypoints[pathIdx];
        enemies.push(new Enemy(type, path, this.hpBoost));
        this.spawned++;
        this.spawnTimer = this.spawnInterval;
      }
    }
    if (this.spawned >= this.toSpawn && enemies.length === 0) {
      this.active = false;
    }
  }

  isComplete(enemies) {
    return !this.active && this.spawned >= this.toSpawn && enemies.length === 0;
  }
}
