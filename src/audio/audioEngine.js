import * as Tone from 'tone';
import { Transport } from 'tone';
import StepSequencer from './sequencer/stepSequencer.js';
import PatternManager from './sequencer/patternManager.js';
import SynthFactory from './instruments/synthFactory.js';
import EffectsChain from './effects/effectsChain.js';
import NoiseUtils from './effects/noiseUtils.js';

class AudioEngine {
    constructor() {
        // 音频上下文管理
        this.contextStarted = false;
        this.isPlaying = false;
        
        // 创建高级噪声消除系统
        this.noiseUtils = new NoiseUtils();
        
        // 创建效果链管理器
        this.effectsChain = new EffectsChain();
        
        // 创建合成器
        this.synthFactory = new SynthFactory();
        this.mainSynths = {};
        
        // 创建音序器
        this.sequencer = new StepSequencer();
        this.patternManager = new PatternManager();
        
        // 模式状态
        this.currentScale = 'major';
        this.currentRhythmPattern = 'basic';
        this.lastNoteTime = 0;
        this.activeNotes = new Set();
        this.lastBeatTime = 0;
        
        // 初始化
        this._initInstruments();
        this._initEffects();
        this._initPatterns();
        this._initTransport();
    }

    /**
     * 初始化所有乐器
     * @private
     */
    _initInstruments() {
        // 创建主要合成器
        this.mainSynths = {
            // 主合成器 - 中央区域使用
            main: this.synthFactory.createPolySynth({
                oscillator: {
                    type: 'sine',
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.6,
                    release: 1.2
                },
                volume: -10
            }),
            
            // 低音合成器 - 左侧区域使用
            bass: this.synthFactory.createMonoSynth({
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.1,
                    decay: 0.3,
                    sustain: 0.5,
                    release: 1.5
                },
                filterEnvelope: {
                    attack: 0.05,
                    decay: 0.5,
                    sustain: 0.3,
                    release: 2,
                    baseFrequency: 200,
                    octaves: 2.5
                },
                volume: -12
            }),
            
            // 滑音合成器 - 右侧区域使用
            glide: this.synthFactory.createMonoSynth({
                oscillator: { type: 'sawtooth' },
                envelope: {
                    attack: 0.05,
                    decay: 0.2,
                    sustain: 0.8,
                    release: 2
                },
                portamento: 0.2,
                volume: -15
            })
        };
        
