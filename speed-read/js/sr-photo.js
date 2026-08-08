/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 照相记忆引擎（8 项）
 * 三色卡 / 几何卡 / 黄卡 / 曼陀罗 / 3D卡 / 图片浏览 / 记忆训练 / 瞬间计算
 * ============================================================ */
(function () {
  'use strict';
  const SR = window.SR;
  const { $, $$, Store, Sound, Canvas, Color } = SR;

  const TRAININGS = [
    { id: 'tricolor', name: '三色卡片', type: 'tricolor', num: 1,
      method: '将卡片全部纳入视野，集中注意力目不转睛地注视卡片 30 秒左右，时间到后立即闭眼，眼前出现残像。残像消失后继续睁眼注视。当一种颜色的残像停留时间足够长时，换一种颜色继续练习。' },
    { id: 'geom', name: '几何卡片', type: 'geom', num: 2,
      method: '同三色卡片，注视几何图形产生残像。当一种形状的残像停留时间足够长时，换一种形状继续练习。' },
    { id: 'yellow', name: '黄卡', type: 'yellow', num: 3,
      method: '集中注意力目不转睛地注视黄卡 30 秒左右，时间到后立即闭眼，眼前出现残像（一般为反色）。此时开动想象力，使反色残像消失，代之以原色图像。每天不间断练习。' },
    { id: 'mandala', name: '曼陀罗卡片', type: 'mandala', num: 4,
      method: '集中注意力注视卡片 5 秒后立即闭眼 5 秒并单击鼠标，保持原色在眼前更久的停留。睁开眼后观看无填充色的曼陀罗卡片，力求将它的颜色回忆出来。单击屏幕可在填充/不填充间切换。' },
    { id: 'card3d', name: '3D 卡片', type: 'card3d', num: 5,
      method: '尽量用视线平行的方法，注视三维图后方的虚拟物体，将会看到立体的图像。图片练熟后可以改成文字三维继续练习。' },
    { id: 'picview', name: '图片浏览', type: 'picview', num: 6,
      method: '播放需要记忆的 1000 大图（此处为程序生成的记忆图案）。集中注意力，将图片全部纳入视野，训练照相记忆能力。' },
    { id: 'memory', name: '记忆训练', type: 'memory', num: 7,
      method: '文字找同：原理同图片找同游戏，换成难度更大的文字，是对记忆素质的一项检测。图片位置记忆：在指定时间内记住每张图片和相应的位置。' },
    { id: 'fastcalc', name: '瞬间计算', type: 'fastcalc', num: 8,
      method: '集中注意力于整个屏幕，身心放松，快速闪过一些点后，立即回忆点的数目。' }
  ];

  /* 曼陀罗生成：白底 + 红黄蓝绿四色对称花瓣（对应原版 6_4 截图）
   * variant 0-22 共 23 种变体：花瓣数/层数/内部图案变化 */
  const MANDALA_COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6'];
  function drawMandala(ctx, cx, cy, r, color, filled, seed, variant) {
    const v = variant || 0;
    const petals = [8, 12, 16][v % 3];
    const layers = 1 + (v % 3);      // 1-3 层花瓣
    const inner = v % 4;             // 0 圆 | 1 星 | 2 菱形 | 3 同心圆
    // 白底圆卡
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    // 外环（用四色分段描边，形成彩色圆环）
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = MANDALA_COLORS[i % 4];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, i / 24 * Math.PI * 2, (i + 1) / 24 * Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = MANDALA_COLORS[(i + 2) % 4];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, i / 24 * Math.PI * 2, (i + 1) / 24 * Math.PI * 2);
      ctx.stroke();
    }
    // 多层花瓣（四色轮换，均匀对称分布）
    for (let L = 0; L < layers; L++) {
      const lr = r * (0.58 - L * 0.17);
      const n = petals + L * 2;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + seed;
        const c = MANDALA_COLORS[(i + L) % 4];
        ctx.save();
        ctx.rotate(ang);
        ctx.fillStyle = filled ? c : 'transparent';
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(lr, 0, lr * 0.4, lr * 0.13, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
    // 内部图案（四色同心）
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = filled ? MANDALA_COLORS[k] : 'transparent';
      ctx.strokeStyle = MANDALA_COLORS[k];
      ctx.lineWidth = 2;
      if (inner === 0) {
        ctx.beginPath(); ctx.arc(0, 0, r * (0.16 - k * 0.03), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (inner === 1) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 === 0 ? r * (0.17 - k * 0.03) : r * 0.06;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + k * 0.4;
          i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (inner === 2) {
        ctx.save(); ctx.rotate(k * Math.PI / 4);
        ctx.beginPath(); ctx.moveTo(0, -r * (0.18 - k * 0.03)); ctx.lineTo(r * (0.18 - k * 0.03), 0); ctx.lineTo(0, r * (0.18 - k * 0.03)); ctx.lineTo(-r * (0.18 - k * 0.03), 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r * (0.16 - k * 0.035), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* 伪随机数（SIRDS 点阵每行稳定） */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 3D 图：真 SIRDS（单幅随机点立体图）
   * 原理：每行随机点以周期 T 重复（背景），图案区域的点额外偏移 shift，
   * 平行视线（两眼注视图后方）时背景重合、图案区域因视差浮起。
   * 模式：pic 图片（中央圆+星） | txt 文字（"3D"） | anim 动画（移动小球） */
  function draw3D(ctx, w, h, mode, seed, t) {
    const shift = 26, T = 72;
    const cx = w / 2, cy = h / 2;
    let region;
    if (mode === 'txt') {
      // 离屏 canvas 画文字，取笔画区域做深度
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const octx = off.getContext('2d');
      octx.clearRect(0, 0, w, h);
      octx.fillStyle = '#fff';
      octx.font = `bold ${Math.min(150, w * 0.22)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      octx.textAlign = 'center'; octx.textBaseline = 'middle';
      octx.fillText('3D', w / 2, h / 2 - 30);
      octx.font = `bold ${Math.min(44, w * 0.07)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      octx.fillText('视线平行 · 看后方虚像', w / 2, h / 2 + 95);
      const data = octx.getImageData(0, 0, w, h).data;
      region = (x, y) => data[((y * w + x) | 0) * 4 + 3] > 128;
    } else if (mode === 'anim') {
      // 移动小球区域做深度（凝视时球浮起并移动）
      const bx = cx + Math.sin(t / 900) * w * 0.2;
      const by = cy + Math.cos(t / 1300) * h * 0.15;
      const br = Math.min(w, h) * 0.13;
      region = (x, y) => {
        const dx = x - bx, dy = y - by;
        return dx * dx + dy * dy < br * br;
      };
    } else {
      // 图片模式：中央圆 + 菱形星浮起
      const rr = Math.min(w, h) * 0.17;
      const starR = Math.min(w, h) * 0.11;
      region = (x, y) => {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < rr * rr) return true;
        return Math.abs(dx) + Math.abs(dy) < starR;
      };
    }
    // 生成 SIRDS：每行周期随机点（周期内点固定颜色，重复时同色 → 双目匹配成立），深度区域偏移 shift
    // 用红棕色调多色点，还原原版 6_5 截图的暗红棕斑纹质感
    const SIRDS_COLORS = ['#a03a2e', '#c96a3a', '#7a2e26', '#b5502f', '#8a4a2f'];
    for (let y = 0; y < h; y++) {
      const rowRnd = mulberry32(((Math.floor(seed * 1e5) + y * 131) >>> 0));
      const pts = [];
      const n = Math.max(5, Math.floor(T / 6));
      for (let i = 0; i < n; i++) {
        pts.push({ x: rowRnd() * T, c: SIRDS_COLORS[Math.floor(rowRnd() * SIRDS_COLORS.length)] });
      }
      for (let k = 0; k <= w / T; k++) {
        for (const p of pts) {
          const x = k * T + p.x;
          if (x > w) continue;
          const d = region(x, y) ? shift : 0;
          ctx.fillStyle = p.c;
          ctx.fillRect(x + d, y, 3, 3);
        }
      }
    }
    if (mode === 'anim') {
      // 动画模式：在球位置画一个小圆点做参考（可选）
      const bx = cx + Math.sin(t / 900) * w * 0.2;
      const by = cy + Math.cos(t / 1300) * h * 0.15;
      ctx.strokeStyle = 'rgba(251,191,36,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.stroke();
    }
  }

  /* 程序生成记忆图案 */
  function genPattern(ctx, x, y, size, seed) {
    const types = ['circle', 'rect', 'tri', 'star', 'ring', 'diamond'];
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
    const type = types[Math.floor(seed * 7.13) % types.length];
    const color = colors[Math.floor(seed * 13.7) % colors.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    switch (type) {
      case 'circle': ctx.beginPath(); ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2); ctx.fill(); break;
      case 'rect': ctx.fillRect(-size * 0.8, -size * 0.8, size * 1.6, size * 1.6); break;
      case 'tri':
        ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(-size * 0.87, size * 0.8); ctx.lineTo(size * 0.87, size * 0.8); ctx.closePath(); ctx.fill(); break;
      case 'star': {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 === 0 ? size : size * 0.45;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill(); break;
      }
      case 'ring': ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2); ctx.stroke(); break;
      case 'diamond':
        ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }

  /* ---------------- 照相记忆训练器 ---------------- */
  class PhotoTrainer extends SR.Trainer {
    constructor(opts) {
      super(opts);
      this.cw = 0; this.ch = 0;
      this.training = null;
      this.mandalaFilled = true;
      this.mandalaSeed = 0.3;
      this.mandalaVariant = 0;
      this.tricolorIdx = 0;        // 三色卡：当前颜色 0红/1黄/2蓝
      this.geomIdx = 0;            // 几何卡：当前形状 0圆/1方/2三角
      this.picIdx = 0;
      this.picTimer = 0;
      // 记忆训练状态
      this.memMode = 'find';       // find 文字找同 | pos 图片位置记忆
      this.memGrid = [];
      this.memSelected = null;
      this.memPairs = 0;
      this.memFound = 0;
      this.memReveal = false;      // 展示阶段
      this.memRevealT = 0;
      this.memFlip = [];           // 当前翻开
      this.memShown = [];          // 已匹配/已答对
      this.memTarget = -1;         // 图片位置记忆：当前要点的格子索引
      this.memDone = false;
      // 瞬间计算
      this.fcCount = 0;
      this.fcShow = false;
      this.fcTimer = 0;
      this.fcPhase = 'idle';
      this.fcAnswer = 0;
      this.fcMsg = '';
      this.fcMsgT = 0;
    }

    resize() {
      const { w, h } = Canvas.setup(this.canvas);
      this.cw = w; this.ch = h;
    }

    selectTraining(t) {
      this.training = t;
      this.setParams(defaultsOf(t));
      this.reset();
      this.resize();
      this._initType();
      this.draw();
    }

    applyParams(p) {
      this.setParams(p);
      this._initType();
      if (!this.running) this.draw();
    }

    _initType() {
      const t = this.training.type;
      this.mandalaSeed = Math.random() * Math.PI * 2;
      this.mandalaFilled = true;
      this.mandalaVariant = Math.floor(Math.random() * 23); // 23 张曼陀罗卡变体
      if (t === 'memory') this.initMemory();
      if (t === 'fastcalc') { this.fcPhase = 'idle'; this.fcShow = false; this.fcMsg = ''; }
    }

    initMemory() {
      this.memMode = this.params.memMode || 'find';
      if (this.memMode === 'find') {
        // 文字找同：6x6 网格，成对汉字
        const rows = 4, cols = 6, n = rows * cols;
        const pool = '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥天地人和春夏秋冬金木水火土风雷雨雪山水日月星云';
        const half = n / 2;
        let chars = [];
        for (let i = 0; i < half; i++) chars.push(pool[i % pool.length]);
        chars = chars.concat(chars.slice());
        // 洗牌
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        this.memGrid = chars.map((v, i) => ({ v, i, matched: false }));
        this.memPairs = half;
        this.memFound = 0;
        this.memFlip = [];
        this.memShown = [];
        this.memSelected = null;
      } else {
        // 图片位置记忆：难度 rows×cols（原版 2*2 → 8*4），每格一张不同图案
        // 流程：展示 N 秒记住位置 → 隐藏 → 逐张出图，点击其所在位置
        const rows = this.params.memRows || 3;
        const cols = this.params.memCols || 4;
        const n = Math.min(rows * cols, 32);
        const seeds = [];
        for (let i = 0; i < n; i++) seeds.push(i + 1);
        // 洗牌（位置随机）
        for (let i = seeds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
        }
        this.memGrid = seeds.map((s, i) => ({ seed: s, i, matched: false }));
        this.memPairs = n;
        this.memFound = 0;
        this.memFlip = [];
        this.memShown = [];
        this.memDone = false;
        this.memTarget = -1;
        this.memReveal = true;
        this.memRevealT = 0;
      }
    }

    /* 点击处理（记忆训练/瞬间计算） */
    handleClick(e) {
      const t = this.training.type;
      if (!this.running) return;
      if (t === 'memory') {
        if (this.memMode === 'pos' && this.memReveal) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const rows = this.memMode === 'find' ? 4 : 3;
        const cols = this.memMode === 'find' ? 6 : 4;
        const cellW = this.cw / cols, cellH = this.ch / rows;
        const ci = Math.floor(x / cellW), cj = Math.floor(y / cellH);
        if (ci < 0 || ci >= cols || cj < 0 || cj >= rows) return;
        const idx = cj * cols + ci;
        this.memClick(idx);
      } else if (t === 'fastcalc') {
        if (this.fcPhase === 'idle') {
          this.startFastCalc();
        } else if (this.fcPhase === 'question') {
          // 点击不处理，用选项
        } else if (this.fcPhase === 'feedback' && performance.now() - this.fcMsgT > 1000) {
          this.startFastCalc();
        }
      } else if (t === 'mandala') {
        this.mandalaFilled = !this.mandalaFilled;
        Sound.flip();
        if (!this.running) this.draw();
      }
    }

    memClick(idx) {
      const g = this.memGrid[idx];
      if (!g || g.matched) return;
      if (this.memFlip.includes(idx) || this.memShown.includes(idx)) return;
      if (this.memMode === 'find') {
        if (this.memFlip.length === 0) {
          this.memFlip = [idx];
          Sound.click();
        } else if (this.memFlip.length === 1) {
          this.memFlip.push(idx);
          const a = this.memGrid[this.memFlip[0]], b = this.memGrid[idx];
          if (a.v === b.v) {
            Sound.good();
            this.memFound++;
            this.memShown.push(this.memFlip[0], idx);
            this.memFlip = [];
            if (this.memFound >= this.memPairs) {
              this.memMsg = '完成！用时 ' + Math.floor(this.elapsed) + 's';
              Sound.done();
              this.memFlip = null;
              this.memDone = true;
            }
          } else {
            Sound.err();
            setTimeout(() => { this.memFlip = []; this.draw(); }, 500);
          }
        }
      } else {
        // 图片位置记忆：点击格子，判断是否为当前目标图案的位置
        const g = this.memGrid[idx];
        if (!g || g.matched) return;
        if (idx === this.memTarget) {
          g.matched = true;
          this.memShown.push(idx);
          Sound.good();
          this.memFound++;
          this.memTarget = -1;
          const remain = this.memGrid.filter(x => !x.matched);
          if (remain.length === 0) {
            this.memDone = true;
            Sound.done();
          } else {
            this.memTarget = remain[Math.floor(Math.random() * remain.length)].i;
            Sound.flip();
          }
        } else {
          Sound.err();
          this.memWrong = (this.memWrong || 0) + 1;
        }
      }
      if (!this.running) this.draw();
    }

    startFastCalc() {
      const p = this.params;
      const min = p.fcMin || 3, max = p.fcMax || 11;
      this.fcCount = min + Math.floor(Math.random() * (max - min + 1));
      this.fcShow = true;
      this.fcTimer = 0;
      this.fcPhase = 'show';
      Sound.flip();
    }

    update(dt) {
      const t = this.training.type;
      if (t === 'picview' && this.running) {
        this.picTimer += dt * 1000;
        if (this.picTimer >= 1500) {
          this.picTimer = 0;
          this.picIdx++;
          Sound.click();
        }
      } else if (t === 'memory') {
        if (this.memMode === 'pos' && this.memReveal) {
          this.memRevealT += dt * 1000;
          if (this.memRevealT >= (this.params.revealTime || 3000)) {
            this.memReveal = false;
            const remain = this.memGrid.filter(x => !x.matched);
            this.memTarget = remain.length ? remain[Math.floor(Math.random() * remain.length)].i : -1;
            this.memWrong = 0;
            Sound.flip();
          }
        }
      } else if (t === 'fastcalc' && this.running) {
        if (this.fcPhase === 'show') {
          this.fcTimer += dt * 1000;
          if (this.fcTimer >= 600) {
            this.fcShow = false;
            this.fcPhase = 'question';
            this.fcMsg = '';
          }
        }
      }
    }

    draw() {
      const { ctx, cw: w, ch: h, params: p } = this;
      if (!w || !h) return;
      const t = this.training.type;
      Canvas.clear(ctx, w, h, p.bg);
      switch (t) {
        case 'tricolor': this.drawTricolor(ctx, w, h); break;
        case 'geom': this.drawGeom(ctx, w, h); break;
        case 'yellow': this.drawYellow(ctx, w, h); break;
        case 'mandala': this.drawMandala(ctx, w, h); break;
        case 'card3d': this.drawCard3D(ctx, w, h); break;
        case 'picview': this.drawPicView(ctx, w, h); break;
        case 'memory': this.drawMemory(ctx, w, h); break;
        case 'fastcalc': this.drawFastCalc(ctx, w, h); break;
      }
      // 状态
      if (this.running || t === 'yellow' || t === 'tricolor' || t === 'geom' || t === 'mandala') {
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.fillText('速度 ×' + this.speedMul.toFixed(1) + ' · 时长 ' + Math.floor(this.elapsed) + 's', w - 16, 14);
      }
    }

    /* 计时残像卡公共：画卡 + 闭眼提示 */
    drawCardFrame(ctx, w, h, secs) {
      // 计时进度
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillText(Math.floor(secs) + 's', w - 16, 14);
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.font = '14px sans-serif';
      ctx.fillText('注视 ' + Math.max(0, Math.ceil(30 - secs)) + ' 秒后闭眼，观察残像', w / 2, h - 14);
    }

    drawTricolor(ctx, w, h) {
      // 原版：主区一张大纯色卡（当前颜色），点击切换红/黄/蓝
      const p = this.params;
      const colors = ['#ef4444', '#eab308', '#3b82f6'];
      const color = p.tricolorColor || colors[this.tricolorIdx % colors.length];
      // 主卡片（大色块，近似原版右侧大卡）
      ctx.fillStyle = color;
      ctx.fillRect(w * 0.06, h * 0.1, w * 0.88, h * 0.66);
      // 卡片边框
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.06, h * 0.1, w * 0.88, h * 0.66);
      // 底部小卡（切换预览：红黄蓝三个小色块）
      const sw = w * 0.1, sh = h * 0.09;
      const y0 = h * 0.84;
      const total = sw * 3 + 12 * 2;
      let x0 = (w - total) / 2;
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(x0, y0, sw, sh);
        if (i === this.tricolorIdx % colors.length) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(x0 - 2, y0 - 2, sw + 4, sh + 4);
        }
        x0 += sw + 12;
      });
      this.drawCardFrame(ctx, w, h, this.elapsed);
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(148,163,184,0.85)';
      ctx.fillText('点击下方小卡或按空格切换颜色', w / 2, h * 0.95 - 6);
    }

    drawGeom(ctx, w, h) {
      // 原版：主区一张大图形卡（当前形状），点击切换圆/方/三角
      const p = this.params;
      const shapes = ['circle', 'square', 'triangle'];
      const shape = p.geomShape || shapes[this.geomIdx % shapes.length];
      const cx = w / 2, cy = h * 0.44;
      const r = Math.min(w, h) * 0.2;
      // 白卡背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.66);
      ctx.strokeStyle = 'rgba(15,23,42,0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.12, h * 0.1, w * 0.76, h * 0.66);
      // 图形（深色）
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#1e293b';
      if (shape === 'circle') {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      } else if (shape === 'square') {
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      } else {
        ctx.beginPath(); ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx - r * 0.87, cy + r * 0.75);
        ctx.lineTo(cx + r * 0.87, cy + r * 0.75);
        ctx.closePath(); ctx.fill();
      }
      // 底部小形状预览（切换）
      const names = ['圆形', '方形', '三角'];
      const sw = w * 0.12, sh = h * 0.1;
      const y0 = h * 0.82;
      const total = sw * 3 + 12 * 2;
      let x0 = (w - total) / 2;
      shapes.forEach((s, i) => {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(x0, y0, sw, sh);
        if (i === this.geomIdx % shapes.length) {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3;
          ctx.strokeRect(x0 - 2, y0 - 2, sw + 4, sh + 4);
        }
        const sxp = x0 + sw / 2, syp = y0 + sh / 2, sr = Math.min(sw, sh) * 0.28;
        ctx.fillStyle = '#0f172a';
        if (s === 'circle') {
          ctx.beginPath(); ctx.arc(sxp, syp, sr, 0, Math.PI * 2); ctx.fill();
        } else if (s === 'square') {
          ctx.fillRect(sxp - sr, syp - sr, sr * 2, sr * 2);
        } else {
          ctx.beginPath(); ctx.moveTo(sxp, syp - sr);
          ctx.lineTo(sxp - sr * 0.87, syp + sr * 0.75);
          ctx.lineTo(sxp + sr * 0.87, syp + sr * 0.75);
          ctx.closePath(); ctx.fill();
        }
        x0 += sw + 12;
      });
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(148,163,184,0.85)';
      ctx.fillText(`当前：${names[this.geomIdx % shapes.length]} · 点击小图或按空格切换`, w / 2, h * 0.94 - 6);
      this.drawCardFrame(ctx, w, h, this.elapsed);
    }

    drawYellow(ctx, w, h) {
      const p = this.params;
      // 原版黄卡：黄色方卡（大卡片）
      ctx.fillStyle = p.yellow || '#ffaa01';
      ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.68);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.68);
      this.drawCardFrame(ctx, w, h, this.elapsed);
    }

    drawMandala(ctx, w, h) {
      const p = this.params;
      const r = Math.min(w, h) * 0.36;
      const color = p.mandalaColor || '#f97316';
      drawMandala(ctx, w / 2, h / 2, r, color, this.mandalaFilled, this.mandalaSeed, this.mandalaVariant);
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillText(this.mandalaFilled ? '单击切换为 不填充（回忆颜色）' : '单击切换为 填充（原色）', w / 2, h - 14);
    }

    drawCard3D(ctx, w, h) {
      const p = this.params;
      draw3D(ctx, w, h, p.mode3d || 'pic', this.mandalaSeed, this.elapsed);
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(148,163,184,0.9)';
      ctx.fillText('视线平行，注视图后方虚像', w / 2, h - 14);
    }

    drawPicView(ctx, w, h) {
      const p = this.params;
      const cx = w / 2, cy = h / 2;
      const size = Math.min(w, h) * 0.28;
      genPattern(ctx, cx, cy, size, this.picIdx + 0.5);
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillText('图案 ' + (this.picIdx + 1), w / 2, h - 14);
    }

    drawMemory(ctx, w, h) {
      const p = this.params;
      const rows = this.memMode === 'find' ? 4 : (this.params.memRows || 3);
      const cols = this.memMode === 'find' ? 6 : (this.params.memCols || 4);
      const cellW = w / cols, cellH = h / rows;
      if (!this.memGrid || this.memGrid.length === 0) return;

      if (this.memMode === 'find') {
        this.memGrid.forEach((g) => {
          const ci = g.i % cols, cj = Math.floor(g.i / cols);
          const x = ci * cellW, y = cj * cellH;
          const revealed = g.matched || this.memShown.includes(g.i) || this.memFlip.includes(g.i);
          ctx.fillStyle = revealed ? 'rgba(30,41,59,0.85)' : 'rgba(51,65,85,0.25)';
          ctx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);
          ctx.strokeStyle = 'rgba(148,163,184,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);
          if (revealed) {
            ctx.font = `bold ${Math.min(28, cellH * 0.5)}px "PingFang SC", sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = g.matched || this.memShown.includes(g.i) ? '#4ade80' : '#f1f5f9';
            ctx.fillText(g.v, x + cellW / 2, y + cellH / 2);
          }
        });
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText(`已找到 ${this.memFound}/${this.memPairs} 对`, 14, 14);
        if (this.memDone) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('全部找到！用时 ' + Math.floor(this.elapsed) + 's', w / 2, h / 2 - 16);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '15px sans-serif';
          ctx.fillText('点击任意位置重新开始', w / 2, h / 2 + 26);
        }
      } else {
        // 图片位置记忆：展示 → 隐藏 → 逐张出图点位置
        this.memGrid.forEach((g) => {
          const ci = g.i % cols, cj = Math.floor(g.i / cols);
          const x = ci * cellW, y = cj * cellH;
          const shown = this.memReveal || g.matched;
          if (shown) {
            genPattern(ctx, x + cellW / 2, y + cellH / 2, Math.min(cellW, cellH) * 0.3, g.seed * 0.7);
          } else {
            ctx.fillStyle = 'rgba(51,65,85,0.3)';
            ctx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);
          }
          ctx.strokeStyle = 'rgba(148,163,184,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);
        });
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        if (this.memReveal) {
          ctx.fillStyle = 'rgba(250,204,21,0.95)';
          ctx.font = '15px sans-serif';
          ctx.fillText(`记住每张图片的位置…（${Math.max(0, Math.ceil((this.params.revealTime || 3000) / 1000 - this.memRevealT / 1000))}s）`, 14, 12);
        } else if (this.memDone) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('全部答对！用时 ' + Math.floor(this.elapsed) + 's', w / 2, h / 2 - 16);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '15px sans-serif';
          ctx.fillText('点击任意位置重新开始', w / 2, h / 2 + 26);
        } else if (this.memTarget >= 0) {
          const tg = this.memGrid[this.memTarget];
          genPattern(ctx, 42, 38, 26, tg.seed * 0.7);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '14px sans-serif';
          ctx.fillText('这张图在哪个位置？点击格子作答', 78, 26);
          ctx.fillStyle = 'rgba(148,163,184,0.8)';
          ctx.font = '13px sans-serif';
          ctx.fillText(`已答对 ${this.memFound}/${this.memPairs} · 点错 ${this.memWrong || 0} 次`, 78, 48);
        } else {
          ctx.fillStyle = 'rgba(148,163,184,0.8)';
          ctx.font = '13px sans-serif';
          ctx.fillText('准备出题…', 14, 12);
        }
      }
    }

    drawFastCalc(ctx, w, h) {
      const p = this.params;
      if (this.fcPhase === 'show' && this.fcShow) {
        // 画点
        ctx.fillStyle = p.fg;
        for (let i = 0; i < this.fcCount; i++) {
          const x = w * 0.15 + Math.random() * w * 0.7;
          const y = h * 0.2 + Math.random() * h * 0.6;
          ctx.beginPath(); ctx.arc(x, y, 8 + Math.random() * 6, 0, Math.PI * 2); ctx.fill();
        }
      } else if (this.fcPhase === 'question') {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText('刚才有几个点？', w / 2, h * 0.25);
        // 选项
        const opts = this._fcOptions();
        const bw = Math.min(130, w * 0.16), bh = 64, gap = 14;
        const totalW = bw * 4 + gap * 3;
        const x0 = (w - totalW) / 2, y0 = h * 0.5;
        this._hitAreas = [];
        opts.forEach((v, i) => {
          const x = x0 + i * (bw + gap);
          ctx.fillStyle = 'rgba(30,41,59,0.9)';
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(x, y0, bw, bh);
          ctx.fillRect(x, y0, bw, bh);
          ctx.fillStyle = '#f1f5f9';
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText(String(v), x + bw / 2, y0 + bh / 2);
          this._hitAreas.push({ x, y: y0, w: bw, h: bh, val: v });
        });
      } else if (this.fcPhase === 'feedback') {
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = this.fcMsg.startsWith('✓') ? '#4ade80' : '#f87171';
        ctx.fillText(this.fcMsg, w / 2, h / 2 - 20);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('点击继续', w / 2, h / 2 + 30);
      } else {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText('点击开始', w / 2, h / 2);
      }
    }

    _fcOptions() {
      const set = new Set([this.fcCount]);
      while (set.size < 4) {
        set.add(this.fcCount + Math.floor(Math.random() * 9) - 4);
      }
      return [...set].sort((a, b) => a - b);
    }

    fcChoose(val) {
      if (this.fcPhase !== 'question') return;
      if (val === this.fcCount) {
        this.fcMsg = '✓ 正确！';
        Sound.good();
      } else {
        this.fcMsg = '✗ 实际是 ' + this.fcCount;
        Sound.err();
      }
      this.fcPhase = 'feedback';
      this.fcMsgT = performance.now();
    }

    handleClick(e) {
      const t = this.training.type;
      // 三色卡/几何卡：训练中也可点击切换（换一种颜色/形状继续练习）
      if (t === 'tricolor') {
        this.tricolorIdx++;
        Sound.flip();
        if (!this.running) this.draw();
        return;
      }
      if (t === 'geom') {
        this.geomIdx++;
        Sound.flip();
        if (!this.running) this.draw();
        return;
      }
      if (!this.running) return;
      if (t === 'memory') {
        if (this.memMode === 'pos' && this.memReveal) return;
        if (this.memDone) {
          this.initMemory();
          return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const rows = this.memMode === 'find' ? 4 : (this.params.memRows || 3);
        const cols = this.memMode === 'find' ? 6 : (this.params.memCols || 4);
        const cellW = this.cw / cols, cellH = this.ch / rows;
        const ci = Math.floor(x / cellW), cj = Math.floor(y / cellH);
        if (ci < 0 || ci >= cols || cj < 0 || cj >= rows) return;
        this.memClick(cj * cols + ci);
      } else if (t === 'fastcalc') {
        if (this.fcPhase === 'idle') {
          this.startFastCalc();
        } else if (this.fcPhase === 'question' && this._hitAreas) {
          const rect = this.canvas.getBoundingClientRect();
          const x = e.clientX - rect.left, y = e.clientY - rect.top;
          for (const a of this._hitAreas) {
            if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) {
              this.fcChoose(a.val);
              return;
            }
          }
        } else if (this.fcPhase === 'feedback' && performance.now() - this.fcMsgT > 800) {
          this.startFastCalc();
        }
      } else if (t === 'mandala') {
        this.mandalaFilled = !this.mandalaFilled;
        Sound.flip();
        if (!this.running) this.draw();
      }
    }
  }

  function defaultsOf(t) {
    return {
      fg: '#ffffff', bg: '#000000',
      yellow: '#fde047', mandalaColor: '#f97316',
      mode3d: 'pic',
      memMode: 'find', revealTime: 3000,
      fcMin: 3, fcMax: 11
    };
  }

  function paramDefsOf(t) {
    const base = [
      { key: 'bg', label: '背景色', type: 'color', def: '#000000' }
    ];
    switch (t.type) {
      case 'yellow':
        base.push({ key: 'yellow', label: '黄卡颜色', type: 'color', def: '#fde047' });
        break;
      case 'mandala':
        base.push({ key: 'mandalaColor', label: '曼陀罗颜色', type: 'color', def: '#f97316' });
        break;
      case 'card3d':
        base.push({ key: 'mode3d', label: '显示方式', type: 'select', def: 'pic', options: [['pic', '图片'], ['txt', '3D文字'], ['anim', '动画']] });
        break;
      case 'memory':
        base.push(
          { key: 'memMode', label: '训练类型', type: 'select', def: 'find', options: [['find', '文字找同'], ['pos', '图片位置记忆']] },
          { key: 'revealTime', label: '位置记忆展示时间(ms)', type: 'range', min: 1000, max: 8000, step: 500, def: 3000 },
          { key: 'memRows', label: '网格行数(2-8)', type: 'range', min: 2, max: 8, step: 1, def: 3 },
          { key: 'memCols', label: '网格列数(2-4)', type: 'range', min: 2, max: 4, step: 1, def: 4 }
        );
        break;
      case 'fastcalc':
        base.push(
          { key: 'fcMin', label: '最少点数', type: 'range', min: 2, max: 8, def: 3 },
          { key: 'fcMax', label: '最多点数', type: 'range', min: 6, max: 20, def: 11 }
        );
        break;
    }
    return base;
  }

  /* ---------------- 页面初始化 ---------------- */
  function init() {
    const canvas = $('#canvas');
    const stage = $('#stage');
    const trainer = new PhotoTrainer({ canvas });

    const listEl = $('#trainList');
    TRAININGS.forEach(t => {
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
      $$('.sr-train-item').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      trainer.selectTraining(t);
      nameEl.textContent = t.name;
      methodBox.innerHTML = `<b>训练方法：</b>${t.method}`;
      const defs = paramDefsOf(t);
      SR.buildParamPanel(paramPanel, defs, null, () => {
        trainer.applyParams(SR.readParams(paramPanel, defs));
      });
    }

    SR.buildControls($('#controls'), trainer);
    SR.bindKeyboard(trainer);
    canvas.addEventListener('click', e => trainer.handleClick(e));

    const ro = new ResizeObserver(() => {
      trainer.resize();
      if (!trainer.running) trainer.draw();
    });
    ro.observe(stage);

    const first = listEl.querySelector('.sr-train-item[data-id]');
    if (first) select(TRAININGS[0], first);

    // 支持 URL ?train=id 直接选中（训练计划执行器使用）
    const urlTrain = new URLSearchParams(location.search).get('train');
    if (urlTrain) {
      const btn = listEl.querySelector(`[data-id="${urlTrain}"]`);
      if (btn) btn.click();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
