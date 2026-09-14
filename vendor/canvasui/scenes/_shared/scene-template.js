/* scene-template.js — 独立场景 .html 的生成模板
 *
 * 思路:每个 .html 都是同构的 5 段:
 *   1. HTML 骨架(头/三个 canvas/div#content)
 *   2. importmap 共享 three.js
 *   3. 导入组件 .js 工厂
 *   4. 读 URL query + postMessage 初始化组件
 *   5. 上报 ready / 错误给父页面
 *
 * 这个文件被 build-scenes.mjs 读取后注入到每个生成的 .html。
 * 直接看 build-scenes.mjs 比读这个文件更清楚。
 */

export const SCENE_HTML_TEMPLATE = (opts) => `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>${opts.displayName} — CanvasUI Scene</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>${opts.sharedCss}</style>
    <script type="importmap">
    {
        "imports": {
            "three": "/vendor/canvasui-three/three.module.min.js",
            "three/addons/": "/vendor/canvasui-three/"
        }
    }
    </script>
</head>
<body>
    <canvas id="source"></canvas>
    <div id="content"></div>
    <canvas id="output"></canvas>

    <script type="module">
        import { create${opts.createName} } from '/assets/js/canvasui/${opts.name}.js?v=20260915';

        const params = new URLSearchParams(location.search);
        const TITLE = params.get('title') || 'MINDTRAINER';
        const SUBTITLE = params.get('subtitle') || '选一个测试 · 挑一个现在就测';
        const BG = params.get('bg') || '#0a0e1a';
        const CONTENT_MODE = params.get('content') || '${opts.content}';

        const sourceEl = document.getElementById('source');
        const contentEl = document.getElementById('content');
        const outputEl = document.getElementById('output');
        const IS_OBJECT_3D = ${opts.isObject3D};

        /* ---- 画 source canvas:深色基底 + 渐变 + 网格 + 文字 ---- */
        function drawSource() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = sourceEl.clientWidth || window.innerWidth;
            const h = sourceEl.clientHeight || window.innerHeight;
            if (!w || !h) return;
            sourceEl.width = Math.round(w * dpr);
            sourceEl.height = Math.round(h * dpr);
            const ctx = sourceEl.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, w, h);
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#111d3a');
            g.addColorStop(.45, BG);
            g.addColorStop(1, '#191024');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            const gl = ctx.createRadialGradient(w * .12, h * .18, 0, w * .12, h * .18, Math.max(w, h) * .55);
            gl.addColorStop(0, 'rgba(59,130,246,.30)');
            gl.addColorStop(1, 'rgba(59,130,246,0)');
            ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
            const gr = ctx.createRadialGradient(w * .9, h * .85, 0, w * .9, h * .85, Math.max(w, h) * .55);
            gr.addColorStop(0, 'rgba(139,92,246,.24)');
            gr.addColorStop(1, 'rgba(139,92,246,0)');
            ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(148,163,184,.12)';
            ctx.lineWidth = Math.max(1, Math.round(dpr));
            const step = Math.max(34, Math.round(Math.min(w, h) * .052));
            for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
            const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e'];
            const sh = Math.max(24, Math.round(h * .055));
            const gap = Math.max(14, Math.round(w * .012));
            const sw = sh, sy = h * .76;
            let sx = w * .055;
            for (const c of colors) {
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.roundRect(sx, sy, sw, sh, Math.round(sw * .24));
                ctx.fill();
                sx += sw + gap;
            }
            ctx.fillStyle = '#f1f5f9';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '800 ' + Math.round(Math.min(w * .058, 58)) + 'px -apple-system, sans-serif';
            ctx.fillText(TITLE, w / 2, h * .40);
            ctx.font = '500 ' + Math.round(Math.min(w * .021, 19)) + 'px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(241,245,249,.55)';
            ctx.fillText(SUBTITLE, w / 2, h * .40 + Math.max(30, h * .048));
        }

        /* ---- 配置 #content(card 或 scroll)---- */
        function setupContent() {
            if (CONTENT_MODE === 'scroll') {
                contentEl.classList.add('scroll');
                contentEl.innerHTML = '<div class="scene-demo">'
                    + '选一个测试 · 挑一个现在就测<br>MINDTRAINER<br>'
                    + ('—— 认知测试 ——<br>'.repeat(16))
                    + '反应时间 · 瞄准 · 序列记忆 · 数字记忆 · 多目标追踪 · 斯特鲁普</div>';
                contentEl.scrollTop = 0;
            } else {
                contentEl.classList.remove('scroll');
                contentEl.innerHTML = 'MINDTRAINER<br>选一个测试';
            }
        }

        /* ---- 启动组件 ---- */
        let inst = null;
        function start() {
            try {
                if (IS_OBJECT_3D) {
                    inst = create${opts.createName}({ canvas: outputEl }, { src: '/vendor/canvasui-three/models/Box.glb', autoRotate: true, autoRotateSpeed: 1.5 });
                } else {
                    setupContent();
                    drawSource();
                    inst = create${opts.createName}({ source: sourceEl, content: contentEl, output: outputEl }, ${opts.defaultOptionsLiteral});
                }
                if (inst) {
                    // 延后 800ms 再报 ready — 覆盖大多数组件的 init/shader 编译时延
                    setTimeout(() => parent?.postMessage({ type: 'mt:ready', name: '${opts.name}' }, location.origin), 800);
                } else {
                    parent?.postMessage({ type: 'mt:error', name: '${opts.name}', message: 'create 返回 null' }, location.origin);
                }
            } catch (e) {
                parent?.postMessage({ type: 'mt:error', name: '${opts.name}', message: (e && e.message) || String(e) }, location.origin);
                console.error('[Scene:${opts.name}]', e);
            }
        }

        /* ---- 等 layout 稳定后启动 ---- */
        requestAnimationFrame(() => requestAnimationFrame(start));

        /* ---- 父页面通信桥 ---- */
        window.addEventListener('message', (e) => {
            // 只接受本站父页面的指令。原先不校验来源，任意第三方页面都能
            // 往场景里注入 mt:pointer / mt:click / mt:destroy。
            if (e.origin !== location.origin) return;
            const m = e.data;
            if (!m || typeof m !== 'object') return;
            if (m.type === 'mt:resize') {
                if (!IS_OBJECT_3D) drawSource();
                try { inst?.resize?.(); } catch (_) {}
            } else if (m.type === 'mt:pointer') {
                const kind = m.kind || 'pointermove';
                const x = m.x ?? 0, y = m.y ?? 0;
                const pt = { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, isPrimary: true };
                for (const t of IS_OBJECT_3D ? [outputEl] : [outputEl, contentEl]) {
                    try { t.dispatchEvent(new PointerEvent(kind, pt)); } catch (_) {}
                }
            } else if (m.type === 'mt:click') {
                const x = m.x ?? 0, y = m.y ?? 0;
                for (const t of [outputEl, contentEl]) {
                    try { t.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true })); } catch (_) {}
                }
            } else if (m.type === 'mt:scroll') {
                if (contentEl) contentEl.scrollTop = m.y ?? 0;
            } else if (m.type === 'mt:destroy') {
                try { inst?.destroy?.(); } catch (_) {}
                const gl = outputEl.getContext('webgl2') || outputEl.getContext('webgl');
                gl?.getExtension('WEBGL_lose_context')?.loseContext();
                inst = null;
            }
        });

        /* ---- 父页面大小变化 → 转发 mt:resize ---- */
        const ro = new ResizeObserver(() => {
            if (!IS_OBJECT_3D) drawSource();
            try { inst?.resize?.(); } catch (_) {}
        });
        ro.observe(outputEl);
    </script>
</body>
</html>
`;
