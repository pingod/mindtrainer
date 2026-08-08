/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 冥想训练
 * 双脑同步声频（双耳节拍 binaural beats）+ 呼吸引导 + 曼陀罗动画
 * ============================================================ */
(function () {
  'use strict';
  const SR = window.SR;
  const { $, $$, Store, Sound, Canvas, Color } = SR;

  /* 双耳节拍档位：频率(Hz)、说明 */
  const WAVES = [
    { id: 'delta', name: 'δ 深度睡眠', freq: 3, desc: '0.5-4Hz，深度放松、恢复、睡眠' },
    { id: 'theta', name: 'θ 深度冥想', freq: 6, desc: '4-8Hz，深度冥想、灵感、REM 睡眠' },
    { id: 'alpha', name: 'α 放松专注', freq: 10, desc: '8-12Hz，放松警觉、心流、学习' },
    { id: 'beta', name: 'β 清醒专注', freq: 18, desc: '12-30Hz，清醒警觉、积极思考' },
    { id: 'gamma', name: 'γ 高专注', freq: 40, desc: '30-100Hz，高级认知、峰值表现' }
  ];

  const CARRIER = 200; // 载波频率 200Hz，左右声道相差 beatHz

  class MeditationEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cw = 0; this.ch = 0;
      this.running = false;
      this.elapsed = 0;
      this._last = 0;
      this.t = 0;
      // 音频
      this.audio = null;
      this.oscL = null;
      this.oscR = null;
      this.gainNode = null;
      // 呼吸
      this.breathPhase = 'inhale';
      this.breathT = 0;
      this.wave = WAVES[2]; // 默认 α
      this.params = { vol: 0.35, breath: true, anim: true, breathe: 'box' };
      this.breathPatterns = {
        box: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
        relax: { inhale: 4, hold: 7, exhale: 8, rest: 0 },
        quick: { inhale: 3, hold: 0, exhale: 3, rest: 0 }
      };
      this._ro = null;
    }

    resize() {
      const { w, h } = Canvas.setup(this.canvas);
      this.cw = w; this.ch = h;
    }

    setWave(wave) { this.wave = wave; }

    applyParams(p) { Object.assign(this.params, p); }

    /* 启动音频 */
    startAudio() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.audio = new AC();
      const c = this.audio;
      const master = c.createGain();
      master.gain.value = this.params.vol || 0.35;
      master.connect(c.destination);

      // 左声道：载波
      this.oscL = c.createOscillator();
      this.oscL.type = 'sine';
      this.oscL.frequency.value = CARRIER;
      // 右声道：载波 + beat
      this.oscR = c.createOscillator();
      this.oscR.type = 'sine';
      this.oscR.frequency.value = CARRIER + this.wave.freq;

      // 缓慢淡入
      const gainL = c.createGain(); gainL.gain.value = 1;
      const gainR = c.createGain(); gainR.gain.value = 1;

      // 立体声定位：左声道 pan -1，右声道 pan +1
      const panL = c.createStereoPanner ? c.createStereoPanner() : null;
      const panR = c.createStereoPanner ? c.createStereoPanner() : null;
      if (panL) panL.pan.value = -1;
      if (panR) panR.pan.value = 1;

      const fade = c.createGain();
      fade.gain.setValueAtTime(0.0001, c.currentTime);
      fade.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.5);

      this.oscL.connect(gainL);
      if (panL) { gainL.connect(panL); panL.connect(fade); } else { gainL.connect(fade); }
      this.oscR.connect(gainR);
      if (panR) { gainR.connect(panR); panR.connect(fade); } else { gainR.connect(fade); }
      fade.connect(master);

      this.oscL.start();
      this.oscR.start();
      this.gainNode = master;
      return true;
    }

    stopAudio() {
      try {
        if (this.oscL) this.oscL.stop();
        if (this.oscR) this.oscR.stop();
        if (this.audio) this.audio.close();
      } catch (e) {}
      this.oscL = this.oscR = this.audio = null;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.elapsed = 0;
      this._last = performance.now();
      this.breathT = 0;
      this.breathPhase = 'inhale';
      this.t = 0;
      this.startAudio();
      requestAnimationFrame(this.loop.bind(this));
    }

    stop() {
      this.running = false;
      this.stopAudio();
    }

    toggle() {
      if (this.running) this.stop();
      else this.start();
    }

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.elapsed += dt;
      this.t += dt;
      // 呼吸节奏
      const bp = this.breathPatterns[this.params.breathe] || this.breathPatterns.box;
      this.breathT += dt;
      const total = bp.inhale + bp.hold + bp.exhale + bp.rest;
      if (this.breathT > total) {
        this.breathT = 0;
        this.breathPhase = 'inhale';
      } else if (this.breathPhase === 'inhale' && this.breathT > bp.inhale) {
        this.breathPhase = 'hold';
      } else if (this.breathPhase === 'hold' && this.breathT > bp.inhale + bp.hold) {
        this.breathPhase = 'exhale';
      } else if (this.breathPhase === 'exhale' && this.breathT > bp.inhale + bp.hold + bp.exhale) {
        this.breathPhase = 'rest';
      }
      this.draw();
      requestAnimationFrame(this.loop.bind(this));
    }

    draw() {
      const { ctx, cw: w, ch: h } = this;
      if (!w || !h) return;
      Canvas.clear(ctx, w, h, '#0b0f14');

      const cx = w / 2, cy = h / 2;
      const bp = this.breathPatterns[this.params.breathe] || this.breathPatterns.box;

      // 呼吸进度
      let breathProgress = 0;
      if (this.breathPhase === 'inhale') breathProgress = this.breathT / bp.inhale;
      else if (this.breathPhase === 'hold') breathProgress = 1;
      else if (this.breathPhase === 'exhale') breathProgress = 1 - (this.breathT - bp.inhale - bp.hold) / bp.exhale;
      else breathProgress = 0;
      breathProgress = Math.max(0.15, Math.min(1, breathProgress));

      // 曼陀罗动画（旋转 + 随呼吸缩放）
      const r = Math.min(w, h) * 0.3 * (0.7 + 0.3 * breathProgress);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.t * 0.15);
      // 花瓣
      const color = this.params.anim ? '#6366f1' : '#334155';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(r * 0.5, 0, r * 0.5, r * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      // 中心光点
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.08 * (1 + breathProgress * 0.5), 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // 呼吸提示
      const phaseLabel = { inhale: '吸气', hold: '屏息', exhale: '呼气', rest: '休息' };
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(phaseLabel[this.breathPhase], cx, h * 0.8);

      // 状态
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillText(`${this.wave.name} · ${this.wave.freq}Hz 双耳节拍 · 时长 ${Math.floor(this.elapsed)}s`, w - 16, 14);
      ctx.textAlign = 'left';
      ctx.fillText('🎧 建议佩戴耳机体验双耳节拍', 16, 14);
    }
  }

  /* ---------------- 页面初始化 ---------------- */
  function init() {
    const canvas = $('#canvas');
    const stage = $('#stage');
    const engine = new MeditationEngine(canvas);

    // 波档位选择
    const wavePanel = $('#wavePanel');
    WAVES.forEach(w => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sr-btn wave-btn';
      btn.dataset.id = w.id;
      btn.innerHTML = `<b>${w.name}</b><small>${w.desc}</small>`;
      btn.title = w.desc;
      btn.addEventListener('click', () => {
        $$('.wave-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        engine.setWave(w);
        // 如果正在运行，重建音频
        if (engine.running) {
          engine.stopAudio();
          engine.startAudio();
        }
        SR.Sound.ok();
      });
      wavePanel.appendChild(btn);
    });
    // 默认 α
    const alphaBtn = wavePanel.querySelector('[data-id="alpha"]');
    if (alphaBtn) alphaBtn.classList.add('active');

    // 参数面板
    const paramPanel = $('#paramPanel');
    const defs = [
      { key: 'vol', label: '音量', type: 'range', min: 5, max: 80, def: 35, display: v => Math.round(v) + '%' },
      { key: 'breathe', label: '呼吸节奏', type: 'select', def: 'box',
        options: [['box', '4-4-4-4 盒式'], ['relax', '4-7-8 放松'], ['quick', '3-3 快速']] },
      { key: 'anim', label: '曼陀罗动画', type: 'check', def: true }
    ];
    SR.buildParamPanel(paramPanel, defs, null, () => {
      engine.applyParams(SR.readParams(paramPanel, defs));
    });

    // 控制
    const controls = $('#controls');
    controls.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'sr-control-bar';
    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'sr-btn sr-btn-start';
    startBtn.textContent = '开始冥想';
    startBtn.addEventListener('click', () => {
      engine.toggle();
      startBtn.textContent = engine.running ? '停止' : '开始冥想';
      if (engine.running) {
        // 检查音频是否可用
        if (!engine.audio) {
          statusEl.textContent = '提示：浏览器未播放声音，请点击页面任意位置后重试';
        } else {
          statusEl.textContent = '';
        }
      }
    });
    bar.appendChild(startBtn);
    const statusEl = document.createElement('div');
    statusEl.className = 'sr-state';
    statusEl.textContent = '';
    bar.appendChild(statusEl);
    controls.appendChild(bar);

    // 点击页面任意处恢复音频上下文
    document.addEventListener('click', () => {
      if (engine.audio && engine.audio.state === 'suspended') engine.audio.resume();
    });

    const ro = new ResizeObserver(() => {
      engine.resize();
      if (!engine.running) engine.draw();
    });
    ro.observe(stage);
    engine.resize();
    engine.draw();

    const y = SR.$('#currentYear');
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
