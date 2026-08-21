/* ==========================================================================
   MindTrainer — site shell
   Renders the header and footer on every page so the chrome is defined once.
   All styling lives in mt.css; this file only builds markup and wires
   behaviour. Requires <header id="mt-header"></header> in the page.
   ========================================================================== */
(function () {
  'use strict';

  var header = document.getElementById('mt-header');
  if (!header) return;

  /* Information architecture is unchanged from the previous site:
     same labels, same URLs, same grouping. Only the presentation is new. */
  var NAV = [
    { label: '首页', href: '/' },
    { label: '认知测试', children: [
      { label: '反应时间',   href: '/reaction-time-test/' },
      { label: '瞄准训练',   href: '/aim-trainer/' },
      { label: '序列记忆',   href: '/sequence-memory-test/' },
      { label: '数字记忆',   href: '/number-memory-test/' },
      { label: '多目标追踪', href: '/multiple-object-tracking-test/' },
      { label: '斯特鲁普',   href: '/stroop-test/' }
    ]},
    { label: '飞克视读', children: [
      { label: '基础训练', href: '/speed-read/basic.html' },
      { label: '闪视训练', href: '/speed-read/flash.html' },
      { label: '速读训练', href: '/speed-read/speed.html' },
      { label: '照相记忆', href: '/speed-read/photo.html' },
      { label: '冥想训练', href: '/speed-read/meditation.html' },
      { label: '训练计划', href: '/speed-read/plan.html' }
    ]}
  ];

  var path = location.pathname;

  function isActive(item) {
    if (item.href === '/') return path === '/' || path === '/index.html';
    return path.indexOf(item.href) === 0;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var CARET = '<svg class="mt-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  /* ------------------------------------------------------------- header -- */
  var items = NAV.map(function (item, i) {
    if (!item.children) {
      return '<a class="mt-nav-item mt-nav-link' + (isActive(item) ? ' is-active' : '') +
             '" href="' + esc(item.href) + '">' + esc(item.label) + '</a>';
    }
    var open = item.children.some(isActive);
    var subs = item.children.map(function (c) {
      return '<a href="' + esc(c.href) + '"' + (isActive(c) ? ' class="is-active"' : '') + '>' +
             esc(c.label) + '</a>';
    }).join('');
    return '<div class="mt-nav-item mt-has-pop' + (open ? ' is-active' : '') + '">' +
             '<button type="button" class="mt-nav-btn" aria-expanded="false" aria-controls="mt-pop-' + i + '">' +
               esc(item.label) + CARET +
             '</button>' +
             '<div class="mt-pop" id="mt-pop-' + i + '">' + subs + '</div>' +
           '</div>';
  }).join('');

  header.innerHTML =
    '<a class="mt-brand" href="/" aria-label="MindTrainer 首页">' +
      '<span class="mt-brand-mark">' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.8V17a3 3 0 0 0 5 2.2A3 3 0 0 0 17 17v-2.2A3.5 3.5 0 0 0 16 8a4 4 0 0 0-4-4Z"/>' +
          '<path d="M12 4v16"/>' +
        '</svg>' +
      '</span>' +
      '<span class="mt-brand-name">MindTrainer</span>' +
    '</a>' +
    '<nav class="mt-nav" aria-label="主导航">' + items + '</nav>' +
    '<button type="button" class="mt-theme" aria-label="切换深色模式" title="切换深色模式">' +
      '<svg class="mt-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' +
      '<svg class="mt-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
    '</button>' +
    '<button type="button" class="mt-burger" aria-label="打开菜单" aria-expanded="false">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>' +
    '</button>';

  /* ------------------------------------------------------------- footer -- */
  var footer = document.querySelector('footer');
  if (footer) {
    footer.className = 'mt-footer';
    footer.innerHTML =
      '<div class="mt-wrap mt-footer-inner">' +
        '<span class="mt-footer-brand">© ' + new Date().getFullYear() + ' MindTrainer</span>' +
        '<span class="mt-footer-links">' +
          '<a href="/about/">关于</a>' +
          '<a href="/privacy-policy/">隐私政策</a>' +
          '<a href="/terms-of-use/">使用条款</a>' +
          '<a href="mailto:hello@picktests.com">联系</a>' +
        '</span>' +
      '</div>';
  }

  /* ---------------------------------------------------------- behaviour -- */
  var pops = Array.prototype.slice.call(header.querySelectorAll('.mt-has-pop'));
  var desktop = window.matchMedia('(min-width: 901px)');

  function closeAll(except) {
    pops.forEach(function (p) {
      if (p === except) return;
      p.classList.remove('is-open');
      var b = p.querySelector('.mt-nav-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  function setOpen(item, open) {
    item.classList.toggle('is-open', open);
    var b = item.querySelector('.mt-nav-btn');
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  pops.forEach(function (item) {
    var timer = null;
    var btn = item.querySelector('.mt-nav-btn');

    // Desktop: hover with a close delay so a diagonal cursor path is forgiving.
    item.addEventListener('mouseenter', function () {
      if (!desktop.matches) return;
      clearTimeout(timer);
      closeAll(item);
      setOpen(item, true);
    });
    item.addEventListener('mouseleave', function () {
      if (!desktop.matches) return;
      clearTimeout(timer);
      timer = setTimeout(function () { setOpen(item, false); }, 220);
    });

    // Click works in both modes, and is the only path on touch.
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var willOpen = !item.classList.contains('is-open');
      closeAll(item);
      setOpen(item, willOpen);
    });
  });

  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) {
      closeAll(null);
      setMenu(false);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(null); setMenu(false); }
  });

  /* mobile drawer */
  var burger = header.querySelector('.mt-burger');
  function setMenu(open) {
    header.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    if (!open) closeAll(null);
  }
  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    setMenu(!header.classList.contains('is-menu-open'));
  });
  desktop.addEventListener('change', function () { setMenu(false); closeAll(null); });

  /* theme toggle — falls back to the OS preference until the user chooses */
  var root = document.documentElement;
  header.querySelector('.mt-theme').addEventListener('click', function () {
    var isDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    var next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('mt-theme', next); } catch (err) {}
  });
})();
