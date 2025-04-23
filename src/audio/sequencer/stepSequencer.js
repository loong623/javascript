import * as Tone from 'tone';

/**
 * 步进音序器类
 * 管理音乐模式和序列
 */
class StepSequencer {
    constructor() {
        // 存储活动序列
        this.sequences = new Map();
        
        // 序列设置
        this.subdivision = '16n';
        this.isRunning = false;
        
        // 状态跟踪
        this.activeSteps = new Set();
        this.stepCallbacks = new Map();
        
        // 创建一个メtronome指示当前步骤
        this._createMetronome();
    }
    
    /**
     * 创建内部メtronome
     * @private
     */
    _createMetronome() {
        // 16步メtronome
        const steps = 16;
        this.currentStep = 0;
        
        // 创建メtronome序列
        this.metronome = new Tone.Loop((time) => {
            this._onMetronomeStep(this.currentStep, time);
            // 更新下一步
            this.currentStep = (this.currentStep + 1) % steps;
        }, this.subdivision);
    }
    
    /**
     * 当メtronome触发时调用
     * @param {number} step - 当前步骤
     * @param {number} time - 事件时间
     * @private
     */
    _onMetronomeStep(step, time) {
        // 触发任何注册到此步骤的回调
        if (this.stepCallbacks.has(step)) {
            this.stepCallbacks.get(step).forEach(callback => {
                callback(time, step);
            });
        }
        
        // 发射步骤事件 (可由外部监听器使用)
        this._emitStepEvent(step, time);
    }
    
