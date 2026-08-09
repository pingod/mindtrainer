/* ============================================================
 * MindTrainer 首页卡片 3D 交互（JS 逻辑；样式在 index.html 内联）
 * 12 张功能卡：鼠标跟随立体倾斜（tilt）+ 光效扫过（glare）
 * ============================================================ */
(function () {
  'use strict';
  const cards = document.querySelectorAll('.test-entry-card');
  if (!cards.length) return;

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
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
