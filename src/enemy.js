import { CFG, dirFromVector } from './config.js';
import { drawSprite, drawHPBar } from './render.js';

let nextEnemyId = 1;

export class Enemy {
  constructor(type, waypoints, hpMultiplier = 1) {
    const stats = CFG.ENEMIES[type];
    this.id = nextEnemyId++;
    this.type = type;
    this.maxHp = stats.hp * hpMultiplier;
    this.hp = this.maxHp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.reward = stats.reward;
    this.color = stats.color;
    this.label = stats.label;
    this.waypoints = waypoints;
    this.wpIndex = 0;
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.direction = 'right';
    this.alive = true;
    this.reachedCastle = false;
    this.stunTimer = 0;
  }

  update(dt) {
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }
    if (this.wpIndex >= this.waypoints.length - 1) {
      this.reachedCastle = true;
      this.alive = false;
      return;
    }
    const target = this.waypoints[this.wpIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * CFG.CELL * dt;
    if (step >= dist) {
      this.x = target.x;
      this.y = target.y;
      this.wpIndex++;
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      this.direction = dirFromVector(dx, dy);
    }
  }

  takeDamage(amount, stun = 0) {
    this.hp -= amount;
    if (stun > 0) this.stunTimer = Math.max(this.stunTimer, stun);
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  render(ctx, sprites) {
    const sprite = sprites?.enemies?.[this.type]?.[this.direction] || null;
    const size = CFG.CELL * 0.85;
    const drawX = this.x - size / 2;
    const drawY = this.y - size / 2;
    drawSprite(ctx, sprite, drawX, drawY, size, size, this.color, this.label);
    drawHPBar(ctx, drawX, drawY - 8, size, this.hp, this.maxHp);
    if (this.stunTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', this.x, drawY - 12);
    }
  }
}
