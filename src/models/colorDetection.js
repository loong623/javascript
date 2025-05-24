/**
 * Color Ball Detection System
 * Compatible with existing neural network detection system
 * Detects colored balls/spheres in the video stream
 */

class ColorDetection {
    constructor() {
        this.isEnabled = false;
        this.isRunning = false;
        this.lastDetections = [];
        this.lastDetectionTime = 0;
        this.detectionThrottle = 100; // 限制检测频率至100ms
        
        // Color ranges for different ball colors (HSV values)
        this.colorRanges = {
            red: {
                lower: [0, 120, 70],
                upper: [10, 255, 255],
                lower2: [170, 120, 70], // Second range for red (wraps around)
                upper2: [180, 255, 255],
                name: 'red ball'
            },
            blue: {
                lower: [100, 120, 70],
                upper: [130, 255, 255],
                name: 'blue ball'
            },
            green: {
                lower: [40, 120, 70],
                upper: [80, 255, 255],
                name: 'green ball'
            },
            yellow: {
                lower: [20, 120, 70],
                upper: [40, 255, 255],
                name: 'yellow ball'
            },
            orange: {
                lower: [10, 120, 70],
                upper: [20, 255, 255],
                name: 'orange ball'
            },
            purple: {
                lower: [130, 120, 70],
                upper: [170, 255, 255],
                name: 'purple ball'
            }
        };
        
        // Detection parameters
        this.minContourArea = 500; // 最小轮廓面积
        this.maxContourArea = 50000; // 最大轮廓面积
        this.circularityThreshold = 0.7; // 圆形度阈值
        this.minConfidence = 0.6; // 最小置信度
        
        // Canvas for image processing
        this.processingCanvas = null;
        this.processingCtx = null;
        this.tempCanvas = null;
        this.tempCtx = null;
        
        this._initializeCanvases();
    }
    
    /**
     * 初始化处理用的画布
     * @private
     */
    _initializeCanvases() {
        // 创建离屏画布用于图像处理
        this.processingCanvas = document.createElement('canvas');
        this.processingCtx = this.processingCanvas.getContext('2d');
        
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
    }
    
    /**
     * 启用/禁用颜色检测
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            console.log('颜色球检测已启用');
        } else {
            console.log('颜色球检测已禁用');
            this.lastDetections = [];
        }
    }
    
    /**
     * 设置运行状态
     * @param {boolean} running - 是否运行
     */
    setRunning(running) {
        this.isRunning = running;
    }
    
    /**
     * 检测视频中的彩色球
     * @param {HTMLVideoElement} videoElement - 视频元素
     * @returns {Array} 检测结果数组，格式与神经网络检测结果兼容
     */
    async detectColorBalls(videoElement) {
        if (!this.isEnabled || !this.isRunning) {
            return [];
        }
        
        // 节流检测以提高性能
        const now = Date.now();
        if (now - this.lastDetectionTime < this.detectionThrottle) {
            return this.lastDetections;
        }
        this.lastDetectionTime = now;
        
        try {
            // 检查视频是否有效
            if (!videoElement || 
                !videoElement.videoWidth || 
                !videoElement.videoHeight || 
                videoElement.readyState < 2) {
                return [];
            }
            
            // 设置处理画布尺寸
            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;
            
            this.processingCanvas.width = width;
            this.processingCanvas.height = height;
            this.tempCanvas.width = width;
            this.tempCanvas.height = height;
            
            // 将视频帧绘制到画布上
            this.processingCtx.drawImage(videoElement, 0, 0, width, height);
            
            // 获取图像数据
            const imageData = this.processingCtx.getImageData(0, 0, width, height);
            
            // 转换为HSV并检测彩色球
            const detections = this._detectBallsInImage(imageData, width, height);
            
            this.lastDetections = detections;
            return detections;
            
        } catch (error) {
            console.error('颜色球检测错误:', error);
            return this.lastDetections;
        }
    }
    
    /**
     * 在图像中检测彩色球
     * @param {ImageData} imageData - 图像数据
     * @param {number} width - 图像宽度
     * @param {number} height - 图像高度
     * @returns {Array} 检测结果
     * @private
     */
    _detectBallsInImage(imageData, width, height) {
        const detections = [];
        const data = imageData.data;
        
        // 为每种颜色创建掩码并检测
        for (const [colorName, colorRange] of Object.entries(this.colorRanges)) {
            const mask = this._createColorMask(data, width, height, colorRange);
            const ballDetections = this._findBallsInMask(mask, width, height, colorRange.name);
            detections.push(...ballDetections);
        }
        
        return detections;
    }
    
