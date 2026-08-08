/* 通用冒烟测试：加载指定 sr-*.js，遍历训练按钮，逐个 select + start + 渲染数帧 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const TARGET = process.argv[2] || 'sr-basic.js';
const EXPECT = parseInt(process.argv[3] || '0', 10);

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

function mockCanvas() {
  const el = {
    width: 800, height: 500, style: {},
    getContext: () => mockCtx(),
    getBoundingClientRect: () => ({ width: 800, height: 500, left: 0, top: 0 }),
    addEventListener(type, fn) { this._l = this._l || {}; this._l[type] = fn; },
    closest: () => null,
  };
  return el;
}

function mockEl(tag) {
  const listeners = {};
  return {
    tagName: tag || 'DIV', style: {}, dataset: {}, children: [],
    innerHTML: '', textContent: '',
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(type, fn) { listeners[type] = fn; },
    click() { if (listeners.click) listeners.click({ preventDefault() {}, clientX: 10, clientY: 10, target: {} }); },
    querySelector: () => null,
    querySelectorAll: () => [],
    setAttribute() {}, getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 800, height: 500 }),
    closest: () => null,
    _listeners: listeners,
  };
}

const elements = {};
function q(sel) {
  if (sel === '#canvas') return elements.canvas;
  if (sel === '#trainList') return elements.trainList;
  if (sel === '#paramPanel') return elements.paramPanel;
  if (sel === '#methodBox') return elements.methodBox;
  if (sel === '#controls') return elements.controls;
  if (sel === '#statusInfo') return elements.statusInfo;
  if (sel === '#statusName') return elements.statusName;
  if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
  return null;
}

elements.canvas = mockCanvas();
elements.trainList = mockEl('DIV');
elements.paramPanel = mockEl('DIV');
elements.methodBox = mockEl('DIV');
elements.controls = mockEl('DIV');
elements.statusInfo = mockEl('SPAN');
elements.statusName = mockEl('SPAN');
const trainButtons = [];
elements.trainList.appendChild = function (c) {
  this.children.push(c);
  if (c.dataset && c.dataset.id) trainButtons.push(c);
  return c;
};
elements.trainList.querySelector = function (sel) {
  if (sel.includes('sr-train-item') && sel.includes('data-id')) return trainButtons[0] || null;
  return null;
};
elements.trainList.querySelectorAll = function () { return trainButtons; };

const documentMock = {
  readyState: 'complete',
  querySelector: q,
  querySelectorAll: (sel) => (sel === '.sr-train-item' ? trainButtons : []),
  createElement: (tag) => mockEl(tag),
  addEventListener: () => {},
  removeEventListener: () => {},
};
const store = {};
const windowMock = {
  devicePixelRatio: 2,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  AudioContext: undefined,
  addEventListener: () => {},
  ResizeObserver: class { observe() {} },
  requestAnimationFrame: (fn) => setTimeout(() => fn(performance.now() + 16), 2),
  cancelAnimationFrame: (id) => clearTimeout(id),
  performance,
  document: documentMock,
};

const sandbox = {
  window: windowMock, document: documentMock,
  localStorage: windowMock.localStorage, performance,
  console, setTimeout, clearTimeout,
  requestAnimationFrame: windowMock.requestAnimationFrame,
  ResizeObserver: windowMock.ResizeObserver, navigator: {},
  URLSearchParams, location: { search: '' },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = '/Users/pavia/githome/mindtrainer/speed-read/js';
function load(f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}

function nextFrame() { return new Promise(r => setTimeout(r, 40)); }

(async () => {
  try {
    load('sr-common.js');
    load(TARGET);
    console.log(`${TARGET} 训练按钮数: ${trainButtons.length}`);
    if (EXPECT && trainButtons.length !== EXPECT) {
      console.error(`期望 ${EXPECT} 项，实际 ${trainButtons.length}`);
      process.exit(1);
    }

    const startBtn = elements.controls.children[0];
    if (!startBtn) { console.error('控制条未构建'); process.exit(1); }

    const errors = [];
    for (let i = 0; i < trainButtons.length; i++) {
      const btn = trainButtons[i];
      try {
        btn.click();
        startBtn.click();       // start
        await nextFrame();
        startBtn.click();       // pause
        await nextFrame();
        console.log(`  [${String(i + 1).padStart(2, '0')}] ${btn.dataset.id} OK`);
      } catch (e) {
        errors.push(`${btn.dataset.id}: ${e.message}`);
        console.log(`  [${String(i + 1).padStart(2, '0')}] ${btn.dataset.id} FAIL: ${e.message}`);
      }
    }

    if (errors.length) { console.error('\n失败项:', errors.length); process.exit(1); }
    console.log(`\n=== ${TARGET} 全部 ${trainButtons.length} 项运行正常 ===`);
    process.exit(0);
  } catch (e) {
    console.error('加载失败:', e.message);
    console.error(e.stack.split('\n').slice(0, 6).join('\n'));
    process.exit(1);
  }
})();
