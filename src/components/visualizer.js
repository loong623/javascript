/**
 * Visualizer component for rendering predictions and music visualization
 */
import { stringToColor } from '../utils/helpers.js';

class Visualizer {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.isInitialized = false;
        this.showLabels = true;
        this.showBoundingBoxes = true;
        this.showMusicInfo = true;
        this.musicVisualization = true;
        
        // Audio visualization properties
        this.particles = [];
        this.particleCount = 50;
        this.lastNoteTime = 0;
        this.lastNote = null;
        this.lastTimbre = null;
        
        // 添加视频尺寸监听器
        this._setupVideoSizeObserver();
    }
    
    /**
     * 设置视频尺寸变化监听
     * @private
     */
    _setupVideoSizeObserver() {
        // 监听视频元素的尺寸变化
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                    this.resizeCanvas();
                }
            });
            this.resizeObserver.observe(this.video);
        }
        
        // 监听视频数据加载事件
        this.video.addEventListener('loadedmetadata', () => {
            this.resizeCanvas();
        });
    }
    
    initialize() {
        // Set canvas dimensions to match video
        if (!this.isInitialized) {
            this.resizeCanvas();
            this.isInitialized = true;
            
            // 手动触发第一次调整尺寸
            setTimeout(() => this.resizeCanvas(), 500);
        }
        
        // 显示一个加载指示
        this._drawLoadingIndicator('正在准备摄像头...');
    }
    
    /**
     * 绘制加载指示器
     * @private
     */
    _drawLoadingIndicator(message) {
        // 确保画布有最小尺寸
        if (this.canvas.width < 100) this.canvas.width = 640;
        if (this.canvas.height < 100) this.canvas.height = 480;
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制文字
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
        
        // 显示提示信息
        this.ctx.font = '16px Arial';
        this.ctx.fillText('请确保已允许浏览器访问摄像头', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
    
    resizeCanvas() {
        try {
            if (this.video.videoWidth && this.video.videoHeight) {
                const videoAspect = this.video.videoWidth / this.video.videoHeight;
                
                // 设置Canvas尺寸与视频相同
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                
                // 记录成功调整尺寸的日志
                console.log(`Canvas尺寸已调整为: ${this.canvas.width}x${this.canvas.height}, 视频尺寸: ${this.video.videoWidth}x${this.video.videoHeight}`);
                
                return true;
            } else {
                console.warn('视频尺寸不可用，无法调整Canvas尺寸');
                return false;
            }
        } catch (err) {
            console.error('调整Canvas尺寸时出错:', err);
            return false;
        }
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    renderPredictions(predictions) {
        // 如果视频尺寸发生变化，重新调整Canvas
        if (this.video.videoWidth > 0 && 
            (this.canvas.width !== this.video.videoWidth || 
             this.canvas.height !== this.video.videoHeight)) {
            this.resizeCanvas();
        }
        
        // 如果视频尚未准备好，显示加载指示
        if (!this.video.videoWidth || !this.video.videoHeight) {
            this._drawLoadingIndicator('等待视频流...');
            return;
        }
        
        // 准备绘制前清空画布
        this.clearCanvas();
        
        // 如果没有预测结果，显示提示
        if (!predictions || predictions.length === 0) {
            // 在屏幕上绘制一个小提示
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('未检测到物品 - 试着将物品放在摄像头前', this.canvas.width / 2, 30);
            this.ctx.textAlign = 'start'; // 重置文本对齐
        } else {
            // Draw predictions
            predictions.forEach(prediction => {
                try {
                    const [x, y, width, height] = prediction.bbox;
                    const color = stringToColor(prediction.class);
                      if (this.showBoundingBoxes) {
                        // Use different styles for different detection sources
                        if (prediction.source === 'color_detection') {
                            // Color detection: use solid colored boxes with thicker border
                            this.ctx.strokeStyle = prediction.color || color;
                            this.ctx.lineWidth = 3;
                            this.ctx.setLineDash([]);
                            
                            // Add a subtle fill for color detections
                            this.ctx.fillStyle = `${prediction.color || color}20`; // 20% opacity
                            this.ctx.fillRect(x, y, width, height);
                        } else {
                            // Neural network detection: use dashed boxes
                            this.ctx.strokeStyle = color;
                            this.ctx.lineWidth = 2;
                            this.ctx.setLineDash([5, 5]);
                        }
                        
                        this.ctx.strokeRect(x, y, width, height);
                        this.ctx.setLineDash([]); // Reset line dash
                    }
                      if (this.showLabels) {
                        // Prepare label text with source indicator
                        const sourceIndicator = prediction.source === 'color_detection' ? ' 🎨' : ' 🤖';
                        const labelText = `${prediction.class}${sourceIndicator} (${Math.round(prediction.score * 100)}%)`;
                        
                        // Draw label with improved visibility
                        // 先绘制黑色背景增强可读性
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        const textWidth = this.ctx.measureText(labelText).width;
                        this.ctx.fillRect(
                            x, 
                            y > 22 ? y - 22 : y,
                            textWidth + 10,
                            22
                        );
                        
                        // 再绘制文字
                        this.ctx.fillStyle = prediction.source === 'color_detection' ? (prediction.color || color) : color;
                        this.ctx.font = '16px Arial';
                        this.ctx.fillText(
                            labelText,
                            x + 5,
                            y > 20 ? y - 5 : y + 16
                        );
                    }
                    
                    if (this.showMusicInfo) {
                        // Draw music info if this is the primary object
                        if (prediction === predictions[0]) {
                            // 统一为一个音区，不再区分左中右
                            const zoneText = "统一音区";
                            
                            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                            this.ctx.fillRect(x, y + height + 5, width, 65);
                            
                            this.ctx.fillStyle = 'white';
                            this.ctx.font = '12px Arial';
                            this.ctx.fillText(`音高: Y坐标 (${Math.round(y)})`, x + 5, y + height + 20);
                            this.ctx.fillText(`节奏: 物品移动检测`, x + 5, y + height + 35);
                            this.ctx.fillText(`音色: ${prediction.class}`, x + 5, y + height + 50);
                            this.ctx.fillText(`当前区域: ${zoneText}`, x + 5, y + height + 65);
                        }
                    }
                } catch (err) {
                    console.error('绘制预测框时出错:', err, prediction);
                }
            });
        }
        
        // Draw music visualization if enabled
        if (this.musicVisualization && this.lastNote) {
            this.drawMusicVisualization();
        }
    }
    
    updateMusicInfo(note, rhythm, timbre) {
        this.lastNote = note;
        this.lastTimbre = timbre;
        this.lastNoteTime = Date.now();
        
        // Create particles for visualization
        if (this.musicVisualization) {
            this.createParticles(1);
        }
    }
    
    createParticles(count) {
        if (!this.canvas.width || !this.canvas.height) return;

        for (let i = 0; i < count; i++) {
            const img = new Image();
            img.src = `/cat/${Math.ceil(Math.random() * 3)}.jpg`; // 使用相对于 public 的路径
            img.onload = () => {
                const particle = {
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * 30 + 50, // 粒子大小随机
                    speed: Math.random() * 2 + 1,
                    angle: Math.random() * Math.PI * 2,
                    life: 1,
                    image: img // 使用图片代替颜色
                };
                this.particles.push(particle);

                if (this.particles.length > this.particleCount) {
                    this.particles = this.particles.slice(-this.particleCount);
                }
            };

            img.onerror = () => {
                console.error(`图片加载失败: ${img.src}`);
            };
        }
    }
    
    drawMusicVisualization() {
        if (!this.canvas.width || !this.canvas.height) return;
        if (this.particles.length === 0) return;

        const now = Date.now();
        const delta = Math.min((now - this.lastNoteTime) / 1000, 0.1);
        this.lastNoteTime = now;

        const toRemove = [];

        this.particles.forEach((particle, index) => {
            particle.x += Math.cos(particle.angle) * particle.speed * delta * 60;
            particle.y += Math.sin(particle.angle) * particle.speed * delta * 60;
            particle.life -= delta * 0.5;

            if (particle.life <= 0 || 
                particle.x < -50 || particle.x > this.canvas.width + 50 || 
                particle.y < -50 || particle.y > this.canvas.height + 50) {
                toRemove.push(index);
                return;
            }

            this.ctx.globalAlpha = particle.life;
            this.ctx.drawImage(particle.image, particle.x, particle.y, particle.size, particle.size); // 绘制图片
        });

        this.ctx.globalAlpha = 1;

        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.particles.splice(toRemove[i], 1);
        }
    }
    
    toggleLabels() {
        this.showLabels = !this.showLabels;
        return this.showLabels;
    }
    
    toggleBoundingBoxes() {
        this.showBoundingBoxes = !this.showBoundingBoxes;
        return this.showBoundingBoxes;
    }
    
    toggleMusicVisualization() {
        this.musicVisualization = !this.musicVisualization;
        return this.musicVisualization;
    }
    
    /**
     * 清理资源
     */
    dispose() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // 清空粒子数组
        this.particles = [];
    }
}

export default Visualizer;