import * as Tone from 'tone';

/**
 * 高级噪声处理工具类
 * 提供了增强的噪声门控和信号处理功能
 */
class NoiseUtils {
    /**
     * 创建增强型噪声门
     * @param {Object} options - 噪声门配置
     * @returns {Tone.Gate} 配置好的噪声门实例
     */
    createEnhancedNoiseGate(options = {}) {
        // 默认设置，专注于消除背景噪声
        const defaults = {
            threshold: -35,    // 较高的阈值捕获更多噪声
            smoothing: 0.1,    // 更快的平滑以获得更好的响应
            attack: 0.005,     // 快速攻击以保留瞬态
            release: 0.1      // 较短的释放以减少噪声泄漏
        };
        
        // 合并选项
        const settings = {...defaults, ...options};
        
        try {
            // 创建噪声门
            const noiseGate = new Tone.Gate(settings).toDestination();
            
            // 增强噪声门以处理动态输入
            this._enhanceGate(noiseGate);
            
            return noiseGate;
        } catch (error) {
            console.error('创建噪声门时出错:', error);
            // 返回一个简单的通道作为备用
            return new Tone.Volume(0).toDestination();
        }
    }
    
    /**
     * 安全访问对象属性
     * @private
     */
    _safeGet(obj, path) {
        if (!obj) return undefined;
        
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        
        return current;
    }
    
