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
    }
    
    initialize() {
        // Set canvas dimensions to match video
        if (!this.isInitialized) {
            this.resizeCanvas();
            this.isInitialized = true;
        }
    }
    
    resizeCanvas() {
        if (this.video.videoWidth && this.video.videoHeight) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
        }
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    renderPredictions(predictions) {
        if (!this.isInitialized) return;
        
        // Make sure canvas size matches video
        this.resizeCanvas();
        
        // Clear the canvas
        this.clearCanvas();
        
        // Draw zones if enabled
        if (this.showZones) {
            this.drawInteractionZones();
        }
        
        // Draw predictions
        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            const color = stringToColor(prediction.class);
            
            if (this.showBoundingBoxes) {
                // Draw bounding box
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, width, height);
            }
            
            if (this.showLabels) {
                // Draw label
                this.ctx.fillStyle = color;
                this.ctx.font = '16px Arial';
                this.ctx.fillText(
                    `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
                    x,
                    y > 10 ? y - 5 : 10
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
        });
        
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
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 10 + 2,
                speed: Math.random() * 3 + 1,
                color: stringToColor(this.lastTimbre || 'default'),
                angle: Math.random() * Math.PI * 2
            });
        }
        
        // Limit total particles
        if (this.particles.length > this.particleCount) {
            this.particles = this.particles.slice(-this.particleCount);
        }
    }
    
    drawMusicVisualization() {
        // Draw particles
        this.particles.forEach((particle, index) => {
            // Update particle position
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            
            // Fade out over time
            const age = 1 - ((Date.now() - this.lastNoteTime) / 1000);
            if (age <= 0) {
                this.particles.splice(index, 1);
                return;
            }
            
            // Draw particle
            this.ctx.globalAlpha = age;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Reset alpha
        this.ctx.globalAlpha = 1;
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
}

export default Visualizer;