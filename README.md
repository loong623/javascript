# Interactive Music Generator 交互式音乐生成器

## Introduction 简介

This is an interactive music generator based on computer vision. Through camera object recognition, it generates music in real-time according to the position and movement characteristics of objects. The system uses an advanced sequencer architecture with adaptive glide control and intelligent noise cancellation technology.

这是一个基于计算机视觉的交互式音乐生成器。通过摄像头识别特定物品，根据物品的位置和移动特征实时生成音乐。系统采用先进的音序器架构，具备自适应滑音控制和智能噪音消除技术。

## Features 功能特点

- Real-time camera video stream processing
- Object recognition and tracking with movement analysis
- Adaptive music generation based on movement speed and position
- Dynamic glide effect controlled by object movement speed
- Automatic bass chord progression (1-6-4-5) with drum patterns
- Advanced sequencer architecture with quantized timing
- Enhanced noise cancellation and audio quality optimization
- Customizable timbre mapping to object types
- Visual feedback with customizable display options

---

- 实时摄像头视频流处理
- 物品识别、追踪及移动分析
- 基于物品移动速度和位置的自适应音乐生成
- 由物体移动速度控制的动态滑音效果
- 自动低音和弦进行（1-6-4-5）配合鼓机节奏
- 先进的音序器架构，实现量化定时
- 增强的噪音消除和音频质量优化
- 可自定义的物品类型音色映射
- 可自定义显示选项的视觉反馈

## Technology Stack 技术栈

- TensorFlow.js - For object recognition and movement analysis
- Tone.js - For advanced audio synthesis, sequencing and effects
- Web Audio API - For audio generation and processing
- MediaDevices API - For camera access
- Canvas API - For video processing and visualization
- Vite - For development and build tooling

---

- TensorFlow.js - 用于物品识别和移动分析
- Tone.js - 用于高级音频合成、音序和效果
- Web Audio API - 用于音频生成和处理
- MediaDevices API - 用于摄像头访问
- Canvas API - 用于视频处理和可视化
- Vite - 用于开发和构建工具

## Installation and Setup 安装和运行

1. Clone the repository:
   克隆项目到本地：
   ```bash
   git clone https://github.com/yourusername/interactive-music-generator.git
   cd interactive-music-generator
   ```

2. Install dependencies:
   安装依赖：
   ```bash
   npm install
   ```

3. Start the development server:
   启动开发服务器：
   ```bash
   npm run dev
   ```

4. Access in browser:
   在浏览器中访问：
   ```
   http://localhost:3000
   ```

## Usage Instructions 使用说明

1. Allow browser access to your camera
   允许浏览器访问摄像头
   
2. Place objects (like phones, books, cups, etc.) in the camera's field of view
   将物品（如手机、书本、杯子等）放置在摄像头视野中
   
3. The vertical position (Y-coordinate) of the object controls pitch
   物品的垂直位置（Y坐标）控制音高
   
4. The movement speed controls the sound behavior:
   物品的移动速度控制音效行为：
   
   - Fast movement: Quick glide transitions between notes
     快速移动：音符间的快速滑音过渡
     
   - Medium movement: Moderate glide with balanced response
     中等移动：平衡响应的中等滑音
     
   - Slow/stationary: Smooth glide with longer transition time
     缓慢/静止：具有较长过渡时间的平滑滑音
   
5. The background drum and bass pattern plays automatically:
   背景鼓机和低音模式自动播放：
   
   - Automatic 1-6-4-5 bass progression synced with drum pattern
     自动1-6-4-5低音和弦进行，与鼓机节奏同步
   
6. The object type (e.g., phone, book) controls the timbre
   物品的类型（如手机、书本）控制音色

7. Use the control panel to:
   使用控制面板可以：
   
   - Select musical scale (Major, Minor, Pentatonic, Blues)
     选择音阶（大调、小调、五声音阶、蓝调）
     
   - Choose rhythm pattern (Basic, Techno, Jazz, Latin)
     选择节奏型（基本、电子、爵士、拉丁）
     
   - Adjust volume
     调节音量
     
   - Toggle visual effects
     切换可视化效果

## System Requirements 系统要求

- Node.js 14.0 or higher
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Camera device
- Audio output device
- Recommended: Dedicated GPU for smoother object detection

---

- Node.js 14.0 或更高版本
- 支持 WebRTC 的现代浏览器（Chrome、Firefox、Safari、Edge）
- 摄像头设备
- 音频输出设备
- 推荐：独立 GPU 以获得更流畅的物体检测

