import { CFG, dirFromVector } from './config.js';
import { drawSprite } from './render.js';
import { Projectile } from './projectile.js';

let nextTowerId = 1;

export class Tower {
  constructor(kind, col, row) {
    this.id = nextTowerId++;
    this.kind = kind;
    this.col = col;
    this.row = row;
    this.cx = col * CFG.CELL + CFG.CELL / 2;
    this.cy = row * CFG.CELL + CFG.CELL / 2;
    this.level = 0;
    this.cooldown = 0;
    this.direction = 'down';
    this.target = null;
  }

  get def() { return CFG.TOWERS[this.kind]; }
  get stats() { return this.def.levels[this.level]; }
  get maxLevel() { return this.def.levels.length - 1; }

  canUpgrade() { return this.level < this.maxLevel; }
  upgradeCost() {
    if (!this.canUpgrade()) return null;
    return this.def.levels[this.level + 1].cost;
  }
  upgrade() {
    if (this.canUpgrade()) this.level++;
  }

  pickTarget(enemies) {
    const range = this.stats.range * CFG.CELL;
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.cx, e.y - this.cy);
      if (d <= range && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  update(dt, enemies, projectiles) {
    this.cooldown -= dt;
    if (this.target && (!this.target.alive || Math.hypot(this.target.x - this.cx, this.target.y - this.cy) > this.stats.range * CFG.CELL)) {
      this.target = null;
    }
    if (!this.target) {
      this.target = this.pickTarget(enemies);
    }
    if (this.target) {
      this.direction = dirFromVector(this.target.x - this.cx, this.target.y - this.cy);
      if (this.cooldown <= 0) {
        this.shoot(projectiles);
        this.cooldown = this.stats.fireRate;
      }
    }
  }

  shoot(projectiles) {
    const s = this.stats;
    projectiles.push(new Projectile({
      x: this.cx,
      y: this.cy - CFG.CELL * 0.15,
      target: this.target,
      damage: s.damage,
      kind: s.projectile,
      aoe: s.aoe || 0,
      stun: s.stun || 0,
    }));
  }

  render(ctx, sprites) {
    const sprite = sprites?.towers?.[this.kind]?.[this.direction] || null;
    const x = this.col * CFG.CELL;
    const y = this.row * CFG.CELL;
    drawSprite(ctx, sprite, x, y, CFG.CELL, CFG.CELL, CFG.COLORS[this.kind], this.kind[0].toUpperCase() + (this.level + 1));
    if (this.level > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('★'.repeat(this.level), x + CFG.CELL - 4, y + 12);
    }
  }
}
