/* 冥想引擎冒烟测试 */
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
function mockCanvas() {
  return {
    width: 800, height: 500, style: {},
    getContext: () => mockCtx(),
    getBoundingClientRect: () => ({ width: 800, height: 500, left: 0, top: 0 }),
    addEventListener() {}, closest: () => null,
  };
}
function mockEl(tag) {
  const listeners = {};
  return {
    tagName: tag || 'DIV', style: {}, dataset: {}, children: [],
    innerHTML: '', textContent: '',
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
}
const elements = {};
function q(sel) {
  if (sel === '#canvas') return elements.canvas;
  if (sel === '#wavePanel') return elements.wavePanel;
  if (sel === '#paramPanel') return elements.paramPanel;
  if (sel === '#controls') return elements.controls;
  if (sel === '#currentYear') return elements.currentYear;
  if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
  return null;
}
elements.canvas = mockCanvas();
elements.wavePanel = mockEl('DIV');
elements.paramPanel = mockEl('DIV');
elements.controls = mockEl('DIV');
elements.currentYear = mockEl('SPAN');
elements.wavePanel.querySelector = function (sel) {
  if (sel.includes('data-id')) return this.children.find(c => c.dataset && c.dataset.id === 'alpha') || null;
  return null;
};

// 模拟 AudioContext（带 resume/close）
function MockAudioContext() {
  const state = { value: 'running' };
  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    createGain() { return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; },
    createOscillator() { return { type: 'sine', frequency: { value: 200 }, start() {}, stop() {}, connect() {} }; },
    createStereoPanner() { return { pan: { value: 0 }, connect() {} }; },
    resume() { this.state = 'running'; },
    close() { this.state = 'closed'; },
  };
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
  AudioContext: MockAudioContext,
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
  console, setTimeout, clearTimeout,
  requestAnimationFrame: windowMock.requestAnimationFrame,
  ResizeObserver: windowMock.ResizeObserver, navigator: {},
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
    load('sr-meditation.js');
    console.log('sr-meditation.js 加载 OK');
    console.log('脑波按钮数:', elements.wavePanel.children.length, '(应为 5)');
    console.log('控制条按钮数:', elements.controls.children[0] ? elements.controls.children[0].children.length : 0);
    // 触发开始
    const bar = elements.controls.children[0];
    const startBtn = bar.children[0];
    startBtn.click();
    await new Promise(r => setTimeout(r, 50));
    console.log('开始后按钮文案:', startBtn.textContent);
    startBtn.click(); // 停止
    await new Promise(r => setTimeout(r, 20));
    console.log('停止后按钮文案:', startBtn.textContent);
    console.log('\n=== 冥想引擎冒烟测试通过 ===');
    process.exit(0);
  } catch (e) {
    console.error('失败:', e.message);
    console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  }
})();
