/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 训练通用框架
 * sr-common.js
 * 提供：Store(localStorage) / Sound(Web Audio) / Canvas(高清适配)
 *      Trainer 训练器基类 / 参数面板生成 / 控制条 / 键盘绑定
 * ============================================================ */
(function () {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  /* ---------------- Store: 设置持久化 ---------------- */
  const Store = {
    get(k, d) {
      try {
        const v = localStorage.getItem('sr_' + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('sr_' + k, JSON.stringify(v)); } catch (e) {}
    },
    del(k) { try { localStorage.removeItem('sr_' + k); } catch (e) {} }
  };

  /* ---------------- Sound: Web Audio 提示音 ---------------- */
  const Sound = {
    _ctx: null,
    ctx() {
      if (!this._ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this._ctx = new AC();
      }
      if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    },
    tone(freq, dur, type, vol, when) {
      const c = this.ctx();
      if (!c) return;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    },
    ok() { this.tone(660, 0.09, 'sine'); },
    good() { this.tone(880, 0.1, 'sine'); this.tone(1320, 0.12, 'sine', 0.1, 0.1); },
    err() { this.tone(220, 0.16, 'square', 0.06); },
    click() { this.tone(440, 0.03, 'triangle', 0.06); },
    flip() { this.tone(520, 0.05, 'sine', 0.05); },
    /* 训练完成音：一度被各模块调用却从未定义，导致 5 处 TypeError
       （视读表/记忆训练/速读定时/训练计划切步的完成分支全部中断）。 */
    done() { this.good(); this.tone(1760, 0.18, 'sine', 0.1, 0.12); },
    /* 兜底：音频异常绝不应拖垮训练状态机（Web Audio 在无用户手势、
       无音频设备或上下文超限时都可能抛错）。 */
    safe(fn) {
      try { return fn(); } catch (e) { /* 音频失败静默降级 */ }
    }
  };

  /* ---------------- Canvas: 高清适配 ---------------- */
  const Canvas = {
    setup(canvas) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: rect.width, h: rect.height, dpr };
    },
    clear(ctx, w, h, color) {
      ctx.fillStyle = color || '#0b0f14';
      ctx.fillRect(0, 0, w, h);
    }
  };

  /* ---------------- 颜色工具 ---------------- */
  const Color = {
    // 反色（黄卡残像用）
    invert(hex) {
      const n = parseInt(hex.slice(1), 16);
      const r = 255 - ((n >> 16) & 255), g = 255 - ((n >> 8) & 255), b = 255 - (n & 255);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    },
    // hex -> rgba
    rgba(hex, a) {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
  };

  /* ---------------- 参数面板生成器 ---------------- */
  /* paramDefs: [{key,label,type,min,max,step,def,options,onChange}] */
  function buildParamPanel(container, paramDefs, getState, onAnyChange) {
    container.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'sr-params';
    paramDefs.forEach(def => {
      const row = document.createElement('div');
      row.className = 'sr-param-row';
      const label = document.createElement('label');
      label.className = 'sr-param-label';
      label.textContent = def.label;
      label.setAttribute('for', 'p_' + def.key);
      row.appendChild(label);

      const ctl = document.createElement('div');
      ctl.className = 'sr-param-ctl';
      let input;
      if (def.type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
        input.id = 'p_' + def.key;
        input.value = def.def;
      } else if (def.type === 'check') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'p_' + def.key;
        input.checked = !!def.def;
      } else if (def.type === 'select') {
        input = document.createElement('select');
        input.id = 'p_' + def.key;
        (def.options || []).forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          if (String(o.value) === String(def.def)) opt.selected = true;
          input.appendChild(opt);
        });
      } else if (def.type === 'text') {
        input = document.createElement('input');
        input.type = 'text';
        input.id = 'p_' + def.key;
        input.value = def.def;
      } else { // range
        input = document.createElement('input');
        input.type = 'range';
        input.id = 'p_' + def.key;
        input.min = def.min; input.max = def.max;
        input.step = def.step || 1;
        input.value = def.def;
        const val = document.createElement('span');
        val.className = 'sr-param-val';
        val.textContent = def.def;
        const syncVal = () => {
          val.textContent = def.display ? def.display(+input.value) : input.value;
          if (def.onChange) def.onChange(+input.value);
        };
        input.addEventListener('input', () => {
          syncVal();
          onAnyChange && onAnyChange();
        });
        ctl.appendChild(input);
        ctl.appendChild(val);
        row.appendChild(ctl);
        box.appendChild(row);
        return;
      }
      input.addEventListener('input', () => {
        onAnyChange && onAnyChange();
      });
      input.addEventListener('change', () => {
        onAnyChange && onAnyChange();
      });
      ctl.appendChild(input);
      row.appendChild(ctl);
      box.appendChild(row);
    });
    container.appendChild(box);
  }

  /* 读取参数面板当前值 -> 对象 */
  function readParams(container, paramDefs) {
    const out = {};
    paramDefs.forEach(def => {
      const el = $('#p_' + def.key, container);
      if (!el) return;
      if (def.type === 'check') out[def.key] = el.checked;
      else if (def.type === 'color') out[def.key] = el.value;
      else if (def.type === 'range' || def.type === 'number') out[def.key] = parseFloat(el.value);
      else out[def.key] = el.value;
    });
    return out;
  }

  /* ---------------- 训练器基类 ---------------- */
  class Trainer {
    constructor(opts) {
      this.canvas = opts.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.params = Object.assign({}, opts.defaults || {});
      this.speedMul = 1;          // 上下键调速倍率 0.5 ~ 3
      this.running = false;
      this.paused = false;
      this.done = false;
      this._last = 0;
      this.elapsed = 0;           // 训练总耗时(秒)
      this.frame = 0;
      this.onStateChange = opts.onStateChange || null;
      // rAF 句柄 + 预绑定回调：原先每帧 `this._loop.bind(this)` 都会新建一个
      // 函数对象，且从不 cancelAnimationFrame —— 重置后立即开始会出现两条
      // 并行循环，导致 elapsed/dt 双倍累加。
      this._raf = 0;
      this._boundLoop = this._loop.bind(this);
    }

    setParams(p) { Object.assign(this.params, p); }

    _stopLoop() {
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.paused = false;
      this.done = false;
      this.elapsed = 0;
      this._last = performance.now();
      this.onStart && this.onStart();
      this._emit();
      this._stopLoop();
      this._raf = requestAnimationFrame(this._boundLoop);
    }

    pause() {
      if (!this.running) return;
      this.paused = !this.paused;
      this._last = performance.now();
      this._emit();
    }

    stop() {
      this.running = false;
      this.paused = false;
      this._stopLoop();
      this._emit();
    }

    reset() {
      this.stop();
      this.elapsed = 0;
      this.frame = 0;
      this.done = false;
      this.onReset && this.onReset();
      this.draw();
      this._emit();
    }

    _loop(now) {
      if (!this.running) return;
      const dtRaw = (now - this._last) / 1000;
      this._last = now;
      if (!this.paused) {
        const dt = Math.min(dtRaw, 0.05) * this.speedMul;
        this.elapsed += dt;
        this.frame++;
        this.update(dt, now);
      }
      this.draw();
      this._raf = requestAnimationFrame(this._boundLoop);
    }

    // 子类覆写
    update(dt, now) {}
    draw() {}
    onStart() {}
    onReset() {}

    /* 页面卸载 / 切换训练时调用，彻底停掉循环 */
    destroy() {
      this.stop();
      this.onStateChange = null;
    }

    _emit() {
      if (this.onStateChange) {
        this.onStateChange({
          running: this.running, paused: this.paused,
          elapsed: this.elapsed, speedMul: this.speedMul
        });
      }
    }

    // 上下键调速（0.5x ~ 3x）
    speedUp() { this.speedMul = Math.min(3, +(this.speedMul + 0.1).toFixed(2)); this._emit(); }
    speedDown() { this.speedMul = Math.max(0.5, +(this.speedMul - 0.1).toFixed(2)); this._emit(); }

    // 工具：画带圆角的矩形
    rrect(x, y, w, h, r) {
      const c = this.ctx;
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    // 工具：居中文字
    centerText(txt, cx, cy, size, color, font) {
      const c = this.ctx;
      c.fillStyle = color;
      c.font = `${size}px ${font || 'sans-serif'}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(txt, cx, cy);
    }
  }

  /* ---------------- 控制条（开始/暂停/重置/全屏 + 状态显示） ---------------- */
  function buildControls(container, trainer, extraButtons) {
    container.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'sr-control-bar';

    const btn = (label, cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sr-btn ' + cls;
      b.textContent = label;
      b.addEventListener('click', fn);
      bar.appendChild(b);
      return b;
    };

    const stateEl = document.createElement('div');
    stateEl.className = 'sr-state';
    const speedEl = document.createElement('span');
    speedEl.className = 'sr-speed';
    const timeEl = document.createElement('span');
    timeEl.className = 'sr-time';
    stateEl.appendChild(speedEl);
    stateEl.appendChild(timeEl);
    bar.appendChild(stateEl);

    const startBtn = btn('开始', 'sr-btn-start', () => {
      if (trainer.running) trainer.pause();
      else trainer.start();
    });
    const resetBtn = btn('重置', 'sr-btn-reset', () => trainer.reset());
    const fullBtn = btn('全屏', 'sr-btn-full', () => {
      const wrap = trainer.canvas.closest('.sr-stage');
      if (!document.fullscreenElement) {
        (wrap || trainer.canvas).requestFullscreen && (wrap || trainer.canvas).requestFullscreen();
      } else {
        document.exitFullscreen && document.exitFullscreen();
      }
    });

    if (extraButtons) extraButtons.forEach(b => btn(b.label, b.cls || '', b.fn));

    // 原先直接覆盖，把构造函数传入的 opts.onStateChange 静默丢弃了。
    const prevStateChange = trainer.onStateChange;
    trainer.onStateChange = s => {
      if (prevStateChange) prevStateChange(s);
      startBtn.textContent = s.running && !s.paused ? '暂停' : (s.running ? '继续' : '开始');
      speedEl.textContent = '速度 ×' + s.speedMul.toFixed(1);
      timeEl.textContent = '时长 ' + Math.floor(s.elapsed) + 's';
    };
    trainer._emit();

    container.appendChild(bar);
    return { startBtn, resetBtn };
  }

  /* ---------------- 键盘绑定 ---------------- */
  function bindKeyboard(trainer, opts) {
    const keydown = e => {
      const t = e.target;
      // 原先只排除 INPUT|TEXTAREA|SELECT：焦点在按钮上时空格会既激活按钮
      // 又被这里 preventDefault 吞掉一次，行为互相打架。
      if (t && (/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(t.tagName) || t.isContentEditable)) return;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault(); trainer.speedUp(); break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault(); trainer.speedDown(); break;
        case ' ':
          e.preventDefault();
          if (trainer.running) trainer.pause();
          else trainer.start();
          break;
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen();
          break;
        case 'p': case 'P':
          trainer.pause(); break;
      }
      if (opts && opts.onKey) opts.onKey(e);
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }

  /* ---------------- 训练项选中态 ---------------- */
  /* 选中态原先只有 .active 这一个视觉 class，屏幕阅读器无从得知当前选中的
     是哪一项。这里同时写入 aria-current。 */
  function markActive(btn, selector) {
    $$(selector || '.sr-train-item').forEach(b => {
      b.classList.remove('active');
      b.removeAttribute('aria-current');
    });
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'true');
    }
  }

  /* ---------------- 模块标题 ---------------- */
  function pageHeader(title, subtitle) {
    const hero = $('#sr-hero');
    if (!hero) return;
    hero.querySelector('h1').textContent = title;
    if (subtitle && hero.querySelector('p')) hero.querySelector('p').textContent = subtitle;
  }

  /* ---------------- 速读四页初始化模板 ---------------- */
  /* sr-basic / sr-flash / sr-speed / sr-photo 四份 init() 逐字重复，
     变化点只有：Trainer 类、训练列表、paramDefsOf、是否按 group 分组、
     额外的 DOM（文章面板/剪贴板/点击处理）以及键盘扩展。
     抽成工厂后，四页只保留各自的数据与特殊逻辑。 */
  function createTrainingPage({
    TrainerClass,
    TRAININGS,
    paramDefsOf,
    hasGroups = false,
    groupLabel = null,
    bindKeyboard: kbConfig = true,
    onInit = null
  }) {
    const canvas = $('#canvas');
    const stage = $('#stage');
    const trainer = new TrainerClass({ canvas });

    const listEl = $('#trainList');
    let lastGroup = '';
    TRAININGS.forEach(t => {
      if (hasGroups && t.group && t.group !== lastGroup) {
        const g = document.createElement('div');
        g.className = 'sr-train-item sr-train-group';
        g.style.cssText = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;padding:10px 10px 2px;cursor:default;';
        g.textContent = groupLabel[t.group];
        listEl.appendChild(g);
        lastGroup = t.group;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sr-train-item';
      btn.dataset.id = t.id;
      btn.innerHTML = `<span class="sr-train-num">${String(t.num).padStart(2, '0')}</span>${t.name}`;
      btn.addEventListener('click', () => select(t, btn));
      listEl.appendChild(btn);
    });

    const paramPanel = $('#paramPanel');
    const methodBox = $('#methodBox');
    const nameEl = $('#statusName');

    function select(t, btn) {
      markActive(btn);
      trainer.selectTraining(t);
      nameEl.textContent = t.name;
      methodBox.innerHTML = `<b>训练方法：</b>${t.method}`;
      const defs = paramDefsOf(t);
      buildParamPanel(paramPanel, defs, null, () => {
        trainer.applyParams(readParams(paramPanel, defs));
      });
    }

    const controls = $('#controls');
    buildControls(controls, trainer);

    if (kbConfig) {
      const opts = typeof kbConfig === 'object' && typeof kbConfig.opts === 'function'
        ? kbConfig.opts(trainer)
        : (typeof kbConfig === 'object' ? kbConfig.opts : undefined);
      bindKeyboard(trainer, opts);
    }

    const ro = new ResizeObserver(() => {
      if (trainer.resize) trainer.resize();
      if (!trainer.running) trainer.draw();
    });
    ro.observe(stage);

    if (onInit) onInit({ trainer, canvas, stage, controls, listEl, paramPanel, methodBox, nameEl });

    const first = listEl.querySelector('.sr-train-item[data-id]');
    if (first) select(TRAININGS[0], first);

    // 支持 URL ?train=id 直接选中（训练计划执行器使用）。
    // 必须先在 TRAININGS 白名单里命中，再拿 id 拼属性选择器，避免注入。
    const urlTrain = new URLSearchParams(location.search).get('train');
    if (urlTrain) {
      const urlHit = TRAININGS.find(t => t.id === urlTrain);
      if (urlHit) {
        const btn = listEl.querySelector('.sr-train-item[data-id="' + urlHit.id + '"]');
        if (btn) btn.click();
      }
    }

    return trainer;
  }

  window.SR = { $, $$, Store, Sound, Canvas, Color, Trainer, markActive, buildParamPanel, readParams, buildControls, bindKeyboard, pageHeader, createTrainingPage };
})();
