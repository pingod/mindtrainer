/* canvasui-gallery.js — 调度壳
 *
 * 33 个 WebGL 场景已经各自独立成 vendor/canvasui/scenes/<name>.html。
 * 这个文件只做四件事:
 *   1. fetch manifest.json → 构建 sidebar
 *   2. iframe 加载对应场景
 *   3. 定时 autoInteract(按各组件 META.events 合成 postMessage)
 *   4. 自检 / 搜索 / 随机 / 键盘导航
 *
 * 不再做:
 *   - drawSource / setupContent(已搬到各场景 .html)
 *   - refreshOutputCanvas(用 iframe 卸载 = 天然上下文释放)
 *   - WebGL context loss hack(同上)
 *   - 共享 output canvas(每个场景自带,iframe 隔离)
 */

const SCENES_BASE = '/vendor/canvasui/scenes/';
const CATEGORY_ORDER = ['reveal', 'distort', 'atmosphere', 'grid', 'object3d', 'material'];

let manifest = null;
let currentIndex = -1;
let autoTimers = [];
let iframeReady = false;
let pendingAutoEvents = null;  // iframe 未 ready 时先记下,ready 后再发

const $ = (id) => document.getElementById(id);
const listEl = $('galleryList');
const stageFrame = $('stageFrame');
const stageHint = $('stageHint');
const infoName = $('info-name');
const infoDesc = $('info-desc');
const infoErr = $('info-err');
const countEl = $('count');

/* ---- 读 manifest 并构建 sidebar ---- */
async function loadManifest() {
    const res = await fetch(SCENES_BASE + 'manifest.json?v=20260915');
    if (!res.ok) throw new Error('manifest.json 加载失败: ' + res.status);
    manifest = await res.json();
    countEl.textContent = `${manifest.components.length} 组件`;
    buildList();
    selectComponent(0);
}

function buildList() {
    const catLabels = manifest.CATEGORY_LABELS;
    const grouped = {};
    manifest.components.forEach((c, i) => {
        (grouped[c.category] ||= []).push({ c, i });
    });
    const html = [];
    for (const cat of CATEGORY_ORDER) {
        if (!grouped[cat]) continue;
        html.push(`<div class="sidebar-cat">${catLabels[cat]}</div>`);
        for (const { c, i } of grouped[cat]) {
            const short = c.description.split(/[:：]/)[0];
            html.push(
                `<button class="comp-btn" data-index="${i}" data-name="${c.displayName.toLowerCase()}">` +
                `<span>${c.displayName}</span><small>${short}</small></button>`
            );
        }
    }
    listEl.innerHTML = html.join('');
    listEl.querySelectorAll('.comp-btn').forEach((btn) => {
        btn.addEventListener('click', () => selectComponent(+btn.dataset.index));
    });
}

