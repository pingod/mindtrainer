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
- [开发中]

## 技术栈
- 纯静态 HTML + CSS + Vanilla JS（与原站一致，无框架、无构建）
- 本地资源，无任何外部依赖（无 CDN、无统计脚本）

## 本地运行
```bash
cd mindtrainer && python3 -m http.server 8082
# 打开 http://127.0.0.1:8082/
```

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