        // 创建鼓组系统
        this.drumKit = this.synthFactory.createDrumKit();
    }

    /**
     * 初始化音频效果链
     * @private
     */
    _initEffects() {
        // 创建主效果链
        const mainEffectsChain = this.effectsChain.createChain({
            // 低切滤波器 - 去除低频噪音
            lowcut: new Tone.Filter({
                type: "highpass",
                frequency: 80,
                rolloff: -24
            }),
            
            // 混响效果
            reverb: new Tone.Reverb({
                decay: 1.5,
                wet: 0.2,
                preDelay: 0.1
            }),
            
            // 延迟效果
            delay: new Tone.FeedbackDelay({
                delayTime: "8n", 
                feedback: 0.1,
                wet: 0.1
            }),
            
            // 增强型噪声门 - 关键组件
            noiseGate: this.noiseUtils.createEnhancedNoiseGate({
                threshold: -30,
                smoothing: 0.1,
                attack: 0.003,
                release: 0.1
            }),
            
            // 动态压缩器 - 平衡响度
            compressor: new Tone.Compressor({
                threshold: -24,
                ratio: 4,
                attack: 0.003,
                release: 0.25,
                knee: 30
            }),
            
            // 主音量控制
            masterVolume: new Tone.Volume(-5)
        });
        
        // 连接合成器到效果链
        this.effectsChain.connectInstruments(this.mainSynths, mainEffectsChain);
        
        // 将所有效果发送到输出
        mainEffectsChain.masterVolume.toDestination();
        
        // 存储引用以便后续使用
        this.mainEffectsChain = mainEffectsChain;
    }

    /**
     * 初始化音乐模式
     * @private
     */
    _initPatterns() {
        // 从模式管理器获取
        this.scales = this.patternManager.getScales();
        this.rhythmPatterns = this.patternManager.getRhythmPatterns();
        this.drumPatterns = this.patternManager.getDrumPatterns();
        this.timbres = this.patternManager.getTimbres();
    }

    /**
     * 初始化传输控制
     * @private
     */
    _initTransport() {
        // 设置默认BPM
        this.bpm = 120;
        try {
            if (Transport.bpm && typeof Transport.bpm === 'object') {
                Transport.bpm.value = this.bpm;
            }
        } catch (err) {
            console.error('设置 BPM 失败:', err);
        }
        this.beatInterval = 60 / this.bpm;
        
        // 静音主输出直到明确启动
        this._safeSetVolume(Tone.getDestination(), -Infinity);
    }

    /**
     * 安全设置音量值
     * @private
     */
    _safeSetVolume(volumeNode, value) {
        try {
            // 确保是一个有效的音量节点
            if (volumeNode && volumeNode.volume && typeof volumeNode.volume === 'object') {
                if (typeof volumeNode.volume.value === 'number') {
                    volumeNode.volume.value = value;
                } else if (typeof volumeNode.volume.rampTo === 'function') {
                    volumeNode.volume.rampTo(value, 0.01);
                }
            }
        } catch (err) {
            console.warn('设置音量时出错:', err);
        }
    }

    /**
     * 安全设置效果参数
     * @private
     */
    _safeSetEffectParam(effect, paramName, value) {
        if (!effect) return false;
        
        try {
            const paramParts = paramName.split('.');
            let current = effect;
            
            // 遍历参数路径
            for (let i = 0; i < paramParts.length - 1; i++) {
                current = current[paramParts[i]];
                if (!current || typeof current !== 'object') {
                    return false;
                }
            }
            
            // 获取最后一个参数名
            const lastParam = paramParts[paramParts.length - 1];
            
            // 如果是对象并且有 value 属性，设置 value
            if (current[lastParam] && typeof current[lastParam] === 'object' &&
                'value' in current[lastParam]) {
                current[lastParam].value = value;
                return true;
            } 
            // 如果是对象并且有 rampTo 方法，使用 rampTo
            else if (current[lastParam] && typeof current[lastParam] === 'object' &&
                     typeof current[lastParam].rampTo === 'function') {
                current[lastParam].rampTo(value, 0.01);
                return true;
            }
            // 否则直接设置
            else {
                current[lastParam] = value;
                return true;
            }
        } catch (err) {
            console.warn(`设置效果参数 ${paramName} 失败:`, err);
            return false;
        }
    }

    /**
     * 启动音频引擎
     */
    async start() {
        if (this.isPlaying) return;
        
        // 确保音频上下文已启动
        if (!this.contextStarted) {
            try {
                await Tone.start();
                this.contextStarted = true;
                
                // 延迟启动，让音频系统初始化
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                console.error('启动音频上下文失败:', err);
                return;
            }
        }
        
        // 重置效果链
        this._resetEffects();
        
        // 开始传输
        Transport.start();
        this.isPlaying = true;
        
        // 启动主音量
        try {
            const destination = Tone.getDestination();
            if (destination && destination.volume) {
                if (typeof destination.volume.rampTo === 'function') {
                    destination.volume.rampTo(-5, 0.2);
                } else if (typeof destination.volume === 'object') {
                    destination.volume.value = -5;
                }
            }
        } catch (err) {
            console.warn('设置主音量时出错:', err);
        }
        
        // 启动音序器
        this._startSequencer();
        
        console.log("音频引擎已启动");
    }

    /**
     * 重置效果参数
     * @private
     */
    _resetEffects() {
        // 安全设置效果值
        if (this.mainEffectsChain) {
            // 设置合理的初始效果值
            if (this.mainEffectsChain.reverb) {
                this._safeSetEffectParam(this.mainEffectsChain.reverb, 'wet.value', 0.2);
            }
            
            if (this.mainEffectsChain.delay) {
                this._safeSetEffectParam(this.mainEffectsChain.delay, 'wet.value', 0.1);
            }
            
            // 配置噪声门 - 关键的噪声消除组件
            if (this.mainEffectsChain.noiseGate) {
                try {
                    this.noiseUtils.optimizeNoiseGate(this.mainEffectsChain.noiseGate, {
                        threshold: -30,  // 较高的阈值可以滤除更多背景噪声
                        smoothing: 0.1   // 更快的平滑响应以减少"泵浦"效应
                    });
                } catch (err) {
                    console.error('优化噪声门失败:', err);
                }
            }
        }
    }

    /**
     * 启动音序器
     * @private
     */
    _startSequencer() {
        // 停止任何现有序列
        this.sequencer.stopAll();
        
        // 获取当前鼓点模式
        const drumPattern = this.drumPatterns[this.currentRhythmPattern];
        
        // 创建并启动序列
        this.sequencer.createDrumSequence(this.drumKit, drumPattern);
        this.sequencer.start();
        
        console.log(`启动音序器：${this.currentRhythmPattern} 模式`);
    }

    /**
     * 停止音频引擎
     */
    stop() {
        if (!this.isPlaying) return;
        
        // 平滑淡出主音量
        try {
            const destination = Tone.getDestination();
            if (destination && destination.volume) {
                if (typeof destination.volume.rampTo === 'function') {
                    destination.volume.rampTo(-Infinity, 0.3);
                } else if (typeof destination.volume === 'object') {
                    destination.volume.value = -Infinity;
                }
            }
        } catch (err) {
            console.warn('淡出音量时出错:', err);
        }
        
        // 停止所有序列
        this.sequencer.stopAll();
        
        // 释放所有音符
        try {
            Object.values(this.mainSynths).forEach(synth => {
                if (synth && typeof synth === 'object') {
                    if (typeof synth.releaseAll === 'function') {
                        synth.releaseAll();
                    } else if (typeof synth.triggerRelease === 'function') {
                        synth.triggerRelease();
                    }
                }
            });
        } catch (err) {
            console.warn('释放音符时出错:', err);
        }
        
        // 取消所有计划的事件
        Transport.cancel();
        Transport.stop();
        
        // 清理状态
        this.activeNotes.clear();
        this.isPlaying = false;
        
        console.log("音频引擎已停止");
    }

    /**
     * 播放音符 - 支持精确定时
     * @param {string} note - 音符名称
     * @param {string} duration - 音符持续时间
     * @param {boolean} isRightSide - 是否在右侧区域
     * @param {boolean} isLeftSide - 是否在左侧区域
     */
    playNote(note, duration = '8n', isRightSide = false, isLeftSide = false) {
        if (!this.isPlaying) return;
        
        // 使用Transport时间进行精确定时
        const now = Transport.seconds;
        
        // beat同步 - 防止过于密集的触发
        if (now - this.lastBeatTime < this.beatInterval * 0.5) return;
        this.lastBeatTime = now;
        
        // 防止重复音符
        if (this.activeNotes.has(note)) return;
        this.activeNotes.add(note);
        
        // 选择合适的合成器
        const synth = isRightSide ? this.mainSynths.glide : 
                     isLeftSide ? this.mainSynths.bass : 
                     this.mainSynths.main;
        
        // 使用量化时间播放音符
        const quantizedTime = Transport.quantize('16n');
        synth.triggerAttackRelease(note, duration, quantizedTime);
        
        // 在适当的时间从活动音符中移除
        const durationSeconds = Tone.Time(duration).toSeconds();
        setTimeout(() => {
            this.activeNotes.delete(note);
        }, durationSeconds * 1000);
    }

    /**
     * 设置音色
     * @param {string} objectClass - 对象类名
     * @returns {string} 选择的振荡器类型
     */
    setTimbre(objectClass) {
        // 映射对象类到音色
        const oscType = this.timbres[objectClass] || 'sine';
        
        // 更新合成器设置
        this.mainSynths.main.set({
            oscillator: { type: oscType }
        });
        
        return oscType;
    }

    /**
     * 创建基于对象位置的模式
     * @param {number} x - 标准化X坐标 (0-1)
     * @param {number} y - 标准化Y坐标 (0-1)
     * @param {string} objectClass - 对象类名
     * @returns {Object} 音乐模式描述
     */
    createPattern(x, y, objectClass) {
        const note = this.mapToNote(y);
        const rhythm = this.mapToRhythm(x);
        const timbre = this.setTimbre(objectClass);
        
        // 确定在左侧还是右侧区域
        const isRightSide = x > 0.7;
        const isLeftSide = x < 0.3;
        
        return { note, rhythm, timbre, isRightSide, isLeftSide };
    }

    /**
     * 基于检测到的对象生成音乐
     * @param {Array} predictions - 对象检测预测结果
     * @returns {Object|null} 生成的音乐模式
     */
    generateMusic(predictions) {
        if (predictions.length === 0 || !this.isPlaying) {
            return null;
        }

        try {
            // 检查音频上下文状态
            if (Tone.context.state !== "running") {
                console.warn("音频上下文当前状态:", Tone.context.state);
                
                // 尝试恢复挂起的音频上下文
                if (Tone.context.state === "suspended") {
                    console.log("尝试恢复音频上下文...");
                    Tone.context.resume();
                }
            }

            // 获取第一个检测到的对象
            const object = predictions[0];
            const [x, y, width, height] = object.bbox;
            
            // 获取画布尺寸
            const canvasWidth = predictions[0].videoWidth || 640;
            const canvasHeight = predictions[0].videoHeight || 480;
            
            // 计算标准化位置 (0-1)
            const normalizedX = x / canvasWidth;
            const normalizedY = 1 - (y / canvasHeight); // 反转Y轴，使顶部为高音
            
            // 创建音乐模式
            const pattern = this.createPattern(normalizedX, normalizedY, object.class);
            
            // 记录详细音乐信息以帮助调试
            console.log("生成音乐:", {
                object: object.class,
                position: { x: normalizedX, y: normalizedY },
                note: pattern.note,
                rhythm: pattern.rhythm,
                timbre: pattern.timbre,
                zone: pattern.isLeftSide ? "左" : (pattern.isRightSide ? "右" : "中")
            });
            
            // 确保主合成器已连接到输出
            if (this.mainSynths && this.mainSynths.main) {
                // 直接播放一个音符以测试声音
                const synth = pattern.isRightSide ? this.mainSynths.glide : 
                             pattern.isLeftSide ? this.mainSynths.bass : 
                             this.mainSynths.main;
                
                // 使用当前时间播放而不是量化，确保音符播放
                try {
                    synth.triggerAttackRelease(pattern.note, pattern.rhythm, "+0.05");
                    console.log(`播放音符: ${pattern.note}, 节奏: ${pattern.rhythm}`);
                } catch (noteErr) {
                    console.error("播放音符出错:", noteErr);
                }
            }
            
            // 超过阈值的声音强度触发噪声抑制
            const intensity = Math.random() * 0.3 + 0.7; // 模拟声音强度
            if (intensity > 0.8 && this.mainEffectsChain && this.mainEffectsChain.noiseGate) {
                this.noiseUtils.handlePeakSignal(this.mainEffectsChain.noiseGate, intensity);
            }
            
            // 动态调整部分参数以适应场景
            this._dynamicParameterAdjustment(normalizedX, normalizedY);
            
            return pattern;
        } catch (err) {
            console.error("生成音乐时出错:", err);
            return null;
        }
    }

    /**
     * 动态参数调整
     * @private
     */
    _dynamicParameterAdjustment(x, y) {
        if (!this.mainEffectsChain) return;
        
        try {
            // 根据Y位置调整混响量
            if (this.mainEffectsChain.reverb) {
                const reverbAmount = Math.min(0.1 + y * 0.3, 0.4);
                if (typeof this.mainEffectsChain.reverb.wet.rampTo === 'function') {
                    this.mainEffectsChain.reverb.wet.rampTo(reverbAmount, 0.2);
                } else {
                    this._safeSetEffectParam(this.mainEffectsChain.reverb, 'wet.value', reverbAmount);
                }
            }
            
            // 根据X位置调整延迟反馈
            if (this.mainEffectsChain.delay) {
                let feedbackValue = 0.15;  // 默认中等延迟
                let wetValue = 0.12;       // 默认中等湿度
                
                if (x > 0.7) { // 右侧区域 - 更多延迟
                    feedbackValue = 0.3;
                    wetValue = 0.25;
                } else if (x < 0.3) { // 左侧区域 - 更少延迟
                    feedbackValue = 0.05;
                    wetValue = 0.05;
                }
                
                // 安全设置参数
                this._safeSetEffectParam(this.mainEffectsChain.delay, 'feedback.value', feedbackValue);
                this._safeSetEffectParam(this.mainEffectsChain.delay, 'wet.value', wetValue);
            }
        } catch (err) {
            console.warn('动态参数调整时出错:', err);
        }
    }

    /**
     * 将Y坐标映射到音符
     * @param {number} y - 标准化Y坐标 (0-1)
     * @returns {string} 音符名称
     */
    mapToNote(y) {
        const notes = this.scales[this.currentScale];
        // 使用音阶的较小范围获得更好的音乐效果
        const index = Math.floor(y * (notes.length * 0.8));
        return notes[Math.min(index, notes.length - 1)];
    }

    /**
     * 将X坐标映射到节奏
     * @param {number} x - 标准化X坐标 (0-1)
     * @returns {string} 节奏值
     */
    mapToRhythm(x) {
        const rhythms = this.rhythmPatterns[this.currentRhythmPattern];
        const index = Math.floor(x * rhythms.length);
        return rhythms[Math.min(index, rhythms.length - 1)];
    }

    /**
     * 设置当前音阶
     * @param {string} scaleName - 音阶名称
     * @returns {boolean} 是否成功更改
     */
    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
            return true;
        }
        return false;
    }

    /**
     * 设置当前节奏模式
     * @param {string} patternName - 节奏模式名称
     * @returns {boolean} 是否成功更改
     */
    setRhythmPattern(patternName) {
        if (this.rhythmPatterns[patternName]) {
            this.currentRhythmPattern = patternName;
            
            // 如果正在播放，更新鼓序列
            if (this.isPlaying) {
                this._startSequencer();
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * 设置主音量
     * @param {number} level - 0-100 范围内的音量级别
     */
    setVolume(level) {
        try {
            // 确保范围有效
            const safeLevel = Math.max(0, Math.min(100, level || 0));
            
            // 转换 0-100 范围为分贝
            const db = Tone.gainToDb(safeLevel/100);
            
            // 安全设置音量
            const destination = Tone.getDestination();
            if (destination && destination.volume) {
                if (typeof destination.volume.rampTo === 'function') {
                    destination.volume.rampTo(db, 0.1);
                } else if (typeof destination.volume === 'object') {
                    destination.volume.value = db;
                }
            }
        } catch (err) {
            console.warn('设置音量时出错:', err);
        }
    }
}

export default AudioEngine;