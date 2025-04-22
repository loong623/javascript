import AudioEngine from './audio/audioEngine.js';
import VisionModel from './models/visionModel.js';
import Controls from './components/controls.js';
import Visualizer from './components/visualizer.js';
import { debounce } from './utils/helpers.js';
import * as Tone from 'tone';

// DOM elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusEl = document.getElementById('status');
const toggleVisualizationBtn = document.getElementById('toggleVisualization');
const toggleZonesBtn = document.getElementById('toggleZones');
const volumeSlider = document.getElementById('volume-slider');

// Create instances of our modules
const audioEngine = new AudioEngine();
const visionModel = new VisionModel();
const controls = new Controls(audioEngine, visionModel);
const visualizer = new Visualizer(video, canvas);

// Variables
let isRunning = false;
let animationId;
let lastMusicGenerationTime = 0;
const MUSIC_GENERATION_INTERVAL = 200; // Minimum time between music generations in ms

// Initialize the application
async function initApp() {
    updateStatus('初始化应用...');
    
    // Initialize controls
    controls.initialize();
    
    // Initialize visualizer
    visualizer.initialize();
    
    // Check if browser supports camera access
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        updateStatus('您的浏览器不支持摄像头访问，请使用Chrome、Firefox、Edge或Safari的最新版本');
        startButton.disabled = true;
        return;
    }
    
    // Load TensorFlow.js model
    updateStatus('加载物品识别模型...');
    try {
        const modelLoaded = await visionModel.loadModel();
        
        if (modelLoaded) {
            updateStatus('模型加载成功，可以开始使用摄像头');
            startButton.disabled = false;
        } else {
            updateStatus('模型加载失败，请刷新页面重试');
        }
    } catch (err) {
        console.error('模型加载错误:', err);
        updateStatus('模型加载出错: ' + err.message);
    }
    
    // Set up additional event listeners
    setupEventListeners();
}

// Event listeners
function setupEventListeners() {
    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
    
    if (toggleVisualizationBtn) {
        toggleVisualizationBtn.addEventListener('click', toggleVisualization);
    }

    if (toggleZonesBtn) {
        toggleZonesBtn.addEventListener('click', toggleZones);
    }
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', handleVolumeChange);
    }
    
    // Add event listeners for rhythm and scale selectors
    const scaleSelect = document.getElementById('scale-select');
    if (scaleSelect) {
        scaleSelect.addEventListener('change', (e) => {
            audioEngine.setScale(e.target.value);
            updateStatus(`音阶已更改为: ${e.target.value}`);
        });
    }
    
    const rhythmSelect = document.getElementById('rhythm-select');
    if (rhythmSelect) {
        rhythmSelect.addEventListener('change', (e) => {
            audioEngine.setRhythmPattern(e.target.value);
            updateStatus(`节奏型已更改为: ${e.target.value}`);
        });
    }
}

// Start camera
async function startCamera() {
    try {
        // 更可靠的音频初始化流程
        updateStatus('正在初始化音频系统...');

        // 确保使用用户交互来启动音频上下文
        try {
            // 使用较长的超时以确保音频上下文有时间完成初始化
            await Tone.start();
            console.log('Tone.js 音频上下文状态:', Tone.context.state);
            
            // 播放测试音以确保音频系统工作
            await testAudio();
            
            // 启动音频引擎
            await audioEngine.start();
        } catch (audioErr) {
            console.error('音频初始化错误:', audioErr);
            updateStatus('音频初始化出错: ' + audioErr.message + '。声音可能不可用。');
            // 继续执行，因为我们至少可以使用摄像头视觉功能
        }
        
        // Show loading status
        updateStatus('正在访问摄像头...');
        
        // Get camera stream with more specific constraints and error handling
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'environment' // 优先使用后置摄像头，如果有的话
            }
        };
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set up video stream
        video.srcObject = stream;
        
        // Wait for metadata to load to ensure dimensions are available
        await new Promise(resolve => {
            if (video.readyState >= 2) {
                resolve();
            } else {
                video.onloadedmetadata = () => resolve();
            }
        });
        
        // Start playing video
        await video.play().catch(err => {
            console.error('视频播放错误:', err);
            throw new Error('无法播放视频流，请检查浏览器权限设置');
        });
        
        // Video is now playing, update state
        isRunning = true;
        visionModel.setRunningState(true);
        
        // Set initial volume
        if (volumeSlider) {
            audioEngine.setVolume(parseInt(volumeSlider.value));
        }
        
        // Start detection loop
        detectObjects();
        
        updateStatus('摄像头已启动，开始检测物品...');
        
        // Disable start button and enable stop button
        startButton.disabled = true;
        stopButton.disabled = false;
    } catch (err) {
        console.error('摄像头访问错误:', err);
        
        // 提供更具体的错误信息
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            updateStatus('摄像头访问被拒绝，请在浏览器中允许摄像头权限后重试');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            updateStatus('未找到摄像头设备，请确保您的设备有摄像头并且正常连接');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            updateStatus('摄像头可能被其他应用占用，请关闭其他可能使用摄像头的应用后重试');
        } else if (err.name === 'OverconstrainedError') {
            updateStatus('摄像头不支持请求的分辨率，正在尝试自动调整...');
            // 尝试使用默认设置重新请求
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                await video.play();
                isRunning = true;
                visionModel.setRunningState(true);
                detectObjects();
                updateStatus('摄像头已启动（使用默认设置），开始检测物品...');
            } catch (fallbackErr) {
                updateStatus('无法使用默认设置访问摄像头: ' + fallbackErr.message);
            }
        } else {
            updateStatus('访问摄像头出错: ' + err.message);
        }
    }
}

