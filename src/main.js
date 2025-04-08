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
    
    // Load TensorFlow.js model
    updateStatus('加载物品识别模型...');
    const modelLoaded = await visionModel.loadModel();
    
    if (modelLoaded) {
        updateStatus('模型加载成功，可以开始使用摄像头');
        startButton.disabled = false;
    } else {
        updateStatus('模型加载失败，请刷新页面重试');
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
        // Start audio context (to satisfy browser autoplay policy)
        await audioEngine.start();
        
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        // Set up video stream
        video.srcObject = stream;
        await video.play();
        
        // Update state
        isRunning = true;
        visionModel.setRunningState(true);
        
        // Set initial volume
        if (volumeSlider) {
            audioEngine.setVolume(parseInt(volumeSlider.value));
        }
        
        // Start detection loop
        detectObjects();
        
        updateStatus('摄像头已启动，开始检测物品...');
    } catch (err) {
        updateStatus('访问摄像头出错: ' + err.message);
    }
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
    
    updateStatus('摄像头已停止');
}

// Detect objects in video stream
async function detectObjects() {
    if (!isRunning) return;
    
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
    }
}

// Initialize the application
initApp();