/* ============================================================================
 * MindTrainer — CanvasUI 统一生命周期
 *
 * 此前 33 个组件各写一份生命周期：ResizeObserver、IntersectionObserver、
 * document.visibilitychange、prefers-reduced-motion、WebGL 上下文丢失、销毁清理。
 * 而且分成两套实现 —— 28 个 WebGL 组件一套，5 个 three.js 组件一套 ——
 * 结果同一件事有 6 处行为不一致，其中最要命的两条：
 *
 *   1. three.js 那 5 个组件完全没有 visibilitychange，标签页切到后台后
 *      setAnimationLoop 仍在跑（三分之一的组件白耗 GPU 与电量）；
 *   2. 28 个 WebGL 组件的 visibilitychange 与 webglcontextlost 监听从未在
 *      destroy() 里摘掉 —— 画廊每切换一次场景就泄漏两个监听器，
 *      切换 50 次就是 100 个闭包一直挂在 document 上。
 *
 * 这个文件是唯一的一份实现。组件只负责“什么时候画、画什么”，
 * “什么时候该画、什么时候该停、什么时候该收拾干净”全部在这里。
 * ========================================================================== */

/** 设备像素比上限。33 个组件此前各自内联同一行，上限统一为 2。 */
export function getDpr(max = 2) {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, max);
}

/** 当前是否偏好减少动效。 */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* -------------------------------------------------------------------------
 * WebGL 上下文丢失浮层
 *
 * GPU 重置、驱动崩溃、同页上下文数量超限都会触发。此前全库 0 处处理，
 * 一旦丢失就是永久黑屏且控制台无任何提示。丢失后 program / texture / FBO
 * 全部失效，无法就地重建，只能明确告知用户刷新 —— 所以这里只做提示。
 * 浮层全局唯一，30 多个组件同时丢失也只出现一个。
 * ---------------------------------------------------------------------- */
let ctxLostTip = null;
let ctxLostHolders = 0;
const CTX_LOST_TEXT = "图形上下文已丢失，请刷新页面";

export function showContextLostTip(message) {
  if (typeof document === "undefined") return;
  const text = message || CTX_LOST_TEXT;
  ctxLostHolders += 1;
  if (!ctxLostTip) {
    ctxLostTip = document.createElement("div");
    ctxLostTip.id = "mt-gl-lost";
    ctxLostTip.setAttribute("role", "alert");
    ctxLostTip.style.cssText =
      "position:fixed;inset:0;display:flex;align-items:center;" +
      "justify-content:center;text-align:center;padding:24px;" +
      "font:500 14px -apple-system,BlinkMacSystemFont,sans-serif;" +
      "color:#94a3b8;background:rgba(11,15,20,.88);z-index:9";
    document.body.appendChild(ctxLostTip);
  }
  ctxLostTip.textContent = text;
}

/* 引用计数：同一页可能有多个组件同时丢失上下文，只有最后一个离场才撤掉浮层，
   否则画廊切换场景会把还在报错的另一个组件的提示一并抹掉。 */
export function hideContextLostTip() {
  ctxLostHolders = Math.max(0, ctxLostHolders - 1);
  if (ctxLostHolders === 0 && ctxLostTip) {
    ctxLostTip.remove();
    ctxLostTip = null;
  }
}

/* -------------------------------------------------------------------------
 * createLifecycle
 *
 * 组件把“该动的时候怎么动”交进来，其余全部由这里负责：
 *   · ResizeObserver      —— target（＋ watch 里的额外元素）
 *   · IntersectionObserver—— target 进出视口
 *   · visibilitychange    —— 标签页前后台
 *   · prefers-reduced-motion —— 变化时回调
 *   · webglcontextlost    —— 仅在传入 gl 时挂载
 *   · destroy()           —— 上面每一项都会摘干净
 *
 * 可见性策略只有一条：进入视口 **且** 标签页在前台 = 可见。
 * 由不可见变可见时调 onShow，反之调 onHide，只在状态真正翻转时触发。
 * ---------------------------------------------------------------------- */
export function createLifecycle(options = {}) {
  const {
    target,
    watch = [],
    observeViewport = true,
    onResize,
    onShow,
    onHide,
    onMotionChange,
    gl,
    contextLostMessage
  } = options;

  if (!target) throw new Error("createLifecycle: 缺少 target");

  let inView = true;                                     // IO 尚未回调前视为在视口内
  let tabVisible = typeof document === "undefined" ? true : !document.hidden;
  let destroyed = false;
  let lastEffective = null;                              // 首次 sync 一定触发一次 onShow
  const teardown = [];

  const isVisible = () => inView && tabVisible && !destroyed;

  function sync() {
    if (destroyed) return;
    const next = isVisible();
    if (next === lastEffective) return;
    lastEffective = next;
    if (next) { if (onShow) onShow(); }
    else if (onHide) onHide();
  }

  /* ---- 尺寸 ---- */
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (destroyed) return;
      if (onResize) onResize();
    });
    ro.observe(target);
    for (const el of watch) if (el) ro.observe(el);
    teardown.push(() => ro.disconnect());
  }

  /* ---- 进出视口 ---- */
  if (observeViewport && typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1]?.isIntersecting ?? true;
      sync();
    });
    io.observe(target);
    teardown.push(() => io.disconnect());
  }

  /* ---- 标签页前后台 ---- */
  if (typeof document !== "undefined") {
    const onVisibility = () => { tabVisible = !document.hidden; sync(); };
    document.addEventListener("visibilitychange", onVisibility);
    teardown.push(() => document.removeEventListener("visibilitychange", onVisibility));
  }

  /* ---- 减少动效 ---- */
  if (typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMqChange = () => { if (!destroyed && onMotionChange) onMotionChange(); };
    mq.addEventListener("change", onMqChange);
    teardown.push(() => mq.removeEventListener("change", onMqChange));
  }

  /* ---- WebGL 上下文丢失 ---- */
  let ownsTip = false;
  if (gl) {
    const onLost = (event) => {
      // preventDefault 是允许浏览器恢复上下文的前提，必须调用
      event.preventDefault();
      if (onHide) onHide();
      showContextLostTip(contextLostMessage);
      ownsTip = true;
    };
    target.addEventListener("webglcontextlost", onLost);
    teardown.push(() => target.removeEventListener("webglcontextlost", onLost));
  }

  if (onResize) onResize();

  return {
    isVisible,
    resize() { if (!destroyed && onResize) onResize(); },
    /** 手动标为可见（例如组件自己知道已经挂到页面上） */
    show() { inView = true; tabVisible = true; sync(); },
    /** 手动标为不可见 */
    hide() { inView = false; sync(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const off of teardown.splice(0)) off();
      if (ownsTip) { ownsTip = false; hideContextLostTip(); }
    }
  };
}