    /**
     * 安全设置对象属性
     * @private
     */
    _safeSet(obj, path, value) {
        if (!obj) return false;
        
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== 'object') {
                return false;
            }
            current = current[part];
        }
        
        try {
            const lastPart = parts[parts.length - 1];
            current[lastPart] = value;
            return true;
        } catch (error) {
            console.error(`无法设置属性 ${path}:`, error);
            return false;
        }
    }
    
    /**
     * 增强噪声门的功能
     * @param {Tone.Gate} gate - 要增强的噪声门
     * @private
     */
    _enhanceGate(gate) {
        if (!gate || typeof gate !== 'object') return;
        
        try {
            // 确保 gate.threshold 是一个对象而不是数字
            if (gate.threshold && typeof gate.threshold === 'object') {
                // 存储原始设置以便后续调整
                gate._originalSettings = {
                    threshold: this._safeGet(gate, 'threshold.value') || -30,
                    attack: gate.attack || 0.005,
                    release: gate.release || 0.1
                };
                
                // 添加自适应功能
                gate.adaptiveMode = false;
                
                // 添加动态调整方法
                gate.adaptThreshold = function(level) {
                    if (!this.adaptiveMode || !this.threshold || typeof this.threshold.rampTo !== 'function') return;
                    
                    // 根据输入级别动态调整阈值
                    const newThreshold = Math.max(
                        -50,  // 最低阈值
                        Math.min(-20, level - 10) // 最高阈值
                    );
                    this.threshold.rampTo(newThreshold, 0.2);
                };
                
                // 添加重置方法
                gate.resetToDefaults = () => {
                    if (!gate || !gate._originalSettings) return;
                    
                    if (gate.threshold && typeof gate.threshold === 'object') {
                        try {
                            gate.threshold.value = gate._originalSettings.threshold;
                        } catch (e) {
                            console.warn('无法重置阈值:', e);
                        }
                    }
                    
                    gate.attack = gate._originalSettings.attack;
                    gate.release = gate._originalSettings.release;
                };
            } else {
                console.warn('噪声门阈值不是一个对象，跳过增强');
            }
        } catch (error) {
            console.error('增强噪声门时出错:', error);
        }
    }
    
    /**
     * 优化噪声门参数
     * @param {Tone.Gate} gate - 噪声门实例
     * @param {Object} options - 配置选项
     */
    optimizeNoiseGate(gate, options = {}) {
        if (!gate || typeof gate !== 'object') {
            console.warn('无法优化噪声门: 参数无效');
            return;
        }
        
        try {
            // 设置噪声门参数
            if (options.threshold !== undefined && gate.threshold && typeof gate.threshold === 'object') {
                try {
                    gate.threshold.value = options.threshold;
                } catch (e) {
                    console.warn(`无法设置阈值 ${options.threshold}:`, e);
                    // 备选方案：如果直接设置失败，尝试使用 rampTo
                    if (typeof gate.threshold.rampTo === 'function') {
                        gate.threshold.rampTo(options.threshold, 0.01);
                    }
                }
            }
            
            if (options.smoothing !== undefined) {
                gate.smoothing = options.smoothing;
            }
            
            if (options.attack !== undefined) {
                gate.attack = options.attack;
            }
            
            if (options.release !== undefined) {
                gate.release = options.release;
            }
            
            // 为自适应模式设置标志
            gate.adaptiveMode = !!options.adaptive;
        } catch (error) {
            console.error('优化噪声门参数时出错:', error);
        }
    }
    
    /**
     * 处理峰值信号
     * 当检测到较强信号时调整噪声门参数
     * @param {Tone.Gate} gate - 噪声门实例
     * @param {number} intensity - 信号强度 (0-1)
     */
    handlePeakSignal(gate, intensity) {
        // 更健壮的参数检查
        if (!gate || typeof gate !== 'object') {
            console.warn('无法处理峰值信号: 噪声门无效');
            return;
        }

        try {
            // 确保 intensity 在有效范围内
            const safeIntensity = Math.max(0, Math.min(1, intensity || 0.5));
            
            // 检查 threshold 属性
            if (!gate.threshold) {
                console.warn('无法处理峰值信号: 噪声门没有阈值属性');
                return;
            }

            // 获取当前阈值 - 使用更安全的方法
            let currentThreshold = -30; // 默认值
            try {
                // 如果是对象类型，则尝试获取value属性
                if (typeof gate.threshold === 'object' && gate.threshold !== null) {
                    if (typeof gate.threshold.value === 'number') {
                        currentThreshold = gate.threshold.value;
                    }
                } 
                // 如果是数字类型，直接使用
                else if (typeof gate.threshold === 'number') {
                    currentThreshold = gate.threshold;
                }
            } catch (e) {
                console.warn('获取当前阈值时出错，使用默认值:', e);
            }
            
            // 计算峰值阈值
            const peakThreshold = Math.min(-20, currentThreshold + (safeIntensity * 5));
            
            // 尝试调整阈值 - 兼容多种情况
            if (typeof gate.threshold === 'object' && gate.threshold !== null) {
                // 1. 首先尝试使用 rampTo 方法
                if (typeof gate.threshold.rampTo === 'function') {
                    gate.threshold.rampTo(peakThreshold, 0.05);
                } 
                // 2. 如果没有 rampTo 方法，尝试直接设置值
                else if ('value' in gate.threshold) {
                    try {
                        gate.threshold.value = peakThreshold;
                    } catch (e) {
                        console.warn('无法设置阈值属性:', e);
                    }
                }
                // 3. 如果以上都失败，尝试设置整个阈值属性
                else {
                    try {
                        gate.threshold = peakThreshold;
                    } catch (e) {
                        console.warn('无法设置阈值:', e);
                    }
                }
            } 
            // 如果阈值是数字，直接设置
            else if (typeof gate.threshold === 'number') {
                gate.threshold = peakThreshold;
            }
            
            // 之后恢复阈值
            setTimeout(() => {
                try {
                    // 与上面相同的逻辑处理恢复阈值
                    if (typeof gate.threshold === 'object' && gate.threshold !== null) {
                        if (typeof gate.threshold.rampTo === 'function') {
                            gate.threshold.rampTo(currentThreshold, 0.2);
                        } else if ('value' in gate.threshold) {
                            gate.threshold.value = currentThreshold;
                        } else {
                            gate.threshold = currentThreshold;
                        }
                    } else if (typeof gate.threshold === 'number') {
                        gate.threshold = currentThreshold;
                    }
                } catch (e) {
                    console.warn('恢复阈值时出错:', e);
                }
            }, 150);
        } catch (error) {
            console.error('处理峰值信号时出错:', error);
        }
    }
    
    /**
     * 分析音频信号的噪声特征
     * @param {AudioBuffer} buffer - 要分析的音频缓冲区
     * @returns {Object} 噪声特征
     */
    analyzeNoiseProfile(buffer) {
        // 此方法在实际实现中会分析音频并返回噪声特征
        // 由于浏览器限制，这里仅返回模拟结果
        return {
            noiseFloor: -60 + Math.random() * 10,
            peaks: -30 + Math.random() * 15,
            suggested: {
                threshold: -45 + Math.random() * 10,
                attack: 0.001 + Math.random() * 0.01,
                release: 0.05 + Math.random() * 0.1
            }
        };
    }
}

export default NoiseUtils;