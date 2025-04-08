# Interactive Music Generator 交互式音乐生成器

## Introduction 简介

This is an interactive music generator based on computer vision. Through camera object recognition, it generates music in real-time according to the position and characteristics of objects.

这是一个基于计算机视觉的交互式音乐生成器。通过摄像头识别特定物品，根据物品的位置和特征实时生成音乐。

## Features 功能特点

- Real-time camera video stream processing
- Object recognition and tracking
- Real-time music generation based on object position and characteristics
- Customizable timbre, pitch, and rhythm patterns
- Interactive sound zones with different musical behaviors
- Visual feedback with customizable display options

---

- 实时摄像头视频流处理
- 物品识别和追踪
- 基于物品位置和特征的实时音乐生成
- 可自定义音色、音高和节奏型
- 具有不同音乐行为的交互式声音区域
- 可自定义显示选项的视觉反馈

## Technology Stack 技术栈

- TensorFlow.js - For object recognition
- Tone.js - For advanced audio synthesis and effects
- Web Audio API - For audio generation
- MediaDevices API - For camera access
- Canvas API - For video processing and visualization
- Vite - For development and build tooling

---

- TensorFlow.js - 用于物品识别
- Tone.js - 用于高级音频合成和效果
- Web Audio API - 用于音频生成
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
   
4. The horizontal position (X-coordinate) controls rhythm and sound effects:
   物品的水平位置（X坐标）控制节奏和音效：
   
   - Left zone (0-30%): Bass rhythm area
     左侧区域（0-30%）：低音节奏区
     
   - Center zone (30-70%): Standard tone area
     中央区域（30-70%）：标准音区
     
   - Right zone (70-100%): High-pitched glide area
     右侧区域（70-100%）：高音滑音区
     
5. The object type (e.g., phone, book) controls the timbre
   物品的类型（如手机、书本）控制音色

6. Use the control panel to:
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
├── public/              # Static assets 静态资源
├── src/                 # Source code 源代码
│   ├── components/      # UI components UI组件
│   │   ├── controls.js  # User interface controls 用户界面控制
│   │   └── visualizer.js # Visual feedback visualization 视觉反馈可视化
│   │
│   ├── models/          # Machine learning models 机器学习模型
│   │   └── visionModel.js # TensorFlow object detection model TensorFlow物体检测模型
│   │
│   ├── audio/           # Audio processing 音频处理
│   │   └── audioEngine.js # Tone.js sound generation engine Tone.js音频生成引擎
│   │
│   ├── utils/           # Utility functions 工具函数
│   │   └── helpers.js   # Helper utilities 辅助工具
│   │
│   └── main.js         # Application entry point 应用程序入口点
│
├── index.html           # Main HTML file 主HTML文件
├── vite.config.js       # Vite configuration Vite配置
├── package.json         # Project dependencies 项目依赖
└── README.md            # Project documentation 项目文档
```

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