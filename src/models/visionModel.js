import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

class VisionModel {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.isRunning = false;
        this.latestPredictions = [];
        this.objectsToDetect = [
            'person', 'bottle', 'cup', 'book', 'cell phone', 
            'keyboard', 'remote', 'mouse', 'laptop'
        ];
        this.modelLoadAttempts = 0;
        this.maxLoadAttempts = 3;
        this.loadProgress = 0;
        this.lastDetectionError = null;
    }

    /**
     * 加载物品检测模型
     * @returns {Promise<boolean>} 是否成功加载
     */
    async loadModel() {
        try {
            // 确保TensorFlow已准备就绪
            if (!tf.getBackend()) {
                console.log('正在初始化TensorFlow后端...');
                await tf.ready();
                const backend = tf.getBackend();
                console.log(`TensorFlow后端初始化完成: ${backend}`);
            }

            // 记录开始加载时间
            const startTime = Date.now();
            
            // 添加进度监听
            const loadingCallback = {
                // 这里由于COCO-SSD不支持进度回调，我们仅记录日志
                onProgress: (progress) => {
                    this.loadProgress = progress || 50;
                    console.log(`模型加载进度: ${this.loadProgress}%`);
                }
            };
            
            this.model = await cocoSsd.load({
                base: 'lite_mobilenet_v2', // 使用较轻量级模型提高加载速度
                modelUrl: undefined, // 使用默认CDN
            });
            
            const loadTime = Date.now() - startTime;
            console.log(`模型加载完成，耗时: ${loadTime}ms`);
            
            // 初始测试检测以确认模型正常工作
            try {
                const testCanvas = document.createElement('canvas');
                testCanvas.width = 10;
                testCanvas.height = 10;
                const testContext = testCanvas.getContext('2d');
                testContext.fillStyle = 'black';
                testContext.fillRect(0, 0, 10, 10);
                
                await this.model.detect(testCanvas);
                console.log('模型测试成功');
                
                // 清理测试资源
                testCanvas.remove();
            } catch (testErr) {
                console.warn('模型测试失败，但仍继续使用:', testErr);
            }
            
            this.isLoaded = true;
            this.modelLoadAttempts = 0;
            return true;
        } catch (error) {
            console.error('加载物品检测模型失败:', error);
            
            this.modelLoadAttempts++;
            
            // 如果小于最大尝试次数，尝试重新加载
            if (this.modelLoadAttempts < this.maxLoadAttempts) {
                console.log(`尝试重新加载模型 (${this.modelLoadAttempts}/${this.maxLoadAttempts})...`);
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.loadModel();
            }
            
            // 如果加载失败，可能是内存问题，尝试清理
            try {
                tf.disposeVariables();
                tf.engine().purgeLocalWebGLMemory();
                console.log('清理TensorFlow内存后尝试加载');
            } catch (e) {
                console.error('清理内存失败:', e);
            }
            
            return false;
        }
    }

    /**
     * 检查模型是否已加载
     * @returns {boolean} 模型是否已加载
     */
    isModelLoaded() {
        return this.isLoaded && this.model !== null;
    }

    /**
     * 设置模型运行状态
     * @param {boolean} state 运行状态
     */
    setRunningState(state) {
        this.isRunning = state;
        // 重置错误状态
        if (state) {
            this.lastDetectionError = null;
        }
    }

    /**
     * 检测视频中的物品
     * @param {HTMLVideoElement} videoElement 视频元素
     * @returns {Promise<Array>} 检测结果数组
     */
    async detectObjects(videoElement) {
        // 如果模型未加载或未运行，返回空数组
        if (!this.isLoaded || !this.isRunning) return [];
        
        // 如果视频元素无效或不可用，返回空数组
        if (!videoElement || 
            !videoElement.videoWidth || 
            !videoElement.videoHeight || 
            videoElement.readyState < 2) {
            return [];
        }
        
        try {
            // 运行检测
            const predictions = await this.model.detect(videoElement);
            
            // 对已识别物体进行过滤
            const filteredPredictions = this.filterPredictions(predictions);
            
            // 排序，按置信度降序
            filteredPredictions.sort((a, b) => b.score - a.score);
            
            // 更新最新预测结果
            this.latestPredictions = filteredPredictions;
            
            // 重置错误状态
            this.lastDetectionError = null;
            
            return filteredPredictions;
        } catch (error) {
            // 记录错误但不中断应用
            this.lastDetectionError = error;
            console.error('物品检测错误:', error);
            
            // 如果是内存或WebGL相关错误，尝试清理资源
            if (error.message && 
                (error.message.includes('memory') || 
                 error.message.includes('WebGL') || 
                 error.message.includes('GPU'))) {
                try {
                    // 尝试清理TensorFlow资源（使用更简洁的方法）
                    tf.engine().endScope();
                    tf.engine().purgeLocalWebGLMemory();
                    console.log('已清理TensorFlow内存资源');
                } catch (e) {
                    console.warn('清理TensorFlow资源失败:', e);
                }
            }
            
            // 返回最近一次有效的预测结果，以保持连续性
            return this.latestPredictions;
        }
    }
    
    /**
     * 过滤检测结果，只保留感兴趣的对象
     * @param {Array} predictions 原始检测结果
     * @returns {Array} 过滤后的检测结果
     */
    filterPredictions(predictions) {
        const minConfidence = 0.5;
        return predictions.filter(prediction => 
            prediction.score >= minConfidence &&
            prediction.class === 'person' // 只保留人类
        );
    }
    
    /**
     * 获取最新的预测结果
     * @returns {Array} 最新的预测结果
     */
    getLatestPredictions() {
        return [...this.latestPredictions];
    }
    
    /**
     * 获取最后一次检测错误
     * @returns {Error|null} 最后一次错误或null
     */
    getLastError() {
        return this.lastDetectionError;
    }
    
    /**
     * 添加要检测的物品类别
     * @param {string} className 物品类名
     * @returns {boolean} 是否成功添加
     */
    addObjectClass(className) {
        if (!this.objectsToDetect.includes(className)) {
            this.objectsToDetect.push(className);
            return true;
        }
        return false;
    }
    
    /**
     * 从检测列表中移除物品类别
     * @param {string} className 物品类名
     * @returns {boolean} 是否成功移除
     */
    removeObjectClass(className) {
        const index = this.objectsToDetect.indexOf(className);
        if (index !== -1) {
            this.objectsToDetect.splice(index, 1);
            return true;
        }
        return false;
    }
    
    /**
     * 获取要检测的物品类别列表
     * @returns {Array<string>} 物品类别列表
     */
    getObjectsToDetect() {
        return [...this.objectsToDetect];
    }
    
    /**
     * 清理资源
     */
    dispose() {
        // 释放所有TensorFlow资源
        try {
            if (this.model && typeof this.model.dispose === 'function') {
                this.model.dispose();
            }
            
            tf.engine().purgeLocalWebGLMemory();
            console.log('已清理视觉模型资源');
        } catch (err) {
            console.error('清理视觉模型资源时出错:', err);
        }
        
        this.model = null;
        this.isLoaded = false;
        this.isRunning = false;
        this.latestPredictions = [];
    }
}

export default VisionModel;