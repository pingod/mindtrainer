/* ============================================================
 * MindTrainer — 飞克视读 Web 重写 · 训练计划系统
 * 自定义训练步骤序列 + 一键按序执行（iframe 内嵌 + 倒计时）
 * ============================================================ */
(function () {
  'use strict';
  const SR = window.SR;
  const { $, $$, Store, Sound } = SR;

  /* 各模块训练目录（id/name 与对应引擎一致） */
  const CATALOG = {
    basic: { label: '基础训练', page: 'basic.html', trains: [
      ['arrows', '发散箭头'], ['block', '扩大方框'], ['circular', '扩大圆环'],
      ['lr_expand', '左右拓宽'], ['ud_expand', '上下拓宽'], ['all_expand', '四周拓宽'],
      ['circle', '扩大圆周'], ['down_expand', '展开向下'], ['symbol', '整体符号'],
      ['chars_expand', '展开文字'], ['h_move_text', '水平拓展'], ['sides_down', '两侧向下'],
      ['random_blink', '随机闪现'], ['circular_letter', '环形文字'], ['h_move', '水平移动'],
      ['v_move', '垂直移动'], ['star_move', '星形移动'], ['circle_move', '圆周移动'],
      ['move_8', '八字移动'], ['arc_move', '曲线移动'], ['point_gaze', '一点凝视'],
      ['block_gaze', '方形凝视'], ['focus_gaze', '集中凝视'], ['table_en', '英文视读表'],
      ['table_num', '数字视读表'], ['table_cn', '汉字视读表']
    ] },
    flash: { label: '闪视训练', page: 'flash.html', trains: [
      ['flash_num', '数字闪视'], ['flash_alpha', '字母闪视'], ['flash_cn', '随机汉字闪视'],
      ['flash_mix', '组合闪视'], ['flash_article', '文章闪视'], ['flash_pic', '图片闪视']
    ] },
    speed: { label: '速读训练', page: 'speed.html', trains: [
      ['text_move', '字块移动'], ['vision_expand', '视野扩展'],
      ['read_train', '阅读训练'], ['combat', '实战训练']
    ] },
    photo: { label: '照相记忆', page: 'photo.html', trains: [
      ['tricolor', '三色卡片'], ['geom', '几何卡片'], ['yellow', '黄卡'],
      ['mandala', '曼陀罗卡片'], ['card3d', '3D 卡片'], ['picview', '图片浏览'],
      ['memory', '记忆训练'], ['fastcalc', '瞬间计算']
    ] },
    meditation: { label: '冥想训练', page: 'meditation.html', trains: [['meditation', '冥想']] }
  };

  const DEFAULTS = [
    { module: 'basic', train: 'table_num', label: '数字视读表', minutes: 3 },
    { module: 'flash', train: 'flash_num', label: '数字闪视', minutes: 3 },
    { module: 'speed', train: 'read_train', label: '阅读训练', minutes: 5 },
    { module: 'photo', train: 'mandala', label: '曼陀罗卡片', minutes: 3 },
    { module: 'meditation', train: 'meditation', label: '冥想', minutes: 5 }
  ];

  function stepUrl(step) {
    const mod = CATALOG[step.module];
    if (!mod) return '#';
    const url = mod.page;
    if (step.train && step.train !== 'meditation') return url + '?train=' + encodeURIComponent(step.train);
    return url;
  }

  function stepLabel(step) {
    if (step.label) return step.label;
    const mod = CATALOG[step.module];
    if (!mod) return step.module;
    const t = mod.trains.find(x => x[0] === step.train);
    return t ? t[1] : mod.label;
  }

  function loadPlans() { return Store.get('plans', []); }
  function savePlans(plans) { Store.set('plans', plans); }

  /* ---------------- 页面初始化 ---------------- */
  function init() {
    const nameInput = $('#planName');
    const stepList = $('#stepList');
    const addBtn = $('#addStepBtn');
    const moduleSel = $('#moduleSel');
    const trainSel = $('#trainSel');
    const minuteInput = $('#stepMinutes');
    const saveBtn = $('#savePlanBtn');
    const execBtn = $('#execPlanBtn');
    const planSel = $('#planSel');
    const deleteBtn = $('#deletePlanBtn');
    const exportBtn = $('#exportPlanBtn');
    const importBtn = $('#importPlanBtn');
    const importFile = $('#importFile');

    let currentPlan = { name: '我的训练计划', steps: DEFAULTS.map(s => Object.assign({}, s)) };

    /* 模块选择联动训练下拉 */
    function fillModuleSel(selected) {
      moduleSel.innerHTML = '';
      Object.keys(CATALOG).forEach(k => {
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = CATALOG[k].label;
        if (k === selected) opt.selected = true;
        moduleSel.appendChild(opt);
      });
      fillTrainSel();
    }
    function fillTrainSel() {
      trainSel.innerHTML = '';
      const mod = CATALOG[moduleSel.value];
      mod.trains.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t[0]; opt.textContent = t[1];
        trainSel.appendChild(opt);
      });
    }
    moduleSel.addEventListener('change', fillTrainSel);

    /* 渲染步骤列表 */
    function render() {
      stepList.innerHTML = '';
      currentPlan.steps.forEach((step, i) => {
        const row = document.createElement('div');
        row.className = 'sr-plan-step';
        const idx = document.createElement('span');
        idx.className = 'sr-plan-step-idx';
        idx.textContent = String(i + 1).padStart(2, '0');
        const info = document.createElement('div');
        info.className = 'sr-plan-step-info';
        const nm = document.createElement('div');
        nm.className = 'sr-plan-step-name';
        nm.textContent = stepLabel(step);
        const desc = document.createElement('div');
        desc.className = 'sr-plan-step-desc';
        desc.textContent = (CATALOG[step.module] ? CATALOG[step.module].label : step.module) + ' · ' + step.minutes + ' 分钟';
        info.appendChild(nm); info.appendChild(desc);
        const ops = document.createElement('div');
        ops.className = 'sr-plan-step-ops';
        const mkBtn = (txt, fn) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'sr-btn sr-btn-mini'; b.textContent = txt;
          b.addEventListener('click', fn);
          ops.appendChild(b);
        };
        mkBtn('↑', () => { if (i > 0) { const t = currentPlan.steps[i - 1]; currentPlan.steps[i - 1] = currentPlan.steps[i]; currentPlan.steps[i] = t; render(); } });
        mkBtn('↓', () => { if (i < currentPlan.steps.length - 1) { const t = currentPlan.steps[i + 1]; currentPlan.steps[i + 1] = currentPlan.steps[i]; currentPlan.steps[i] = t; render(); } });
        mkBtn('✕', () => { currentPlan.steps.splice(i, 1); render(); });
        row.appendChild(idx); row.appendChild(info); row.appendChild(ops);
        stepList.appendChild(row);
      });
      const total = currentPlan.steps.reduce((s, x) => s + (x.minutes || 0), 0);
      $('#planTotal').textContent = total ? `共 ${currentPlan.steps.length} 步 · 约 ${total} 分钟` : '暂无步骤';
      nameInput.value = currentPlan.name;
    }

    /* 添加步骤 */
    function addStep() {
      const mod = moduleSel.value;
      const train = trainSel.value;
      const minutes = Math.max(1, parseInt(minuteInput.value, 10) || 3);
      currentPlan.steps.push({ module: mod, train, label: '', minutes });
      render();
      Sound.ok();
    }
    addBtn.addEventListener('click', addStep);

    /* 保存计划 */
    function savePlan() {
      currentPlan.name = nameInput.value || '我的训练计划';
      const plans = loadPlans();
      const existing = plans.findIndex(p => p.name === currentPlan.name);
      const copy = { name: currentPlan.name, steps: currentPlan.steps.map(s => Object.assign({}, s)) };
      if (existing >= 0) plans[existing] = copy;
      else plans.push(copy);
      savePlans(plans);
      refreshPlanSel(currentPlan.name);
      Sound.good();
    }
    saveBtn.addEventListener('click', savePlan);

    /* 计划下拉 */
    function refreshPlanSel(active) {
      planSel.innerHTML = '';
      const plans = loadPlans();
      plans.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name; opt.textContent = p.name;
        if (p.name === active) opt.selected = true;
        planSel.appendChild(opt);
      });
    }
    planSel.addEventListener('change', () => {
      const plans = loadPlans();
      const p = plans.find(x => x.name === planSel.value);
      if (p) {
        currentPlan = { name: p.name, steps: p.steps.map(s => Object.assign({}, s)) };
        render();
      }
    });
    deleteBtn.addEventListener('click', () => {
      const plans = loadPlans();
      const i = plans.findIndex(x => x.name === planSel.value);
      if (i >= 0) {
        plans.splice(i, 1);
        savePlans(plans);
        refreshPlanSel('');
        currentPlan = { name: '我的训练计划', steps: [] };
        render();
      }
    });

    /* 导出 JSON */
    exportBtn.addEventListener('click', () => {
      const data = { name: currentPlan.name, steps: currentPlan.steps };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (currentPlan.name || 'plan') + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    /* 导入 JSON */
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', () => {
      const f = importFile.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data && Array.isArray(data.steps)) {
            currentPlan = { name: data.name || '导入计划', steps: data.steps.map(s => Object.assign({}, s)) };
            render();
            Sound.ok();
          }
        } catch (e) { Sound.err(); }
      };
      reader.readAsText(f);
    });

    /* 执行计划 */
    let execTimer = null;
    execBtn.addEventListener('click', () => {
      if (execTimer) { stopExec(); return; }
      if (currentPlan.steps.length === 0) { Sound.err(); return; }
      startExec();
    });

    function startExec() {
      currentPlan.name = nameInput.value || '我的训练计划';
      execState = { idx: 0, remaining: currentPlan.steps[0].minutes * 60, paused: false };
      const panel = $('#execPanel');
      panel.style.display = 'block';
      $('#execStartBtn').style.display = 'none';
      $('#execPauseBtn').style.display = '';
      $('#execPauseBtn').textContent = '暂停';
      $('#execStopBtn').style.display = '';
      loadStep(0);
    }

    let execState = null;
    function loadStep(i) {
      if (i >= currentPlan.steps.length) { finishExec(); return; }
      execState.idx = i;
      execState.remaining = currentPlan.steps[i].minutes * 60;
      const step = currentPlan.steps[i];
      $('#execStepName').textContent = `第 ${i + 1}/${currentPlan.steps.length} 步 · ${stepLabel(step)}`;
      const frame = $('#execFrame');
      frame.src = stepUrl(step);
      execState.lastTick = Date.now();
      if (execTimer) clearInterval(execTimer);
      execTimer = setInterval(tick, 500);
    }

    function tick() {
      if (!execState || execState.paused) return;
      const now = Date.now();
      const dt = (now - execState.lastTick) / 1000;
      execState.lastTick = now;
      execState.remaining -= dt;
      const m = Math.floor(execState.remaining / 60), s = Math.floor(execState.remaining % 60);
      $('#execCountdown').textContent = `剩余 ${m}:${String(s).padStart(2, '0')}`;
      const total = currentPlan.steps[execState.idx].minutes * 60;
      const pct = Math.max(0, Math.min(100, ((total - execState.remaining) / total) * 100));
      $('#execProgress').style.width = pct + '%';
      if (execState.remaining <= 0) {
        Sound.done();
        loadStep(execState.idx + 1);
      }
    }

    function finishExec() {
      if (execTimer) clearInterval(execTimer);
      execTimer = null;
      execState = null;
      const panel = $('#execPanel');
      $('#execFrame').src = 'about:blank';
      $('#execStepName').textContent = '🎉 计划完成！恭喜你完成本次训练。';
      $('#execCountdown').textContent = '';
      $('#execProgress').style.width = '100%';
      $('#execStartBtn').style.display = '';
      $('#execPauseBtn').style.display = 'none';
      $('#execStopBtn').style.display = 'none';
      Sound.good(); Sound.good();
    }

    function stopExec() {
      if (execTimer) clearInterval(execTimer);
      execTimer = null;
      execState = null;
      const panel = $('#execPanel');
      panel.style.display = 'none';
      $('#execFrame').src = 'about:blank';
    }

    $('#execStartBtn').addEventListener('click', startExec);
    $('#execPauseBtn').addEventListener('click', () => {
      if (!execState) return;
      execState.paused = !execState.paused;
      $('#execPauseBtn').textContent = execState.paused ? '继续' : '暂停';
      if (!execState.paused) execState.lastTick = Date.now();
    });
    $('#execStopBtn').addEventListener('click', stopExec);

    /* 初始化 */
    fillModuleSel('basic');
    refreshPlanSel('');
    render();
    const y = $('#currentYear');
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
