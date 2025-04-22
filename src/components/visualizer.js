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
        this.showZones = true; // Show left/right interaction zones
        
        // Audio visualization properties
        this.particles = [];
        this.particleCount = 50;
        this.lastNoteTime = 0;
        this.lastNote = null;
        this.lastTimbre = null;
        
        // Zone boundaries
        this.leftZoneBoundary = 0.3; // 30% from left
        this.rightZoneBoundary = 0.7; // 70% from left
        
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
        
        // 绘制视频帧作为背景（可选，通常不需要，因为视频层已在下面）
        // this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Draw zones if enabled
        if (this.showZones) {
            this.drawInteractionZones();
        }
        
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
                        // Draw bounding box
                        this.ctx.strokeStyle = color;
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(x, y, width, height);
                    }
                    
                    if (this.showLabels) {
                        // Draw label with improved visibility
                        // 先绘制黑色背景增强可读性
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        const textWidth = this.ctx.measureText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`).width;
                        this.ctx.fillRect(
                            x, 
                            y > 22 ? y - 22 : y,
                            textWidth + 10,
                            22
                        );
                        
                        // 再绘制文字
                        this.ctx.fillStyle = color;
                        this.ctx.font = '16px Arial';
                        this.ctx.fillText(
                            `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
                            x + 5,
                            y > 20 ? y - 5 : y + 16
                        );
                    }
                    
                    if (this.showMusicInfo) {
                        // Draw music info if this is the primary object
                        if (prediction === predictions[0]) {
                            // Determine which zone the object is in
                            const normalizedX = x / this.canvas.width;
                            let zoneText = "中央音区";
                            
                            if (normalizedX < this.leftZoneBoundary) {
                                zoneText = "低音节奏区";
                            } else if (normalizedX > this.rightZoneBoundary) {
                                zoneText = "高音滑音区";
                            }
                            
                            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                            this.ctx.fillRect(x, y + height + 5, width, 65);
                            
                            this.ctx.fillStyle = 'white';
                            this.ctx.font = '12px Arial';
                            this.ctx.fillText(`音高: Y坐标 (${Math.round(y)})`, x + 5, y + height + 20);
                            this.ctx.fillText(`节奏: X坐标 (${Math.round(x)})`, x + 5, y + height + 35);
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
    
    // Draw the left and right interaction zones
    drawInteractionZones() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Left zone (low bass notes)
        this.ctx.fillStyle = 'rgba(50, 50, 150, 0.2)'; // Blue tint
        this.ctx.fillRect(0, 0, width * this.leftZoneBoundary, height);
        
        // Right zone (high glide notes)
        this.ctx.fillStyle = 'rgba(150, 50, 50, 0.2)'; // Red tint
        this.ctx.fillRect(width * this.rightZoneBoundary, 0, width * (1 - this.rightZoneBoundary), height);
        
        // Draw zone labels
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        
        // Left zone label
        this.ctx.fillText('低音节奏区', width * this.leftZoneBoundary / 2, 30);
        
        // Right zone label
        this.ctx.fillText('高音滑音区', width - (width * (1 - this.rightZoneBoundary) / 2), 30);
        
        // Reset text alignment
        this.ctx.textAlign = 'start';
    }
    
    updateMusicInfo(note, rhythm, timbre) {
        this.lastNote = note;
        this.lastTimbre = timbre;
        this.lastNoteTime = Date.now();
        
        // Create particles for visualization
        if (this.musicVisualization) {
            this.createParticles(10);
        }
    }
    
    createParticles(count) {
        // 如果画布尚未准备好，不创建粒子
        if (!this.canvas.width || !this.canvas.height) return;
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 10 + 2,
                speed: Math.random() * 3 + 1,
                color: stringToColor(this.lastTimbre || 'default'),
                angle: Math.random() * Math.PI * 2,
                life: 1.0  // 粒子生命值为1.0（100%）
            });
        }
        
        // Limit total particles
        if (this.particles.length > this.particleCount) {
            this.particles = this.particles.slice(-this.particleCount);
        }
    }
    
    drawMusicVisualization() {
        // 如果画布尚未准备好，不绘制
        if (!this.canvas.width || !this.canvas.height) return;
        
        // 粒子数组为空时直接返回
        if (this.particles.length === 0) return;
        
        // 计算时间差以平滑动画
        const now = Date.now();
        const delta = Math.min((now - this.lastNoteTime) / 1000, 0.1);
        this.lastNoteTime = now;
        
        // 准备删除的粒子索引
        const toRemove = [];
        
        // Draw particles with improved animation
        this.particles.forEach((particle, index) => {
            // Update particle position with delta time for smooth animation
            particle.x += Math.cos(particle.angle) * particle.speed * delta * 60;
            particle.y += Math.sin(particle.angle) * particle.speed * delta * 60;
            
            // 减少粒子生命值
            particle.life -= delta * 0.5;  // 每秒减少50%的生命值
            
            // 如果粒子生命结束或者移出屏幕，将其标记为删除
            if (particle.life <= 0 || 
                particle.x < -50 || particle.x > this.canvas.width + 50 || 
                particle.y < -50 || particle.y > this.canvas.height + 50) {
                toRemove.push(index);
                return;
            }
            
            // Draw particle with fading based on life
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Reset alpha
        this.ctx.globalAlpha = 1;
        
        // 从后向前删除标记的粒子，以保持索引正确
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
    
    toggleZones() {
        this.showZones = !this.showZones;
        return this.showZones;
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