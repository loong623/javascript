/**
 * UI Controls for Interactive Music Generator
 */

class Controls {
    constructor(audioEngine, visionModel, colorDetection) {
        this.audioEngine = audioEngine;
        this.visionModel = visionModel;
        this.colorDetection = colorDetection;
        this.elements = {};
        this.isInitialized = false;
    }

    initialize() {        // Find all control elements
        this.elements = {
            startButton: document.getElementById('startButton'),
            stopButton: document.getElementById('stopButton'),
            statusEl: document.getElementById('status'),
            scaleSelect: document.getElementById('scale-select'),
            rhythmSelect: document.getElementById('rhythm-select'),
            objectList: document.getElementById('object-list')
        };

        // Add UI elements if they don't exist
        this.createMissingUIElements();
        
        // Get references to newly created elements
        this.elements.detectionModeSelect = document.getElementById('detection-mode-select');
        this.elements.colorBallInfo = document.getElementById('color-ball-info');
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
    }

    createMissingUIElements() {
        const container = document.querySelector('.container');        // Create scale selector if it doesn't exist
        if (!this.elements.scaleSelect) {
            const scaleContainer = document.createElement('div');
            scaleContainer.className = 'control-group';
            scaleContainer.innerHTML = `
                <label for="scale-select">Scale:</label>
                <select id="scale-select">
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="pentatonic">Pentatonic</option>
                    <option value="blues">Blues</option>
                </select>
            `;
            container.appendChild(scaleContainer);
            this.elements.scaleSelect = document.getElementById('scale-select');
        }        // Create rhythm selector if it doesn't exist
        if (!this.elements.rhythmSelect) {
            const rhythmContainer = document.createElement('div');
            rhythmContainer.className = 'control-group';
            rhythmContainer.innerHTML = `
                <label for="rhythm-select">Rhythm:</label>
                <select id="rhythm-select">
                    <option value="basic">Basic</option>
                    <option value="techno">Techno</option>
                    <option value="jazz">Jazz</option>
                    <option value="latin">Latin</option>
                </select>
            `;
            container.appendChild(rhythmContainer);
            this.elements.rhythmSelect = document.getElementById('rhythm-select');
        }        // Object list already exists in HTML, just ensure we have reference
        if (!this.elements.objectList) {
            this.elements.objectList = document.getElementById('object-list');
        }

        // Add styles
        this.addStyles();
    }

    addStyles() {
        // Check if our styles already exist
        if (document.getElementById('control-styles')) return;

        const styleEl = document.createElement('style');
        styleEl.id = 'control-styles';
        styleEl.textContent = `
            .control-group {
                margin: 10px auto;
                text-align: center;
            }
            .control-group label {
                margin-right: 10px;
            }
            .control-group select {
                padding: 5px 10px;
                border-radius: 4px;
                border: 1px solid #ccc;
            }
            .object-detection-panel {
                margin: 20px auto;
                max-width: 600px;
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }            .object-detection-panel h3 {
                margin-top: 0;
                color: #333;
                background-color: #f5f5dc; /* 米白色背景 */
                padding: 10px;
                border-radius: 4px;
            }            .detection-controls {
                margin: 15px 0;
                padding: 10px;
                background: #f8f8f8;
                border-radius: 4px;
                border: 1px solid #ddd;
            }
            .detection-mode {
                margin-bottom: 15px;
            }
            .detection-mode label {
                display: block;
                margin: 8px 0;
                font-weight: bold;
            }
            .detection-mode select {
                padding: 6px 10px;
                border-radius: 4px;
                border: 1px solid #ccc;
                width: 200px;
                margin-top: 5px;
            }
            .detection-controls label {
                display: block;
                margin: 8px 0;
                font-weight: bold;
            }
            .detection-controls input[type="checkbox"] {
                margin-right: 8px;
            }
            .color-settings {
                margin-top: 10px;
                font-size: 14px;
            }
            .color-info {
                font-weight: normal;
                color: #666;
            }
            #object-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            #object-list li {
                padding: 8px 10px;
                margin: 5px 0;
                background: #f5f5f5;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
            }
            .detection-info {
                margin-top: 15px;
                padding: 10px;
                background: #f0f8ff;
                border-radius: 4px;
            }
            #detected-object {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 5px;
            }
            #object-info {
                font-size: 14px;
                color: #555;
            }
            body {
                background-image: url('./background/b.png');
                background-size: cover;
                background-repeat: no-repeat;
                background-attachment: fixed;
            }
        `;
        document.head.appendChild(styleEl);
    }    setupEventListeners() {
        // Scale selection
        if (this.elements.scaleSelect) {
            this.elements.scaleSelect.addEventListener('change', (e) => {
                this.audioEngine.setScale(e.target.value);
                this.updateStatus(`Scale changed to ${e.target.value}`);
            });
        }

        // Rhythm selection
        if (this.elements.rhythmSelect) {
            this.elements.rhythmSelect.addEventListener('change', (e) => {
                this.audioEngine.setRhythmPattern(e.target.value);
                this.updateStatus(`Rhythm changed to ${e.target.value}`);
            });
        }
        
        // Detection mode selection
        if (this.elements.detectionModeSelect) {
            this.elements.detectionModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                this.updateDetectionMode(mode);
                this.updateStatus(`Detection mode changed to ${mode === 'people' ? 'People' : 'Color Balls'}`);
            });
            
