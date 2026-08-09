import * as THREE from 'three';
/* ============================================================
 * MindTrainer — 冥想训练（Three.js 2D 平面渲染版）
 * 正交相机（视觉纯平无透视）+ GPU 粒子 + 呼吸引导 + 双耳节拍声频
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

      // ---- Three.js 正交 2D 场景（视觉纯平，无透视） ----
      const w = canvas.clientWidth || 800, h = canvas.clientHeight || 500;
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setClearColor(0x0b0f14);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
      this.camera.position.z = 10;
      this.camera.lookAt(0, 0, 0);

      this.mandala = this._buildMandala();
      this.scene.add(this.mandala);
      this.particles = this._buildParticles();
      this.scene.add(this.particles);
      this._ro = null;
    }

    /* 平面曼陀罗：Ring 花瓣绕中心 + 中层环 + 中心光球（多层光晕）+ 双外环
     * 全部 MeshBasicMaterial 纯色，无光照 → 视觉纯平 */
    _buildMandala() {
      const group = new THREE.Group();
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.RingGeometry(0.55, 0.68, 24),
          new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.9 })
        );
        petal.position.set(Math.cos(ang) * 1.6, Math.sin(ang) * 1.6, 0);
        petal.scale.set(1.4, 0.5, 1);
        petal.rotation.z = ang;
        group.add(petal);
      }
      const mid = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.12, 48),
        new THREE.MeshBasicMaterial({ color: 0x4f46e5, transparent: true, opacity: 0.8 })
      );
      group.add(mid);
      this.core = new THREE.Group();
      const c1 = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
      const c2 = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3 }));
      const c3 = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.12 }));
      this.core.add(c1, c2, c3);
      group.add(this.core);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.95, 2.05, 64),
        new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.35 })
      );
      group.add(ring);
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(2.35, 2.4, 64),
        new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.2 })
      );
      group.add(ring2);
      return group;
    }

    /* GPU 粒子：平面分布（按画布尺寸），固定像素大小 */
    _buildParticles() {
      const N = 1400;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * (this.cw || 1200);
        pos[i * 3 + 1] = (Math.random() - 0.5) * (this.ch || 700);
        pos[i * 3 + 2] = 0;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x94a3b8, size: 3, sizeAttenuation: false,
        transparent: true, opacity: 0.5
      });
      return new THREE.Points(geo, mat);
    }

    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this._applySize(w, h);
    }

    _applySize(w, h) {
      this.cw = w; this.ch = h;
      this.renderer.setSize(w, h, false);
      this.camera.left = -w / 2; this.camera.right = w / 2;
      this.camera.top = h / 2; this.camera.bottom = -h / 2;
      this.camera.updateProjectionMatrix();
      // 粒子按新尺寸重新分布
      this.scene.remove(this.particles);
      this.particles = this._buildParticles();
      this.scene.add(this.particles);
    }

    setWave(wave) { this.wave = wave; }

    applyParams(p) { Object.assign(this.params, p); }

    /* 启动音频（双耳节拍：左 200Hz / 右 200+beatHz，立体声分离） */
    startAudio() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.audio = new AC();
      const c = this.audio;
      const master = c.createGain();
      master.gain.value = this.params.vol || 0.35;
      master.connect(c.destination);

      this.oscL = c.createOscillator();
      this.oscL.type = 'sine';
      this.oscL.frequency.value = CARRIER;
      this.oscR = c.createOscillator();
      this.oscR.type = 'sine';
      this.oscR.frequency.value = CARRIER + this.wave.freq;

      const gainL = c.createGain(); gainL.gain.value = 1;
      const gainR = c.createGain(); gainR.gain.value = 1;
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
      this.render(dt);
      requestAnimationFrame(this.loop.bind(this));
    }

    render(dt) {
      // 兜底：尺寸变化自动 resize
      const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
      if (cw && ch && (cw !== this.cw || ch !== this.ch)) this._applySize(cw, ch);

      const bp = this.breathPatterns[this.params.breathe] || this.breathPatterns.box;
      let breathProgress = 0;
      if (this.breathPhase === 'inhale') breathProgress = this.breathT / bp.inhale;
      else if (this.breathPhase === 'hold') breathProgress = 1;
      else if (this.breathPhase === 'exhale') breathProgress = 1 - (this.breathT - bp.inhale - bp.hold) / bp.exhale;
      else breathProgress = 0;
      breathProgress = Math.max(0.15, Math.min(1, breathProgress));

      // 2D 平面更新：曼陀罗平面旋转 + 呼吸缩放 + 中心光球呼吸 + 粒子缓转
      this.mandala.rotation.z += 0.008;
      const s = 0.72 + 0.28 * breathProgress;
      this.mandala.scale.setScalar(s);
      const cs = 0.6 + 0.6 * breathProgress;
      this.core.scale.setScalar(cs);
      this.particles.rotation.z += 0.0004;

      this.renderer.render(this.scene, this.camera);

      // DOM 呼吸提示 + 状态
      const phaseLabel = { inhale: '吸气', hold: '屏息', exhale: '呼气', rest: '休息' };
      const label = $('#breathLabel');
      if (label) label.textContent = phaseLabel[this.breathPhase] || '';
      const status = $('#statusInfo');
      if (status) status.textContent = `${this.wave.name} · ${this.wave.freq}Hz 双耳节拍 · 时长 ${Math.floor(this.elapsed)}s`;
    }

    /* 兼容外部调用（ResizeObserver 等） */
    draw() { this.render(0); }
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
        if (engine.running) {
          engine.stopAudio();
          engine.startAudio();
        }
        SR.Sound.ok();
      });
      wavePanel.appendChild(btn);
    });
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
