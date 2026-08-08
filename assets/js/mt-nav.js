/* ============================================================
 * MindTrainer 全局导航栏 v2（高级设计）
 * 毛玻璃 header · 渐变品牌 · pill 菜单 · 动效下拉 · 渐变 CTA
 * 所有页面共用：<header id="mt-header"></header> + 本脚本
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

  var path = location.pathname;
  function isActive(item) {
    if (item.href === '/') return path === '/' || path === '/index.html';
    if (item.href === '/speed-read/') return /^\/speed-read\/?$/.test(path);
    if (item.href.indexOf('/speed-read/') === 0) return path.indexOf(item.href) === 0;
    return path.indexOf(item.href) === 0;
  }
  function isGroupActive(group) { return group.children.some(isActive); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var itemsHtml = NAV.map(function (item) {
    if (item.children) {
      var active = isGroupActive(item);
      var sub = item.children.map(function (c) {
        var a = isActive(c);
        return '<a class="mt-sub' + (a ? ' mt-sub-active' : '') + '" href="' + esc(c.href) + '">' +
          '<span class="mt-sub-dot"></span>' + esc(c.label) + '</a>';
      }).join('');
      return '<div class="mt-menu-item mt-dropdown' + (active ? ' mt-active' : '') + '">' +
        '<button type="button" class="mt-menu-btn">' + esc(item.label) +
        '<svg class="mt-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button>' +
        '<div class="mt-dropdown-panel">' + sub + '</div></div>';
    }
    return '<a class="mt-menu-item mt-menu-link' + (isActive(item) ? ' mt-active' : '') + '" href="' + esc(item.href) + '">' + esc(item.label) + '</a>';
  }).join('');

  /* ---- 高级导航样式（覆盖原站 header 视觉）---- */
  var style = document.createElement('style');
  style.textContent = [
    /* header 容器：毛玻璃 */
    '#mt-header{position:fixed;top:0;left:0;right:0;z-index:10240;height:72px;padding:0 28px;',
    '  display:flex;align-items:center;justify-content:space-between;',
    '  background:rgba(255,255,255,.68);',
    '  -webkit-backdrop-filter:blur(22px) saturate(1.5);backdrop-filter:blur(22px) saturate(1.5);',
    '  border-bottom:1px solid rgba(226,232,240,.7);',
    '  box-shadow:0 1px 2px rgba(15,23,42,.03),0 12px 32px -16px rgba(15,23,42,.12);}',
    /* main 让位同步（原站 128px → 72px） */
    'main{margin-top:72px !important;}',
    /* 品牌 */
    '.mt-brand{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0}',
    '.mt-brand-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;',
    '  background:linear-gradient(135deg,#6366f1,#8b5cf6 55%,#d946ef);color:#fff;font-size:19px;',
    '  box-shadow:0 6px 16px -6px rgba(99,102,241,.55);}',
    '.mt-brand-text{font-size:18px;font-weight:800;letter-spacing:-.02em;',
    '  background:linear-gradient(120deg,#0f172a,#4f46e5);-webkit-background-clip:text;background-clip:text;color:transparent;}',
    /* 菜单 */
    '.mt-menu{display:flex;align-items:center;gap:4px;margin-left:auto;margin-right:16px}',
    '.mt-menu-item{position:relative;display:flex;align-items:center}',
    '.mt-menu-link,.mt-menu-btn{font:inherit;font-size:14.5px;font-weight:500;color:#475569;text-decoration:none;',
    '  background:none;border:0;padding:9px 15px;border-radius:999px;cursor:pointer;',
    '  display:flex;align-items:center;gap:5px;transition:background .15s ease,color .15s ease,transform .1s ease;}',
    '.mt-menu-link:hover,.mt-menu-btn:hover{background:rgba(241,245,249,.95);color:#0f172a}',
    '.mt-menu-link:active,.mt-menu-btn:active{transform:scale(.97)}',
    '.mt-menu-item.mt-active>.mt-menu-link,.mt-menu-item.mt-active>.mt-menu-btn{',
    '  background:linear-gradient(120deg,rgba(99,102,241,.12),rgba(139,92,246,.12));color:#4f46e5;font-weight:700}',
    '.mt-caret{transition:transform .18s ease;opacity:.65}',
    '.mt-dropdown:hover .mt-caret{transform:rotate(180deg)}',
    /* 下拉面板：毛玻璃卡片 */
    '.mt-dropdown-panel{display:none;position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%) translateY(-4px);',
    '  min-width:196px;padding:8px;border-radius:16px;',
    '  background:rgba(255,255,255,.9);-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);',
    '  border:1px solid rgba(226,232,240,.85);box-shadow:0 18px 48px -12px rgba(15,23,42,.18);',
    '  opacity:0;visibility:hidden;transition:opacity .16s ease,transform .16s ease,visibility .16s;z-index:20480;flex-direction:column;}',
    '.mt-dropdown-panel::before{content:"";position:absolute;top:-5px;left:50%;transform:translateX(-50%) rotate(45deg);',
    '  width:10px;height:10px;background:rgba(255,255,255,.95);border-left:1px solid rgba(226,232,240,.85);border-top:1px solid rgba(226,232,240,.85);}',
    /* hover 桥：覆盖按钮与面板之间的 10px 缝隙，鼠标移过缝隙时 hover 不中断 */
    '.mt-dropdown-panel::after{content:"";position:absolute;top:-10px;left:0;right:0;height:10px}',
    '.mt-dropdown:hover .mt-dropdown-panel,.mt-dropdown.open .mt-dropdown-panel{display:flex;opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}',
    '.mt-sub{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;font-size:14px;color:#334155;',
    '  text-decoration:none;white-space:nowrap;transition:background .12s ease,color .12s ease;font-weight:500}',
    '.mt-sub:hover{background:rgba(99,102,241,.08);color:#4f46e5}',
    '.mt-sub-dot{width:6px;height:6px;border-radius:50%;background:#cbd5e1;transition:background .15s ease,transform .15s ease;flex-shrink:0}',
    '.mt-sub:hover .mt-sub-dot{background:#8b5cf6;transform:scale(1.3)}',
    '.mt-sub-active{background:rgba(99,102,241,.1);color:#4f46e5;font-weight:700}',
    '.mt-sub-active .mt-sub-dot{background:#6366f1}',
    /* CTA 按钮 */
    '  font-size:14px;font-weight:700;color:#fff;text-decoration:none;',
    '  background:linear-gradient(120deg,#0f172a,#1e293b);',
    '  box-shadow:0 8px 20px -8px rgba(15,23,42,.5);transition:transform .12s ease,box-shadow .2s ease;}',
    /* 响应式 */
    '@media (max-width:900px){#mt-header{padding:0 16px}.mt-menu{gap:2px}.mt-menu-link,.mt-menu-btn{padding:8px 10px;font-size:13.5px}.mt-brand-text{font-size:16px}}',
  ].join('\n');
  document.head.appendChild(style);

  /* ---- 组装 header ---- */
  current.innerHTML =
    '<a class="mt-brand" href="/">' +
    '<span class="mt-brand-icon">⚡</span>' +
    '<span class="mt-brand-text">MindTrainer</span>' +
    '</a>' +
    '<nav class="mt-menu" aria-label="主导航">' + itemsHtml + '</nav>' +

  /* 下拉菜单防抖关闭：mouseenter 打开、mouseleave 延迟 250ms 关闭，
   * 快速或斜向移动鼠标时有缓冲，不会中途自动关闭（配合 CSS hover 桥） */
  document.querySelectorAll('.mt-dropdown').forEach(function (dd) {
    var timer = null;
    function open() { if (timer) clearTimeout(timer); dd.classList.add('open'); }
    function close() { if (timer) clearTimeout(timer); timer = setTimeout(function () { dd.classList.remove('open'); }, 250); }
    dd.addEventListener('mouseenter', open);
    dd.addEventListener('mouseleave', close);
    var panel = dd.querySelector('.mt-dropdown-panel');
    if (panel) {
      panel.addEventListener('mouseenter', open);
      panel.addEventListener('mouseleave', close);
    }
  });

  /* 移动端：点击展开下拉 */
  document.addEventListener('click', function (e) {
    var dd = e.target.closest ? e.target.closest('.mt-dropdown') : null;
    var menu = dd && dd.querySelector('.mt-dropdown-panel');
    document.querySelectorAll('.mt-dropdown.open').forEach(function (el) {
      if (el !== dd) el.classList.remove('open');
    });
    if (dd) {
      if (!menu || !menu.contains(e.target)) {
        dd.classList.toggle('open');
      }
    }
  });
})();
