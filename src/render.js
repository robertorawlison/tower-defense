import { CFG } from './config.js';

export function drawSprite(ctx, img, x, y, w, h, fallbackColor, label) {
  if (img) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  ctx.fillStyle = fallbackColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (label) {
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.floor(h * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
}

export function drawGrassCell(ctx, col, row, grassImg) {
  const x = col * CFG.CELL;
  const y = row * CFG.CELL;
  if (grassImg) {
    ctx.drawImage(grassImg, x, y, CFG.CELL, CFG.CELL);
    return;
  }
  ctx.fillStyle = (col + row) % 2 === 0 ? CFG.COLORS.grass : CFG.COLORS.grassAlt;
  ctx.fillRect(x, y, CFG.CELL, CFG.CELL);
}

export function drawHPBar(ctx, x, y, w, current, max) {
  const ratio = Math.max(0, current / max);
  const h = 5;
  ctx.fillStyle = CFG.COLORS.hpBarBg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(x, y, w * ratio, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function drawRangeIndicator(ctx, cx, cy, rangeCells) {
  ctx.beginPath();
  ctx.arc(cx, cy, rangeCells * CFG.CELL, 0, Math.PI * 2);
  ctx.fillStyle = CFG.COLORS.rangeIndicator;
  ctx.fill();
  ctx.strokeStyle = CFG.COLORS.slotBorder;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawSlot(ctx, col, row, slotImg, pulse) {
  const x = col * CFG.CELL;
  const y = row * CFG.CELL;
  if (slotImg) {
    ctx.drawImage(slotImg, x, y, CFG.CELL, CFG.CELL);
  } else {
    ctx.fillStyle = CFG.COLORS.slot;
    ctx.fillRect(x + 4, y + 4, CFG.CELL - 8, CFG.CELL - 8);
    ctx.strokeStyle = CFG.COLORS.slotBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4.5, y + 4.5, CFG.CELL - 9, CFG.CELL - 9);
  }
  if (pulse !== undefined) {
    const alpha = 0.25 + 0.25 * Math.sin(pulse * 4);
    ctx.fillStyle = `rgba(255, 209, 102, ${alpha})`;
    ctx.fillRect(x, y, CFG.CELL, CFG.CELL);
  }
}

export function drawCastle(ctx, gridCol, gridRow, castleImg) {
  const x = gridCol * CFG.CELL;
  const y = gridRow * CFG.CELL;
  const w = CFG.CASTLE_COLS * CFG.CELL;
  const h = CFG.CASTLE_ROWS * CFG.CELL;
  if (castleImg) {
    ctx.drawImage(castleImg, x, y, w, h);
    return;
  }
  ctx.fillStyle = CFG.COLORS.castle;
  ctx.fillRect(x + 6, y + h * 0.35, w - 12, h * 0.65 - 6);
  ctx.fillStyle = CFG.COLORS.castleRoof;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h * 0.35);
  ctx.lineTo(x + w / 2, y + 8);
  ctx.lineTo(x + w - 6, y + h * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  const doorW = w * 0.18;
  const doorH = h * 0.35;
  ctx.fillRect(x + w / 2 - doorW / 2, y + h - doorH - 8, doorW, doorH);
  ctx.fillStyle = CFG.COLORS.castleFlag;
  ctx.fillRect(x + w / 2 - 2, y - 4, 3, 14);
  ctx.fillRect(x + w / 2, y - 4, 12, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold 14px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('CASTELO', x + w / 2, y + h * 0.55);
}

export function drawCastleHPBar(ctx, castleArea, hp, maxHp) {
  const castleX = castleArea.col * CFG.CELL;
  const castleY = castleArea.row * CFG.CELL;
  const castleW = castleArea.cols * CFG.CELL;
  const barW = Math.floor(castleW * 0.8);
  const barH = 16;
  const barX = castleX + (castleW - barW) / 2;
  const barY = castleY - barH - 14;
  const ratio = Math.max(0, hp / maxHp);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

  ctx.fillStyle = CFG.COLORS.hpBarBg;
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(barX, barY, barW * ratio, barH);

  ctx.strokeStyle = CFG.COLORS.slotBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  const label = `${Math.max(0, Math.ceil(hp))} / ${maxHp}`;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeText(label, barX + barW / 2, barY + barH / 2 + 1);
  ctx.fillStyle = 'white';
  ctx.fillText(label, barX + barW / 2, barY + barH / 2 + 1);
}