// 测试音频系统是否正常工作
async function testAudio() {
    return new Promise((resolve) => {
        try {
            // 创建一个短暂的测试音
            const testSynth = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    sustain: 0,
                    release: 0.1
                },
                volume: -20 // 设置为较低的音量
            }).toDestination();
            
            // 播放一个轻微可听的测试音
            testSynth.triggerAttackRelease('C4', '16n');
            console.log('播放测试音...');
            
            // 测试音完成后释放资源
            setTimeout(() => {
                testSynth.dispose();
                resolve(true);
            }, 300);
        } catch (err) {
            console.error('测试音频失败:', err);
            resolve(false); // 即使测试失败也继续执行
        }
    });
}

// Stop camera
function stopCamera() {
    if (!isRunning) return;
    
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    
    // Update state
    isRunning = false;
    visionModel.setRunningState(false);
    
    // Stop animation loop
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Stop audio engine and wait for cleanup
    audioEngine.stop();
    
    // Reset music generation timer
    lastMusicGenerationTime = 0;
    
    // Re-enable start button
    startButton.disabled = false;
    stopButton.disabled = true;
    
    updateStatus('摄像头已停止');
    
    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Detect objects in video stream
async function detectObjects() {
    if (!isRunning) return;
    
    try {
        // Detect objects
        const predictions = await visionModel.detectObjects(video);
        
        // Add video dimensions to predictions for accurate normalization
        if (predictions.length > 0) {
            predictions.forEach(pred => {
                pred.videoWidth = video.videoWidth;
                pred.videoHeight = video.videoHeight;
            });
        }
        
        // Render predictions
        visualizer.renderPredictions(predictions);
        
        // Update UI with detected objects
        controls.updateObjectList(predictions);
        
        // Generate music if objects found, with rate limiting
        const now = Date.now();
        if (predictions.length > 0 && now - lastMusicGenerationTime >= MUSIC_GENERATION_INTERVAL) {
            const pattern = audioEngine.generateMusic(predictions);
            lastMusicGenerationTime = now;
            
            // Update visualizer with music info
            if (pattern) {
                visualizer.updateMusicInfo(pattern.note, pattern.rhythm, pattern.timbre);
            }
        }
    } catch (err) {
        console.error('检测物品时出错:', err);
        // 如果是瞬时错误，继续尝试检测
    }
    
    // Continue the detection loop
    animationId = requestAnimationFrame(detectObjects);
}

// Toggle music visualization
function toggleVisualization() {
    const isEnabled = visualizer.toggleMusicVisualization();
    updateStatus(`音乐可视化效果已${isEnabled ? '启用' : '禁用'}`);
}

// Toggle zones display
function toggleZones() {
    const isEnabled = visualizer.toggleZones();
    updateStatus(`区域显示已${isEnabled ? '启用' : '禁用'}`);
}

// Handle volume change
function handleVolumeChange(e) {
    const volume = parseInt(e.target.value);
    // Ensure volume is within safe range (0-100)
    const safeVolume = Math.max(0, Math.min(100, volume));
    audioEngine.setVolume(safeVolume);
    updateStatus(`音量已设置为: ${safeVolume}%`);
}

// Update status message
function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
        console.log(message); // 同时在控制台输出状态消息，方便调试
    }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // 添加页面可见性变化处理，当页面切换到后台时暂停摄像头
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && isRunning) {
            stopCamera();
            updateStatus('页面切换到后台，摄像头已暂停');
        }
    });
});