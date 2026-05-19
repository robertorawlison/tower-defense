import { CFG } from './config.js';

export class Projectile {
  constructor({ x, y, target, damage, kind, aoe = 0, stun = 0 }) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.target = target;
    this.damage = damage;
    this.kind = kind;
    this.aoe = aoe;
    this.stun = stun;
    this.alive = true;
    this.speed = kind === 'rock' ? 380 : kind === 'bolt' ? 720 : 600;
    this.arc = kind === 'rock';
    if (this.arc) {
      const dx = target.x - x;
      const dy = target.y - y;
      this.flightTime = Math.max(0.4, Math.hypot(dx, dy) / this.speed);
      this.elapsed = 0;
      this.targetX = target.x;
      this.targetY = target.y;
    }
  }

  update(dt, enemies) {
    if (!this.alive) return;
    if (this.arc) {
      this.elapsed += dt;
      const t = Math.min(1, this.elapsed / this.flightTime);
      if (this.target && this.target.alive) {
        this.targetX = this.target.x;
        this.targetY = this.target.y;
      }
      this.x = this.startX + (this.targetX - this.startX) * t;
      this.y = this.startY + (this.targetY - this.startY) * t;
      if (t >= 1) {
        this.explode(enemies);
        this.alive = false;
      }
      return;
    }
    if (!this.target || !this.target.alive) {
      this.alive = false;
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (step >= dist) {
      this.target.takeDamage(this.damage, this.stun);
      if (this.aoe > 0) this.explode(enemies);
      this.alive = false;
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  explode(enemies) {
    if (this.aoe <= 0) return;
    const radius = this.aoe * CFG.CELL;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= radius) {
        e.takeDamage(this.damage, this.stun);
      }
    }
  }

  render(ctx) {
    if (this.kind === 'rock') {
      const t = Math.min(1, this.elapsed / this.flightTime);
      const arc = Math.sin(Math.PI * t) * 40;
      ctx.fillStyle = CFG.COLORS.rock;
      ctx.beginPath();
      ctx.arc(this.x, this.y - arc, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(this.x, this.y + 2, 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.kind === 'bolt') {
      const angle = Math.atan2(this.target ? this.target.y - this.y : 0, this.target ? this.target.x - this.x : 1);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      ctx.fillStyle = CFG.COLORS.bolt;
      ctx.fillRect(-10, -2, 18, 4);
      ctx.restore();
    } else {
      const angle = Math.atan2(this.target ? this.target.y - this.y : 0, this.target ? this.target.x - this.x : 1);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      ctx.fillStyle = CFG.COLORS.arrow;
      ctx.fillRect(-8, -1, 14, 2);
      ctx.fillStyle = '#a0664a';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(2, -3);
      ctx.lineTo(2, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
