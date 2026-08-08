/* 训练计划引擎冒烟测试 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function mockCtx() {
  const target = {};
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'string') { t[prop] = () => {}; return t[prop]; }
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; }
  });
}
function mockEl(tag) {
  const listeners = {};
  const el = {
    tagName: tag || 'DIV', style: {}, dataset: {}, children: [],
    innerHTML: '', textContent: '', value: '', src: 'about:blank', files: [],
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(type, fn) { listeners[type] = fn; },
    click() { if (listeners.click) listeners.click({ preventDefault() {}, clientX: 10, clientY: 10 }); },
    querySelector: () => null, querySelectorAll: () => [],
    setAttribute() {}, getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 800, height: 500 }),
    closest: () => null,
    _listeners: listeners,
  };
  return el;
}
const elements = {};
function q(sel) {
  if (sel === '#planName') return elements.planName;
  if (sel === '#stepList') return elements.stepList;
  if (sel === '#addStepBtn') return elements.addStepBtn;
  if (sel === '#moduleSel') return elements.moduleSel;
  if (sel === '#trainSel') return elements.trainSel;
  if (sel === '#stepMinutes') return elements.stepMinutes;
  if (sel === '#savePlanBtn') return elements.savePlanBtn;
  if (sel === '#execPlanBtn') return elements.execPlanBtn;
  if (sel === '#planSel') return elements.planSel;
  if (sel === '#deletePlanBtn') return elements.deletePlanBtn;
  if (sel === '#exportPlanBtn') return elements.exportPlanBtn;
  if (sel === '#importPlanBtn') return elements.importPlanBtn;
  if (sel === '#importFile') return elements.importFile;
  if (sel === '#planTotal') return elements.planTotal;
  if (sel === '#execPanel') return elements.execPanel;
  if (sel === '#execStartBtn') return elements.execStartBtn;
  if (sel === '#execPauseBtn') return elements.execPauseBtn;
  if (sel === '#execStopBtn') return elements.execStopBtn;
  if (sel === '#execStepName') return elements.execStepName;
  if (sel === '#execCountdown') return elements.execCountdown;
  if (sel === '#execProgress') return elements.execProgress;
  if (sel === '#execFrame') return elements.execFrame;
  if (sel === '#currentYear') return elements.currentYear;
  if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
  return null;
}
Object.assign(elements, {
  planName: mockEl('INPUT'), stepList: mockEl('DIV'), addStepBtn: mockEl('BUTTON'),
  moduleSel: mockEl('SELECT'), trainSel: mockEl('SELECT'), stepMinutes: mockEl('INPUT'),
  savePlanBtn: mockEl('BUTTON'), execPlanBtn: mockEl('BUTTON'), planSel: mockEl('SELECT'),
  deletePlanBtn: mockEl('BUTTON'), exportPlanBtn: mockEl('BUTTON'), importPlanBtn: mockEl('BUTTON'),
  importFile: mockEl('INPUT'), planTotal: mockEl('P'), execPanel: mockEl('DIV'),
  execStartBtn: mockEl('BUTTON'), execPauseBtn: mockEl('BUTTON'), execStopBtn: mockEl('BUTTON'),
  execStepName: mockEl('SPAN'), execCountdown: mockEl('SPAN'), execProgress: mockEl('DIV'),
  execFrame: mockEl('IFRAME'), currentYear: mockEl('SPAN'),
});
elements.moduleSel.value = 'basic';
elements.trainSel.value = 'table_num';
elements.stepMinutes.value = '3';

// mock URL API
const mockURL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
const documentMock = {
  readyState: 'complete',
  querySelector: q,
  querySelectorAll: () => [],
  createElement: (t) => mockEl(t),
  addEventListener() {}, removeEventListener() {},
};
const store = {};
const windowMock = {
  devicePixelRatio: 2,
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } },
  AudioContext: undefined,
  URL: mockURL,
  Blob: class {},
  addEventListener() {},
  ResizeObserver: class { observe() {} },
  requestAnimationFrame: (fn) => setTimeout(() => fn(performance.now() + 16), 2),
  cancelAnimationFrame: (id) => clearTimeout(id),
  performance,
  document: documentMock,
};
const sandbox = {
  window: windowMock, document: documentMock,
  localStorage: windowMock.localStorage, performance,
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: windowMock.requestAnimationFrame,
  ResizeObserver: windowMock.ResizeObserver, navigator: {},
  URL: mockURL, Blob: windowMock.Blob,
  location: { search: '' },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = '/Users/pavia/githome/mindtrainer/speed-read/js';
function load(f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
(async () => {
  try {
    load('sr-common.js');
    load('sr-plan.js');
    console.log('sr-plan.js 加载 OK');
    // 默认 5 步渲染
    console.log('默认步骤数:', elements.stepList.children.length, '(应为 5)');
    // 添加一步
    elements.addStepBtn.click();
    console.log('添加后步骤数:', elements.stepList.children.length, '(应为 6)');
    // 保存
    elements.savePlanBtn.click();
    console.log('保存后 localStorage 计划数:', JSON.parse(store['sr_plans']).length, '(应为 1)');
    // 执行
    elements.execPlanBtn.click();
    await new Promise(r => setTimeout(r, 30));
    console.log('执行面板显示:', elements.execPanel.style.display, '(应为 block)');
    console.log('iframe src:', elements.execFrame.src);
    console.log('步骤名:', elements.execStepName.textContent);
    // 停止
    elements.execStopBtn.click();
    await new Promise(r => setTimeout(r, 10));
    console.log('停止后面板:', elements.execPanel.style.display, '(应为 none)');
    console.log('\n=== 训练计划引擎冒烟测试通过 ===');
    process.exit(0);
  } catch (e) {
    console.error('失败:', e.message);
    console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  }
})();
