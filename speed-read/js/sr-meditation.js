/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 冥想训练
 * 双耳节拍（binaural beats）+ 可选背景音乐（原版 Music.mp3）
 * + 呼吸引导 + 曼陀罗动画
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

  /* AudioContext 全局单例。
     原先每次 startAudio 都 new 一个，切档位又是 stopAudio + startAudio
     （再建一个），而 close() 是异步的 —— 快速连点会短暂突破浏览器约 6 个
     AudioContext 上限，之后出声失败且控制台刷警告。 */
  let sharedAudio = null;
  function getSharedAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!sharedAudio || sharedAudio.state === 'closed') sharedAudio = new AC();
    if (sharedAudio.state === 'suspended') sharedAudio.resume();
    return sharedAudio;
  }

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
      /* vol 是 0~1 的实际增益，volPct/bgmPct 是参数面板上 0~100 的百分比。
         原先面板直接写 vol（5~80），startAudio 又把它当作增益塞进
         master.gain —— 用户只要动过任意一个参数（面板会把整份参数回传），
         增益就会从 0.35 变成 35，音量暴增百倍并严重削波。 */
      this.params = { vol: 0.35, volPct: 35, bgmOn: true, bgmPct: 40, anim: true, breathe: 'box' };
      this.bgm = null;              // 背景音乐 Music.mp3（原版飞克视读的资源，默认随训练开启）
      this.breathPatterns = {
        box: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
        relax: { inhale: 4, hold: 7, exhale: 8, rest: 0 },
        quick: { inhale: 3, hold: 0, exhale: 3, rest: 0 }
      };
      this._ro = null;
      this._raf = 0;
      this._boundLoop = this.loop.bind(this);   // 预绑定，避免每帧新建函数对象
    }

    resize() {
      const { w, h } = Canvas.setup(this.canvas);
      this.cw = w; this.ch = h;
    }

    setWave(wave) { this.wave = wave; }

    /* 节拍音量：面板百分比 -> 0~1 增益，并实时生效（原先只在 start 时设一次，
       训练中拖动音量滑杆完全没反应）。 */
    setVolume(v) {
      this.params.vol = Math.max(0, Math.min(1, v));
      if (this.gainNode && this.audio) {
        try {
          this.gainNode.gain.setTargetAtTime(this.params.vol, this.audio.currentTime, 0.05);
        } catch (e) { /* 上下文已关闭 */ }
      }
    }

    /* ---------------- 背景音乐（原版飞克视读 Music.mp3） ---------------- */
    startBgm() {
      if (!this.params.bgmOn) return false;
      if (!this.bgm) {
        this.bgm = new Audio('/speed-read/assets/music/Music.mp3');
        this.bgm.loop = true;
        this.bgm.preload = 'none';
      }
      this.bgm.volume = Math.max(0, Math.min(1, (this.params.bgmPct || 0) / 100));
      const pr = this.bgm.play();
      // 自动播放策略可能拒绝，等用户下次手势；这里静默即可
      if (pr && pr.catch) pr.catch(() => {});
      return true;
    }

    stopBgm() { if (this.bgm) this.bgm.pause(); }

    setBgmVolume(pct) {
      this.params.bgmPct = pct;
      if (this.bgm) this.bgm.volume = Math.max(0, Math.min(1, pct / 100));
    }

    applyParams(p) {
      const prevBgmOn = this.params.bgmOn;
      if (p.volPct != null) { this.params.volPct = p.volPct; this.setVolume(p.volPct / 100); }
      if (p.bgmPct != null) this.setBgmVolume(p.bgmPct);
      Object.assign(this.params, p);
      // 运行中切换背景音乐开关即时生效
      if (this.params.bgmOn !== prevBgmOn && this.running) {
        if (this.params.bgmOn) this.startBgm(); else this.stopBgm();
      }
    }

    /* 启动音频（复用单例上下文） */
    startAudio() {
      const c = getSharedAudio();
      if (!c) return false;
      this.audio = c;
      const master = c.createGain();
      // 用 typeof 判断而非 ||：0 是合法的静音值，|| 会把它顶成 0.35
      master.gain.value = typeof this.params.vol === 'number' ? this.params.vol : 0.35;
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
        // 不 close 单例上下文，只挂起：下次 start 复用，避免反复创建/销毁
        if (this.audio && this.audio.state === 'running') this.audio.suspend();
      } catch (e) { /* 振荡器已停止等情况忽略 */ }
      this.oscL = this.oscR = null;
      this.audio = null;
    }

    /* 切换档位时只改右声道频率，不重建整套音频节点 */
    updateWaveAudio() {
      if (!this.audio || !this.oscR) return false;
      try {
        this.oscR.frequency.setTargetAtTime(CARRIER + this.wave.freq, this.audio.currentTime, 0.05);
        return true;
      } catch (e) { return false; }
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
      this.startBgm();
      this._stopLoop();
      this._raf = requestAnimationFrame(this._boundLoop);
    }

    stop() {
      this.running = false;
      this._stopLoop();
      this.stopAudio();
      this.stopBgm();
    }

    _stopLoop() {
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
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
      this._raf = requestAnimationFrame(this._boundLoop);
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
        SR.markActive(btn, '.wave-btn');
        engine.setWave(w);
        // 运行中切档位只改频率。原先是 stopAudio + startAudio 整套重建，
        // 会再开一个 AudioContext 并让声音中断一下。
        if (engine.running) engine.updateWaveAudio();
        SR.Sound.ok();
      });
      wavePanel.appendChild(btn);
    });
    const alphaBtn = wavePanel.querySelector('[data-id="alpha"]');
    if (alphaBtn) SR.markActive(alphaBtn, '.wave-btn');   // 默认 α

    // 参数面板
    const paramPanel = $('#paramPanel');
    const defs = [
      { key: 'volPct', label: '节拍音量', type: 'range', min: 0, max: 100, def: 35, display: v => Math.round(v) + '%' },
      { key: 'bgmOn', label: '背景音乐', type: 'check', def: true },
      { key: 'bgmPct', label: '音乐音量', type: 'range', min: 0, max: 100, def: 40, display: v => Math.round(v) + '%' },
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

    // 切到后台时停止：原先 rAF 被浏览器节流但振荡器仍在发声，动画与声音
    // 脱节，回到前台还会累积 elapsed。
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && engine.running) {
        engine.stop();
        startBtn.textContent = '开始冥想';
      }
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