            // Set initial mode
            this.updateDetectionMode(this.elements.detectionModeSelect.value);
        }
    }
    
    updateDetectionMode(mode) {
        // Show/hide color ball info based on mode
        if (this.elements.colorBallInfo) {
            this.elements.colorBallInfo.style.display = mode === 'colorBalls' ? 'block' : 'none';
        }
        
        // Store detection mode for use in main detection loop
        this.currentDetectionMode = mode;
        
        // Enable/disable color detection based on mode
        if (this.colorDetection) {
            this.colorDetection.setEnabled(mode === 'colorBalls');
        }
    }
    
    getDetectionMode() {
        return this.currentDetectionMode || 'people';
    }    updateObjectList(predictions) {
        if (!this.elements.objectList) return;
        
        // Clear the list
        this.elements.objectList.innerHTML = '';
        
        if (predictions.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No objects detected';
            this.elements.objectList.appendChild(li);
            return;
        }
        
        const detectionMode = this.getDetectionMode();
        
        if (detectionMode === 'people') {
            // Show people detection results
            const header = document.createElement('li');
            header.innerHTML = '<strong>🤖 People Detection:</strong>';
            header.style.backgroundColor = '#e6f3ff';
            header.style.fontWeight = 'bold';
            this.elements.objectList.appendChild(header);
            
            predictions.forEach(prediction => {
                this.addPredictionToList(prediction, false);
            });
        } else if (detectionMode === 'colorBalls') {
            // Separate color detection and other neural network results
            const colorPredictions = predictions.filter(p => p.source === 'color_detection');
            const otherPredictions = predictions.filter(p => p.source !== 'color_detection');
            
            // Show color ball detection results first
            if (colorPredictions.length > 0) {
                const colorHeader = document.createElement('li');
                colorHeader.innerHTML = '<strong>🎨 Color Ball Detection:</strong>';
                colorHeader.style.backgroundColor = '#fff3e6';
                colorHeader.style.fontWeight = 'bold';
                this.elements.objectList.appendChild(colorHeader);
                
                colorPredictions.forEach(prediction => {
                    this.addPredictionToList(prediction, true);
                });
            }
            
            // Show other neural network detections (excluding people)
            if (otherPredictions.length > 0) {
                const neuralHeader = document.createElement('li');
                neuralHeader.innerHTML = '<strong>🤖 Other Objects (Neural):</strong>';
                neuralHeader.style.backgroundColor = '#e6f3ff';
                neuralHeader.style.fontWeight = 'bold';
                this.elements.objectList.appendChild(neuralHeader);
                
                otherPredictions.forEach(prediction => {
                    this.addPredictionToList(prediction, false);
                });
            }
        }
        
        // Update the main detection info with the first (highest confidence) object
        if (predictions.length > 0) {
            const topPrediction = predictions[0];
            const detectedObject = document.getElementById('detected-object');
            const objectInfo = document.getElementById('object-info');
              if (detectedObject && objectInfo) {
                const [x, y, width, height] = topPrediction.bbox;
                const source = topPrediction.source === 'color_detection' ? ' (Color)' : ' (Neural)';
                detectedObject.textContent = `Detected: ${topPrediction.class}${source}`;
                objectInfo.textContent = `Position: x=${Math.round(x)}, y=${Math.round(y)} | 
                                          Pitch: ${this.audioEngine.mapToNote(1 - (y / (topPrediction.videoHeight || 480)))} | 
                                          Rhythm: ${this.audioEngine.mapToRhythm(x / (topPrediction.videoWidth || 640))}`;
            }
        }
    }
    
    addPredictionToList(prediction, isColorDetection = false) {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        const confidenceSpan = document.createElement('span');
        
        nameSpan.textContent = prediction.class;
        confidenceSpan.textContent = `${Math.round(prediction.score * 100)}%`;
        
        // Add color indicator for color detection results
        if (isColorDetection && prediction.color) {
            const colorDot = document.createElement('span');
            colorDot.style.display = 'inline-block';
            colorDot.style.width = '12px';
            colorDot.style.height = '12px';
            colorDot.style.borderRadius = '50%';
            colorDot.style.marginRight = '8px';
            colorDot.style.backgroundColor = prediction.color;
            colorDot.style.border = '1px solid #333';
            nameSpan.insertBefore(colorDot, nameSpan.firstChild);
        }
        
        li.appendChild(nameSpan);
        li.appendChild(confidenceSpan);
        this.elements.objectList.appendChild(li);
    }updateStatus(message) {
        if (this.elements.statusEl) {
            this.elements.statusEl.textContent = message;
        }
    }
}

export default Controls;