# MindTrainer — 脑力训练场

认知测试 + 速读训练一体化的纯前端 Web 应用（无构建，静态文件直接部署）。

## 项目组成

### 1. PickTests 复刻（认知测试，9 页 × 中英双语）
- **Reaction Time** 反应时间（1/5 轮模式、柱状图、历史记录 localStorage）
- **Aim Trainer** 瞄准训练
- **Sequence Memory** 序列记忆（Simon 式）
- **Number Memory** 数字记忆（难度递进）
- **Multiple Object Tracking** 多目标追踪
- **Stroop** 斯特鲁普色词干扰
- 首页 / 关于 / 隐私政策 / 使用条款（中英双语）

### 2. 飞克视读 Web 重写（速读训练，`/speed-read/`）
> 原「飞克视读」（上海 fiercelc 团队，2009–2023）为 Delphi 速读训练软件，含基础训练 26 项、闪视训练、速读训练、照相记忆、冥想、训练计划。此处用 HTML5 Canvas + Web Audio 全量重写。

| 模块 | 页面 | 内容 |
|---|---|---|
| 基础训练 | `basic.html` | 26 项：视野扩展（发散箭头/扩大方框/左右上下四周拓宽/整体符号…）、文字移动、眼动训练（水平/垂直/星形/圆周/8字/曲线移动）、凝视训练（一点/方形/集中）、视读表（英文/数字/汉字舒尔特表） |
| 闪视训练 | `flash.html` | 6 项：数字/字母/随机汉字/组合/文章/图片闪视，支持测试题（4 选 1）、回放、手动显示、字数自动增长、文字旋转 |
| 速读训练 | `speed.html` | 4 模块：字块移动、视野扩展（镜像/两侧/逐字）、阅读训练、实战训练（模拟书刊排版），支持文章选择/剪贴板/竖排/倒立/眼停眼跳 |
| 照相记忆 | `photo.html` | 8 项：三色卡、几何卡、黄卡、曼陀罗（程序生成+填充切换）、3D 卡、图片浏览、记忆训练（文字找同/图片位置记忆）、瞬间计算 |
| 冥想训练 | `meditation.html` | 双脑同步声频（Web Audio 双耳节拍 5 档 δ/θ/α/β/γ）+ 呼吸引导（4-4-4-4 / 4-7-8）+ 曼陀罗动画 |
| 训练计划 | `plan.html` | 自定义步骤序列、保存/导入/导出、iframe 一键按序执行 + 倒计时自动切换 |

- 每项训练还原帮助文档中的训练方法说明
- 训练页支持 `?train=id` URL 直达（计划执行器使用）
- 键盘：空格 开始/暂停、↑↓ 调速、Esc 退出全屏

## 技术栈
- 纯静态 HTML + CSS + Vanilla JS（与原站一致，无框架、无构建）
- 本地资源，无任何外部依赖（无 CDN、无统计脚本）

## 本地运行
```bash
cd mindtrainer && python3 -m http.server 8082
# 打开 http://127.0.0.1:8082/
```

## 生产部署（与 unitale 共用 openresty 容器，独立端口）
已配置为 openresty（`unitale` 容器）的**独立端口**站点，与 unitale 端口完全隔离：

| 站点 | HTTP | HTTPS |
|---|---|---|
| unitale | `http://192.168.1.5:8081` | `https://192.168.1.5:8443` |
| **MindTrainer** | `http://192.168.1.5:8082` | `https://192.168.1.5:8444` |

- 实现：`unitale/nginx/nginx.conf` 新增独立 `server` 块（listen 8082 / 8444 ssl，root 指向容器 `/usr/share/nginx/mindtrainer`）；`unitale/nginx/start.sh` 挂载 `~/githome/mindtrainer -> /usr/share/nginx/mindtrainer:ro` 并映射 `-p 8082:8082 -p 8444:8444`
- HTTPS（8444）提供安全上下文，速读训练的「读取剪贴板」可用
- 更新部署：改完代码后 `docker restart unitale` 即可（nginx.conf 改动需 `cd unitale && ./nginx/start.sh start` 重建刷新挂载）

## 目录结构
```
├── index.html               # 英文首页
├── zh/                      # 中文版
├── about/ privacy-policy/ terms-of-use/
├── reaction-time-test/ aim-trainer/ sequence-memory-test/
├── number-memory-test/ multiple-object-tracking-test/ stroop-test/
├── speed-read/              # 飞克视读训练中心（Web 重写）
└── assets/ css/ js/ images/
```