    /**
     * 创建颜色掩码
     * @param {Uint8ClampedArray} data - 图像数据
     * @param {number} width - 图像宽度
     * @param {number} height - 图像高度
     * @param {Object} colorRange - 颜色范围
     * @returns {Uint8Array} 二值掩码
     * @private
     */
    _createColorMask(data, width, height, colorRange) {
        const mask = new Uint8Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 转换RGB到HSV
            const hsv = this._rgbToHsv(r, g, b);
            
            // 检查是否在颜色范围内
            let inRange = this._isInHsvRange(hsv, colorRange.lower, colorRange.upper);
            
            // 对于红色，检查第二个范围（HSV中红色会环绕）
            if (!inRange && colorRange.lower2 && colorRange.upper2) {
                inRange = this._isInHsvRange(hsv, colorRange.lower2, colorRange.upper2);
            }
            
            const pixelIndex = Math.floor(i / 4);
            mask[pixelIndex] = inRange ? 255 : 0;
        }
        
        return mask;
    }
    
    /**
     * 在掩码中查找球形轮廓
     * @param {Uint8Array} mask - 二值掩码
     * @param {number} width - 图像宽度
     * @param {number} height - 图像高度
     * @param {string} className - 类别名称
     * @returns {Array} 检测结果
     * @private
     */
    _findBallsInMask(mask, width, height, className) {
        const detections = [];
        const visited = new Set();
        
        // 使用连通组件分析找到潜在的球形区域
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                
                if (mask[index] === 255 && !visited.has(index)) {
                    const component = this._floodFill(mask, width, height, x, y, visited);
                    
                    if (component.length > this.minContourArea && component.length < this.maxContourArea) {
                        const ballInfo = this._analyzeBallComponent(component, width, height);
                        
                        if (ballInfo && ballInfo.circularity > this.circularityThreshold) {
                            // 创建与神经网络检测结果兼容的格式
                            const detection = {
                                class: className,
                                score: Math.min(ballInfo.circularity * ballInfo.confidence, 0.99),
                                bbox: [
                                    ballInfo.x - ballInfo.radius,
                                    ballInfo.y - ballInfo.radius,
                                    ballInfo.radius * 2,
                                    ballInfo.radius * 2
                                ],
                                center: { x: ballInfo.x, y: ballInfo.y },
                                radius: ballInfo.radius,
                                color: className.split(' ')[0], // 提取颜色名称
                                source: 'color_detection' // 标识为颜色检测结果
                            };
                            
                            detections.push(detection);
                        }
                    }
                }
            }
        }
        
        return detections;
    }
    
    /**
     * 洪水填充算法找连通组件
     * @param {Uint8Array} mask - 二值掩码
     * @param {number} width - 图像宽度
     * @param {number} height - 图像高度
     * @param {number} startX - 起始X坐标
     * @param {number} startY - 起始Y坐标
     * @param {Set} visited - 已访问像素集合
     * @returns {Array} 连通组件像素坐标
     * @private
     */
    _floodFill(mask, width, height, startX, startY, visited) {
        const component = [];
        const stack = [{ x: startX, y: startY }];
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const index = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height || 
                visited.has(index) || mask[index] !== 255) {
                continue;
            }
            
            visited.add(index);
            component.push({ x, y });
            
            // 添加邻接像素
            stack.push(
                { x: x + 1, y },
                { x: x - 1, y },
                { x, y: y + 1 },
                { x, y: y - 1 }
            );
        }
        
        return component;
    }
    
    /**
     * 分析球形组件的特征
     * @param {Array} component - 连通组件
     * @param {number} width - 图像宽度
     * @param {number} height - 图像高度
     * @returns {Object|null} 球形特征信息
     * @private
     */
    _analyzeBallComponent(component, width, height) {
        if (component.length === 0) return null;
        
        // 计算质心
        let sumX = 0, sumY = 0;
        for (const point of component) {
            sumX += point.x;
            sumY += point.y;
        }
        const centerX = sumX / component.length;
        const centerY = sumY / component.length;
        
        // 计算到质心的平均距离作为半径
        let sumDist = 0;
        for (const point of component) {
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            sumDist += Math.sqrt(dx * dx + dy * dy);
        }
        const avgRadius = sumDist / component.length;
        
        // 计算圆形度（实际面积 vs 理论圆形面积）
        const area = component.length;
        const theoreticalArea = Math.PI * avgRadius * avgRadius;
        const circularity = theoreticalArea > 0 ? area / theoreticalArea : 0;
        
        // 计算紧凑度作为置信度指标
        const perimeter = this._estimatePerimeter(component);
        const compactness = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
        
        // 综合置信度
        const confidence = Math.min(circularity * compactness, 1.0);
        
        return {
            x: centerX,
            y: centerY,
            radius: avgRadius,
            circularity: Math.min(circularity, 1.0),
            confidence: confidence,
            area: area
        };
    }
    
    /**
     * 估算轮廓周长
     * @param {Array} component - 连通组件
     * @returns {number} 估算的周长
     * @private
     */
    _estimatePerimeter(component) {
        // 简化的周长估算：边界像素数量
        const pointSet = new Set(component.map(p => `${p.x},${p.y}`));
        let boundaryCount = 0;
        
        for (const point of component) {
            const { x, y } = point;
            
            // 检查是否为边界点（邻居中有不属于组件的点）
            const neighbors = [
                { x: x + 1, y }, { x: x - 1, y },
                { x, y: y + 1 }, { x, y: y - 1 }
            ];
            
            for (const neighbor of neighbors) {
                if (!pointSet.has(`${neighbor.x},${neighbor.y}`)) {
                    boundaryCount++;
                    break;
                }
            }
        }
        
        return boundaryCount;
    }
    
    /**
     * RGB转HSV颜色空间
     * @param {number} r - 红色值 (0-255)
     * @param {number} g - 绿色值 (0-255)
     * @param {number} b - 蓝色值 (0-255)
     * @returns {Array} HSV值 [H(0-180), S(0-255), V(0-255)]
     * @private
     */
    _rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : diff / max;
        const v = max;
        
        if (diff !== 0) {
            switch (max) {
                case r:
                    h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / diff + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / diff + 4) / 6;
                    break;
            }
        }
        
        return [
            Math.round(h * 180), // H: 0-180 (OpenCV range)
            Math.round(s * 255), // S: 0-255
            Math.round(v * 255)  // V: 0-255
        ];
    }
    
    /**
     * 检查HSV值是否在指定范围内
     * @param {Array} hsv - HSV值
     * @param {Array} lower - 下限 [H, S, V]
     * @param {Array} upper - 上限 [H, S, V]
     * @returns {boolean} 是否在范围内
     * @private
     */
    _isInHsvRange(hsv, lower, upper) {
        const [h, s, v] = hsv;
        const [lowerH, lowerS, lowerV] = lower;
        const [upperH, upperS, upperV] = upper;
        
        return h >= lowerH && h <= upperH &&
               s >= lowerS && s <= upperS &&
               v >= lowerV && v <= upperV;
    }
    
    /**
     * 获取最新的检测结果
     * @returns {Array} 最新的检测结果
     */
    getLatestDetections() {
        return [...this.lastDetections];
    }
    
    /**
     * 获取可检测的颜色列表
     * @returns {Array} 颜色名称数组
     */
    getSupportedColors() {
        return Object.keys(this.colorRanges);
    }
    
    /**
     * 更新特定颜色的检测参数
     * @param {string} colorName - 颜色名称
     * @param {Object} newRange - 新的颜色范围
     */
    updateColorRange(colorName, newRange) {
        if (this.colorRanges[colorName]) {
            this.colorRanges[colorName] = { ...this.colorRanges[colorName], ...newRange };
            console.log(`已更新 ${colorName} 的检测范围`);
        }
    }
    
    /**
     * 设置检测参数
     * @param {Object} params - 参数对象
     */
    setDetectionParams(params) {
        if (params.minContourArea !== undefined) {
            this.minContourArea = params.minContourArea;
        }
        if (params.maxContourArea !== undefined) {
            this.maxContourArea = params.maxContourArea;
        }
        if (params.circularityThreshold !== undefined) {
            this.circularityThreshold = params.circularityThreshold;
        }
        if (params.minConfidence !== undefined) {
            this.minConfidence = params.minConfidence;
        }
        
        console.log('颜色检测参数已更新:', params);
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.isEnabled = false;
        this.isRunning = false;
        this.lastDetections = [];
        
        if (this.processingCanvas) {
            this.processingCanvas = null;
            this.processingCtx = null;
        }
        
        if (this.tempCanvas) {
            this.tempCanvas = null;
            this.tempCtx = null;
        }
        
        console.log('颜色检测资源已清理');
    }
}

export default ColorDetection;
