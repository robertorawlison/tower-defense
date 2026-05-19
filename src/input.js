import { CFG } from './config.js';

export function attachCanvasClick(canvas, handler) {
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (ev.clientX - rect.left) * scaleX;
    const y = (ev.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CFG.CELL);
    const row = Math.floor(y / CFG.CELL);
    handler({ x, y, col, row, clientX: ev.clientX, clientY: ev.clientY });
  });
}

export function attachCanvasHover(canvas, handler) {
  canvas.addEventListener('mousemove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (ev.clientX - rect.left) * scaleX;
    const y = (ev.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CFG.CELL);
    const row = Math.floor(y / CFG.CELL);
    handler({ x, y, col, row });
  });
  canvas.addEventListener('mouseleave', () => handler(null));
}
