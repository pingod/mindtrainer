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
  const MAX_PLAN_STEPS = 50;
  const MAX_STEP_MINUTES = 120;
  const MAX_IMPORT_BYTES = 128 * 1024;

  function planName(value, fallback) {
    const name = typeof value === 'string' ? value.trim().slice(0, 40) : '';
    return name || fallback;
  }

  function normalizeStep(value) {
    if (!value || typeof value !== 'object') return null;
    const module = typeof value.module === 'string' ? value.module : '';
    const catalog = CATALOG[module];
    const train = typeof value.train === 'string' ? value.train : '';
    if (!catalog || !catalog.trains.some(item => item[0] === train)) return null;
    const minutes = Number(value.minutes);
    if (!Number.isFinite(minutes)) return null;
    return {
      module,
      train,
      label: typeof value.label === 'string' ? value.label.trim().slice(0, 60) : '',
      minutes: Math.min(MAX_STEP_MINUTES, Math.max(1, Math.round(minutes)))
    };
  }

  function normalizePlan(value, fallbackName) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.steps)) return null;
    const source = value.steps.slice(0, MAX_PLAN_STEPS);
    const steps = source.map(normalizeStep).filter(Boolean);
    return {
      name: planName(value.name, fallbackName),
      steps,
      rejected: value.steps.length - steps.length
    };
  }

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

  function loadPlans() {
    const stored = Store.get('plans', []);
    if (!Array.isArray(stored)) return [];
    return stored.slice(0, 100).map((plan, index) => {
      return normalizePlan(plan, '训练计划 ' + (index + 1));
    }).filter(Boolean).map(plan => ({ name: plan.name, steps: plan.steps }));
  }

  function savePlans(plans) {
    const safePlans = Array.isArray(plans) ? plans.slice(0, 100).map((plan, index) => {
      return normalizePlan(plan, '训练计划 ' + (index + 1));
    }).filter(Boolean).map(plan => ({ name: plan.name, steps: plan.steps })) : [];
    Store.set('plans', safePlans);
  }

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
    const planStatus = $('#planStatus');

    let currentPlan = { name: '我的训练计划', steps: DEFAULTS.map(s => Object.assign({}, s)) };

    function setPlanStatus(message, isError) {
      if (!planStatus) return;
      planStatus.textContent = message;
      planStatus.classList.remove('is-error');
      if (isError) planStatus.classList.add('is-error');
    }

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
      if (currentPlan.steps.length >= MAX_PLAN_STEPS) {
        setPlanStatus(`单个计划最多可添加 ${MAX_PLAN_STEPS} 个步骤。`, true);
        Sound.err();
        return;
      }
      const mod = moduleSel.value;
      const train = trainSel.value;
      const minutes = Math.min(MAX_STEP_MINUTES, Math.max(1, parseInt(minuteInput.value, 10) || 3));
      minuteInput.value = minutes;
      currentPlan.steps.push({ module: mod, train, label: '', minutes });
      setPlanStatus('');
      render();
      Sound.ok();
    }
    addBtn.addEventListener('click', addStep);

    /* 保存计划 */
    function savePlan() {
      currentPlan.name = planName(nameInput.value, '我的训练计划');
      const plans = loadPlans();
      const existing = plans.findIndex(p => p.name === currentPlan.name);
      const copy = { name: currentPlan.name, steps: currentPlan.steps.map(s => Object.assign({}, s)) };
      if (existing >= 0) plans[existing] = copy;
      else plans.push(copy);
      savePlans(plans);
      refreshPlanSel(currentPlan.name);
      setPlanStatus('计划已保存。');
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
      const file = importFile.files[0];
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) {
        setPlanStatus('导入失败：计划文件不能超过 128 KB。', true);
        importFile.value = '';
        Sound.err();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const plan = normalizePlan(JSON.parse(reader.result), '导入计划');
          if (!plan || (plan.steps.length === 0 && plan.rejected > 0)) {
            setPlanStatus('导入失败：文件中没有可用的训练步骤。', true);
            Sound.err();
            return;
          }
          currentPlan = { name: plan.name, steps: plan.steps };
          render();
          setPlanStatus(plan.rejected
            ? `已导入 ${plan.steps.length} 个步骤，已忽略 ${plan.rejected} 个无效或超出范围的步骤。`
            : `已导入 ${plan.steps.length} 个步骤。`);
          Sound.ok();
        } catch (e) {
          setPlanStatus('导入失败：请选择格式正确的训练计划 JSON 文件。', true);
          Sound.err();
        } finally {
          importFile.value = '';
        }
      };
      reader.onerror = () => {
        setPlanStatus('导入失败：无法读取该文件。', true);
        importFile.value = '';
        Sound.err();
      };
      reader.readAsText(file);
    });

    /* 执行计划 */
    let execTimer = null;
    execBtn.addEventListener('click', () => {
      if (execTimer) { stopExec(); return; }
      if (currentPlan.steps.length === 0) { Sound.err(); return; }
      startExec();
    });

    function startExec() {
      currentPlan.name = planName(nameInput.value, '我的训练计划');
      execState = { idx: 0, remaining: currentPlan.steps[0].minutes * 60, paused: false };
      const panel = $('#execPanel');
      panel.style.display = 'block';
      $('#execStartBtn').hidden = true;
      $('#execPauseBtn').hidden = false;
      $('#execPauseBtn').textContent = '暂停';
      $('#execStopBtn').hidden = false;
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
      armDeadline();
      if (execTimer) clearInterval(execTimer);
      execTimer = setInterval(tick, 500);
    }

    /* 用 performance.now() 的截止时刻计时。
       原先是 Date.now() 差值累加：后台标签页里 setInterval 会被节流到 ≥1s，
       且 Date.now() 受系统时钟调整影响，两者叠加会让训练时长系统性偏长。 */
    function armDeadline() {
      if (!execState) return;
      execState.deadline = performance.now() + execState.remaining * 1000;
    }

    function tick() {
      if (!execState || execState.paused) return;
      execState.remaining = Math.max(0, (execState.deadline - performance.now()) / 1000);
      const m = Math.floor(execState.remaining / 60), s = Math.floor(execState.remaining % 60);
      $('#execCountdown').textContent = `剩余 ${m}:${String(s).padStart(2, '0')}`;
      const total = currentPlan.steps[execState.idx].minutes * 60;
      const pct = Math.max(0, Math.min(100, ((total - execState.remaining) / total) * 100));
      $('#execProgress').style.width = pct + '%';
      if (execState.remaining <= 0) {
        if (execTimer) { clearInterval(execTimer); execTimer = null; }
        Sound.safe(() => Sound.done());
        loadStep(execState.idx + 1);
      }
    }

    function finishExec() {
      if (execTimer) clearInterval(execTimer);
      execTimer = null;
      execState = null;
      $('#execFrame').src = 'about:blank';
      $('#execStepName').textContent = '🎉 计划完成！恭喜你完成本次训练。';
      $('#execCountdown').textContent = '';
      $('#execProgress').style.width = '100%';
      $('#execStartBtn').hidden = false;
      $('#execPauseBtn').hidden = true;
      $('#execStopBtn').hidden = true;
      Sound.good(); Sound.good();
    }

    function stopExec() {
      if (execTimer) clearInterval(execTimer);
      execTimer = null;
      execState = null;
      $('#execFrame').src = 'about:blank';
      const panel = $('#execPanel');
      panel.style.display = 'none';
    }

    $('#execStartBtn').addEventListener('click', startExec);
    $('#execPauseBtn').addEventListener('click', () => {
      if (!execState) return;
      execState.paused = !execState.paused;
      $('#execPauseBtn').textContent = execState.paused ? '继续' : '暂停';
      if (!execState.paused) armDeadline();   // 继续时按剩余量重设截止时刻
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
