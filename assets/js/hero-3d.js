import * as THREE from 'three';
/* ============================================================
 * MindTrainer 首页 hero 3D 场景（Three.js r185）
 * 金属环面结 + 线框叠加 + 粒子星云 + 漂浮小几何体
 * 交互：鼠标拖拽旋转 · 滚轮缩放 · 触屏单指旋转
 * ============================================================ */
(function () {
  'use strict';
  const canvas = document.getElementById('hero3d');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  /* 灯光：紫 + 蓝双点光 + 环境光 */
  const amb = new THREE.AmbientLight(0xffffff, 0.4);
  const key = new THREE.PointLight(0x8b5cf6, 60, 30);
  key.position.set(4, 3, 5);
  const rim = new THREE.PointLight(0x6366f1, 40, 30);
  rim.position.set(-4, -2, -3);
  scene.add(amb, key, rim);

  /* 中央：金属环面结 + 线框叠加 */
  const knotGeo = new THREE.TorusKnotGeometry(1.1, 0.34, 140, 18);
  const knot = new THREE.Mesh(knotGeo, new THREE.MeshStandardMaterial({
    color: 0x8b5cf6, metalness: 0.85, roughness: 0.25, emissive: 0x2a1b5e
  }));
  scene.add(knot);
  const wire = new THREE.Mesh(knotGeo, new THREE.MeshBasicMaterial({
    color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.18
  }));
  scene.add(wire);

  /* 粒子星云：球壳分布 */
  const N = 700;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xc4b5fd, size: 0.05, transparent: true, opacity: 0.8
  }));
  scene.add(stars);

  /* 漂浮小几何体（环 + 多面体交替） */
  const floaters = [];
  for (let i = 0; i < 6; i++) {
    const geo = i % 2 ? new THREE.IcosahedronGeometry(0.22, 0) : new THREE.OctahedronGeometry(0.22, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: i % 2 ? 0x6366f1 : 0xd946ef,
      metalness: 0.7, roughness: 0.3,
      emissive: i % 2 ? 0x1e1b4b : 0x3b0764
    }));
    const a = (i / 6) * Math.PI * 2;
    m.position.set(Math.cos(a) * 2.6, Math.sin(a) * 1.4 - 0.5, (Math.random() - 0.5) * 1.5);
    scene.add(m);
    floaters.push({ m, speed: 0.3 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
  }

  /* 交互：鼠标拖拽旋转 + 滚轮缩放 + 触屏单指旋转 */
  let rotX = 0, rotY = 0, zoom = 8;
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.005;
    rotX += (e.clientY - lastY) * 0.005;
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = Math.max(4.5, Math.min(13, zoom + e.deltaY * 0.004));
  }, { passive: false });
  let touch = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!touch || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touch.x;
    const dy = e.touches[0].clientY - touch.y;
    rotY += dx * 0.006; rotX += dy * 0.006;
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.style.cursor = 'grab';

  /* 尺寸自适应 */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas.parentElement || canvas);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();
  window.__h3d = { renderer, scene, camera }; // 调试钩子

  /* 渲染循环 */
  const clock = new THREE.Clock();
  function loop() {
    // 兜底：尺寸变化自动 resize
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw && ch && (cw !== renderer.domElement.width || ch !== renderer.domElement.height)) resize();
    const t = clock.getElapsedTime();
    knot.rotation.y = rotY + t * 0.15;
    knot.rotation.x = rotX + Math.sin(t * 0.3) * 0.1;
    wire.rotation.copy(knot.rotation);
    stars.rotation.y = t * 0.02;
    floaters.forEach((f) => {
      f.m.position.y += Math.sin(t * f.speed + f.phase) * 0.0012;
      f.m.rotation.x += 0.005;
      f.m.rotation.y += 0.008;
    });
    camera.position.z = zoom;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
})();