/* ---- 选中并加载一个组件 ---- */
function selectComponent(index) {
    if (index < 0 || index >= manifest.components.length) return;
    currentIndex = index;
    const c = manifest.components[index];

    // active 高亮
    listEl.querySelectorAll('.comp-btn').forEach((b) => b.classList.toggle('active', +b.dataset.index === index));
    listEl.querySelector(`.comp-btn[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    infoName.textContent = c.displayName;
    infoDesc.textContent = c.description;
    infoErr.textContent = '';

    // 提示
    stageHint.classList.add('show');
    setTimeout(() => stageHint.classList.remove('show'), 2500);

    // 清空 autoInteract
    autoTimers.forEach(clearTimeout);
    autoTimers = [];

    // 先通知旧场景销毁。浏览器对 WebGL 上下文是异步 GC 的，只换 src 不会
    // 立即释放；连续切换（尤其自检连跑 33 个）会撞上 Chrome 约 16 个活跃
    // 上下文上限，之后场景全黑。33 个场景都写了 mt:destroy 分支，但画廊
    // 原先从不发这个消息，那些分支一直是死代码。
    try { stageFrame.contentWindow?.postMessage({ type: 'mt:destroy' }, location.origin); } catch (_) {}

    // 加载场景
    iframeReady = false;
    pendingAutoEvents = c.events;
    const params = new URLSearchParams({ content: c.content });
    stageFrame.src = `${SCENES_BASE}${c.name}.html?${params}`;
}

/* postMessage 统一走本站 origin，并校验来源。
   原先一律用 '*' 发送、且 message 监听不校验 e.origin。 */
function post(msg) {
    try { stageFrame.contentWindow?.postMessage(msg, location.origin); } catch (_) {}
}
function fromSelf(e) {
    return e.origin === location.origin;
}

/* ---- iframe ready 回调 ---- */
window.addEventListener('message', (e) => {
    if (!fromSelf(e)) return;
    const m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'mt:ready') {
        iframeReady = true;
        if (pendingAutoEvents) {
            scheduleAutoInteract(pendingAutoEvents);
            pendingAutoEvents = null;
        }
    } else if (m.type === 'mt:error') {
        infoErr.textContent = `${m.name}: ${m.message}`;
    }
});

/* ---- autoInteract(替代旧版的合成事件逻辑)----
 * 旧逻辑:在主页面把 PointerEvent dispatch 到 output canvas + content div
 * 新逻辑:合成相同事件,但通过 postMessage 推到 iframe,iframe 内部再 dispatch 到它的 output/content
 */
function scheduleAutoInteract(events) {
    if (!events || !events.length) return;
    const frame = stageFrame;
    const send = (msg) => post(msg);
    const rect = () => frame.getBoundingClientRect();
    const cx = () => rect().left + rect().width / 2;
    const cy = () => rect().top + rect().height / 2;
    const has = (t) => events.includes(t);

    if (has('pointermove')) {
        autoTimers.push(setTimeout(() => send({ type: 'mt:pointer', kind: 'pointermove', x: cx(), y: cy() }), 250));
    }
    if (has('pointerdown') || has('pointerup') || has('click')) {
        autoTimers.push(setTimeout(() => {
            if (has('pointerdown')) send({ type: 'mt:pointer', kind: 'pointerdown', x: cx(), y: cy() });
            if (has('pointerup'))   send({ type: 'mt:pointer', kind: 'pointerup',   x: cx(), y: cy() });
            if (has('click'))       send({ type: 'mt:click',    x: cx(), y: cy() });
        }, 600));
    }
    if (has('pointermove')) {
        autoTimers.push(setTimeout(() => {
            send({ type: 'mt:pointer', kind: 'pointermove',
                x: cx() + Math.min(120, rect().width * .2),
                y: cy() - Math.min(60, rect().height * .15) });
        }, 1100));
    }
    if (has('scroll')) {
        // 推送 scroll 进度(0→max→0)给 iframe 内的 scroll 形态 content
        const total = 16;
        for (let i = 0; i < total; i++) {
            const frac = Math.sin((i / (total - 1)) * Math.PI);
            autoTimers.push(setTimeout(() => {
                // 父页面不知道 iframe 内 scrollHeight,先按 w*2 估算最大滚动量
                send({ type: 'mt:scroll', y: rect().height * 2 * frac });
            }, 450 + i * 130));
        }
    }
}

/* ---- 搜索 ---- */
$('gallerySearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    listEl.querySelectorAll('.comp-btn').forEach((btn) => {
        btn.style.display = !q || btn.dataset.name.includes(q) ? '' : 'none';
    });
    listEl.querySelectorAll('.sidebar-cat').forEach((cat) => {
        let n = cat.nextElementSibling, has = false;
        while (n && !n.classList.contains('sidebar-cat')) {
            if (n.style.display !== 'none') { has = true; break; }
            n = n.nextElementSibling;
        }
        cat.style.display = has ? '' : 'none';
    });
});

/* ---- 随机 ---- */
$('randomBtn').addEventListener('click', () => {
    if (!manifest) return;
    let idx;
    do { idx = Math.floor(Math.random() * manifest.components.length); }
    while (idx === currentIndex && manifest.components.length > 1);
    selectComponent(idx);
});

/* ---- 键盘导航 ---- */
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (!manifest) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        selectComponent(Math.min(currentIndex + 1, manifest.components.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        selectComponent(Math.max(currentIndex - 1, 0));
    } else if (e.key === 'r' || e.key === 'R') {
        $('randomBtn').click();
    }
});

/* ---- 自检:依次加载,iframe.load 成功 + 短超时无 error 算通过 ---- */
const stEl = $('selftest');
const stBody = $('stBody');
const stSum = $('stSum');
const stClose = $('stClose');
stClose.addEventListener('click', () => stEl.classList.remove('show'));
stEl.addEventListener('click', (e) => { if (e.target === stEl) stEl.classList.remove('show'); });

async function runSelfTest() {
    stEl.classList.add('show');
    stBody.innerHTML = '';
    let ok = 0, bad = 0;

    for (let i = 0; i < manifest.components.length; i++) {
        const c = manifest.components[i];
        stSum.textContent = `检测中 ${i + 1}/${manifest.components.length}…`;

        const problem = await new Promise((resolve) => {
            const TIMEOUT_MS = 2500;
            let resolved = false;
            const onMsg = (e) => {
                if (!fromSelf(e)) return;
                const m = e.data;
                if (!m || m.name !== c.name) return;
                if (m.type === 'mt:ready') { resolved = true; cleanup(); resolve(null); }
                else if (m.type === 'mt:error') { resolved = true; cleanup(); resolve(m.message); }
            };
            function cleanup() { window.removeEventListener('message', onMsg); }
            window.addEventListener('message', onMsg);
            selectComponent(i);
            setTimeout(() => { if (!resolved) { cleanup(); resolve('超时(' + TIMEOUT_MS + 'ms)无 mt:ready'); } }, TIMEOUT_MS);
        });

        const cls = problem ? 'st-bad' : 'st-ok';
        const mark = problem ? '✕' : '✓';
        problem ? bad++ : ok++;
        const row = document.createElement('div');
        row.className = 'st-row';
        row.innerHTML =
            `<span class="${cls}">${mark}</span>` +
            `<span class="st-name">${c.displayName}</span>` +
            `<span class="st-msg">${problem ? String(problem).replace(/</g, '&lt;') : '正常'}</span>`;
        stBody.appendChild(row);
        stBody.scrollTop = stBody.scrollHeight;
    }

    stSum.textContent = `正常 ${ok} · 失败 ${bad}`;
}

$('selftestBtn').addEventListener('click', runSelfTest);

/* ---- 窗口大小变化:通知 iframe ---- */
window.addEventListener('resize', () => {
    post({ type: 'mt:resize' });
});

/* ---- init ---- */
loadManifest().catch((e) => {
    infoErr.textContent = 'manifest 加载失败: ' + e.message;
    console.error(e);
});
