/* ============================================================
 * MindTrainer 全局导航栏
 * 所有页面共用：<header id="mt-header"></header> + 本脚本
 * 核心功能全部收纳：首页 / 认知测试(6) / 飞克视读(7)
 * 改这里 = 全站导航更新
 * ============================================================ */
(function () {
  'use strict';
  var current = document.getElementById('mt-header');
  if (!current) return;

  var NAV = [
    { label: '首页', href: '/' },
    { label: '认知测试', children: [
      { label: '反应时间', href: '/reaction-time-test/' },
      { label: '瞄准训练', href: '/aim-trainer/' },
      { label: '序列记忆', href: '/sequence-memory-test/' },
      { label: '数字记忆', href: '/number-memory-test/' },
      { label: '多目标追踪', href: '/multiple-object-tracking-test/' },
      { label: '斯特鲁普', href: '/stroop-test/' }
    ]},
    { label: '飞克视读', children: [
      { label: '训练中心', href: '/speed-read/' },
      { label: '基础训练', href: '/speed-read/basic.html' },
      { label: '闪视训练', href: '/speed-read/flash.html' },
      { label: '速读训练', href: '/speed-read/speed.html' },
      { label: '照相记忆', href: '/speed-read/photo.html' },
      { label: '冥想训练', href: '/speed-read/meditation.html' },
      { label: '训练计划', href: '/speed-read/plan.html' }
    ]}
  ];

  /* 当前路径高亮判定 */
  var path = location.pathname;
  function isActive(item) {
    if (item.href === '/') return path === '/' || path === '/index.html';
    if (item.href === '/speed-read/') return /^\/speed-read\/?$/.test(path);
    if (item.href.indexOf('/speed-read/') === 0) return path.indexOf(item.href) === 0;
    return path.indexOf(item.href) === 0;
  }
  function isGroupActive(group) {
    return group.children.some(isActive);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 导航项 HTML */
  var itemsHtml = NAV.map(function (item) {
    if (item.children) {
      var active = isGroupActive(item);
      var sub = item.children.map(function (c) {
        var a = isActive(c);
        return '<a class="mt-nav-link mt-nav-sub' + (a ? ' mt-active' : '') + '" href="' + esc(c.href) + '">' + esc(c.label) + '</a>';
      }).join('');
      return '<div class="mt-nav-item mt-dropdown' + (active ? ' mt-active' : '') + '">' +
        '<button type="button" class="mt-nav-btn">' + esc(item.label) + '<svg class="mt-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button>' +
        '<div class="mt-dropdown-menu">' + sub + '</div></div>';
    }
    return '<a class="mt-nav-item mt-nav-link' + (isActive(item) ? ' mt-active' : '') + '" href="' + esc(item.href) + '">' + esc(item.label) + '</a>';
  }).join('');

  /* 注入导航样式（复用原站 header 视觉：白底圆角悬浮条） */
  var style = document.createElement('style');
  style.textContent = [
    '#mt-header{display:flex;align-items:center;gap:12px}',
    '#mt-header .mt-logo{display:flex;align-items:center;text-decoration:none;color:#0f172a}',
    '#mt-header .mt-logo-mark{font-weight:800;font-size:17px;letter-spacing:-.02em}',
    '#mt-header .mt-logo-badge{border-radius:18px;background:radial-gradient(circle,#fef6e4 8%,transparent 100%);padding:2px 10px}',
    '#mt-header .mt-nav{display:flex;align-items:center;gap:4px}',
    '.mt-nav-item{position:relative;display:flex;align-items:center}',
    '.mt-nav-link,.mt-nav-btn{font:inherit;font-size:15px;color:#334155;text-decoration:none;background:none;border:0;padding:8px 12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:4px;transition:background .12s ease,color .12s ease}',
    '.mt-nav-link:hover,.mt-nav-btn:hover{background:#f1f5f9;color:#0f172a}',
    '.mt-nav-item.mt-active>.mt-nav-link,.mt-nav-item.mt-active>.mt-nav-btn{color:#0f172a;font-weight:700}',
    '.mt-caret{transition:transform .15s ease}',
    '.mt-dropdown:hover .mt-caret{transform:rotate(180deg)}',
    '.mt-dropdown-menu{display:none;position:absolute;top:calc(100% + 6px);left:0;min-width:168px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 10px 30px rgb(15 23 42 / 12%);padding:6px;z-index:20480;flex-direction:column}',
    '.mt-dropdown:hover .mt-dropdown-menu{display:flex}',
    '.mt-dropdown.open .mt-dropdown-menu{display:flex}',
    '.mt-nav-sub{display:block;width:100%;text-align:left;padding:8px 12px;font-size:14px;border-radius:8px;white-space:nowrap}',
    '.mt-nav-sub.mt-active{background:#f1f5f9;font-weight:700}',
    '@media (max-width:860px){#mt-header .mt-logo-badge{display:none}#mt-header{gap:6px}.mt-nav-link,.mt-nav-btn{padding:8px;font-size:14px}}',
    '@media (max-width:640px){.mt-dropdown-menu{position:fixed;left:12px;right:12px;top:auto;min-width:0}.mt-nav-item{position:static}}'
  ].join('\n');
  document.head.appendChild(style);

  /* 组装 header（复用原站 header 布局类：global.min.css 提供 fixed 128px 视觉） */
  current.innerHTML =
    '<div class="header-left-box"><div class="header-left-content-box">' +
    '<a class="mt-logo" href="/"><span class="mt-logo-badge mt-logo-mark">MindTrainer</span></a>' +
    '</div></div>' +
    '<div class="header-center-box"><img alt="MindTrainer logo" src="/assets/images/logo.png" width="192" height="192" decoding="async"></div>' +
    '<div class="header-right-box"><div class="header-right-content-box">' +
    '<nav class="mt-nav" aria-label="主导航">' + itemsHtml + '</nav>' +
    '</div></div>';

  /* 移动端：点击展开下拉 */
  document.addEventListener('click', function (e) {
    var dd = e.target.closest ? e.target.closest('.mt-dropdown') : null;
    document.querySelectorAll('.mt-dropdown.open').forEach(function (el) {
      if (el !== dd) el.classList.remove('open');
    });
    if (dd) {
      var menu = dd.querySelector('.mt-dropdown-menu');
      if (menu && !menu.contains(e.target)) {
        dd.classList.toggle('open');
      }
    }
  });
})();
