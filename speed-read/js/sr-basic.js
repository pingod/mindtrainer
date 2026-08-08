/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 基础训练引擎（26 项）
 * 数据驱动：每项训练 = 配置对象（类型/参数/训练方法）
 * 类型：expand 视野扩展 / move 文字移动 / eyemove 眼动
 *       gaze 凝视 / table 视读表（舒尔特表）
 * ============================================================ */
(function () {
  'use strict';
  const SR = window.SR;
  const { $, $$, Store, Sound, Canvas, Color } = SR;

  /* ---------------- 26 项训练配置 ---------------- */
  const TRAININGS = [
    /* ===== 视野扩展 ===== */
    { id: 'arrows', name: '发散箭头', group: 'expand', type: 'arrows', num: 1,
      method: '保持端正姿势，视线垂直于训练图，眼睛与图保持 30CM 左右。凝视中心的方形，保持注意力集中于整个图，使视幅随着箭头的扩大而扩展至极限。注意腹式呼吸，尽量不眨眼。',
      params: {
        fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        shape: { def: 'arrow', options: [['arrow', '箭头'], ['dot', '圆点']] }
      } },
    { id: 'block', name: '扩大方框', group: 'expand', type: 'block', num: 2,
      method: '凝视中心的方形，随着方形区域不断扩大，视野同时扩展。保持注意力集中，尽量不眨眼。',
      params: { fg: { def: '#808080' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        grad: { def: false, check: true, label: '渐变显示' } } },
    { id: 'circular', name: '扩大圆环', group: 'expand', type: 'circular', num: 3,
      method: '参数同扩大方框。凝视中心圆环，随圆环扩大扩展视野。',
      params: { fg: { def: '#808080' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        grad: { def: false, check: true, label: '渐变显示' } } },
    { id: 'lr_expand', name: '左右拓宽', group: 'expand', type: 'lr_expand', num: 4,
      method: '视点保持在中心的竖线上，注意力集中于所有文字，随着两竖文字的间距不断扩大，视野同时扩展，并始终能看清文字。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: '飞克视读', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },
    { id: 'ud_expand', name: '上下拓宽', group: 'expand', type: 'ud_expand', num: 5,
      method: '同左右拓宽，上下方向扩大。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: '飞克视读', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },
    { id: 'all_expand', name: '四周拓宽', group: 'expand', type: 'all_expand', num: 6,
      method: '同左右拓宽，四周方向扩大。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: '飞克视读', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },
    { id: 'circle', name: '扩大圆周', group: 'expand', type: 'circle', num: 7,
      method: '眼球放松，注视圆周，并配合圆周的变化同步呼吸。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        linew: { def: 2, min: 1, max: 12 } } },
    { id: 'down_expand', name: '展开向下', group: 'expand', type: 'down_expand', num: 8,
      method: '视点保持在中心的竖线上，视野扩大到整幅图形，注意力集中于高亮运动的圆形。',
      params: { fg: { def: '#808080' }, hl: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        width: { def: 9, min: 2, max: 30 } } },
    { id: 'symbol', name: '整体符号', group: 'expand', type: 'symbol', num: 9,
      method: '视幅扩展至整幅图形，注意力集中于高亮运动的区域。',
      params: { fg: { def: '#808080' }, hl: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        hl_lines: { def: 1, min: 1, max: 5 } } },
    { id: 'chars_expand', name: '展开文字', group: 'expand', type: 'chars_expand', num: 10,
      method: '视幅扩展至两侧所有文字，注意力集中于高亮运动的文字。力求运动过程中高亮的每个文字都能看清，使视野不断扩大。',
      params: { fg: { def: '#ffffff' }, hl: { def: '#808080' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: '我的视野很开阔', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },

    /* ===== 文字移动 ===== */
    { id: 'h_move_text', name: '水平拓展', group: 'move', type: 'h_move_text', num: 11,
      method: '视点保持在中心的竖线上，力求运动过程中每个文字都能看清。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: '横向视野', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },
    { id: 'sides_down', name: '两侧向下', group: 'move', type: 'sides_down', num: 12,
      method: '视点保持在中心的竖线上，注意力集中于外端的文字，力求运动过程中保持视野的宽度，并且每个文字都能看清。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: '横向视野', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },
    { id: 'random_blink', name: '随机闪现', group: 'move', type: 'random_blink', num: 13,
      method: '视点保持在区域中心，注意力集中于整个图，当闪视的数字出现后立即识别，力求每个文字都能看清。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: 'RandomNumber', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },
    { id: 'circular_letter', name: '环形文字', group: 'move', type: 'circular_letter', num: 14,
      method: '视点保持在区域中心，注意力集中于整个图，随着环形的变大变小，感觉自己的视野能同样缩放自如，力求环形上的文字都能看清。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 120 },
        text: { def: '飞克视读飞克视读飞克视读', text: true }, fontsize: { def: 32, min: 14, max: 96 } } },

    /* ===== 眼动训练 ===== */
    { id: 'h_move', name: '水平移动', group: 'eyemove', type: 'h_move', num: 15,
      method: '视点随着高亮的圆迅速跳动，运动过程中保持深呼吸。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 100, min: 10, max: 400 },
        linew: { def: 5, min: 2, max: 24 } } },
    { id: 'v_move', name: '垂直移动', group: 'eyemove', type: 'v_move', num: 16,
      method: '同水平移动，垂直方向。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 100, min: 10, max: 400 },
        linew: { def: 5, min: 2, max: 24 } } },
    { id: 'star_move', name: '星形移动', group: 'eyemove', type: 'star_move', num: 17,
      method: '同水平移动，星形路线。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 50, min: 10, max: 300 },
        linew: { def: 5, min: 2, max: 24 } } },
    { id: 'circle_move', name: '圆周移动', group: 'eyemove', type: 'circle_move', num: 18,
      method: '视点随着圆流畅地移动，运动过程中保持深呼吸。训练中单击鼠标运动反向。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 200 },
        linew: { def: 5, min: 2, max: 24 }, dir: { def: 1, min: -1, max: 1, step: 1, label: '方向 ±' } } },
    { id: 'move_8', name: '八字移动', group: 'eyemove', type: 'move_8', num: 19,
      method: '同圆周移动，8 字形路线。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 200 },
        linew: { def: 5, min: 2, max: 24 } } },
    { id: 'arc_move', name: '曲线移动', group: 'eyemove', type: 'arc_move', num: 20,
      method: '同圆周移动。训练中单击左键运动反向，单击右键改变曲线形状。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, speed: { def: 30, min: 5, max: 200 },
        linew: { def: 5, min: 2, max: 24 }, shape: { def: 0, min: 0, max: 2, step: 1, label: '曲线 0正弦 1椭圆 2弧' } } },

    /* ===== 凝视训练 ===== */
    { id: 'point_gaze', name: '一点凝视', group: 'gaze', type: 'point_gaze', num: 21,
      method: '凝视中心的十字，全过程中保持深呼吸，并尽量不眨眼睛。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#808080' }, radius: { def: 400, min: 60, max: 800 },
        timer: { def: true, check: true, label: '显示计时' } } },
    { id: 'block_gaze', name: '方形凝视', group: 'gaze', type: 'block_gaze', num: 22,
      method: '凝视中心的方形，同时暗示自己"越来越大，越来越清晰"。全过程中保持深呼吸，并尽量不眨眼睛。',
      params: { fg: { def: '#c0c0c0' }, bg: { def: '#000000' }, size: { def: 120, min: 40, max: 400 },
        timer: { def: true, check: true, label: '显示计时' } } },
    { id: 'focus_gaze', name: '集中凝视', group: 'gaze', type: 'focus_gaze', num: 23,
      method: '凝视中心的方形，同时感觉自己完全集中，不去想任何事情。训练前可以先保持一定时间的集中凝视，集中时间要尽量长。',
      params: { fg: { def: '#c0c0c0' }, bg: { def: '#000000' }, timer: { def: true, check: true, label: '显示计时' } } },

    /* ===== 视读表 ===== */
    { id: 'table_en', name: '英文视读表', group: 'table', type: 'table', num: 24,
      method: '将视点放在整张表的正中心，使所有文字尽收眼帘。按预先规定的顺序寻找文字，找到一个就立即寻找下一个，直至全部完成。单击鼠标重排整张表。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, rows: { def: 5, min: 3, max: 8 },
        cols: { def: 5, min: 3, max: 8 }, fontsize: { def: 32, min: 16, max: 72 } } },
    { id: 'table_num', name: '数字视读表', group: 'table', type: 'table', num: 25,
      method: '同英文视读表，按数字顺序寻找。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, rows: { def: 5, min: 3, max: 8 },
        cols: { def: 5, min: 3, max: 8 }, fontsize: { def: 32, min: 16, max: 72 } } },
    { id: 'table_cn', name: '汉字视读表', group: 'table', type: 'table', num: 26,
      method: '同英文视读表，按笔画少的汉字顺序寻找（一、乙、二、十、丁…）。',
      params: { fg: { def: '#ffffff' }, bg: { def: '#000000' }, rows: { def: 5, min: 3, max: 8 },
        cols: { def: 5, min: 3, max: 8 }, fontsize: { def: 32, min: 16, max: 72 } } }
  ];

  const GROUP_LABEL = { expand: '视野扩展', move: '文字移动', eyemove: '眼动训练', gaze: '凝视训练', table: '视读表' };

  /* 汉字按笔画数排序（简表） */
  const CN_BY_STROKE = '一乙二十丁厂七卜人入八九几儿了力乃刀又三于干亏士工土才寸下大丈与万上小口巾山千乞川亿个勺久凡及夕丸么广亡门义之尸弓己已子卫也女飞刃习叉马乡丰王井开夫天无元专云扎艺木五支厅不太犬区历尤友匹车巨牙屯比互切瓦止少日中冈贝内水见午牛手毛气升长仁什片仆化仇币仍仅斤爪反介父从今凶分乏公仓月氏勿欠风丹匀乌凤勾文六方火为斗忆订计户认心尺引丑巴孔队办以允予劝双书幻玉刊示末未击打巧正扑扒功扔去甘世古节本术可丙左厉右石布龙平灭轧东卡北占业旧帅归且旦目叶甲申叮电号田由史只央兄叼叫另叨叹四生失禾丘付仗代仙们仪白仔他斥瓜乎丛令用甩印乐句匆册犯外处冬鸟务包饥主市立闪兰半汁汇头汉宁穴它讨写让礼训必议讯记永司尼民出辽奶奴加召皮边发孕圣对台矛纠母幼丝'

  /* 视读表汉字源：直接取笔画序前 N 个（保证有固定顺序） */
  const TABLE_CN_CHARS = CN_BY_STROKE.slice(0, 128);

  /* ---------------- 基础训练器 ---------------- */
  class BasicTrainer extends SR.Trainer {
    constructor(opts) {
      super(opts);
      this.cw = 0; this.ch = 0;
      this.training = null;
      this.st = null;         // 类型专属状态
      this.onClick = null;
      this.canvas.addEventListener('click', e => {
        if (this.onClick) this.onClick(e);
      });
      this.canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (this.onRClick) this.onRClick(e);
      });
    }

    resize() {
      const { w, h } = Canvas.setup(this.canvas);
      this.cw = w; this.ch = h;
      if (this.st && this.st.reinit) this.st.reinit();
    }

    selectTraining(t) {
      this.training = t;
      this.setParams(defaultsOf(t));
      this.st = makeState(t, this);
      this.reset();
      this.resize();
      this.draw();
    }

    /* 参数面板实时同步 */
    applyParams(p) {
      this.setParams(p);
      if (this.st && this.st.applyParams) this.st.applyParams(p);
      if (this.st && this.st.reinit) this.st.reinit();
      if (!this.running) this.draw();
    }

    update(dt, now) {
      if (!this.st) return;
      if (this.st.update) this.st.update(dt, now, this);
    }

    draw() {
      const { ctx, cw: w, ch: h, params: p } = this;
      if (!w || !h) return;
      Canvas.clear(ctx, w, h, p.bg);
      if (this.st && this.st.draw) this.st.draw(ctx, w, h, this);
      const info = $('#statusInfo');
      if (info && this.running) {
        info.textContent = '时长 ' + Math.floor(this.elapsed) + 's · 速度 ×' + this.speedMul.toFixed(1);
      }
    }
  }

  /* ---------------- 状态工厂 ---------------- */
  function defaultsOf(t) {
    const out = { fg: '#ffffff', bg: '#000000' };
    Object.keys(t.params).forEach(k => {
      const p = t.params[k];
      out[k] = p.check ? !!p.def : (p.def !== undefined ? p.def : '');
    });
    return out;
  }

  function paramDefsOf(t) {
    const labels = {
      fg: '前景色', bg: '背景色', speed: '速度', shape: '形状', grad: '渐变显示',
      text: '显示文字', fontsize: '字体大小', linew: '线条粗细', hl: '高亮色',
      hl_lines: '高亮行数', width: '宽度', dir: '方向', radius: '半径',
      size: '尺寸', timer: '显示计时', rows: '行数', cols: '列数'
    };
    return Object.keys(t.params).map(k => {
      const p = t.params[k];
      let def = {
        key: k,
        label: p.label || labels[k] || k,
        type: p.check ? 'check' : (p.text ? 'text' : (p.def === 'arrow' ? 'select' : (p.options ? 'select' : 'range'))),
        def: p.def,
        min: p.min, max: p.max, step: p.step,
        options: p.options ? p.options.map(o => ({ value: o[0], label: o[1] })) : undefined
      };
      return def;
    });
  }

  function makeState(t, trainer) {
    switch (t.type) {
      case 'arrows': return new SArrows();
      case 'block': return new SBlock(false);
      case 'circular': return new SBlock(true);
      case 'lr_expand': return new SLineExpand('lr');
      case 'ud_expand': return new SLineExpand('ud');
      case 'all_expand': return new SLineExpand('all');
      case 'circle': return new SCircle();
      case 'down_expand': return new SDownExpand();
      case 'symbol': return new SSymbol();
      case 'chars_expand': return new SCharsExpand();
      case 'h_move_text': return new SHMoveText();
      case 'sides_down': return new SSidesDown();
      case 'random_blink': return new SRandomBlink();
      case 'circular_letter': return new SCircularLetter();
      case 'h_move': return new SEyeMove('h');
      case 'v_move': return new SEyeMove('v');
      case 'star_move': return new SEyeMove('star');
      case 'circle_move': return new SEyeMove('circle');
      case 'move_8': return new SEyeMove('8');
      case 'arc_move': return new SEyeMove('arc');
      case 'point_gaze': return new SGaze('point');
      case 'block_gaze': return new SGaze('block');
      case 'focus_gaze': return new SGaze('focus');
      case 'table': return new STable(t.id);
      default: return {};
    }
  }

  /* ========== 类型实现 ========== */

  /* ---- 发散箭头：箭头/圆点从中心向外扩散 ---- */
  class SArrows {
    constructor() { this.t = 0; this.n = 12; }
    update(dt, now, tr) {
      this.t += dt;
    }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cx = w / 2, cy = h / 2;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed)); // 秒/周期
      const ph = (this.t % cycle) / cycle;
      const maxR = Math.min(w, h) * 0.55;
      // 中心方形
      c.fillStyle = p.fg;
      c.fillRect(cx - 6, cy - 6, 12, 12);
      for (let i = 0; i < this.n; i++) {
        const ang = (i / this.n) * Math.PI * 2 + this.t * 0.3;
        const R = maxR * (0.15 + 0.85 * ph);
        const x = cx + Math.cos(ang) * R;
        const y = cy + Math.sin(ang) * R;
        if (p.shape === 'dot') {
          c.fillStyle = p.fg;
          c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
        } else {
          // 箭头：沿径向指向外
          c.save();
          c.translate(x, y);
          c.rotate(ang);
          c.fillStyle = p.fg;
          const s = 10;
          c.beginPath();
          c.moveTo(s, 0); c.lineTo(-s * 0.7, -s * 0.7); c.lineTo(-s * 0.4, 0); c.lineTo(-s * 0.7, s * 0.7);
          c.closePath(); c.fill();
          c.restore();
        }
      }
    }
  }

  /* ---- 扩大方框 / 扩大圆环 ---- */
  class SBlock {
    constructor(circle) { this.t = 0; this.circle = circle; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed));
      const ph = (this.t % cycle) / cycle;
      const maxR = Math.min(w, h) * 0.6;
      const R = 20 + (maxR - 20) * ph;
      if (p.grad) {
        // 渐变显示：内外两层
        const R2 = 20 + (maxR - 20) * Math.max(0, ph - 0.12);
        c.strokeStyle = Color.rgba(p.fg, 0.35);
        c.lineWidth = 2;
        if (this.circle) {
          c.beginPath(); c.arc(w / 2, h / 2, R2, 0, Math.PI * 2); c.stroke();
        } else {
          c.strokeRect(w / 2 - R2, h / 2 - R2, R2 * 2, R2 * 2);
        }
      }
      c.strokeStyle = p.fg;
      c.lineWidth = 3;
      if (this.circle) {
        c.beginPath(); c.arc(w / 2, h / 2, R, 0, Math.PI * 2); c.stroke();
      } else {
        c.strokeRect(w / 2 - R, h / 2 - R, R * 2, R * 2);
      }
    }
  }

  /* ---- 左右/上下/四周拓宽 ---- */
  class SLineExpand {
    constructor(dir) { this.t = 0; this.dir = dir; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed));
      const ph = (this.t % cycle) / cycle;
      const gap = Math.min(w, h) * 0.55 * ph;
      const fs = p.fontsize;
      c.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = p.fg;
      const txt = p.text || '飞克视读';
      const cx = w / 2, cy = h / 2;
      if (this.dir === 'lr') {
        c.fillText(txt, cx - fs * 2 - gap, cy);
        c.fillText(txt, cx + fs * 2 + gap, cy);
      } else if (this.dir === 'ud') {
        c.fillText(txt, cx, cy - fs * 2 - gap);
        c.fillText(txt, cx, cy + fs * 2 + gap);
      } else {
        const d = gap * 0.7;
        c.fillText(txt, cx - fs * 2 - d, cy - d);
        c.fillText(txt, cx + fs * 2 + d, cy - d);
        c.fillText(txt, cx - fs * 2 - d, cy + d);
        c.fillText(txt, cx + fs * 2 + d, cy + d);
      }
      // 中心竖线/十字
      c.strokeStyle = Color.rgba(p.fg, 0.5);
      c.lineWidth = 1;
      if (this.dir === 'lr') {
        c.beginPath(); c.moveTo(cx, cy - h / 2); c.lineTo(cx, cy + h / 2); c.stroke();
      } else if (this.dir === 'ud') {
        c.beginPath(); c.moveTo(cx - w / 2, cy); c.lineTo(cx + w / 2, cy); c.stroke();
      } else {
        c.beginPath(); c.moveTo(cx, cy - h / 2); c.lineTo(cx, cy + h / 2); c.stroke();
        c.beginPath(); c.moveTo(cx - w / 2, cy); c.lineTo(cx + w / 2, cy); c.stroke();
      }
    }
  }

  /* ---- 扩大圆周 ---- */
  class SCircle {
    constructor() { this.t = 0; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed));
      const ph = (this.t % cycle) / cycle;
      const maxR = Math.min(w, h) * 0.6;
      const R = 20 + (maxR - 20) * ph;
      c.strokeStyle = p.fg;
      c.lineWidth = p.linew;
      c.beginPath(); c.arc(w / 2, h / 2, R, 0, Math.PI * 2); c.stroke();
    }
  }

  /* ---- 展开向下：文字列 + 高亮圆向下移动 ---- */
  class SDownExpand {
    constructor() { this.t = 0; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed));
      const ph = (this.t % cycle) / cycle;
      const cx = w / 2;
      // 左侧文字列（静态）
      const col = '的用在人是了可和有大这主中上为个';
      c.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = p.fg;
      const cols = 4, gapX = w * 0.15;
      for (let i = 0; i < cols; i++) {
        const x = cx - (cols / 2 - i - 0.5) * gapX;
        for (let j = 0; j < col.length; j++) {
          c.fillText(col[j], x, 40 + j * 28);
        }
      }
      // 高亮圆向下移动
      const y = h * 0.15 + (h * 0.7) * ph;
      c.fillStyle = p.hl;
      c.beginPath(); c.arc(cx, y, p.width * 1.6, 0, Math.PI * 2); c.fill();
      // 中心竖线
      c.strokeStyle = Color.rgba(p.fg, 0.4);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx, 20); c.lineTo(cx, h - 20); c.stroke();
    }
  }

  /* ---- 整体符号：网格符号 + 高亮行 ---- */
  class SSymbol {
    constructor() { this.t = 0; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed));
      const ph = (this.t % cycle) / cycle;
      const syms = ['△', '○', '□', '◇', '※', '＋', '＝'];
      const rows = 8, cols = 12;
      const cellW = w / cols, cellH = h / rows;
      c.font = `${Math.min(20, cellH * 0.5)}px sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const hlRow = Math.floor(ph * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          c.fillStyle = (j === hlRow) ? p.hl : p.fg;
          c.fillText(syms[(i + j) % syms.length], i * cellW + cellW / 2, j * cellH + cellH / 2);
        }
      }
    }
  }

  /* ---- 展开文字：一行文字，高亮词向两侧展开 ---- */
  class SCharsExpand {
    constructor() { this.t = 0; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed));
      const ph = (this.t % cycle) / cycle;
      const txt = (p.text || '我的视野很开阔').split('');
      const fs = p.fontsize;
      const cx = w / 2, cy = h / 2;
      const spread = Math.min(w * 0.4, fs * txt.length * 2) * ph;
      c.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const mid = Math.floor(txt.length / 2);
      txt.forEach((ch, i) => {
        const off = (i - mid) / Math.max(1, mid);
        c.fillStyle = (i === mid) ? p.hl : p.fg;
        c.fillText(ch, cx + off * spread, cy);
      });
      // 中心竖线
      c.strokeStyle = Color.rgba(p.fg, 0.35);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx, cy - h * 0.3); c.lineTo(cx, cy + h * 0.3); c.stroke();
    }
  }

  /* ---- 水平拓展：文字正弦展开 ---- */
  class SHMoveText {
    constructor() { this.t = 0; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const txt = (p.text || '横向视野').split('');
      const fs = p.fontsize;
      const cx = w / 2, cy = h / 2;
      c.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = p.fg;
      const spread = Math.min(w * 0.38, fs * txt.length);
      const mid = Math.floor(txt.length / 2);
      txt.forEach((ch, i) => {
        const off = (i - mid) / Math.max(1, mid);
        const x = cx + off * spread;
        const y = cy + Math.sin(this.t * 3 + i * 0.8) * 14;
        c.fillText(ch, x, y);
      });
      c.strokeStyle = Color.rgba(p.fg, 0.4);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx, cy - h * 0.35); c.lineTo(cx, cy + h * 0.35); c.stroke();
    }
  }

  /* ---- 两侧向下：两侧文字向下滚动 ---- */
  class SSidesDown {
    constructor() { this.t = 0; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const txt = (p.text || '横向视野').split('');
      const fs = p.fontsize;
      const cx = w / 2;
      c.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = p.fg;
      const leftX = w * 0.22, rightX = w * 0.78;
      const scrollY = (this.t * 120) % (h * 1.2);
      for (let k = -1; k < 2; k++) {
        const y0 = scrollY + k * h * 1.2;
        txt.forEach((ch, i) => {
          c.fillText(ch, leftX, y0 - i * fs * 1.4);
          c.fillText(ch, rightX, y0 - i * fs * 1.4);
        });
      }
      // 中心竖线
      c.strokeStyle = Color.rgba(p.fg, 0.4);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx, 20); c.lineTo(cx, h - 20); c.stroke();
    }
  }

  /* ---- 随机闪现 ---- */
  class SRandomBlink {
    constructor() { this.t = 0; this.cur = ''; this.x = 0; this.y = 0; this.show = true; this.next = 0; }
    update(dt, now, tr) {
      const p = tr.params;
      this.t += dt;
      const interval = Math.max(0.25, 60 / Math.max(1, p.speed));
      if (this.t >= this.next) {
        this.next = this.t + interval;
        this.show = !this.show;
        if (this.show) {
          const useRandom = p.text === 'RandomNumber';
          this.cur = useRandom ? String(Math.floor(Math.random() * 100)) : (p.text || '我');
          this.x = 0.2 + Math.random() * 0.6;
          this.y = 0.2 + Math.random() * 0.6;
        }
      }
    }
    draw(c, w, h, tr) {
      if (!this.show) return;
      const p = tr.params;
      c.font = `${p.fontsize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = p.fg;
      c.fillText(this.cur, w * this.x, h * this.y);
      // 中心十字
      c.strokeStyle = Color.rgba(p.fg, 0.35);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(w / 2, h * 0.3); c.lineTo(w / 2, h * 0.7); c.stroke();
      c.beginPath(); c.moveTo(w * 0.3, h / 2); c.lineTo(w * 0.7, h / 2); c.stroke();
    }
  }

  /* ---- 环形文字 ---- */
  class SCircularLetter {
    constructor() { this.t = 0; }
    update(dt) { this.t += dt; }
    draw(c, w, h, tr) {
      const p = tr.params;
      const txt = (p.text || '飞克视读飞克视读飞克视读').split('');
      const cx = w / 2, cy = h / 2;
      const cycle = Math.max(0.5, 90 / Math.max(1, p.speed));
      const ph = (this.t % cycle) / cycle;
      const baseR = Math.min(w, h) * 0.42;
      const R = baseR * (0.75 + 0.25 * Math.abs(Math.sin(ph * Math.PI * 2)));
      const fs = p.fontsize;
      c.font = `${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = p.fg;
      const n = Math.max(4, txt.length);
      txt.forEach((ch, i) => {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(ang) * R;
        const y = cy + Math.sin(ang) * R;
        c.save();
        c.translate(x, y);
        c.rotate(ang + Math.PI / 2);
        c.fillText(ch, 0, 0);
        c.restore();
      });
    }
  }

  /* ---- 眼动：高亮圆沿路径 ---- */
  class SEyeMove {
    constructor(shape) { this.shape = shape; this.t = 0; this.dir = 1; this.arcShape = 0; }
    update(dt, now, tr) {
      const p = tr.params;
      const sp = Math.max(0.05, p.speed / 100);
      this.t += dt * sp * (this.shape === 'circle' ? p.dir : 1) * this.dir;
      // 点击反向
      tr.onClick = (e) => {
        if (this.shape === 'circle' || this.shape === 'arc') {
          this.dir *= -1;
          SR.Sound.flip();
        }
        if (this.shape === 'arc') {
          this.arcShape = (this.arcShape + 1) % 3;
          SR.Sound.click();
        }
      };
      tr.onRClick = (e) => {
        if (this.shape === 'arc') {
          this.arcShape = (this.arcShape + 1) % 3;
          SR.Sound.click();
        }
      };
    }
    _path(ph, w, h) {
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.36;
      const t = ph * Math.PI * 2;
      switch (this.shape) {
        case 'h': return [cx + Math.sin(t) * w * 0.4, cy];
        case 'v': return [cx, cy + Math.sin(t) * h * 0.4];
        case 'star': {
          // 五角星路径
          const n = 5, steps = 100;
          const k = (ph * steps) % steps;
          const a0 = (Math.floor(k / (steps / n)) * 2 + 1) * Math.PI / n;
          const a1 = ((Math.floor(k / (steps / n)) + 1) * 2 + 1) * Math.PI / n;
          const frac = (k % (steps / n)) / (steps / n);
          const a = a0 + (a1 - a0) * frac - Math.PI / 2;
          return [cx + Math.cos(a) * R * 1.2, cy + Math.sin(a) * R * 1.2];
        }
        case 'circle': return [cx + Math.cos(t) * R, cy + Math.sin(t) * R];
        case '8': return [cx + Math.sin(t) * R, cy - Math.sin(t * 2) * R * 0.5];
        case 'arc': {
          if (this.arcShape === 0) return [cx + Math.sin(t) * R, cy + Math.sin(t * 2) * R * 0.4];
          if (this.arcShape === 1) return [cx + Math.cos(t) * R, cy + Math.sin(t) * R * 0.6];
          // 三次曲线
          const u = (ph % 1) * 3;
          if (u < 1) return [cx - R + u * R * 2, cy];
          if (u < 2) return [cx + R, cy + (u - 1) * R * 2 * 0.6];
          return [cx + R - (u - 2) * R * 2, cy + R * 1.2];
        }
      }
    }
    draw(c, w, h, tr) {
      const p = tr.params;
      // 轨迹
      c.strokeStyle = Color.rgba(p.fg, 0.25);
      c.lineWidth = 1;
      c.setLineDash([6, 6]);
      c.beginPath();
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const [x, y] = this._path(i / 60, w, h);
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
      c.setLineDash([]);
      // 高亮圆
      const [x, y] = this._path((this.t % 1 + 1) % 1, w, h);
      c.fillStyle = p.fg;
      c.beginPath(); c.arc(x, y, p.linew * 1.8, 0, Math.PI * 2); c.fill();
    }
  }

  /* ---- 凝视 ---- */
  class SGaze {
    constructor(kind) { this.kind = kind; this.t0 = 0; }
    reinit() { this.t0 = performance.now(); }
    update() { /* 计时在 draw 中 */ }
    draw(c, w, h, tr) {
      const p = tr.params;
      const cx = w / 2, cy = h / 2;
      const secs = (performance.now() - this.t0) / 1000;
      if (this.kind === 'point') {
        // 十字 + 中心圆
        const r = Math.max(30, Math.min(w, h) * 0.06);
        c.strokeStyle = p.fg;
        c.lineWidth = 2;
        const arm = Math.min(w, h) * 0.16;
        c.beginPath();
        c.moveTo(cx - arm, cy); c.lineTo(cx - r, cy);
        c.moveTo(cx + r, cy); c.lineTo(cx + arm, cy);
        c.moveTo(cx, cy - arm); c.lineTo(cx, cy - r);
        c.moveTo(cx, cy + r); c.lineTo(cx, cy + arm);
        c.stroke();
        c.fillStyle = p.fg;
        c.beginPath(); c.arc(cx, cy, r * 0.5, 0, Math.PI * 2); c.fill();
      } else if (this.kind === 'block') {
        const s = p.size;
        c.fillStyle = p.fg;
        c.fillRect(cx - s / 2, cy - s / 2, s, s);
      } else {
        // 集中凝视：中心方块 + 外框
        const s = Math.min(w, h) * 0.1;
        c.fillStyle = p.fg;
        c.fillRect(cx - s / 2, cy - s / 2, s, s);
        c.strokeStyle = Color.rgba(p.fg, 0.4);
        c.lineWidth = 1;
        c.strokeRect(20, 20, w - 40, h - 40);
      }
      if (p.timer) {
        c.font = '14px sans-serif';
        c.textAlign = 'right'; c.textBaseline = 'top';
        c.fillStyle = Color.rgba(p.fg, 0.6);
        c.fillText(Math.floor(secs) + 's', w - 16, 14);
      }
    }
  }

  /* ---- 视读表（舒尔特表） ---- */
  class STable {
    constructor(kind) { this.kind = kind; this.cells = []; this.next = 1; this.done = false; this.msg = ''; this.msgT = 0; }
    reinit() {
      this.build();
      this.next = 1;
      this.done = false;
      this.msg = '';
    }
    build() {
      const tr = currentTrainer;
      if (!tr) return;
      const p = tr.params;
      const rows = p.rows || 5, cols = p.cols || 5;
      const n = rows * cols;
      let seq = [];
      if (this.kind === 'table_en') {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        seq = letters.slice(0, n).split('');
      } else if (this.kind === 'table_num') {
        seq = Array.from({ length: n }, (_, i) => String(i + 1));
      } else {
        seq = TABLE_CN_CHARS.slice(0, n).split('');
      }
      // Fisher-Yates 洗牌
      for (let i = seq.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seq[i], seq[j]] = [seq[j], seq[i]];
      }
      this.cells = seq;
      this.next = 1;
      this.done = false;
      this.msg = '';
      const cv = $('canvas');
      if (cv) {
        cv.onclick = (e) => this.click(e);
      }
    }
    click(e) {
      const tr = currentTrainer;
      if (!tr) return;
      const cv = tr.canvas;
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const p = tr.params;
      const rows = p.rows || 5, cols = p.cols || 5;
      const cellW = tr.cw / cols, cellH = tr.ch / rows;
      const ci = Math.floor(x / cellW), cj = Math.floor(y / cellH);
      if (ci < 0 || ci >= cols || cj < 0 || cj >= rows) return;
      const idx = cj * cols + ci;
      const want = String(this.next);
      if (this.cells[idx] === want) {
        SR.Sound.good();
        this.next++;
        if (this.next > this.cells.length) {
          this.done = true;
          this.msg = '完成！用时 ' + Math.floor(tr.elapsed) + 's';
          SR.Sound.done();
        }
      } else {
        SR.Sound.err();
        this.msg = '顺序错误，当前要找：' + want;
      }
      this.msgT = performance.now();
    }
    update() {}
    draw(c, w, h, tr) {
      const p = tr.params;
      const rows = p.rows || 5, cols = p.cols || 5;
      const cellW = w / cols, cellH = h / rows;
      const targetIdx = this.cells.findIndex(v => v === String(this.next));
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idx = j * cols + i;
          const isTarget = (idx === targetIdx);
          const x = i * cellW, y = j * cellH;
          c.fillStyle = isTarget ? Color.rgba(p.fg, 0.18) : 'transparent';
          if (isTarget) c.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
          c.strokeStyle = Color.rgba(p.fg, 0.35);
          c.lineWidth = 1;
          c.strokeRect(x + 0.5, y + 0.5, cellW, cellH);
          c.font = `${p.fontsize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = p.fg;
          c.fillText(this.cells[idx], x + cellW / 2, y + cellH / 2);
        }
      }
      if (this.done) {
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#4ade80';
        c.font = 'bold 30px sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(this.msg, w / 2, h / 2 - 20);
        c.fillStyle = '#94a3b8';
        c.font = '16px sans-serif';
        c.fillText('单击任意位置重排', w / 2, h / 2 + 24);
      } else if (this.msg && performance.now() - this.msgT < 2000) {
        c.fillStyle = '#fbbf24';
        c.font = '16px sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'bottom';
        c.fillText(this.msg, w / 2, h - 14);
      }
    }
  }

  let currentTrainer = null;

  /* ---------------- 页面初始化 ---------------- */
  function init() {
    const canvas = $('#canvas');
    const stage = $('#stage');
    const trainer = new BasicTrainer({ canvas });
    currentTrainer = trainer;

    // 训练列表
    const listEl = $('#trainList');
    let lastGroup = '';
    TRAININGS.forEach(t => {
      if (t.group !== lastGroup) {
        const g = document.createElement('div');
        g.className = 'sr-train-item sr-train-group';
        g.style.cssText = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;padding:10px 10px 2px;cursor:default;';
        g.textContent = GROUP_LABEL[t.group];
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
      $$('.sr-train-item').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      trainer.selectTraining(t);
      nameEl.textContent = t.name;
      methodBox.innerHTML = `<b>训练方法：</b>${t.method}`;
      // 重建参数面板
      const defs = paramDefsOf(t);
      SR.buildParamPanel(paramPanel, defs, null, () => {
        trainer.applyParams(SR.readParams(paramPanel, defs));
      });
    }

    // 控制条
    SR.buildControls($('#controls'), trainer);

    // 键盘
    SR.bindKeyboard(trainer, {
      onKey(e) {
        if (e.key === 'Enter') {
          // 回车重排视读表
          if (trainer.training && trainer.training.type === 'table' && trainer.st) {
            trainer.st.build();
          }
        }
      }
    });

    // resize
    const ro = new ResizeObserver(() => {
      if (trainer.resize) trainer.resize();
      if (!trainer.running) trainer.draw();
    });
    ro.observe(stage);

    // 默认选中第一项
    const first = listEl.querySelector('.sr-train-item[data-id]');
    if (first) select(TRAININGS[0], first);

    // 支持 URL ?train=id 直接选中（训练计划执行器使用）
    const urlTrain = new URLSearchParams(location.search).get('train');
    if (urlTrain) {
      const btn = listEl.querySelector(`[data-id="${urlTrain}"]`);
      if (btn) btn.click();
    }

    // 记住上次训练
    const saved = Store.get('basic_last', null);
    if (saved) {
      const idx = TRAININGS.findIndex(t => t.id === saved);
      if (idx >= 0) {
        const btn = listEl.querySelector(`[data-id="${saved}"]`);
        if (btn) select(TRAININGS[idx], btn);
      }
    }
    trainer.onSelect = (id) => Store.set('basic_last', id);

    // 覆盖 onStart 记录选择
    const origSelect = trainer.selectTraining.bind(trainer);
    trainer.selectTraining = (t, ...rest) => {
      origSelect(t, ...rest);
      Store.set('basic_last', t.id);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
