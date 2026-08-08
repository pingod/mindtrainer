/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 闪视训练引擎（7 项）
 * 数字/字母/随机汉字/组合/文章/图片闪视
 * 支持：测试题 / 回放 / 手动显示 / 字数自动变化 / 文字旋转
 * ============================================================ */
(function () {
  'use strict';
  const SR = window.SR;
  const { $, $$, Store, Sound, Canvas, Color } = SR;

  /* 内置文章库 */
  const ARTICLES = {
    '励志篇': '一个人至少拥有一个梦想，有一个理由去坚强。心若没有栖息的地方，到哪里都是在流浪。不管前方的路有多苦，只要走的方向正确，不管多么崎岖不平，都比站在原地更接近幸福。',
    '时间篇': '时间是一条奔流不息的长河，我们每个人都是河中的一粒沙。与其感叹时光易逝，不如把握当下，让每一分钟都过得充实而有意义。',
    '专注篇': '专注是一种能力，更是一种习惯。当你把全部注意力放在一件事上时，世界仿佛都安静下来，效率也随之翻倍。',
    '速读篇': '速读不是单纯地看得快，而是让眼睛的移动更有效率，让大脑的理解更迅速。视野决定速度，理解决定高度。'
  };

  const TRAININGS = [
    { id: 'flash_num', name: '数字闪视', type: 'num', num: 1,
      method: '将视点放在窗口正中心，闪视一串数字后立即回想，力求在最短时间内记住最多的数字。可配合测试题检测短时记忆，文字倾斜加强眼脑直映。',
      article: null },
    { id: 'flash_alpha', name: '字母闪视', type: 'alpha', num: 2,
      method: '同数字闪视，闪视一串字母后立即回想。',
      article: null },
    { id: 'flash_cn', name: '随机汉字闪视', type: 'cn', num: 3,
      method: '闪视一串汉字后立即回想。汉字选自整个字库，一部分不认识，这样大大消除了音读的可能。',
      article: null },
    { id: 'flash_mix', name: '组合闪视', type: 'mix', num: 4,
      method: '闪视一串文字后立即回想，此方法能强烈抑制音读。',
      article: null },
    { id: 'flash_article', name: '文章闪视', type: 'article', num: 5,
      method: '闪视的句子选自文章，有一定的含义，闪视后应能立即理解此句话的意思。可在下方选择文章来源。',
      article: '励志篇' },
    { id: 'flash_pic', name: '图片闪视', type: 'pic', num: 6,
      method: '将视点放在窗口正中心，闪视图片后应能回忆出图片和它的位置。可开启测试题检测短时记忆。',
      article: null }
  ];

  const CN_POOL = '的了在是和有这中大来上个国人你他为我不们到说时要就出会也可下自以之过没有那得于着去里后看生好能多月天如然从成当事对心发进分还前所起又方种面部把但方法学样年向行经现最此水开手使因理合光明工力点二其长实定三如表重问全机法比或与四同直知代将第物指接真被解论完更没等作没北加即两教特义交力好次通做名想知界明斯持相' +
      '风量你白己些受观变程教条别深声打度片才必走般转看界土志立命回单然件期如原活使又气多决正先由想切其程平带流华少入结产多调万将发南整主话解石场变算带信面油几转计千具众治写内改引观按很务际志指证劳平素集飞克视读速读记忆训练右脑开发一目十行过目不忘视野扩展眼球运动';

  /* ---------------- 闪视训练器 ---------------- */
  class FlashTrainer extends SR.Trainer {
    constructor(opts) {
      super(opts);
      this.cw = 0; this.ch = 0;
      this.training = null;
      // 状态机
      this.phase = 'idle';      // idle | show | hide | replay | test | wait_click
      this.phaseT = 0;
      this.content = '';        // 当前闪现内容
      this.picItems = null;     // 图片闪视项目
      this.picAnswer = null;    // 图片闪视答案
      this.round = 0;
      this.correct = 0;
      this.total = 0;
      this.options = [];
      this.testType = 'which';  // which: 哪个字符出现 / pos: 位置 / order: 顺序 / pic: 图片位置
      this.testPrompt = '';
      this.selected = -1;
      this.autoGrow = false;
      this.charCount = 0;
      this.busy = false;
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
      this.draw();
    }

    applyParams(p) {
      this.setParams(p);
      if (!this.running) this.draw();
    }

    /* 生成一轮闪视内容 */
    genRound() {
      const p = this.params;
      const t = this.training.type;
      if (t === 'pic') return this.genPics();
      // 字数：基础 + 自动增长
      let count = p.startCount;
      if (p.autoGrow && this.round > 0) {
        count = Math.min(p.maxCount, count + Math.floor(this.round / 2));
      }
      this.charCount = count;
      switch (t) {
        case 'num': {
          let s = '';
          for (let i = 0; i < count; i++) s += Math.floor(Math.random() * 10);
          this.content = s;
          break;
        }
        case 'alpha': {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
          let s = '';
          for (let i = 0; i < count; i++) s += chars[Math.floor(Math.random() * chars.length)];
          this.content = s;
          break;
        }
        case 'cn': {
          let s = '';
          for (let i = 0; i < count; i++) s += CN_POOL[Math.floor(Math.random() * CN_POOL.length)];
          this.content = s;
          break;
        }
        case 'mix': {
          const pool = '0123456789ABCDEFG的在了是和我你他';
          let s = '';
          for (let i = 0; i < count; i++) s += pool[Math.floor(Math.random() * pool.length)];
          this.content = s;
          break;
        }
        case 'article': {
          const art = ARTICLES[p.articleName] || ARTICLES['励志篇'];
          const sentences = art.split(/[。！？!?]/).map(s => s.trim()).filter(s => s.length > 0);
          const sent = sentences[Math.floor(Math.random() * sentences.length)];
          // 截取中间一段
          const maxLen = Math.max(3, count);
          if (sent.length <= maxLen) this.content = sent;
          else {
            const start = Math.floor(Math.random() * Math.max(1, sent.length - maxLen));
            this.content = sent.slice(start, start + maxLen);
          }
          break;
        }
      }
      // 测试题类型
      const r = Math.random();
      if (t === 'article') this.testType = 'which';
      else if (r < 0.4) this.testType = 'which';
      else if (r < 0.7) this.testType = 'order';
      else this.testType = 'pos';
    }

    /* 图片闪视：生成 6 张随机彩色图形，标记 1 张为答案 */
    genPics() {
      const n = 6;
      this.picItems = [];
      const used = new Set();
      for (let i = 0; i < n; i++) {
        let x, y;
        do {
          x = Math.floor(Math.random() * 3);
          y = Math.floor(Math.random() * 2);
        } while (used.has(x + ',' + y));
        used.add(x + ',' + y);
        this.picItems.push({
          x, y,
          shape: ['circle', 'rect', 'tri'][Math.floor(Math.random() * 3)],
          color: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'][Math.floor(Math.random() * 6)]
        });
      }
      this.picAnswer = this.picItems[Math.floor(Math.random() * n)];
    }

    /* 生成测试题选项 */
    genOptions() {
      const t = this.training.type;
      if (t === 'pic') {
        // 4 选 1：哪张图出现在哪个位置
        const ans = this.picAnswer;
        this.testPrompt = '刚才哪种图形出现在左上区域？';
        this.testType = 'pic';
        const shapes = ['circle', 'rect', 'tri'];
        const labels = { circle: '圆形', rect: '方形', tri: '三角形' };
        const opts = new Set([ans.shape]);
        while (opts.size < 4) opts.add(shapes[Math.floor(Math.random() * shapes.length)]);
        this.options = [...opts].sort(() => Math.random() - 0.5).map(s => ({ value: s, label: labels[s] }));
        this.answer = ans.shape;
        return;
      }
      const content = this.content;
      if (this.testType === 'which') {
        // 哪个字符出现过
        const correctChar = content[Math.floor(Math.random() * content.length)];
        this.testPrompt = '刚才出现了哪个字符？';
        const opts = new Set([correctChar]);
        const pool = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ的了是在和我你他';
        while (opts.size < 4) opts.add(pool[Math.floor(Math.random() * pool.length)]);
        this.options = [...opts].sort(() => Math.random() - 0.5).map(c => ({ value: c, label: c }));
        this.answer = correctChar;
      } else if (this.testType === 'order') {
        // 排序：把内容打乱后选正确顺序（简化：第1个字符是什么）
        this.testPrompt = '第一个字符是什么？';
        const correctChar = content[0];
        const opts = new Set([correctChar]);
        const pool = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ的了是在和我你他';
        while (opts.size < 4) opts.add(pool[Math.floor(Math.random() * pool.length)]);
        this.options = [...opts].sort(() => Math.random() - 0.5).map(c => ({ value: c, label: c }));
        this.answer = correctChar;
      } else {
        // pos：第 N 个位置是什么字符
        const pos = Math.floor(Math.random() * content.length);
        const correctChar = content[pos];
        this.testPrompt = `第 ${pos + 1} 个字符是什么？`;
        const opts = new Set([correctChar]);
        const pool = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ的了是在和我你他';
        while (opts.size < 4) opts.add(pool[Math.floor(Math.random() * pool.length)]);
        this.options = [...opts].sort(() => Math.random() - 0.5).map(c => ({ value: c, label: c }));
        this.answer = correctChar;
      }
    }

    start() {
      if (this.running) return;
      this.round = 0; this.correct = 0; this.total = 0;
      this.busy = false;
      super.start();
      this.beginRound();
    }

    beginRound() {
      const p = this.params;
      this.genRound();
      this.phase = 'show';
      this.phaseT = 0;
      this.selected = -1;
      this.total++;
      Sound.flip();
    }

    update(dt) {
      if (!this.running || this.busy) return;
      const p = this.params;
      this.phaseT += dt * 1000;
      const showMs = p.showTime;
      const hideMs = p.hideTime;
      if (this.phase === 'show') {
        if (this.phaseT >= showMs) {
          this.phase = 'hide';
          this.phaseT = 0;
          if (p.replay) {
            // 回放：先隐藏一小段再回放
          } else {
            if (p.manual) {
              this.phase = 'wait_click';
            } else {
              this.toTest();
            }
          }
        }
      } else if (this.phase === 'hide') {
        if (this.phaseT >= hideMs) {
          if (p.replay) {
            this.phase = 'replay';
            this.phaseT = 0;
          } else if (p.manual) {
            this.phase = 'wait_click';
          } else {
            this.toTest();
          }
        }
      } else if (this.phase === 'replay') {
        if (this.phaseT >= showMs) {
          if (p.manual) this.phase = 'wait_click';
          else this.toTest();
        }
      }
    }

    toTest() {
      if (this.params.test) {
        this.genOptions();
        this.phase = 'test';
        this.phaseT = 0;
      } else {
        this.phase = 'wait_click';
      }
    }

    /* 点击画布：推进流程 */
    canvasClick() {
      if (!this.running) return;
      if (this.phase === 'wait_click') {
        this.beginRound();
      } else if (this.phase === 'test') {
        // 在绘制中处理点击命中选项
      }
    }

    /* 测试题选项点击（由 draw 中注册的临时 hit 处理） */
    choose(idx) {
      if (this.phase !== 'test' || this.selected >= 0) return;
      this.selected = idx;
      if (this.options[idx] && this.options[idx].value === this.answer) {
        this.correct++;
        Sound.good();
      } else {
        Sound.err();
      }
      this.phase = 'feedback';
      this.phaseT = 0;
    }

    updateFeedback(dt) {
      if (this.phase === 'feedback') {
        this.phaseT += dt * 1000;
        if (this.phaseT >= 900) {
          this.round++;
          if (this.params.manual) this.phase = 'wait_click';
          else this.beginRound();
        }
      }
    }

    draw() {
      const { ctx, cw: w, ch: h, params: p } = this;
      if (!w || !h) return;
      Canvas.clear(ctx, w, h, p.bg);
      if (this.training.type === 'pic') this.drawPics(ctx, w, h);
      else this.drawText(ctx, w, h);
      // 得分显示
      if (this.running) {
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.fillText(`第 ${this.total} 轮 · 答对 ${this.correct}/${Math.max(0, this.total - (this.phase === 'show' || this.phase === 'hide' || this.phase === 'replay' ? 1 : 0))}`, 16, 14);
        ctx.textAlign = 'right';
        ctx.fillText('速度 ×' + this.speedMul.toFixed(1) + ' · 时长 ' + Math.floor(this.elapsed) + 's', w - 16, 14);
      }
    }

    drawText(ctx, w, h) {
      const p = this.params;
      if (this.phase === 'show' || this.phase === 'replay') {
        const fs = p.fontsize;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        if (p.rotate && (this.phase === 'show')) {
          ctx.rotate((p.rotateAngle || 15) * Math.PI / 180 * (this.training.type === 'num' ? 1 : -1));
        }
        ctx.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = p.fg;
        ctx.fillText(this.content, 0, 0);
        ctx.restore();
        if (this.phase === 'replay') {
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = 'rgba(250,204,21,0.9)';
          ctx.fillText('回放', w / 2, 20);
        }
      } else if (this.phase === 'test') {
        this.drawTest(ctx, w, h);
      } else if (this.phase === 'feedback') {
        const ok = this.selected >= 0 && this.options[this.selected] && this.options[this.selected].value === this.answer;
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = ok ? '#4ade80' : '#f87171';
        ctx.fillText(ok ? '✓ 正确' : '✗ 错误', w / 2, h / 2 - 40);
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(ok ? '太棒了！' : '正确答案：' + this.answer, w / 2, h / 2 + 16);
      } else if (this.phase === 'wait_click') {
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText('点击开始下一轮', w / 2, h / 2);
      } else if (this.phase === 'idle') {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText('点击开始', w / 2, h / 2);
      }
    }

    drawTest(ctx, w, h) {
      const p = this.params;
      // 提示
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(this.testPrompt, w / 2, h * 0.2);
      // 4 选项按钮
      const bw = Math.min(220, w * 0.2), bh = Math.min(90, h * 0.22);
      const gap = 16;
      const totalW = bw * 4 + gap * 3;
      const x0 = (w - totalW) / 2;
      const y0 = h * 0.45;
      this._hitAreas = [];
      this.options.forEach((opt, i) => {
        const x = x0 + i * (bw + gap);
        const r = 12;
        ctx.fillStyle = 'rgba(30,41,59,0.9)';
        ctx.strokeStyle = this.selected === i ? '#fbbf24' : '#475569';
        ctx.lineWidth = this.selected === i ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(x + r, y0);
        ctx.arcTo(x + bw, y0, x + bw, y0 + bh, r);
        ctx.arcTo(x + bw, y0 + bh, x, y0 + bh, r);
        ctx.arcTo(x, y0 + bh, x, y0, r);
        ctx.arcTo(x, y0, x + bw, y0, r);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(opt.label, x + bw / 2, y0 + bh / 2);
        this._hitAreas.push({ x, y: y0, w: bw, h: bh, idx: i });
      });
    }

    drawPics(ctx, w, h) {
      const p = this.params;
      const cols = 3, rows = 2;
      const cellW = w / cols, cellH = h / rows;
      if (this.phase === 'show' || this.phase === 'replay') {
        // 显示全部图片
        this.picItems.forEach(item => {
          const x = item.x * cellW + cellW / 2;
          const y = item.y * cellH + cellH / 2;
          drawShape(ctx, item.shape, item.color, x, y, Math.min(cellW, cellH) * 0.32);
        });
        if (this.phase === 'replay') {
          ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = 'rgba(250,204,21,0.9)';
          ctx.fillText('回放', w / 2, 20);
        }
      } else if (this.phase === 'test') {
        // 空网格 + 问题
        this.picItems.forEach(item => {
          const x = item.x * cellW + cellW / 2;
          const y = item.y * cellH + cellH / 2;
          ctx.strokeStyle = 'rgba(148,163,184,0.3)';
          ctx.strokeRect(item.x * cellW + 2, item.y * cellH + 2, cellW - 4, cellH - 4);
        });
        this.drawTest(ctx, w, h);
      } else if (this.phase === 'wait_click') {
        ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText('点击开始下一轮', w / 2, h / 2);
      } else if (this.phase === 'idle') {
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.fillText('点击开始', w / 2, h / 2);
      }
    }

    /* 点击命中测试题选项 */
    handleClick(e) {
      if (!this.running) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (this.phase === 'test' && this._hitAreas) {
        for (const a of this._hitAreas) {
          if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) {
            this.choose(a.idx);
            return;
          }
        }
      } else if (this.phase === 'wait_click' || this.phase === 'idle') {
        this.canvasClick();
      }
    }
  }

  function drawShape(ctx, shape, color, x, y, r) {
    ctx.fillStyle = color;
    if (shape === 'circle') {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'rect') {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x - r * 0.87, y + r * 0.65);
      ctx.lineTo(x + r * 0.87, y + r * 0.65);
      ctx.closePath(); ctx.fill();
    }
  }

  function defaultsOf(t) {
    return {
      fg: '#ffffff', bg: '#000000', fontsize: 42,
      showTime: 500, hideTime: 800,
      startCount: 4, maxCount: 12,
      manual: false, test: true, replay: false, autoGrow: true, rotate: false, rotateAngle: 15,
      articleName: '励志篇'
    };
  }

  function paramDefsOf(t) {
    const labels = {
      fg: '前景色', bg: '背景色', fontsize: '字体大小', showTime: '显示时间(ms)',
      hideTime: '隐藏时间(ms)', startCount: '起始字数', maxCount: '最大字数',
      manual: '手动显示', test: '测试题', replay: '回放', autoGrow: '字数自动变化',
      rotate: '文字旋转', rotateAngle: '旋转角度', articleName: '文章闪视来源'
    };
    const defs = [
      { key: 'fg', label: labels.fg, type: 'color', def: '#ffffff' },
      { key: 'bg', label: labels.bg, type: 'color', def: '#000000' },
      { key: 'fontsize', label: labels.fontsize, type: 'range', min: 18, max: 90, def: 42 },
      { key: 'showTime', label: labels.showTime, type: 'range', min: 100, max: 3000, step: 50, def: 500 },
      { key: 'hideTime', label: labels.hideTime, type: 'range', min: 100, max: 3000, step: 50, def: 800 },
      { key: 'startCount', label: labels.startCount, type: 'range', min: 2, max: 15, def: 4 },
      { key: 'maxCount', label: labels.maxCount, type: 'range', min: 4, max: 30, def: 12 },
      { key: 'manual', label: labels.manual, type: 'check', def: false },
      { key: 'test', label: labels.test, type: 'check', def: true },
      { key: 'replay', label: labels.replay, type: 'check', def: false },
      { key: 'autoGrow', label: labels.autoGrow, type: 'check', def: true },
      { key: 'rotate', label: labels.rotate, type: 'check', def: false }
    ];
    if (t.type !== 'pic') {
      defs.push({ key: 'rotateAngle', label: labels.rotateAngle, type: 'range', min: 5, max: 45, def: 15 });
    }
    if (t.type === 'article') {
      defs.push({
        key: 'articleName', label: labels.articleName, type: 'select',
        def: t.article || '励志篇',
        options: Object.keys(ARTICLES).map(k => ({ value: k, label: k }))
      });
    }
    return defs;
  }

  /* ---------------- 页面初始化 ---------------- */
  function init() {
    const canvas = $('#canvas');
    const stage = $('#stage');
    const trainer = new FlashTrainer({ canvas });

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