    /**
     * 发射步骤事件
     * @param {number} step - 步骤索引
     * @param {number} time - 事件时间
     * @private
     */
    _emitStepEvent(step, time) {
        // 创建一个自定义事件以供监听
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('sequencer-step', { 
                detail: { step, time, sequencer: this }
            });
            window.dispatchEvent(event);
        }
    }
    
    /**
     * 开始音序器
     * @param {number} startStep - 开始步骤 (可选)
     */
    start(startStep = 0) {
        if (this.isRunning) return;
        
        // 重置步骤
        this.currentStep = startStep;
        
        // 启动メtronome
        this.metronome.start('+0.1');
        this.isRunning = true;
        
        // 启动所有活动序列
        this.sequences.forEach(sequence => {
            if (sequence.start && !sequence.isStarted) {
                sequence.start('+0.1');
                sequence.isStarted = true;
            }
        });
    }
    
    /**
     * 停止音序器
     */
    stop() {
        if (!this.isRunning) return;
        
        // 停止メtronome
        this.metronome.stop();
        this.isRunning = false;
        
        // 停止所有序列
        this.sequences.forEach(sequence => {
            if (sequence.stop) {
                sequence.stop();
                sequence.isStarted = false;
            }
        });
    }
    
    /**
     * 停止所有序列并清理
     */
    stopAll() {
        this.stop();
        
        // 清理所有序列
        this.sequences.forEach(sequence => {
            if (sequence.dispose) {
                sequence.dispose();
            }
        });
        
        // 清空集合
        this.sequences.clear();
        this.stepCallbacks.clear();
        this.activeSteps.clear();
    }
    
    /**
     * 创建鼓序列
     * @param {Object} drumKit - 鼓组件对象
     * @param {Object} patterns - 鼓模式对象
     * @returns {Object} 创建的序列对象
     */
    createDrumSequence(drumKit, patterns) {
        // 确保有有效的鼓组和模式
        if (!drumKit || !patterns) {
            console.warn('缺少有效的鼓组或模式');
            return null;
        }
        
        const sequences = {};
        
        // 为每个鼓部件创建序列
        for (const [drumName, pattern] of Object.entries(patterns)) {
            if (!Array.isArray(pattern)) continue;
            
            // 获取对应的鼓乐器
            const drum = drumKit[drumName];
            if (!drum) {
                console.warn(`找不到鼓组部件: ${drumName}`);
                continue;
            }
            
            try {
                // 创建序列
                const sequence = new Tone.Sequence(
                    (time, note) => {
                        try {
                            if (note) {
                                // 设置防止爆音的延迟，确保任何潜在的干扰都已处理
                                const safeTime = time + 0.005;
                                
                                // 为不同的鼓组部件使用适合的参数
                                if (drumName === 'kick') {
                                    // 优化低音通鼓的触发，增加释放时间使声音更加自然
                                    try {
                                        // 增加衰减时间以获得更松弛的低音效果
                                        // 降低音量避免过冲，使声音更加厚实自然
                                        drum.triggerAttackRelease('C1', '4n', safeTime, 0.8);
                                        
                                        console.log('触发低音通鼓: C1, 音量: 0.8');
                                    } catch (kickErr) {
                                        console.warn('低音通鼓触发失败，使用备选方案:', kickErr);
                                        drum.triggerAttackRelease('D1', '4n', safeTime, 0.75);
                                    }
                                } else if (drumName === 'snare') {
                                    // 优化军鼓声音，增加释放时间和自然衰减
                                    drum.triggerAttackRelease('16n', safeTime + 0.01, 0.7);
                                } else if (drumName === 'hihat') {
                                    // 重写高音镲触发逻辑，匹配新的NoiseSynth实现
                                    try {
                                        // 用更简化的触发方式，无需操作噪声类型和包络
                                        const hihatTime = safeTime + 0.002; // 最小化延迟避免时序问题
                                        
                                        // 固定使用非常短的持续时间和合适的音量
                                        const hihatDuration = '32n'; 
                                        const hihatVelocity = 0.4;
                                        
                                        // 简单直接的触发方式
                                        drum.triggerAttackRelease(hihatDuration, hihatTime, hihatVelocity);
                                        
                                        // 不再需要频繁修改合成器参数，避免造成数字伪影
                                    } catch (err) {
                                        console.warn(`高音镲触发失败: ${err.message}`);
                                    }
                                } else {
                                    // 其他鼓组部件使用更自然的参数
                                    drum.triggerAttackRelease(
                                        typeof note === 'string' ? note : '32n', 
                                        '16n', // 稍长的持续时间
                                        safeTime + 0.005, // 轻微错开时间
                                        0.65 // 降低默认音量
                                    );
                                }
                                
                                // 记录触发的鼓声，便于调试
                                if (Tone.Transport.state === 'started') {
                                    console.log(`触发鼓声: ${drumName} @ ${Math.round(time * 1000)}ms`);
                                }
                            }
                        } catch (err) {
                            console.error(`触发鼓声 ${drumName} 时出错:`, err);
                        }
                    },
                    pattern,
                    this.subdivision
                );
                
                // 存储序列
                sequences[drumName] = sequence;
                
                // 如果音序器正在运行，也启动这个序列
                if (this.isRunning) {
                    sequence.start('+0.1');
                    sequence.isStarted = true;
                }
            } catch (seqErr) {
                console.error(`为 ${drumName} 创建序列时出错:`, seqErr);
            }
        }
        
        // 创建序列组合
        const sequenceGroup = {
            sequences,
            start: () => {
                Object.values(sequences).forEach(seq => {
                    try {
                        seq.start('+0.1');
                        seq.isStarted = true;
                    } catch (err) {
                        console.error('启动鼓序列时出错:', err);
                    }
                });
            },
            stop: () => {
                Object.values(sequences).forEach(seq => {
                    try {
                        seq.stop();
                        seq.isStarted = false;
                    } catch (err) {
                        console.error('停止鼓序列时出错:', err);
                    }
                });
            },
            dispose: () => {
                Object.values(sequences).forEach(seq => {
                    try {
                        seq.dispose();
                    } catch (err) {
                        console.error('释放鼓序列时出错:', err);
                    }
                });
            }
        };
        
        // 存储序列组合
        const id = `drums_${Date.now()}`;
        this.sequences.set(id, sequenceGroup);
        
        return { id, sequence: sequenceGroup };
    }
    
    /**
     * 创建旋律序列
     * @param {Object} synth - 要使用的合成器
     * @param {Array} notePattern - 音符模式
     * @param {Array} rhythmPattern - 节奏模式 (可选)
     * @returns {Object} 创建的序列对象
     */
    createMelodicSequence(synth, notePattern, rhythmPattern = null) {
        // 确保有有效的合成器和模式
        if (!synth || !Array.isArray(notePattern)) {
            console.warn('缺少有效的合成器或音符模式');
            return null;
        }
        
        // 使用默认节奏如果没有提供
        const rhythm = rhythmPattern || notePattern.map(() => '8n');
        
        // 音符索引
        let noteIndex = 0;
        
        // 创建序列
        const sequence = new Tone.Sequence(
            (time, step) => {
                // 获取当前音符和持续时间
                const note = notePattern[noteIndex];
                const duration = rhythm[noteIndex];
                
                // 播放音符
                if (note && note !== 'rest') {
                    synth.triggerAttackRelease(note, duration, time);
                }
                
                // 更新索引
                noteIndex = (noteIndex + 1) % notePattern.length;
            },
            Array.from({ length: Math.max(notePattern.length, rhythm.length) }, (_, i) => i),
            this.subdivision
        );
        
        // 如果音序器正在运行，也启动这个序列
        if (this.isRunning) {
            sequence.start('+0.1');
            sequence.isStarted = true;
        }
        
        // 存储序列
        const id = `melody_${Date.now()}`;
        this.sequences.set(id, sequence);
        
        return { id, sequence };
    }
    
    /**
     * 在特定步骤注册回调
     * @param {number} step - 步骤索引
     * @param {Function} callback - 回调函数
     * @returns {string} 回调ID
     */
    onStep(step, callback) {
        const callbackId = `callback_${Date.now()}_${Math.random()}`;
        
        if (!this.stepCallbacks.has(step)) {
            this.stepCallbacks.set(step, new Map());
        }
        
        this.stepCallbacks.get(step).set(callbackId, callback);
        return callbackId;
    }
    
    /**
     * 移除步骤回调
     * @param {number} step - 步骤索引
     * @param {string} callbackId - 回调ID
     */
    offStep(step, callbackId) {
        if (this.stepCallbacks.has(step)) {
            this.stepCallbacks.get(step).delete(callbackId);
        }
    }
    
    /**
     * 为所有序列设置节奏细分
     * @param {string} subdivision - 新的细分值
     */
    setSubdivision(subdivision) {
        this.subdivision = subdivision;
        
        // 更新メtronome
        if (this.metronome) {
            this.metronome.interval = subdivision;
        }
        
        // 更新所有序列
        this.sequences.forEach(sequence => {
            if (sequence.subdivision !== undefined) {
                sequence.subdivision = subdivision;
            }
        });
    }
}

export default StepSequencer;