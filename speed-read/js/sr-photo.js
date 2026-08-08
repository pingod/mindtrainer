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

  /* 曼陀罗生成：对称花瓣图案 */
  function drawMandala(ctx, cx, cy, r, color, filled, seed) {
    ctx.save();
    ctx.translate(cx, cy);
    // 外圆环
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();
    // 花瓣（12 瓣）
    const petals = 12;
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 + seed;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = filled ? color : 'transparent';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r * 0.36, 0, r * 0.34, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // 内圆
    ctx.fillStyle = filled ? color : 'transparent';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* 3D 图：随机点 + 中央图案视差偏移（简易 SIRDS 风格，纯绘制实现） */
  function draw3D(ctx, w, h, mode, seed, t) {
    // 背景随机点
    const pts = [];
    const n = Math.floor(w * h / 350);
    for (let i = 0; i < n; i++) {
      pts.push({ x: Math.floor(Math.random() * w), y: Math.floor(Math.random() * h) });
    }
    ctx.fillStyle = '#94a3b8';
    pts.forEach(p => ctx.fillRect(p.x, p.y, 2, 2));
    // 中央区域视差：区域内点向右偏移 depth，制造"浮起"感
    const cx = w / 2, cy = h / 2;
    const boxW = Math.min(w * 0.5, 420), boxH = Math.min(h * 0.6, 320);
    const x0 = cx - boxW / 2, y0 = cy - boxH / 2;
    ctx.fillStyle = '#e2e8f0';
    pts.forEach(p => {
      if (p.x >= x0 && p.x <= x0 + boxW && p.y >= y0 && p.y <= y0 + boxH) {
        ctx.fillRect(p.x + 14, p.y, 2, 2);  // 右移 14px 的点形成视差
      }
    });
    // 中央区域边框
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, boxW, boxH);
    if (mode === 'txt') {
      // 3D 文字叠加
      ctx.font = `bold ${Math.min(80, w * 0.12)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('立 体', cx, cy);
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('3D', cx, cy + 60);
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
      this.memShown = [];          // 已匹配
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
        // 图片位置记忆：4x3 网格，成对图案，先展示 3 秒
        const rows = 3, cols = 4, n = rows * cols;
        const half = n / 2;
        let seeds = [];
        for (let i = 0; i < half; i++) seeds.push(i + 1);
        seeds = seeds.concat(seeds.slice());
        for (let i = seeds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
        }
        this.memGrid = seeds.map((s, i) => ({ seed: s, i, matched: false }));
        this.memPairs = half;
        this.memFound = 0;
        this.memFlip = [];
        this.memShown = [];
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
        // 图片位置
        if (this.memFlip.length === 0) {
          this.memFlip = [idx];
          Sound.click();
        } else if (this.memFlip.length === 1) {
          this.memFlip.push(idx);
          const a = this.memGrid[this.memFlip[0]], b = this.memGrid[idx];
          if (a.seed === b.seed) {
            Sound.good();
            this.memFound++;
            this.memShown.push(this.memFlip[0], idx);
            this.memFlip = [];
            if (this.memFound >= this.memPairs) {
              Sound.done();
              this.memFlip = null;
              this.memDone = true;
            }
          } else {
            Sound.err();
            setTimeout(() => { this.memFlip = []; this.draw(); }, 500);
          }
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
      const cw = w / 3, ch = h * 0.8;
      const y0 = (h - ch) / 2;
      ctx.fillStyle = '#ef4444'; ctx.fillRect(0, y0, cw, ch);
      ctx.fillStyle = '#eab308'; ctx.fillRect(cw, y0, cw, ch);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(cw * 2, y0, cw, ch);
      this.drawCardFrame(ctx, w, h, this.elapsed);
    }

    drawGeom(ctx, w, h) {
      const cw = w / 3, cy = h / 2, r = Math.min(cw, h) * 0.25;
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(cw / 2, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cw * 1.5 - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(cw * 2.5, cy - r);
      ctx.lineTo(cw * 2.5 - r * 0.87, cy + r * 0.75);
      ctx.lineTo(cw * 2.5 + r * 0.87, cy + r * 0.75);
      ctx.closePath(); ctx.fill();
      this.drawCardFrame(ctx, w, h, this.elapsed);
    }

    drawYellow(ctx, w, h) {
      const p = this.params;
      const r = Math.min(w, h) * 0.3;
      ctx.fillStyle = p.yellow || '#fde047';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.fill();
      this.drawCardFrame(ctx, w, h, this.elapsed);
    }

    drawMandala(ctx, w, h) {
      const p = this.params;
      const r = Math.min(w, h) * 0.36;
      const color = p.mandalaColor || '#f97316';
      drawMandala(ctx, w / 2, h / 2, r, color, this.mandalaFilled, this.mandalaSeed);
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
      const rows = this.memMode === 'find' ? 4 : 3;
      const cols = this.memMode === 'find' ? 6 : 4;
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
        // 图片位置记忆
        this.memGrid.forEach((g) => {
          const ci = g.i % cols, cj = Math.floor(g.i / cols);
          const x = ci * cellW, y = cj * cellH;
          const shown = this.memReveal || this.memShown.includes(g.i) || this.memFlip.includes(g.i);
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
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = this.memReveal ? 'rgba(250,204,21,0.9)' : 'rgba(148,163,184,0.8)';
        ctx.fillText(this.memReveal ? '记住每张图片的位置…' : `已找到 ${this.memFound}/${this.memPairs} 对`, w / 2, 10);
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
      if (!this.running) return;
      const t = this.training.type;
      if (t === 'memory') {
        if (this.memMode === 'pos' && this.memReveal) return;
        if (this.memDone) {
          this.initMemory();
          return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const rows = this.memMode === 'find' ? 4 : 3;
        const cols = this.memMode === 'find' ? 6 : 4;
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
        base.push({ key: 'mode3d', label: '显示方式', type: 'select', def: 'pic', options: [['pic', '图片'], ['txt', '3D文字']] });
        break;
      case 'memory':
        base.push(
          { key: 'memMode', label: '训练类型', type: 'select', def: 'find', options: [['find', '文字找同'], ['pos', '图片位置记忆']] },
          { key: 'revealTime', label: '位置记忆展示时间(ms)', type: 'range', min: 1000, max: 8000, step: 500, def: 3000 }
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
