# Interactive Music Generator

这是一个基于计算机视觉的交互式音乐生成器。通过摄像头识别特定物品，根据物品的位置和特征实时生成音乐。

## 功能特点

- 实时摄像头视频流处理
- 物品识别和追踪
- 基于物品位置和特征的实时音乐生成
- 可自定义音色、音高和节奏型

## 技术栈

- TensorFlow.js - 用于物品识别
- Web Audio API - 用于音频生成
- MediaDevices API - 用于摄像头访问
- Canvas API - 用于视频处理和可视化

## 安装和运行

1. 克隆项目到本地：
```bash
git clone [项目地址]
cd interactive-music-generator
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 在浏览器中访问：
```
http://localhost:3000
```

## 使用说明

1. 允许浏览器访问摄像头
2. 将特定物品（如乐高积木、玩具等）放置在摄像头视野中
3. 物品的垂直位置（Y坐标）控制音高
4. 物品的水平位置（X坐标）控制节奏型
5. 物品的特征（如颜色、形状）控制音色

## 开发环境要求

- Node.js 14.0 或更高版本
- 现代浏览器（Chrome、Firefox、Safari等）
- 摄像头设备

## 项目结构

```
interactive-music-generator/
├── public/              # 静态资源
├── src/                 # 源代码
│   ├── components/      # UI组件
│   ├── models/          # 机器学习模型
│   ├── audio/           # 音频处理
│   └── utils/           # 工具函数
├── package.json         # 项目依赖
└── README.md           # 项目文档
```

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 许可证

MIT License 