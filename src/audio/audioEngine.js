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
        
        // 统一使用一种节奏模式 10010010
        this.rhythmPattern = [1, 0, 0, 1, 0, 0, 1, 0];
        this.rhythmStep = 0;
        this.lastObjectNoteInfo = null; // 存储上一个物体生成的音符信息
        
        // 左侧区域1645和弦进行
        this.bassChordProgression = ['C2', 'A1', 'F1', 'G1']; // 1-6-4-5和弦根音
        this.bassChordIndex = 0;
        this.bassSequenceActive = false;
        this.lastBassTime = 0;
        this.bassLoopCount = 0;    // 用于跟踪低音循环次数
        this.bassLoopThreshold = 2; // 完成几个循环后才切换和弦音
        
        // 多物体滑音管理
        this.objectGlides = new Map(); // 存储每个物体的滑音合成器: { id: { synth, note, lastSeen } }
        this.objectCleanupInterval = null; // 用于定期检查和清理不再活跃的物体
        
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
            
            // 低音合成器 - 用于低音和弦进行
            bass: this.synthFactory.createMonoSynth({
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.05, // 修复八进制字面量错误(从05改为0.05)
                    decay: 0.4,
                    sustain: 0.6, // 增加持续值
                    release: 1.0  // 减少释放时间，避免音符重叠
                },
                filterEnvelope: {
                    attack: 0.02,
                    decay: 0.5,
                    sustain: 0.5, // 增加滤波器包络的持续度
                    release: 1.5,
                    baseFrequency: 250, // 增加基频以增强清晰度
                    octaves: 2.0
                },
                volume: -2  // 显著提高低音区音量，使后两个音更清晰
            }),
            
            // 滑音合成器 - 用于物品移动时
            glide: this.synthFactory.createMonoSynth({
                oscillator: { type: 'sawtooth' },
                envelope: {
                    attack: 0.03,
                    decay: 0.2,
                    sustain: 0.8,
                    release: 1.0
                },
                portamento: 0.15, // 降低滑音时间使其更响应
                volume: -12  // 调整滑音区音量
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
            // 低切滤波器 - 去除超低频噪音，降低截止频率以保留更多低音
            lowcut: new Tone.Filter({
                type: "highpass",
                frequency: 30,  // 降低截止频率(从80Hz降至30Hz)，以保留更多低频内容
                rolloff: -12    // 减小斜率，使低频截止更平缓
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
                threshold: -35,  // 降低阈值，让更多低频信号通过
                smoothing: 0.1,
                attack: 0.003,
                release: 1
            }),
            
            // 动态压缩器 - 平衡响度
            compressor: new Tone.Compressor({
                threshold: -24,
                ratio: 4,
                attack: 0.003,
                release: 0.25,
                knee: 30
            }),
            
            // 均衡器 - 进一步增强低频
            eq: new Tone.EQ3({
                low: 5,         // 提升低频 (+5dB, 之前是+2dB)
                mid: 0,         // 保持中频不变
                high: -3,       // 降低高频 (-3dB)
                lowFrequency: 200, // 低频调整范围
                highFrequency: 3000
            }),
            
            // 主音量控制
            masterVolume: new Tone.Volume(-5)
        });
        
        // 连接合成器到效果链
        this.effectsChain.connectInstruments(this.mainSynths, mainEffectsChain);
        
        // 创建专用鼓组效果链，更简单且处理针对鼓组特性的问题
        const drumEffectsChain = this.effectsChain.createChain({
            // 分离的低频高频处理，比单纯的带通滤波器更精准
            lowFilter: new Tone.Filter({
                type: "lowshelf",
                frequency: 150,  // 降低频率以增强更低音区
                gain: 6,         // 增加增益(从3dB到6dB)强化低频
                Q: 0.7           // 降低Q值使频响更平滑
            }),
            
            // 高频滤波器 - 专门处理高音镲噪声
            highFilter: new Tone.Filter({
                type: "highshelf",
                frequency: 5000,
                gain: -6,       // 降低高频增益，减少噪声
                Q: 0.5
            }),
            
            // 均衡器 - 进一步精细调整频率响应
            eq: new Tone.EQ3({
                low: 4,         // 更强力地提升低频(+4dB)
                mid: 0,         // 保持中频不变
                high: -3,       // 降低高频 (-3dB)
                lowFrequency: 180, // 调整低频范围
                highFrequency: 3000
            }),
            
            // 动态压缩器 - 控制鼓声动态范围，减少爆音
            compressor: new Tone.Compressor({
                threshold: -24,
                ratio: 4,
                attack: 0.002,  // 更快的攻击，迅速控制瞬态
                release: 0.15,
                knee: 5
            }),
            
            // 限制器 - 防止信号过载和爆音
            limiter: new Tone.Limiter(-2),
            
            // 鼓组专用音量控制 - 提高音量
            drumVolume: new Tone.Volume(-2) // 从-8dB提高到-2dB
        });
        
        // 连接鼓组到专用效果链之前，为高音镲添加专用效果处理
        if (this.drumKit && this.drumKit.hihat) {
            console.log("配置高音镲专用效果链...");
            
            try {
                // 断开高音镲与之前的连接
                this.drumKit.hihat.disconnect();
                
                // 创建高音镲专用效果链 - 简化处理以解决低频"咳吃"噪音
                const hihatEffectsChain = this.effectsChain.createChain({
                    // 高通滤波器 - 移除低频噪音，提高频率以消除"咳吃"噪音
                    highpass: new Tone.Filter({
                        type: "highpass",
                        frequency: 3000, // 降低频率，避免过于尖锐的噪音
                        rolloff: -24,    // 增加滚降率以更有效过滤低频
                        Q: 0.8           // 降低Q值，减少共振效应
                    }),
                    
                    // 调整限制器阈值
                    limiter: new Tone.Limiter(-8),
                    
                    // 移除可能引起问题的淡入效果
                    // 使用简单增益代替复杂音量控制
                    output: new Tone.Gain(0.3) // 降低增益进一步减少噪音
                });
                
                // 连接高音镲到其专用效果链，然后连接到鼓组效果链
                this.drumKit.hihat.connect(hihatEffectsChain.highpass);
                hihatEffectsChain.output.connect(this.drumEffectsChain.lowFilter);
                
                // 存储引用以便后续使用
                this.hihatEffectsChain = hihatEffectsChain;
            } catch (err) {
                console.error('配置高音镲效果链失败:', err);
                // 如果专用效果链失败，回退到直接连接到鼓效果链
                try {
                    this.drumKit.hihat.disconnect();
                    this.drumKit.hihat.connect(this.drumEffectsChain.lowFilter);
                } catch (fallbackErr) {
                    console.error('高音镲回退连接也失败:', fallbackErr);
                }
            }
        }
        
        // 确保在连接前所有鼓组部件已断开与任何其他节点的连接
        if (this.drumKit) {
            console.log("连接鼓组到专用效果链...");
            Object.values(this.drumKit).forEach(drum => {
                if (drum && typeof drum.disconnect === 'function') {
                    try {
                        // 断开任何现有连接
                        drum.disconnect();
                    } catch (err) {
                        // 忽略断开错误
                    }
                }
            });
            
            // 现在安全地连接到鼓效果链
            this.effectsChain.connectInstruments(this.drumKit, drumEffectsChain);
        }
        
        // 将鼓效果链连接到主输出
        drumEffectsChain.drumVolume.connect(Tone.getDestination());
        
        // 将主效果链连接到输出
        mainEffectsChain.masterVolume.toDestination();
        
        // 存储引用以便后续使用
        this.mainEffectsChain = mainEffectsChain;
        this.drumEffectsChain = drumEffectsChain;
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
        console.log("重置并启动音序器...");
        this.sequencer.stopAll();
        
        try {
            // 确保传输已启动
            if (Transport.state !== 'started') {
                Transport.start('+0.1');
            }
            
            // 获取当前鼓点模式
            const drumPattern = this.drumPatterns[this.currentRhythmPattern];
            if (!drumPattern) {
                console.error(`找不到鼓点模式: ${this.currentRhythmPattern}`);
                return;
            }
            
            console.log(`使用鼓点模式: ${this.currentRhythmPattern}`, drumPattern);
            
            // 确保鼓组已正确初始化
            if (!this.drumKit) {
                console.error("鼓组未正确初始化");
                return;
            }
            
            // 验证鼓组各部分是否存在
            ['kick', 'snare', 'hihat'].forEach(part => {
                if (!this.drumKit[part]) {
                    console.warn(`找不到鼓组部分: ${part}`);
                }
            });
            
            // 直接测试鼓声是否能正常发出声音
            try {
                if (this.drumKit.kick) {
                    setTimeout(() => {
                        this.drumKit.kick.triggerAttackRelease('C2', '16n');
                        console.log("测试鼓声 - kick");
                    }, 500);
                }
                
                if (this.drumKit.snare) {
                    setTimeout(() => {
                        this.drumKit.snare.triggerAttackRelease('16n');
                        console.log("测试鼓声 - snare");
                    }, 800);
                }
                
                if (this.drumKit.hihat) {
                    setTimeout(() => {
                        this.drumKit.hihat.triggerAttackRelease('16n');
                        console.log("测试鼓声 - hihat");
                    }, 1100);
                }
            } catch (testErr) {
                console.error("测试鼓声失败:", testErr);
            }
            
            // 创建并启动鼓序列
            const drumSequence = this.sequencer.createDrumSequence(this.drumKit, drumPattern);
            if (!drumSequence) {
                console.error("无法创建鼓序列");
                return;
            }
            
            // 启动音序器
            this.sequencer.start();
            
            // 启动低音和弦序列
            this._startBassChordSequence();
            
            console.log(`音序器已启动: ${this.currentRhythmPattern} 模式`);
        } catch (err) {
            console.error("启动音序器时出错:", err);
        }
    }
    
    /**
     * 启动低音和弦序列 - 用于左侧区域的1645和弦进行
     * @private
     */
    _startBassChordSequence() {
        if (this.bassSequenceActive) {
            clearInterval(this.bassSequenceActive);
        }
        
        // 计算两拍的时间间隔（反拍）
        const beatInterval = 60 / this.bpm;
        const intervalTime = beatInterval * 1000; // 转为毫秒
        
        // 重置计数器
        this.bassLoopCount = 0;
        this.bassChordIndex = 0;
        
        console.log(`启动低音和弦序列，间隔: ${intervalTime.toFixed(0)}ms, 使用1645和弦进行, ${this.bassLoopThreshold}个循环后切换音高`);
        
        // 创建低音和弦序列
        this.bassSequenceActive = setInterval(() => {
            if (!this.isPlaying) return;
            
            // 获取当前和弦根音
            const bassNote = this.bassChordProgression[this.bassChordIndex];
            
            // 播放低音和弦根音
            if (this.mainSynths.bass) {
                try {
                    const now = Tone.now();
                    
                    // 确保不会过于频繁触发低音
                    if (now - this.lastBassTime < beatInterval * 0.5) {
                        return;
                    }
                    
                    this.lastBassTime = now;
                    
                    // 先释放前一个音符确保新音符能被听到
                    this.mainSynths.bass.triggerRelease(now - 0.05);
                    
                    // 使用较长的持续时间，确保低音连贯
                    this.mainSynths.bass.triggerAttackRelease(bassNote, '4n', now, 0.9);
                    
                    console.log(`播放低音: ${bassNote}, 当前和弦: ${this.bassChordIndex + 1}/4, 循环计数: ${this.bassLoopCount + 1}/${this.bassLoopThreshold}`);
                    
                    // 增加循环计数
                    this.bassLoopCount++;
                    
                    // 完成指定次数循环后才切换到下一个和弦
                    if (this.bassLoopCount >= this.bassLoopThreshold) {
                        this.bassChordIndex = (this.bassChordIndex + 1) % this.bassChordProgression.length;
                        this.bassLoopCount = 0; // 重置循环计数
                        console.log(`低音切换到下一个和弦: ${this.bassChordProgression[this.bassChordIndex]}`);
                    }
                } catch (err) {
                    console.error('播放低音和弦时出错:', err);
                }
            }
        }, intervalTime);
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
                } else if (destination.volume === 'object') {
                    destination.volume.value = -Infinity;
                }
            }
        } catch (err) {
            console.warn('淡出音量时出错:', err);
        }
        
        // 停止所有序列
        this.sequencer.stopAll();
        
        // 停止低音和弦序列
        if (this.bassSequenceActive) {
            clearInterval(this.bassSequenceActive);
            this.bassSequenceActive = false;
        }
        
        // 停止中央区域节奏
        if (this.rhythmGenerator) {
            clearInterval(this.rhythmGenerator);
            this.rhythmGenerator = null;
        }
        
        // 释放右侧滑音
        if (this.glideActive && this.mainSynths.glide) {
            try {
                this.mainSynths.glide.triggerRelease();
                this.glideActive = false;
                this.glideNote = null;
            } catch (err) {
                console.warn('释放滑音时出错:', err);
            }
        }
        
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
        
        // 释放所有物体滑音
        this._releaseAllObjectGlides();
        
        console.log("音频引擎已停止");
    }

    /**
     * 播放音符 - 使用防噪音的双阶段触发策略，加强节奏量化
     * @param {string} note - 音符名称
     * @param {string} duration - 音符持续时间
     * @param {boolean} isRightSide - 是否在右侧区域
     * @param {boolean} isLeftSide - 是否在左侧区域
     */
    playNote(note, duration = '8n', isRightSide = false, isLeftSide = false) {
        if (!this.isPlaying) {
            console.warn('尝试播放音符，但音频引擎未运行');
            return;
        }
        
        // 确保音符是有效的格式
        if (!note || typeof note !== 'string') {
            console.error('无效的音符格式:', note);
            return;
        }
        
        // 记录详细信息以便调试
        console.log(`尝试播放音符: ${note}, 持续时间: ${duration}, 右侧: ${isRightSide}, 左侧: ${isLeftSide}`);
        console.log(`音频上下文状态: ${Tone.context.state}, Transport状态: ${Tone.Transport.state}`);
        
        // ===== 节奏控制和节流逻辑 =====
        // 使用严格的节拍量化和间隔控制
        const now = Tone.now();
        
        // 动态计算节奏间隔 - 确保符合当前节奏模式的脉冲
        // 使用实际节奏值的持续时间而不是固定值
        let rhythmInterval = this.beatInterval; // 默认为一拍
        try {
            // 将节奏值转换为秒数并用作间隔
            // 这确保了不同节奏值有不同的间隔时间
            const durationInSeconds = Tone.Time(duration).toSeconds();
            rhythmInterval = Math.max(durationInSeconds * 0.8, this.beatInterval * 0.5);
            
            // 调试信息
            console.log(`节奏间隔: ${rhythmInterval.toFixed(3)}秒，节奏值: ${duration}`);
        } catch (err) {
            console.warn('计算节奏间隔时出错，使用默认值:', err);
        }
        
        // 使用基于节奏类型的间隔
        if (now - this.lastBeatTime < rhythmInterval) {
            console.log('节奏间隔控制: 跳过过于频繁的音符触发');
            return;
        }
        this.lastBeatTime = now;
        
        // 防止重复音符 - 使用音符+区域作为标识符
        const noteId = `${note}-${isRightSide ? 'right' : (isLeftSide ? 'left' : 'center')}`;
        if (this.activeNotes.has(noteId)) {
            console.log('防重复: 跳过已激活的音符', noteId);
            return;
        }
        this.activeNotes.add(noteId);
        
        // ===== 合成器选择 =====
        // 选择合适的合成器
        let synth;
        try {
            if (isRightSide) {
                // 右侧区域 - 滑音合成器
                synth = this.mainSynths.glide;
            } else if (isLeftSide) {
                // 左侧区域 - 低音合成器
                synth = this.mainSynths.bass;
            } else {
                // 中央区域 - 主合成器
                synth = this.mainSynths.main;
            }
            
            if (!synth) {
                console.error('无法获取有效的合成器');
                this.activeNotes.delete(noteId);
                return;
            } else {
                // 确保合成器已连接到输出
                if (!synth.connected) {
                    console.warn('合成器未连接，尝试重新连接到主输出');
                    synth.toDestination();
                }
            }
        } catch (err) {
            console.error('选择合成器时发生错误:', err);
            this.activeNotes.delete(noteId);
            return;
        }
        
        // ===== 音符触发准备 =====
        try {
            // 确保音频上下文处于活动状态
            if (Tone.context.state !== "running") {
                console.warn('音频上下文未运行，尝试恢复...');
                Tone.context.resume();
            }
            
            // 增加随机偏移量，避免完全同步触发多个音符
            const randomOffset = (Math.random() * 0.02) - 0.01; // ±10ms随机偏移
            
            // 严格量化到节拍网格 - 关键改进
            // 使用当前节奏模式对应的量化细分
            let quantizeValue = '16n'; // 默认量化到16分音符
            
            // 根据当前节奏模式调整量化精度
            switch (this.currentRhythmPattern) {
                case 'techno':
                    quantizeValue = '16n';
                    break;
                case 'jazz':
                    quantizeValue = '8t'; // 三连音八分音符
                    break;
                case 'latin':
                    quantizeValue = '16n';
                    break;
                default: // 'basic'或其他
                    quantizeValue = '8n';
            }
            
            // 检查Transport是否运行，如果没有则启动它
            if (Tone.Transport.state !== "started") {
                console.log('Transport未运行，启动中...');
                Tone.Transport.start();
            }
            
            // 直接计划下一个时间点而不是使用量化，以确保音符播放
            const scheduleTime = now + 0.05 + randomOffset;
            console.log(`计划播放时间: ${scheduleTime.toFixed(3)}`);
            
            // 转换音符持续时间为秒
            const durationSeconds = Tone.Time(duration).toSeconds();
            
            // 获取当前音量并备份
            let originalVolume = -15; // 默认安全值
            try {
                if (synth.volume && typeof synth.volume.value === 'number') {
                    originalVolume = synth.volume.value;
                }
            } catch(e) {
                console.warn('获取合成器音量失败，使用默认值');
            }
            
            // 尝试直接播放声音 - 用于调试
            console.log('直接尝试播放声音以确认音频系统工作...');
            const testVolume = originalVolume; // 使用当前音量
            
            // 直接触发合成器
            synth.triggerAttackRelease(note, durationSeconds, scheduleTime, 0.7);
            
            // 确保音符播放后的清理
            const cleanupTime = scheduleTime + durationSeconds + 0.1; // 增加缓冲时间
            Tone.Transport.scheduleOnce(() => {
                this.activeNotes.delete(noteId);
                console.log(`释放音符: ${noteId} 于 ${cleanupTime.toFixed(3)}`);
            }, cleanupTime);
            
            // 记录调试信息
            console.log(`播放音符: ${note}, 节奏: ${duration}, 区域: ${isRightSide ? '右' : (isLeftSide ? '左' : '中')}`);
            
        } catch (err) {
            console.error('播放音符时出错:', err);
            this.activeNotes.delete(noteId);
        }
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
     * 创建基于对象位置的模式 - 增强版
     * @param {number} x - 标准化X坐标 (0-1)
     * @param {number} y - 标准化Y坐标 (0-1)
     * @param {string} objectClass - 对象类名
     * @returns {Object} 音乐模式描述
     */
    createPattern(x, y, objectClass) {
        // 基本参数映射
        const baseNote = this.mapToNote(y);
        const rhythm = this.mapToRhythm(x);
        const timbre = this.setTimbre(objectClass);
        
        // 区域划分 - 更细致的划分以提高音乐变化
        const isRightSide = x > 0.7;
        const isLeftSide = x < 0.3;
        const isCenterLow = x >= 0.3 && x <= 0.5;  // 中央偏左区域
        const isCenterHigh = x > 0.5 && x <= 0.7;  // 中央偏右区域
        
        // 初始默认音符
        let note = baseNote;
        
        // ===== 区域特殊音乐处理 =====
        
        // 为中间区域增加和弦和旋律变化
        if (!isLeftSide && !isRightSide) {
            // 获取音符在当前音阶中的索引
            const scale = this.scales[this.currentScale];
            const noteIndex = scale.indexOf(baseNote);
            
            if (noteIndex !== -1) {
                // 添加和弦变化
                const now = Tone.now();
                
                // 每两秒变更一次音乐模式，避免单调
                const patternSeed = Math.floor(now / 2) % 4;
                
                if (isCenterLow) {
                    // 中央偏左区域 - 加入部分低音和和弦效果
                    switch (patternSeed) {
                        case 0:
                            // 原音符
                            break;
                        case 1: 
                            // 低一个八度
                            const lowerOctave = baseNote.replace(/(\d+)$/, (match) => {
                                const octave = parseInt(match);
                                return Math.max(2, octave - 1);
                            });
                            note = lowerOctave;
                            break;
                        case 2:
                            // 三度音
                            if (noteIndex + 2 < scale.length) {
                                note = scale[noteIndex + 2];
                            }
                            break;
                        case 3:
                            // 五度音
                            if (noteIndex + 4 < scale.length) {
                                note = scale[noteIndex + 4];
                            }
                            break;
                    }
                } 
                else if (isCenterHigh) {
                    // 中央偏右区域 - 加入部分高音和装饰音效果
                    switch (patternSeed) {
                        case 0:
                            // 原音符
                            break;
                        case 1:
                            // 高八度
                            const higherOctave = baseNote.replace(/(\d+)$/, (match) => {
                                const octave = parseInt(match);
                                return Math.min(6, octave + 1);
                            });
                            note = higherOctave;
                            break;
                        case 2:
                            // 增加二度音
                            if (noteIndex + 1 < scale.length) {
                                note = scale[noteIndex + 1];
                            }
                            break;
                        case 3:
                            // 七度音(如果存在)
                            if (noteIndex + 6 < scale.length) {
                                note = scale[noteIndex + 6];
                            }
                            break;
                    }
                }
                
                // 使用时间因素改变节奏模式，避免过于规律
                // 每3.5秒变更一次节奏型
                const rhythmMod = Math.floor(now / 3.5) % 3;
                let rhythmAdjust = rhythm;
                
                // 根据位置和时间添加节奏变化
                if ((isCenterLow && rhythmMod === 1) || (isCenterHigh && rhythmMod === 2)) {
                    // 转换为附点音符以增加节奏变化
                    if (rhythm === '8n') {
                        rhythmAdjust = '8n.';
                    } else if (rhythm === '4n') {
                        rhythmAdjust = '4n.';
                    }
                }
                
                // 有10%概率添加断奏效果
                if (Math.random() < 0.1) {
                    // 缩短音符长度，模拟断奏
                    if (rhythm === '4n') {
                        rhythmAdjust = '8n';
                    } else if (rhythm === '2n') {
                        rhythmAdjust = '4n';
                    }
                }
                
                return {
                    note,
                    rhythm: rhythmAdjust,
                    timbre,
                    isRightSide,
                    isLeftSide,
                    isCenterLow,
                    isCenterHigh
                };
            }
        }
        
        // 默认返回基本模式
        return { note, rhythm, timbre, isRightSide, isLeftSide };
    }

    /**
     * 基于检测到的对象生成音乐
     * @param {Array} predictions - 对象检测预测结果
     * @returns {Object|null} 生成的音乐模式
     */
    generateMusic(predictions) {
        if (predictions.length === 0 || !this.isPlaying) {
            // 如果没有检测到物体则清理全部滑音
            if (this.objectGlides.size > 0) {
                this._releaseAllObjectGlides();
            }
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

            // 捕获所有被检测到的物体ID，用于后续清理不再检测到的物体
            const detectedObjectIds = new Set();
            
            // 处理每个检测到的物体
            for (let i = 0; i < predictions.length; i++) {
                const object = predictions[i];
                const [x, y, width, height] = object.bbox;
                
                // 创建物体的唯一标识符
                const objectId = object.id || `${object.class}-${i}`;
                detectedObjectIds.add(objectId);
                
                // 初始化位置跟踪
                if (!this.lastObjectPositions) {
                    this.lastObjectPositions = new Map();
                }
                
                // 获取画布尺寸
                const canvasWidth = object.videoWidth || 640;
                const canvasHeight = object.videoHeight || 480;
                
                // 计算标准化位置 (0-1)
                const normalizedX = x / canvasWidth;
                const normalizedY = 1 - (y / canvasHeight); // 反转Y轴，使顶部为高音
                
                const now = Date.now();
                
                // 获取上次位置，如果存在
                let moveSpeed = 0;
                let lastPos = this.lastObjectPositions.get(objectId);
                
                if (lastPos) {
                    // 检测位置变化
                    const xDiff = Math.abs(normalizedX - lastPos.x);
                    const yDiff = Math.abs(normalizedY - lastPos.y);
                    const timeDiff = now - lastPos.timestamp;
                    
                    // 计算移动速度 (像素/毫秒)
                    moveSpeed = Math.sqrt(xDiff * xDiff + yDiff * yDiff) / Math.max(1, timeDiff);
                }
                
                // 存储当前位置用于下次比较
                this.lastObjectPositions.set(objectId, {
                    x: normalizedX, 
                    y: normalizedY,
                    timestamp: now
                });
                
                // 根据Y坐标映射到音符
                const note = this.mapToNote(normalizedY);
                
                // 为该物体创建或更新滑音播放器
                this._createOrUpdateObjectGlide(objectId, note, moveSpeed);
                
                // 应用动态效果参数调整
                if (i === 0) { // 仅根据第一个物体调整全局效果
                    this._dynamicParameterAdjustment(normalizedX, normalizedY);
                }
            }
            
            // 清理不再被检测到的物体
            if (this.objectGlides.size > 0) {
                for (const objectId of this.objectGlides.keys()) {
                    if (!detectedObjectIds.has(objectId)) {
                        this._releaseObjectGlide(objectId);
                    }
                }
            }
            
            // 返回第一个物体的音乐模式（向后兼容）
            if (predictions.length > 0) {
                const object = predictions[0];
                const [x, y] = object.bbox;
                const canvasWidth = object.videoWidth || 640;
                const canvasHeight = object.videoHeight || 480;
                const normalizedX = x / canvasWidth;
                const normalizedY = 1 - (y / canvasHeight);
                
                return {
                    note: this.mapToNote(normalizedY),
                    rhythm: '8n',
                    timbre: this.setTimbre(object.class)
                };
            }
            
            return null;
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
        if (!rhythms || !Array.isArray(rhythms) || rhythms.length === 0) {
            console.warn(`找不到有效的节奏模式: ${this.currentRhythmPattern}，使用默认节奏`);
            return '8n'; // 默认安全值
        }
        
        // 确保参数有效
        const safeX = Math.max(0, Math.min(1, isNaN(x) ? 0.5 : x));
        
        // 改进的映射算法 - 平滑分布确保更自然的选择
        // 基于区域添加偏好，确保各区域节奏特征
        let index;
        if (safeX < 0.3) {
            // 左侧区域倾向于使用较短的节奏值（偏移向数组前部）
            index = Math.floor(safeX / 0.3 * (rhythms.length / 3));
        } else if (safeX > 0.7) {
            // 右侧区域倾向于使用较长的节奏值（偏移向数组后部）
            const rightPosition = (safeX - 0.7) / 0.3;
            index = Math.floor((rhythms.length / 3) * 2 + rightPosition * (rhythms.length / 3));
        } else {
            // 中间区域在中部范围选择节奏值（平衡分布）
            const centerPosition = (safeX - 0.3) / 0.4;
            index = Math.floor((rhythms.length / 3) + centerPosition * (rhythms.length / 3));
        }
        
        // 防止越界
        index = Math.max(0, Math.min(rhythms.length - 1, index));
        
        // 记录日志更好地调试节奏选择
        console.log(`节奏映射: x=${safeX.toFixed(2)} -> 索引=${index} -> 节奏=${rhythms[index]}`);
        
        return rhythms[index];
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

    /**
     * 启动自动节奏生成器
     * @param {Object} initialPattern - 初始音乐模式
     * @private
     */
    _startRhythmGenerator(initialPattern) {
        if (this.rhythmGenerator) {
            // 如果已经存在，先清理
            clearInterval(this.rhythmGenerator);
        }
        
        // 存储上一次使用的音符信息
        this.lastObjectNoteInfo = {
            note: initialPattern.note,
            rhythm: initialPattern.rhythm,
            timbre: initialPattern.timbre,
            isRightSide: initialPattern.isRightSide,
            isLeftSide: initialPattern.isLeftSide
        };
        
        // 使用统一的节奏模式 10010010
        const currentPattern = this.rhythmPattern;
        
        // 计算节拍间隔，基于当前BPM设置
        // 16分音符的时值 = 60秒 / BPM / 4
        const sixteenthNoteTime = 60 / this.bpm / 4;
        const intervalTime = sixteenthNoteTime * 1000; // 转为毫秒
        
        console.log(`启动自动节奏生成器，间隔: ${intervalTime.toFixed(0)}ms, BPM: ${this.bpm}`);
        
        // 创建自动节奏生成器
        this.rhythmGenerator = setInterval(() => {
            if (!this.isPlaying || !this.lastObjectNoteInfo) return;
            
            // 重要修改：如果是右侧区域，不要在这里触发音符，因为右侧区域已经在_handleRightSideZone中处理
            if (this.lastObjectNoteInfo.isRightSide) {
                return;
            }
            
            // 检查步骤是否应该触发音符
            if (currentPattern[this.rhythmStep]) {
                // 使用固定的节奏值，不再随机选择
                let rhythmValue = '16n'; // 固定使用16分音符
                
                // 使用固定的音高，即最初检测到的音高，不再进行随机变化
                const note = this.lastObjectNoteInfo.note;
                
                // 播放固定音符
                this.playNote(
                    note,
                    rhythmValue,
                    this.lastObjectNoteInfo.isRightSide,
                    this.lastObjectNoteInfo.isLeftSide
                );
                
                console.log(`自动节奏: 步骤 ${this.rhythmStep}, 音符 ${note}, 节奏 ${rhythmValue}`);
            }
            
            // 移动到下一步骤
            this.rhythmStep = (this.rhythmStep + 1) % currentPattern.length;
        }, intervalTime);
    }

    /**
     * 处理移动物体 - 产生滑音效果
     * @param {Object} pattern - 音乐模式
     * @private
     */
    _handleMovingObject(pattern) {
        try {
            const { note } = pattern;
            const now = Tone.now();
            
            // 如果滑音合成器还没有激活，或者音符发生了变化，则触发新的滑音
            if (!this.glideActive || this.glideNote !== note) {
                console.log(`激活滑音: ${note}`);
                
                // 如果已经有激活的滑音，先释放它
                if (this.glideActive && this.mainSynths.glide) {
                    this.mainSynths.glide.triggerRelease(now - 0.05);
                }
                
                // 触发新的滑音
                if (this.mainSynths.glide) {
                    this.mainSynths.glide.triggerAttack(note, now);
                    this.glideActive = true;
                    this.glideNote = note;
                }
            } else {
                // 如果滑音已经激活并且音符相同，则调整滑音参数
                if (this.mainSynths.glide && typeof this.mainSynths.glide.setNote === 'function') {
                    // 平滑过渡到新音符
                    this.mainSynths.glide.setNote(note, now);
                    console.log(`滑音过渡: ${note}`);
                }
            }
        } catch (err) {
            console.error('处理移动物体时出错:', err);
        }
    }
    
    /**
     * 处理静止物体 - 产生固定节奏的单音
     * @param {Object} pattern - 音乐模式
     * @private
     */
    _handleStationaryObject(pattern) {
        try {
            // 如果之前有活跃的滑音，先停止它
            if (this.glideActive && this.mainSynths.glide) {
                console.log('停止滑音，切换到单音模式');
                this.mainSynths.glide.triggerRelease();
                this.glideActive = false;
                this.glideNote = null;
            }
            
            // 记录最新的音符信息
            this.lastObjectNoteInfo = {
                note: pattern.note,
                rhythm: '8n', // 固定使用八分音符
                timbre: pattern.timbre
            };
            
            const now = Date.now();
            
            // 确保不会过于频繁触发音符
            if (now - this.lastNoteTime < 250) { // 250ms限制
                return;
            }
            
            this.lastNoteTime = now;
            
            // 播放单个音符
            this.playNote(pattern.note, '8n', false, false);
            
            // 如果自动节奏生成器尚未启动，则启动它
            if (!this.rhythmGenerator) {
                this._startRhythmGenerator(pattern);
            }
        } catch (err) {
            console.error('处理静止物体时出错:', err);
        }
    }

    /**
     * 处理滑音音符 - 根据移动速度调整滑音参数
     * @param {Object} pattern - 音乐模式
     * @private
     */
    _handleSlideNotes(pattern) {
        try {
            const { note, moveSpeed } = pattern;
            const now = Tone.now();
            
            // 根据移动速度调整滑音时间
            // 移动速度越快，滑音时间越短（响应更快）
            // 移动速度越慢，滑音时间越长（过渡更平滑）
            let portamentoTime;
            
            if (moveSpeed > 0.003) { // 快速移动
                portamentoTime = 0.05; // 非常快的滑音
            } else if (moveSpeed > 0.001) { // 中速移动
                portamentoTime = 0.15; // 中等滑音
            } else { // 慢速移动
                portamentoTime = 0.3; // 平滑滑音
            }
            
            // 调整滑音合成器参数
            if (this.mainSynths.glide) {
                this.mainSynths.glide.set({
                    "portamento": portamentoTime
                });
            }
            
            // 如果滑音合成器还没有激活，触发新的滑音
            if (!this.glideActive) {
                console.log(`启动滑音: ${note}, 滑音时间: ${portamentoTime}s`);
                
                if (this.mainSynths.glide) {
                    this.mainSynths.glide.triggerAttack(note, now);
                    this.glideActive = true;
                    this.glideNote = note;
                }
            } else if (this.glideNote !== note) {
                // 如果已经激活且音符发生了变化，更新音符
                if (this.mainSynths.glide && typeof this.mainSynths.glide.setNote === 'function') {
                    this.mainSynths.glide.setNote(note, now);
                    this.glideNote = note;
                    console.log(`滑音过渡: ${note}, 速度: ${moveSpeed.toFixed(5)}, 滑音时间: ${portamentoTime}s`);
                }
            }
        } catch (err) {
            console.error('处理滑音音符时出错:', err);
        }
    }

    /**
     * 为特定物体创建或更新滑音播放器
     * @param {string} objectId - 物体的唯一标识符
     * @param {string} note - 要播放的音符
     * @param {number} moveSpeed - 物体移动速度
     * @private
     */
    _createOrUpdateObjectGlide(objectId, note, moveSpeed) {
        const now = Tone.now();
        
        // 根据移动速度调整滑音时间
        let portamentoTime;
        if (moveSpeed > 0.003) { // 快速移动
            portamentoTime = 0.05; // 非常快的滑音
        } else if (moveSpeed > 0.001) { // 中速移动
            portamentoTime = 0.15; // 中等滑音
        } else { // 慢速移动
            portamentoTime = 0.3; // 平滑滑音
        }
        
        // 检查物体滑音是否已存在
        if (this.objectGlides.has(objectId)) {
            // 更新现有滑音
            const glideData = this.objectGlides.get(objectId);
            
            // 更新最后一次使用时间
            glideData.lastSeen = Date.now();
            
            // 如果音符发生变化，更新滑音
            if (glideData.note !== note) {
                try {
                    if (glideData.synth && typeof glideData.synth.setNote === 'function') {
                        // 设置新的滑音时间
                        glideData.synth.set({ "portamento": portamentoTime });
                        
                        // 平滑过渡到新音符
                        glideData.synth.setNote(note, now);
                        console.log(`物体 ${objectId} 滑音过渡: ${glideData.note} -> ${note}, 速度: ${moveSpeed.toFixed(5)}`);
                        
                        // 更新音符
                        glideData.note = note;
                    }
                } catch (err) {
                    console.error(`更新物体 ${objectId} 滑音时出错:`, err);
                }
            }
        } else {
            // 创建新的滑音合成器
            try {
                console.log(`为物体 ${objectId} 创建新的滑音合成器, 初始音符: ${note}`);
                
                // 创建新的滑音合成器，基于主滑音合成器的设置
                const objectSynth = this.synthFactory.createMonoSynth({
                    oscillator: { type: 'sawtooth' },
                    envelope: {
                        attack: 0.03,
                        decay: 0.2,
                        sustain: 0.8,
                        release: 1.0
                    },
                    portamento: portamentoTime,
                    volume: -12
                });
                
                // 连接到主效果链
                if (this.mainEffectsChain) {
                    objectSynth.connect(this.mainEffectsChain.lowcut);
                } else {
                    objectSynth.toDestination();
                }
                
                // 触发滑音
                objectSynth.triggerAttack(note, now);
                
                // 存储滑音数据
                this.objectGlides.set(objectId, {
                    synth: objectSynth,
                    note: note,
                    lastSeen: Date.now()
                });
                
                // 如果这是第一个物体，启动清理定时器
                if (this.objectGlides.size === 1 && !this.objectCleanupInterval) {
                    this._startObjectCleanupInterval();
                }
            } catch (err) {
                console.error(`为物体 ${objectId} 创建滑音合成器时出错:`, err);
            }
        }
    }

    /**
     * 释放特定物体的滑音播放器
     * @param {string} objectId - 物体的唯一标识符
     * @private
     */
    _releaseObjectGlide(objectId) {
        if (this.objectGlides.has(objectId)) {
            try {
                const glideData = this.objectGlides.get(objectId);
                
                console.log(`释放物体 ${objectId} 的滑音播放器`);
                
                // 释放合成器
                if (glideData.synth) {
                    // 先触发释放
                    glideData.synth.triggerRelease();
                    
                    // 短暂延迟后断开连接和清理资源
                    setTimeout(() => {
                        if (glideData.synth) {
                            try {
                                // 断开连接
                                glideData.synth.disconnect();
                                
                                // 处置合成器
                                if (typeof glideData.synth.dispose === 'function') {
                                    glideData.synth.dispose();
                                }
                            } catch (err) {
                                console.warn(`清理物体 ${objectId} 滑音资源时出错:`, err);
                            }
                        }
                    }, 1000); // 1秒后清理，确保释放完成
                }
                
                // 从Map中移除
                this.objectGlides.delete(objectId);
                
                // 如果没有物体了，清除定时器
                if (this.objectGlides.size === 0 && this.objectCleanupInterval) {
                    clearInterval(this.objectCleanupInterval);
                    this.objectCleanupInterval = null;
                }
            } catch (err) {
                console.error(`释放物体 ${objectId} 滑音时出错:`, err);
            }
        }
    }

    /**
     * 启动清理定时器，处理消失的物体
     * @private
     */
    _startObjectCleanupInterval() {
        // 每5秒检查一次不活跃的物体
        this.objectCleanupInterval = setInterval(() => {
            const now = Date.now();
            const inactiveThreshold = 2000; // 2秒不活跃视为消失
            
            // 检查每个物体
            for (const [objectId, glideData] of this.objectGlides.entries()) {
                // 如果物体超过阈值未被更新，则释放其资源
                if (now - glideData.lastSeen > inactiveThreshold) {
                    console.log(`物体 ${objectId} 超过 ${inactiveThreshold}ms 未更新，释放其滑音资源`);
                    this._releaseObjectGlide(objectId);
                }
            }
        }, 5000);
    }

    /**
     * 停止音频引擎时释放所有物体滑音
     * @private
     */
    _releaseAllObjectGlides() {
        console.log(`释放所有物体滑音资源 (${this.objectGlides.size} 个)`);
        
        // 复制键列表，避免在迭代过程中修改集合
        const objectIds = Array.from(this.objectGlides.keys());
        
        // 释放每个物体的滑音
        objectIds.forEach(objectId => {
            this._releaseObjectGlide(objectId);
        });
        
        // 清理定时器
        if (this.objectCleanupInterval) {
            clearInterval(this.objectCleanupInterval);
            this.objectCleanupInterval = null;
        }
    }
}

export default AudioEngine;