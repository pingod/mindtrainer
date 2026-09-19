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
  const attributes = {};
  const el = {
    tagName: tag || 'DIV', style: {}, dataset: {}, children: [],
    textContent: '', value: '', src: 'about:blank', files: [],
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(type, fn) { listeners[type] = fn; },
    click() { if (listeners.click) listeners.click({ preventDefault() {}, clientX: 10, clientY: 10 }); },
    querySelector: () => null, querySelectorAll: () => [],
    setAttribute(name, value) { attributes[name] = String(value); },
    getAttribute(name) { return attributes[name] || null; },
    removeAttribute(name) { delete attributes[name]; },
    getBoundingClientRect: () => ({ width: 800, height: 500 }),
    closest: () => null,
    _listeners: listeners,
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._innerHTML || ''; },
    set(value) { this._innerHTML = String(value); this.children.length = 0; }
  });
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
  if (sel === '#planStatus') return elements.planStatus;
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
  execFrame: mockEl('IFRAME'), currentYear: mockEl('SPAN'), planStatus: mockEl('P'),
});
elements.moduleSel.value = 'basic';
elements.trainSel.value = 'table_num';
elements.stepMinutes.value = '3';

// mock URL API
const mockURL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
class MockFileReader {
  readAsText(file) {
    if (file.fail) { if (this.onerror) this.onerror(); return; }
    this.result = file.text;
    if (this.onload) this.onload();
  }
}
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
  URL: mockURL, Blob: windowMock.Blob, FileReader: MockFileReader,
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
    if (elements.stepList.children.length !== 5) throw new Error('默认步骤数不正确');

    elements.addStepBtn.click();
    if (elements.stepList.children.length !== 6) throw new Error('添加步骤后数量不正确');
    console.log('添加步骤: OK');

    elements.savePlanBtn.click();
    if (JSON.parse(store.sr_plans).length !== 1) throw new Error('保存计划失败');
    console.log('保存计划: OK');

    elements.execPlanBtn.click();
    await new Promise(r => setTimeout(r, 30));
    if (elements.execPanel.style.display !== 'block' || elements.execFrame.src !== 'basic.html?train=table_num') {
      throw new Error('执行计划未加载首个训练');
    }
    elements.execStopBtn.click();
    await new Promise(r => setTimeout(r, 10));
    if (elements.execPanel.style.display !== 'none') throw new Error('停止执行失败');
    console.log('执行与停止: OK');

    elements.importFile.files = [{
      size: 100,
      text: JSON.stringify({ name: '安全导入', steps: [
        { module: 'basic', train: 'arrows', minutes: 2 },
        { module: 'unknown', train: 'blocked', minutes: 3 }
      ] })
    }];
    elements.importFile._listeners.change();
    if (elements.stepList.children.length !== 1 || !elements.planStatus.textContent.includes('已忽略 1')) {
      throw new Error('导入未过滤无效步骤');
    }

    elements.importFile.files = [{
      size: 100,
      text: JSON.stringify({ steps: [{ module: 'unknown', train: 'blocked', minutes: 3 }] })
    }];
    elements.importFile._listeners.change();
    if (elements.stepList.children.length !== 1 || !elements.planStatus.textContent.includes('没有可用')) {
      throw new Error('无效导入不应覆盖当前计划');
    }

    elements.importFile.files = [{ size: 128 * 1024 + 1, text: '{}' }];
    elements.importFile._listeners.change();
    if (!elements.planStatus.textContent.includes('不能超过 128 KB')) throw new Error('超大文件未被拒绝');
    console.log('导入边界: OK');
    console.log('\n=== 训练计划引擎冒烟测试通过 ===');
    process.exit(0);
  } catch (e) {
    console.error('失败:', e.message);
    console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  }
})();