## Project Structure 项目结构

```
interactive-music-generator/
├── public/                # Static assets 静态资源
├── src/                   # Source code 源代码
│   ├── components/        # UI components UI组件
│   │   ├── controls.js    # User interface controls 用户界面控制
│   │   └── visualizer.js  # Visual feedback visualization 视觉反馈可视化
│   │
│   ├── models/            # Machine learning models 机器学习模型
│   │   └── visionModel.js # TensorFlow object detection model TensorFlow物体检测模型
│   │
│   ├── audio/             # Audio processing 音频处理
│   │   ├── audioEngine.js # Tone.js sound generation engine Tone.js音频生成引擎
│   │   ├── effects/       # Audio effects for enhanced sound quality 用于增强音质的音频效果
│   │   │   ├── effectsChain.js  # Effects chain management 效果链管理
│   │   │   └── noiseUtils.js    # Noise cancellation utilities 噪音消除工具
│   │   ├── instruments/   # Sound synthesis instruments 声音合成乐器
│   │   │   └── synthFactory.js  # Synthesizer factory 合成器工厂
│   │   └── sequencer/     # Rhythm and pattern handling 节奏和模式处理
│   │       ├── patternManager.js # Musical pattern management 音乐模式管理
│   │       └── stepSequencer.js  # Step sequencer engine 步进音序器引擎
│   │
│   ├── utils/             # Utility functions 工具函数
│   │   └── helpers.js     # Helper utilities 辅助工具
│   │
│   └── main.js            # Application entry point 应用程序入口点
│
├── index.html             # Main HTML file 主HTML文件
├── vite.config.js         # Vite configuration Vite配置
├── package.json           # Project dependencies 项目依赖
└── README.md              # Project documentation 项目文档
```

## Audio Architecture Overview 音频架构概述

The system uses an advanced adaptive audio architecture with these key components:

系统采用先进的自适应音频架构，包含以下关键组件：

1. **Movement-Adaptive Synthesis** - Dynamically adjusts glide parameters based on movement speed
   **移动自适应合成** - 根据移动速度动态调整滑音参数

2. **Step Sequencer** - Provides beat-synchronized timing and pattern sequencing
   **步进音序器** - 提供节拍同步时序和模式排序

3. **Bass Chord Progression** - Automatic 1-6-4-5 progression synchronized with drum patterns
   **低音和弦进行** - 与鼓机节奏同步的自动1-6-4-5进行

4. **Pattern Manager** - Manages musical patterns, scales, and instrument timbres
   **模式管理器** - 管理音乐模式、音阶和乐器音色

5. **Effects Chain** - Processes audio through configurable effect chains with dynamic adjustment
   **效果链** - 通过可动态调整的配置效果链处理音频

6. **Enhanced Noise Cancellation** - Advanced noise gate with adaptive threshold adjustment
   **增强噪音消除** - 具有自适应阈值调整的高级噪声门

7. **Synthesizer Factory** - Creates and manages various synthesizer instruments with optimized parameters
   **合成器工厂** - 创建和管理具有优化参数的各种合成器乐器

This architecture delivers a more natural and expressive musical experience by responding intuitively to object movements, while maintaining high audio quality with minimal noise.

该架构通过直观响应物体移动，提供更加自然和富有表现力的音乐体验，同时保持高音质和低噪音。

## Contribution Guidelines 贡献指南

Contributions are welcome! Please feel free to submit issues and pull requests to improve the project.

欢迎贡献！请随时提交Issue和Pull Request来改进项目。

1. Fork the repository
   复刻仓库
   
2. Create your feature branch:
   创建你的特性分支：
   ```bash
   git checkout -b feature/amazing-feature
   ```
   
3. Commit your changes:
   提交您的更改：
   ```bash
   git commit -m 'Add some amazing feature'
   ```
   
4. Push to the branch:
   推送到分支：
   ```bash
   git push origin feature/amazing-feature
   ```
   
5. Open a pull request
   打开拉取请求

## License 许可证

MIT License

## Acknowledgements 致谢

- TensorFlow.js team for the object detection models
- Tone.js team for the powerful web audio framework
- All contributors who have helped shape this project

---

- 感谢 TensorFlow.js 团队提供物体检测模型
- 感谢 Tone.js 团队提供强大的网页音频框架
- 感谢所有帮助塑造这个项目的贡献者