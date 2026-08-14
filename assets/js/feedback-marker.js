/* ============================================================
 * Unitale 页面反馈标记工具（无构建）
 * 用法：点击右下角「✎ 反馈」→「标记问题」→ 点击页面任意元素
 *       → 输入问题描述 → 提交（localStorage 保存）
 *       → 「查看反馈」复制/导出 JSON 给 AI 定位修改
 * ============================================================ */
(function () {
  'use strict';
  if (window.__mtFeedback) return;
  window.__mtFeedback = true;

  const KEY = 'mt_feedback_v1';
  const CSS = /* css */ `
    #mt-fb-fab {
      position: fixed; left: 16px; bottom: 16px; z-index: 99990;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15,23,42,.75);
      color: #fff; font-size: 17px;
      border-radius: 50%; border: none; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
      transition: transform .15s ease;
    }
    #mt-fb-fab:hover { transform: translateY(-2px); }
    #mt-fb-menu {
      position: fixed; left: 16px; bottom: 56px; z-index: 99991;
      background: rgba(255,255,255,.96); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
      border: 1px solid rgba(99,102,241,.2); border-radius: 16px;
      box-shadow: 0 20px 48px -16px rgba(79,70,229,.35);
      padding: 8px; display: none; flex-direction: column; gap: 2px; min-width: 190px;
    }
    #mt-fb-menu button {
      text-align: left; background: none; border: none; color: #1e293b;
      padding: 10px 14px; border-radius: 10px; font-size: 13.5px; cursor: pointer;
    }
    #mt-fb-menu button:hover { background: rgba(109,40,217,.08); color: #6d28d9; }
    #mt-fb-hint {
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 99992;
      background: rgba(15,23,42,.92); color: #fff; font-size: 13.5px;
      padding: 10px 22px; border-radius: 999px; display: none;
      box-shadow: 0 12px 32px -8px rgba(0,0,0,.5); letter-spacing: .02em;
    }
    #mt-fb-panel {
      position: fixed; z-index: 99993; width: 320px;
      background: rgba(255,255,255,.98); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
      border: 1px solid rgba(99,102,241,.25); border-radius: 18px;
      box-shadow: 0 28px 64px -20px rgba(79,70,229,.5);
      padding: 18px; display: none; flex-direction: column; gap: 10px;
    }
    #mt-fb-panel h4 { margin: 0; font-size: 14px; color: #0f172a; }
    #mt-fb-panel .fb-sel {
      font-size: 11px; color: #6d28d9; background: rgba(109,40,217,.07);
      border-radius: 8px; padding: 8px 10px; word-break: break-all; max-height: 60px; overflow: auto;
    }
    #mt-fb-panel textarea {
      width: 100%; box-sizing: border-box; min-height: 72px; resize: vertical;
      border: 1px solid rgba(99,102,241,.3); border-radius: 10px; padding: 10px;
      font-size: 13px; color: #0f172a; font-family: inherit; background: #fafafe;
    }
    #mt-fb-panel .fb-actions { display: flex; gap: 8px; justify-content: flex-end; }
    #mt-fb-panel button {
      border: none; border-radius: 10px; padding: 8px 16px; font-size: 13px; cursor: pointer; font-weight: 600;
    }
    #mt-fb-panel .fb-ok { background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: #fff; }
    #mt-fb-panel .fb-cancel { background: #f1f5f9; color: #475569; }
    #mt-fb-list {
      position: fixed; left: 16px; bottom: 56px; z-index: 99994; width: 380px; max-height: 60vh;
      background: rgba(255,255,255,.98); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
      border: 1px solid rgba(99,102,241,.25); border-radius: 18px;
      box-shadow: 0 28px 64px -20px rgba(79,70,229,.5);
      padding: 16px; display: none; flex-direction: column; gap: 10px; overflow: auto;
    }
    #mt-fb-list h4 { margin: 0; font-size: 14px; color: #0f172a; display: flex; justify-content: space-between; align-items: center; }
    #mt-fb-list .fb-item { border: 1px solid rgba(99,102,241,.15); border-radius: 10px; padding: 10px; font-size: 12px; color: #334155; }
    #mt-fb-list .fb-item .fb-time { color: #94a3b8; font-size: 11px; }
    #mt-fb-list .fb-item .fb-q { color: #0f172a; font-size: 13px; margin-top: 4px; }
    #mt-fb-list button { border: none; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 600; }
    .mt-fb-marker { outline: 2px dashed #ef4444 !important; outline-offset: 2px; cursor: crosshair !important; }
    .mt-fb-marker-locked { outline: 3px solid #ef4444 !important; outline-offset: 2px; }
    .mt-fb-marked { outline: 3px solid #ef4444 !important; outline-offset: 2px; }
    .mt-fb-flash { animation: mt-fb-flash-anim 0.6s ease 4 !important; }
    @keyframes mt-fb-flash-anim { 0%,100% { outline: 3px solid #6d28d9; outline-offset: 2px; } 50% { outline: 3px solid transparent; outline-offset: 2px; } }
  `;

  // ---------- 工具 ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function toast(msg, type) {
    let t = document.getElementById('mt-fb-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mt-fb-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;padding:10px 22px;border-radius:999px;font-size:13.5px;box-shadow:0 12px 32px -8px rgba(0,0,0,.5);transition:opacity .3s;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = '0'; }, 2600);
  }
  // 唯一 CSS 选择器
  const esc = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
    ? (s) => CSS.escape(s)
    : (s) => String(s).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  function cssPath(el) {
    if (!(el instanceof Element)) return '';
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node.tagName !== 'BODY' && node.tagName !== 'HTML') {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += '#' + esc(node.id);
        parts.unshift(part);
        break;
      }
      const cls = Array.from(node.classList || []).filter(c => !c.startsWith('mt-fb')).slice(0, 3);
      if (cls.length) part += '.' + cls.map(esc).join('.');
      const parent = node.parentElement;
      if (parent) {
        const kids = Array.from(parent.children);
        if (kids.length > 1) {
          const idx = kids.indexOf(node) + 1;
          const sameTag = kids.filter(k => k.tagName === node.tagName).length;
          if (sameTag > 1) part += ':nth-child(' + idx + ')';
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }
  function elSummary(el) {
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return el.tagName.toLowerCase() + (txt ? '「' + txt + '」' : '');
  }

  // ---------- 样式 ----------
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ---------- UI 元素 ----------
  const fab = document.createElement('button');
  fab.id = 'mt-fb-fab';
  fab.textContent = '✎';
  fab.title = '页面反馈标记（点击位置 → 记录问题 → 导出给 AI）';
  const menu = document.createElement('div');
  menu.id = 'mt-fb-menu';
  const hint = document.createElement('div');
  hint.id = 'mt-fb-hint';
  hint.textContent = '连续点击标记多个问题（已标记的显示红框，Esc 退出）';
  const panel = document.createElement('div');
  panel.id = 'mt-fb-panel';
  const list = document.createElement('div');
  list.id = 'mt-fb-list';

  document.body.appendChild(fab);
  document.body.appendChild(menu);
  document.body.appendChild(hint);
  document.body.appendChild(panel);
  document.body.appendChild(list);

  let mode = false;
  let hoverEl = null;
  let lockedEl = null;
  const markedEls = []; // 已标记元素（保持红色框，导出/清空时移除）

  function setMode(on) {
    mode = on;
    hint.style.display = on ? 'block' : 'none';
    if (!on) { clearHighlight(); lockedEl = null; }
    document.body.style.cursor = on ? 'crosshair' : '';
  }
  function clearHighlight() {
    document.querySelectorAll('.mt-fb-marker, .mt-fb-marker-locked').forEach(el => {
      el.classList.remove('mt-fb-marker', 'mt-fb-marker-locked');
    });
    hoverEl = null;
  }

  // ---------- 菜单 ----------
  function openMenu() {
    menu.innerHTML = '';
    [
      ['🎯 标记问题', () => { closeAll(); setMode(true); }],
      ['📋 查看反馈（' + load().length + '）', () => { closeAll(); renderList(); }],
      ['📤 导出 JSON', () => { exportJson(); }],
      ['🗑 清空全部', () => {
        const items = load();
        if (!items.length) { toast('暂无反馈'); return; }
        // 二次确认（页面内，不用原生 confirm）
        const b = menu.lastElementChild;
        if (b && b.dataset.arm !== '1') {
          b.dataset.arm = '1';
          b.textContent = '⚠ 再点一次确认清空';
          setTimeout(() => { if (b && b.dataset.arm) { b.dataset.arm = ''; b.textContent = '🗑 清空全部'; } }, 3000);
        } else {
          save([]);
          clearMarked();
          closeAll();
          toast('已清空全部反馈');
        }
      }],
    ].forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = fn;
      menu.appendChild(b);
    });
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
  }
  function closeAll() {
    menu.style.display = 'none';
    panel.style.display = 'none';
    list.style.display = 'none';
    setMode(false);
  }
  // 清除所有已标记元素的红色框（导出/清空后）
  function clearMarked() {
    markedEls.forEach(el => { if (el && el.classList) el.classList.remove('mt-fb-marked'); });
    markedEls.length = 0;
  }

  // ---------- 反馈面板 ----------
  function openPanel(el) {
    lockedEl = el;
    clearHighlight();
    el.classList.add('mt-fb-marker-locked');
    const rect = el.getBoundingClientRect();
    const pw = 320;
    let left = rect.left + rect.width / 2 - pw / 2;
    let top = rect.bottom + 12;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    if (top + 300 > window.innerHeight) top = Math.max(8, rect.top - 300);
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.display = 'flex';
    panel.innerHTML = '';
    const title = document.createElement('h4');
    title.textContent = '标记问题：' + elSummary(el);
    const sel = document.createElement('div');
    sel.className = 'fb-sel';
    sel.textContent = cssPath(el);
    const ta = document.createElement('textarea');
    ta.placeholder = '这里有什么问题？要改成什么样？（例如：颜色太暗 / 这里错位 / 文字看不清…）';
    ta.id = 'mt-fb-textarea';
    const actions = document.createElement('div');
    actions.className = 'fb-actions';
    const ok = document.createElement('button');
    ok.className = 'fb-ok';
    ok.textContent = '提交';
    ok.onclick = () => {
      const q = ta.value.trim();
      if (!q) { toast('请先输入问题描述'); return; }
      const list2 = load();
      list2.push({
        time: new Date().toLocaleString('zh-CN'),
        url: location.pathname,
        selector: cssPath(el),
        summary: elSummary(el),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        x: Math.round(rect.left), y: Math.round(rect.top),
        w: Math.round(rect.width), h: Math.round(rect.height),
        question: q
      });
      save(list2);
      // 已标记元素保持红色框
      el.classList.remove('mt-fb-marker-locked');
      el.classList.add('mt-fb-marked');
      markedEls.push(el);
      // 连续标记：关闭输入框，保持标记模式继续点下一个
      panel.style.display = 'none';
      lockedEl = null;
      mode = true;
      hint.style.display = 'block';
      document.body.style.cursor = 'crosshair';
      toast('✅ 已标记（' + list2.length + '）——继续点下一个，Esc 退出');
    };
    const cancel = document.createElement('button');
    cancel.className = 'fb-cancel';
    cancel.textContent = '取消';
    cancel.onclick = closeAll;
    actions.appendChild(ok);
    actions.appendChild(cancel);
    panel.appendChild(title);
    panel.appendChild(sel);
    panel.appendChild(ta);
    panel.appendChild(actions);
    ta.focus();
  }

  // ---------- 反馈列表 ----------
  function renderList() {
    const items = load();
    list.innerHTML = '';
    const head = document.createElement('h4');
    head.textContent = '反馈记录（' + items.length + '）';
    const copyAll = document.createElement('button');
    copyAll.textContent = '复制全部';
    copyAll.style.cssText = 'background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;';
    copyAll.onclick = () => {
      const txt = items.map((it, i) => `【${i + 1}】${it.time}  ${it.url}\n内容: ${it.text || it.summary || ''}\n位置: (${it.x},${it.y})  尺寸: ${it.w}×${it.h}\n选择器: ${it.selector}\n问题: ${it.question}`).join('\n\n');
      navigator.clipboard.writeText(txt).then(() => {
        save([]);
        clearMarked();
        closeAll();
        toast('✅ 已复制 ' + items.length + ' 条反馈并清空');
      }, () => toast('复制失败——请手动选择'));
    };
    head.appendChild(copyAll);
    list.appendChild(head);
    if (!items.length) {
      const p = document.createElement('div');
      p.textContent = '暂无反馈。点击「🎯 标记问题」开始。';
      p.style.color = '#94a3b8';
      p.style.fontSize = '12.5px';
      list.appendChild(p);
    }
    items.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'fb-item';
      const t1 = document.createElement('div');
      t1.className = 'fb-time';
      t1.textContent = `#${i + 1} ${it.time} · ${it.url}`;
      const t2 = document.createElement('div');
      t2.className = 'fb-sel';
      t2.textContent = it.selector;
      const t3 = document.createElement('div');
      t3.className = 'fb-q';
      t3.textContent = it.question;
      d.appendChild(t1);
      d.appendChild(t2);
      d.appendChild(t3);
      // 编辑按钮：点击后改为 textarea 编辑问题
      const editRow = document.createElement('div');
      editRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏ 编辑';
      editBtn.style.cssText = 'background:#f1f5f9;color:#475569;';
      // 定位按钮：滚动到对应元素并闪烁高亮
      const locateBtn = document.createElement('button');
      locateBtn.textContent = '📍 定位';
      locateBtn.style.cssText = 'background:#ede9fe;color:#6d28d9;';
      locateBtn.onclick = () => {
        const el = document.querySelector(it.selector);
        if (!el) { toast('元素未找到（页面可能已变化）'); return; }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('mt-fb-flash');
        void el.offsetWidth; // 强制 reflow 重启动画
        el.classList.add('mt-fb-flash');
        setTimeout(() => el.classList.remove('mt-fb-flash'), 2600);
      };
      const ta = document.createElement('textarea');
      ta.style.cssText = 'display:none;width:100%;box-sizing:border-box;min-height:60px;border:1px solid rgba(99,102,241,.3);border-radius:8px;padding:8px;font-size:12.5px;font-family:inherit;';
      ta.value = it.question;
      const saveBtn = document.createElement('button');
      saveBtn.textContent = '保存';
      saveBtn.style.cssText = 'display:none;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;';
      editBtn.onclick = () => {
        ta.style.display = 'block';
        saveBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        ta.focus();
      };
      saveBtn.onclick = () => {
        const q = ta.value.trim();
        if (!q) { toast('问题不能为空'); return; }
        const all = load();
        if (all[i]) {
          all[i].question = q;
          all[i].edited = true;
          save(all);
          t3.textContent = q;
        }
        ta.style.display = 'none';
        saveBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
        toast('✅ 已更新');
      };
      editRow.appendChild(editBtn);
      editRow.appendChild(locateBtn);
      editRow.appendChild(ta);
      editRow.appendChild(saveBtn);
      d.appendChild(editRow);
      list.appendChild(d);
    });
    const close = document.createElement('button');
    close.textContent = '关闭';
    close.style.cssText = 'background:#f1f5f9;color:#475569;align-self:flex-end;';
    close.onclick = closeAll;
    list.appendChild(close);
    list.style.display = 'flex';
  }

  // ---------- 导出 ----------
  function exportJson() {
    const items = load();
    if (!items.length) { toast('暂无反馈'); return; }
    const json = JSON.stringify(items, null, 2);
    navigator.clipboard.writeText(json).then(() => toast('✅ JSON 已复制到剪贴板'), () => {
      // fallback: 下载
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mindtrainer-feedback.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('JSON 已下载');
    });
  }

  // ---------- 事件（始终注册，内部判断 mode） ----------
  fab.onclick = openMenu;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAll(); setMode(false); }
  });
  document.addEventListener('mouseover', (e) => {
    if (!mode) return;
    const el = e.target.closest('body *');
    if (!el || el.closest('#mt-fb-menu, #mt-fb-panel, #mt-fb-list, #mt-fb-fab, #mt-fb-hint')) return;
    if (el === hoverEl) return;
    clearHighlight();
    hoverEl = el;
    el.classList.add('mt-fb-marker');
  });
  document.addEventListener('click', (e) => {
    // 菜单/面板/列表打开时：点击外部关闭（点击内部不关）
    const anyOpen = menu.style.display === 'flex' || panel.style.display === 'flex' || list.style.display === 'flex';
    if (anyOpen && !e.target.closest('#mt-fb-menu, #mt-fb-panel, #mt-fb-list, #mt-fb-fab')) {
      closeAll();
      return;
    }
    if (!mode) return;
    const el = e.target.closest('body *');
    if (!el || el.closest('#mt-fb-menu, #mt-fb-panel, #mt-fb-list, #mt-fb-fab')) return;
    e.preventDefault();
    e.stopPropagation();
    setMode(false);
    openPanel(el);
  }, true);
})();
