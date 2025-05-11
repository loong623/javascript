/**
 * UI Controls for Interactive Music Generator
 */

class Controls {
    constructor(audioEngine, visionModel) {
        this.audioEngine = audioEngine;
        this.visionModel = visionModel;
        this.elements = {};
        this.isInitialized = false;
    }

    initialize() {
        // Find all control elements
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
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
    }

    createMissingUIElements() {
        const container = document.querySelector('.container');

        // Create scale selector if it doesn't exist
        if (!this.elements.scaleSelect) {
            const scaleContainer = document.createElement('div');
            scaleContainer.className = 'control-group';
            scaleContainer.innerHTML = `
                <label for="scale-select">音阶:</label>
                <select id="scale-select">
                    <option value="major">大调</option>
                    <option value="minor">小调</option>
                    <option value="pentatonic">五声音阶</option>
                    <option value="blues">蓝调音阶</option>
                </select>
            `;
            container.appendChild(scaleContainer);
            this.elements.scaleSelect = document.getElementById('scale-select');
        }

        // Create rhythm selector if it doesn't exist
        if (!this.elements.rhythmSelect) {
            const rhythmContainer = document.createElement('div');
            rhythmContainer.className = 'control-group';
            rhythmContainer.innerHTML = `
                <label for="rhythm-select">节奏型:</label>
                <select id="rhythm-select">
                    <option value="basic">基本</option>
                    <option value="techno">电子</option>
                    <option value="jazz">爵士</option>
                    <option value="latin">拉丁</option>
                </select>
            `;
            container.appendChild(rhythmContainer);
            this.elements.rhythmSelect = document.getElementById('rhythm-select');
        }

        // Create object list if it doesn't exist
        if (!this.elements.objectList) {
            const objectContainer = document.createElement('div');
            objectContainer.className = 'object-detection-panel';
            objectContainer.innerHTML = `
                <h3>检测的物品</h3>
                <ul id="object-list"></ul>
                <div class="detection-info">
                    <div id="detected-object">未检测到物品</div>
                    <div id="object-info"></div>
                </div>
            `;
            container.appendChild(objectContainer);
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
            }
            .object-detection-panel h3 {
                margin-top: 0;
                color: #333;
                background-color: #f5f5dc; /* 米白色背景 */
                padding: 10px;
                border-radius: 4px;
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
    }

    setupEventListeners() {
        // Scale selection
        if (this.elements.scaleSelect) {
            this.elements.scaleSelect.addEventListener('change', (e) => {
                this.audioEngine.setScale(e.target.value);
                this.updateStatus(`音阶已更改为 ${e.target.value}`);
            });
        }

        // Rhythm selection
        if (this.elements.rhythmSelect) {
            this.elements.rhythmSelect.addEventListener('change', (e) => {
                this.audioEngine.setRhythmPattern(e.target.value);
                this.updateStatus(`节奏型已更改为 ${e.target.value}`);
            });
        }
    }

    updateObjectList(predictions) {
        if (!this.elements.objectList) return;
        
        // Clear the list
        this.elements.objectList.innerHTML = '';
        
        if (predictions.length === 0) {
            const li = document.createElement('li');
            li.textContent = '未检测到物品';
            this.elements.objectList.appendChild(li);
            return;
        }
        
        // Add each detected object
        predictions.forEach(prediction => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            const confidenceSpan = document.createElement('span');
            
            nameSpan.textContent = prediction.class;
            confidenceSpan.textContent = `${Math.round(prediction.score * 100)}%`;
            
            li.appendChild(nameSpan);
            li.appendChild(confidenceSpan);
            this.elements.objectList.appendChild(li);
            
            // If this is the first object, update the detected object info
            if (prediction === predictions[0]) {
                const detectedObject = document.getElementById('detected-object');
                const objectInfo = document.getElementById('object-info');
                
                if (detectedObject && objectInfo) {
                    const [x, y, width, height] = prediction.bbox;
                    detectedObject.textContent = `检测到: ${prediction.class}`;
                    objectInfo.textContent = `位置: x=${Math.round(x)}, y=${Math.round(y)} | 
                                              音高: ${this.audioEngine.mapToNote(1 - (y / height))} | 
                                              节奏: ${this.audioEngine.mapToRhythm(x / width)}`;
                }
            }
        });
    }

    updateStatus(message) {
        if (this.elements.statusEl) {
            this.elements.statusEl.textContent = message;
        }
    }
}

export default Controls;