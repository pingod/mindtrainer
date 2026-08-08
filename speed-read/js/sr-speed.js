/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 速读训练引擎（4 模块）
 * 字块移动 / 视野扩展 / 阅读训练 / 实战训练
 * 支持：文章来源（内置/剪贴板/自定）、竖排、倒立、眼停眼跳
 * ============================================================ */
(function () {
  'use strict';
  const SR = window.SR;
  const { $, $$, Store, Sound, Canvas, Color } = SR;

  const ARTICLES = {
    '励志篇': '一个人至少拥有一个梦想，有一个理由去坚强。心若没有栖息的地方，到哪里都是在流浪。不管前方的路有多苦，只要走的方向正确，不管多么崎岖不平，都比站在原地更接近幸福。人生最精彩的不是实现梦想的瞬间，而是坚持梦想的过程。',
    '时间篇': '时间是一条奔流不息的长河，我们每个人都是河中的一粒沙。与其感叹时光易逝，不如把握当下，让每一分钟都过得充实而有意义。盛年不重来，一日难再晨，及时当勉励，岁月不待人。',
    '专注篇': '专注是一种能力，更是一种习惯。当你把全部注意力放在一件事上时，世界仿佛都安静下来，效率也随之翻倍。心无旁骛，方能致远。每一次专注，都是对大脑的一次锻炼。',
    '速读篇': '速读不是单纯地看得快，而是让眼睛的移动更有效率，让大脑的理解更迅速。视野决定速度，理解决定高度。通过系统训练，让阅读成为一种享受，让知识源源不断流入大脑。'
  };

  const TRAININGS = [
    { id: 'text_move', name: '字块移动', type: 'text_move', num: 1,
      method: '配置好字块的移动方式后即可开始练习。练习中视点要随着字块的移动而准确跳动，并使看到的文字清晰映入眼帘，在保证眼跳频率一定的前提下尝试理解字块内容。',
      defMode: 'h' },
    { id: 'vision_expand', name: '视野扩展', type: 'vision_expand', num: 2,
      method: '练习中两眼平视，视点自上而下。镜像阅读时，注意力集中于两侧整幅文字；两侧运动时，视野随着文字的展开而扩大；逐字显示时，感知最外围出现的文字。',
      defMode: 'mirror' },
    { id: 'read_train', name: '阅读训练', type: 'read_train', num: 3,
      method: '视点随着闪现的一行或几行文字自上而下均匀跳动，在保证眼跳频率一定的前提下尝试理解文字内容。这是飞克视读 1.3x 的经典训练方法。',
      defMode: 'line' },
    { id: 'combat', name: '实战训练', type: 'combat', num: 4,
      method: '视点随着闪现的一行或几行文字自上而下均匀跳动。此训练接近一般的书本阅读，调整显示宽度可实现书、报纸、杂志的排版，还提供文字竖排功能。',
      defMode: 'page' }
  ];

  /* 将文章切成行块 */
  function splitLines(text, charsPerLine) {
    const clean = text.replace(/\s+/g, '');
    const lines = [];
    for (let i = 0; i < clean.length; i += charsPerLine) {
      lines.push(clean.slice(i, i + charsPerLine));
    }
    return lines;
  }

  /* ---------------- 速读训练器 ---------------- */
  class SpeedTrainer extends SR.Trainer {
    constructor(opts) {
      super(opts);
      this.cw = 0; this.ch = 0;
      this.training = null;
      this.lines = [];
      this.lineIdx = 0;
      this.progress = 0;          // 行内进度 0-1
      this.source = '';           // 当前文章
      this.articleName = '励志篇';
      this.eyestopT = 0;
      this.eyemoveT = 0;
      this.phase = 'idle';        // idle | run | done
    }

    resize() {
      const { w, h } = Canvas.setup(this.canvas);
      this.cw = w; this.ch = h;
    }

    selectTraining(t) {
      this.training = t;
      this.setParams(defaultsOf(t));
      this.setArticle(this.articleName);
      this.reset();
      this.resize();
      this.draw();
    }

    setArticle(name) {
      this.articleName = name;
      this.source = ARTICLES[name] || '';
      this.rebuildLines();
    }

    setCustomText(text) {
      this.source = text || '';
      this.articleName = 'custom';
      this.rebuildLines();
    }

    rebuildLines() {
      const p = this.params;
      const perLine = Math.max(3, Math.round(p.lineWidth / (p.fontsize || 32) * 2));
      this.lines = splitLines(this.source, perLine);
      if (this.lines.length === 0) this.lines = ['（请先输入文章或选择文章来源）'];
      this.lineIdx = 0;
      this.progress = 0;
      this.eyestopT = 0;
      this.eyemoveT = 0;
      this.phase = 'idle';
    }

    applyParams(p) {
      this.setParams(p);
      this.rebuildLines();
      if (!this.running) this.draw();
    }

    start() {
      if (this.running) return;
      this.rebuildLines();
      this.phase = 'run';
      super.start();
    }

    update(dt) {
      if (!this.running || this.phase !== 'run') return;
      const p = this.params;
      const t = this.training.type;

      if (t === 'text_move') {
        // 字块沿路线移动：progress 0->1 移动一行字块
        this.progress += dt * (p.speed / 60);
        if (this.progress >= 1) {
          this.progress = 0;
          this.lineIdx++;
          if (this.lineIdx >= this.lines.length) this.lineIdx = 0;
        }
      } else if (t === 'vision_expand') {
        this.progress += dt * (p.speed / 60);
        if (this.progress >= 1) { this.progress = 0; this.lineIdx++; if (this.lineIdx >= this.lines.length) this.lineIdx = 0; }
      } else if (t === 'read_train' || t === 'combat') {
        // 眼停 + 眼跳：眼停时间显示当前行，眼跳时间过渡
        const stopMs = Math.max(50, p.eyestop * 10);
        const moveMs = Math.max(20, p.eyemove * 10);
        if (this.phase === 'run') {
          this.eyestopT += dt * 1000;
          if (this.eyestopT >= stopMs) {
            this.eyestopT = 0;
            this.eyemoveT += dt * 1000;
            // 眼跳动画简化：直接切行
            this.lineIdx++;
            if (this.lineIdx >= this.lines.length) {
              this.lineIdx = 0;
              if (this.elapsed > 2 && p.timer > 0 && this.elapsed >= p.timer) {
                this.phase = 'done';
                this.stop();
                Sound.done();
              }
            }
          }
        }
      }
    }

    draw() {
      const { ctx, cw: w, ch: h, params: p } = this;
      if (!w || !h) return;
      Canvas.clear(ctx, w, h, p.bg);
      const t = this.training.type;
      if (t === 'text_move') this.drawTextMove(ctx, w, h);
      else if (t === 'vision_expand') this.drawVisionExpand(ctx, w, h);
      else if (t === 'read_train') this.drawReadTrain(ctx, w, h);
      else if (t === 'combat') this.drawCombat(ctx, w, h);

      // 状态栏
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.fillText(`行 ${Math.min(this.lines.length, this.lineIdx + 1)}/${this.lines.length}`, 16, 14);
      ctx.textAlign = 'right';
      ctx.fillText('速度 ×' + this.speedMul.toFixed(1) + ' · 时长 ' + Math.floor(this.elapsed) + 's', w - 16, 14);

      if (this.lines.length === 0) {
        ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText('请在右侧输入文章', w / 2, h / 2);
      }
    }

    /* ---- 字块移动 ---- */
    drawTextMove(ctx, w, h) {
      const p = this.params;
      const line = this.lines[this.lineIdx] || '';
      const fs = p.fontsize;
      const textW = line.length * fs;
      const maxX = w - textW - 20;
      const mode = p.moveMode || 'h';
      let x = 20, y = h / 2;
      if (mode === 'h') {
        x = 20 + (maxX - 20) * this.progress;
      } else if (mode === 'v') {
        x = w / 2 - textW / 2;
        y = 30 + (h - 60) * this.progress;
      } else if (mode === 'zigzag') {
        x = 20 + (maxX - 20) * this.progress;
        y = h / 2 + Math.sin(this.progress * Math.PI * 4) * h * 0.28;
      }
      ctx.save();
      if (p.upsidedown) {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = p.fg;
      if (p.verticalText) {
        // 竖排
        ctx.textAlign = 'center';
        line.split('').forEach((ch, i) => {
          ctx.fillText(ch, x + fs / 2, y - (line.length / 2 - i) * fs * 1.2);
        });
      } else {
        ctx.fillText(line, x, y);
      }
      ctx.restore();
      // 视线引导线（水平模式）
      if (mode === 'h') {
        ctx.strokeStyle = Color.rgba(p.fg, 0.15);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      }
    }

    /* ---- 视野扩展：mirror 镜像 / sides 两侧 / char 逐字 ---- */
    drawVisionExpand(ctx, w, h) {
      const p = this.params;
      const line = this.lines[this.lineIdx] || '';
      const fs = p.fontsize;
      const mode = p.visionMode || 'mirror';
      const midW = p.midWidth || Math.max(60, w * 0.18);
      const half = (w - midW) / 2;
      const cy = h / 2;
      ctx.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = p.fg;

      if (mode === 'mirror') {
        // 镜像阅读：左右两组文字，中间留空隙
        const left = line.slice(0, Math.ceil(line.length / 2));
        const right = line.slice(Math.ceil(line.length / 2));
        ctx.fillText(left, half / 2, cy);
        ctx.fillText(right, w - half / 2, cy);
        // 中间空隙标注
        ctx.strokeStyle = Color.rgba(p.fg, 0.2);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(half, cy - h * 0.3); ctx.lineTo(half, cy + h * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - half, cy - h * 0.3); ctx.lineTo(w - half, cy + h * 0.3); ctx.stroke();
      } else if (mode === 'sides') {
        // 两侧运动：文字从两侧向中间展开
        const chars = line.split('');
        const n = chars.length;
        const spread = Math.min(w / 2, (this.progress * 2) * (half / 1.6) + 20);
        chars.forEach((ch, i) => {
          const ratio = (i + 0.5) / n;
          const dx = ratio * spread;
          ctx.fillText(ch, w / 2 - dx, cy);
          ctx.fillText(ch, w / 2 + dx, cy);
        });
        ctx.strokeStyle = Color.rgba(p.fg, 0.2);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(w / 2, cy - h * 0.3); ctx.lineTo(w / 2, cy + h * 0.3); ctx.stroke();
      } else {
        // 逐字显示：最外围字出现
        const chars = line.split('');
        const n = chars.length;
        const showCount = Math.max(1, Math.floor(this.progress * n));
        const step = Math.min(w * 0.8, n * fs) / Math.max(1, n - 1);
        chars.forEach((ch, i) => {
          if (i < showCount) {
            ctx.fillText(ch, w / 2 - (n - 1) / 2 * step + i * step, cy);
          }
        });
      }
    }

    /* ---- 阅读训练：行块自上而下闪现 ---- */
    drawReadTrain(ctx, w, h) {
      const p = this.params;
      const fs = p.fontsize;
      const displayLines = p.displayLines || 1;
      const midY = h / 2;
      // 显示当前行（可多行）
      ctx.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = p.fg;
      for (let k = 0; k < displayLines; k++) {
        const idx = (this.lineIdx + k) % this.lines.length;
        ctx.fillText(this.lines[idx] || '', w / 2, midY + (k - (displayLines - 1) / 2) * fs * 1.6);
      }
      // 引导线
      ctx.strokeStyle = Color.rgba(p.fg, 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();
    }

    /* ---- 实战训练：模拟书刊排版（多列 + 竖排） ---- */
    drawCombat(ctx, w, h) {
      const p = this.params;
      const fs = p.fontsize;
      const displayLines = p.displayLines || 1;
      ctx.save();
      if (p.upsidedown) {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = p.fg;
      if (p.verticalText) {
        // 竖排：一列一列从上往下，每列从右到左
        const colH = Math.floor((h - 40) / (fs * 1.5));
        const totalChars = this.lines.length * (p.lineWidth / (fs * 2));
        const cols = Math.max(1, Math.floor(totalChars / colH));
        for (let c = 0; c < cols; c++) {
          const x = w - 30 - c * fs * 2.2;
          for (let r = 0; r < colH; r++) {
            const charIdx = c * colH + r;
            const lineIdx = Math.floor(charIdx / Math.max(1, Math.round(p.lineWidth / (fs * 2))));
            const ch = this.lines[lineIdx] ? this.lines[lineIdx][charIdx % Math.max(1, Math.round(p.lineWidth / (fs * 2)))] : '';
            if (ch) ctx.fillText(ch, x, 30 + r * fs * 1.5);
          }
        }
      } else {
        // 横向书刊：显示多行，高亮当前行
        const linesPerPage = Math.floor((h - 60) / (fs * 1.8));
        const startIdx = Math.max(0, this.lineIdx - Math.floor(displayLines / 2));
        for (let k = 0; k < linesPerPage; k++) {
          const idx = startIdx + k;
          if (idx >= this.lines.length) break;
          const isCur = idx === this.lineIdx;
          ctx.fillStyle = isCur ? p.fg : Color.rgba(p.fg, 0.5);
          ctx.fillText(this.lines[idx], w / 2, 30 + k * fs * 1.8);
        }
      }
      ctx.restore();
    }
  }

  function defaultsOf(t) {
    return {
      fg: '#ffffff', bg: '#000000', fontsize: 28,
      lineWidth: 5500, displayLines: 1, speed: 30,
      eyestop: 20, eyemove: 5, timer: 0,
      midWidth: 120, upsidedown: false, verticalText: false,
      moveMode: 'h', visionMode: 'mirror'
    };
  }

  function paramDefsOf(t) {
    const base = [
      { key: 'fg', label: '前景色', type: 'color', def: '#ffffff' },
      { key: 'bg', label: '背景色', type: 'color', def: '#000000' },
      { key: 'fontsize', label: '字体大小', type: 'range', min: 14, max: 64, def: 28 },
      { key: 'lineWidth', label: '每行宽度', type: 'range', min: 500, max: 9000, step: 100, def: 5500 },
      { key: 'displayLines', label: '显示行数', type: 'range', min: 1, max: 8, def: 1 }
    ];
    if (t.type === 'text_move') {
      base.push(
        { key: 'moveMode', label: '移动方式', type: 'select', def: 'h', options: [['h', '水平'], ['v', '垂直'], ['zigzag', '锯齿']] },
        { key: 'speed', label: '移动速度', type: 'range', min: 5, max: 200, def: 30 },
        { key: 'verticalText', label: '文字竖排', type: 'check', def: false },
        { key: 'upsidedown', label: '页面倒立', type: 'check', def: false }
      );
    } else if (t.type === 'vision_expand') {
      base.push(
        { key: 'visionMode', label: '移动方式', type: 'select', def: 'mirror', options: [['mirror', '镜像阅读'], ['sides', '两侧运动'], ['char', '逐字显示']] },
        { key: 'midWidth', label: '中间宽度', type: 'range', min: 20, max: 400, def: 120 },
        { key: 'speed', label: '移动速度', type: 'range', min: 5, max: 200, def: 30 },
        { key: 'verticalText', label: '文字竖排', type: 'check', def: false }
      );
    } else if (t.type === 'read_train') {
      base.push(
        { key: 'eyestop', label: '眼停时间', type: 'range', min: 5, max: 80, def: 20 },
        { key: 'eyemove', label: '眼跳时间', type: 'range', min: 0, max: 30, def: 5 },
        { key: 'timer', label: '训练定时(秒,0关)', type: 'range', min: 0, max: 300, step: 10, def: 0 },
        { key: 'verticalText', label: '文字竖排', type: 'check', def: false },
        { key: 'upsidedown', label: '页面倒立', type: 'check', def: false }
      );
    } else if (t.type === 'combat') {
      base.push(
        { key: 'eyestop', label: '眼停时间', type: 'range', min: 5, max: 80, def: 20 },
        { key: 'eyemove', label: '眼跳时间', type: 'range', min: 0, max: 30, def: 5 },
        { key: 'timer', label: '训练定时(秒,0关)', type: 'range', min: 0, max: 300, step: 10, def: 0 },
        { key: 'verticalText', label: '文字竖排', type: 'check', def: false },
        { key: 'upsidedown', label: '页面倒立', type: 'check', def: false }
      );
    }
    return base;
  }

  /* ---------------- 页面初始化 ---------------- */
  function init() {
    const canvas = $('#canvas');
    const stage = $('#stage');
    const trainer = new SpeedTrainer({ canvas });

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
    const articlePanel = $('#articlePanel');

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

    // 文章面板
    if (articlePanel) {
      const sel = document.createElement('select');
      sel.id = 'articleSelect';
      sel.className = 'sr-article-select';
      Object.keys(ARTICLES).forEach(k => {
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = k;
        sel.appendChild(opt);
      });
      const customOpt = document.createElement('option');
      customOpt.value = 'custom'; customOpt.textContent = '自定义文本';
      sel.appendChild(customOpt);
      sel.addEventListener('change', () => {
        if (sel.value === 'custom') {
          textarea.style.display = '';
          trainer.setCustomText(textarea.value);
        } else {
          textarea.style.display = 'none';
          trainer.setArticle(sel.value);
        }
        if (!trainer.running) trainer.draw();
      });
      articlePanel.appendChild(sel);

      const textarea = document.createElement('textarea');
      textarea.id = 'articleText';
      textarea.className = 'sr-article-text';
      textarea.placeholder = '粘贴或输入要训练的文章…';
      textarea.rows = 6;
      textarea.style.display = 'none';
      textarea.addEventListener('input', () => {
        if (sel.value === 'custom') {
          trainer.setCustomText(textarea.value);
          if (!trainer.running) trainer.draw();
        }
      });
      articlePanel.appendChild(textarea);

      const clipBtn = document.createElement('button');
      clipBtn.type = 'button';
      clipBtn.className = 'sr-btn';
      clipBtn.textContent = '📋 读取剪贴板';
      clipBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            sel.value = 'custom';
            textarea.style.display = '';
            textarea.value = text;
            trainer.setCustomText(text);
            if (!trainer.running) trainer.draw();
            SR.Sound.ok();
          }
        } catch (e) {
          SR.Sound.err();
        }
      });
      articlePanel.appendChild(clipBtn);
    }

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
