#!/usr/bin/env node
/* build-scenes.mjs
 *
 * 从 manifest.json + 旧 .js 文件中提取每个组件的默认 options,
 * 用 scene-template.js 渲染 33 个独立的 .html 场景。
 *
 * 用法:
 *   node vendor/canvasui/scenes/_shared/build-scenes.mjs
 *
 * 二次运行时:只重写 .html,不动 .js 也不动 manifest。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
const sharedCss = fs.readFileSync(path.join(__dirname, 'scene-base.css'), 'utf8');
const tplModule = await import('./scene-template.js');
const TEMPLATE = tplModule.SCENE_HTML_TEMPLATE;

/* ---- 从旧 .js 里提取 options 对象字面量 ----
 * 旧 gallery.html 里有一张 COMPONENT_OPTIONS 表,我们直接读它,而不是分析每个 .js。
 * 但 .js 里没有 default options 表,所以退而求其次:
 *   - 有 user 提供固定 opts 的组件:剥 manifest 的 description
 *   - 没传的:不传 options(由组件走内部默认)
 *
 * 为简化:第一个版本只传空 options {},后续按需补。
 */
function defaultOptionsFor(/* name */) {
    return {};  // 组件 .js 内部已有默认
}

function optionsToLiteral(opts) {
    if (!opts || Object.keys(opts).length === 0) return '{}';
    return JSON.stringify(opts, null, 2).replace(/\n/g, '\n            ');
}

const outDir = path.join(__dirname, '..');
let written = 0;
for (const c of manifest.components) {
    if (!c.isObject3D) {
        // 非 object3d 组件:确认 .js 存在且导出 create<Name>
        const jsPath = path.join(ROOT, 'assets', 'js', 'canvasui', `${c.name}.js`);
        if (!fs.existsSync(jsPath)) {
            console.warn(`SKIP ${c.name}: .js not found`);
            continue;
        }
    }
    const html = TEMPLATE({
        name: c.name,
        createName: c.createName,
        displayName: c.displayName,
        isObject3D: c.isObject3D,
        content: c.content,
        sharedCss,
        defaultOptionsLiteral: optionsToLiteral(defaultOptionsFor(c.name)),
    });
    const outPath = path.join(outDir, `${c.name}.html`);
    fs.writeFileSync(outPath, html);
    written++;
}

console.log(`✓ Generated ${written} scene HTML files in ${outDir}`);
