/* ============================================================
 * MindTrainer 首页卡片 3D 交互（纯 CSS 3D + JS，无额外依赖）
 * 12 张功能卡：鼠标跟随立体倾斜（tilt）+ 光效扫过（glare）
 * ============================================================ */
(function () {
  'use strict';
  const cards = document.querySelectorAll('.test-entry-card');
  if (!cards.length) return;

  const style = document.createElement('style');
  style.textContent = [
    '.test-entry-card { transform-style: preserve-3d; transition: transform .18s ease, box-shadow .18s ease; will-change: transform; }',
    '.test-entry-card.tilt-active { transform: perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(-3px); }',
    '.test-entry-card .tilt-glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none;',
    '  opacity: 0; transition: opacity .2s ease;',
    '  background: radial-gradient(420px circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.18), transparent 45%); z-index: 2; }',
    '.test-entry-card:hover .tilt-glare { opacity: 1; }'
  ].join('\n');
  document.head.appendChild(style);

  cards.forEach(function (card) {
    const glare = document.createElement('span');
    glare.className = 'tilt-glare';
    glare.setAttribute('aria-hidden', 'true');
    card.appendChild(glare);

    card.addEventListener('mousemove', function (e) {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
      card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      card.classList.add('tilt-active');
    });
    card.addEventListener('mouseleave', function () {
      card.classList.remove('tilt-active');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
})();
