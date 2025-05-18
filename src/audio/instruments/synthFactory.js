import * as Tone from 'tone';

/**
 * SynthFactory 类负责创建和配置各种合成器
 */
class SynthFactory {
    constructor() {
        // 存储创建的合成器
        this.synths = new Map();
    }

    /**
     * 创建一个复音合成器
     * @param {Object} options - 合成器选项
     * @returns {Tone.PolySynth} 配置好的复音合成器
     */
    createPolySynth(options = {}) {
        try {
            // 默认设置与提供的选项合并
            const settings = {
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.6,
                    release: 1.2
                },
                volume: -10,
                ...options
            };
            
            // 创建复音合成器
            const polySynth = new Tone.PolySynth(Tone.Synth, settings);
            
            // 确保连接到目的地以便立即听到声音（可选）
            // polySynth.toDestination();
            
            // 输出创建信息以帮助调试
            console.log("创建复音合成器:", {
                type: settings.oscillator.type,
                volume: settings.volume
            });
            
            return this._storeSynth('poly', polySynth);
        } catch (error) {
            console.error("创建复音合成器时出错:", error);
            
            // 返回一个简单的备用合成器
            const fallbackSynth = new Tone.PolySynth().toDestination();
            fallbackSynth.volume.value = -15;
            return fallbackSynth;
        }
    }
    
    /**
     * 创建一个单音合成器
     * @param {Object} options - 合成器选项
     * @returns {Tone.MonoSynth} 配置好的单音合成器
     */
    createMonoSynth(options = {}) {
        try {
            // 默认设置与提供的选项合并
            const settings = {
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.05,
                    decay: 0.3,
                    sustain: 0.4,
                    release: 0.8
                },
                filterEnvelope: {
                    attack: 0.05,
                    decay: 0.5,
                    sustain: 0.3,
                    release: 1.5,
                    baseFrequency: 300,
                    octaves: 2
                },
                volume: -15,
                ...options
            };
            
            // 创建单音合成器
            const monoSynth = new Tone.MonoSynth(settings);
            
            // 确保连接到目的地以便立即听到声音（可选）
            // monoSynth.toDestination();
            
            // 输出创建信息以帮助调试
            console.log("创建单音合成器:", {
                type: settings.oscillator.type,
                volume: settings.volume
            });
            
            return this._storeSynth('mono', monoSynth);
        } catch (error) {
            console.error("创建单音合成器时出错:", error);
            
            // 返回一个简单的备用合成器
            const fallbackSynth = new Tone.MonoSynth().toDestination();
            fallbackSynth.volume.value = -15;
            return fallbackSynth;
        }
    }
    
    /**
     * 创建一个 FM 合成器
     * @param {Object} options - 合成器选项
     * @returns {Tone.FMSynth} 配置好的 FM 合成器
     */
    createFMSynth(options = {}) {
        try {
            // 默认设置与提供的选项合并
            const settings = {
                harmonicity: 2,
                modulationIndex: 5,
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.2,
                    decay: 0.1,
                    sustain: 0.5,
                    release: 1.2
                },
                modulation: { type: 'square' },
                modulationEnvelope: {
                    attack: 0.5,
                    decay: 0.1,
                    sustain: 0.2,
                    release: 0.5
                },
                volume: -12,
                ...options
            };
            
            // 创建 FM 合成器
            const fmSynth = new Tone.FMSynth(settings);
            
            // 确保连接到目的地以便立即听到声音（可选）
            // fmSynth.toDestination();
            
            return this._storeSynth('fm', fmSynth);
        } catch (error) {
            console.error("创建 FM 合成器时出错:", error);
            
            // 返回一个简单的备用合成器
            const fallbackSynth = new Tone.FMSynth().toDestination();
            fallbackSynth.volume.value = -15;
            return fallbackSynth;
        }
    }
    
    /**
     * 创建一个鼓组
     * @returns {Object} 鼓组对象
     */
    createDrumKit() {
        try {
            // 为每种鼓声创建一个合成器
            const kick = new Tone.MembraneSynth({
                pitchDecay: 0.04,   
                octaves: 6,         
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.0005, 
                    decay: 0.6,     
                    sustain: 0.015, 
                    release: 1.6    
                },
                volume: -1          // 提高低音通鼓音量(从-3调整到-1)
            });
            
            const snare = new Tone.NoiseSynth({
                noise: { 
                    type: 'white',
                    playbackRate: 3
                },
                envelope: {
                    attack: 0.001,  
                    decay: 0.13,    
                    sustain: 0,     
                    release: 0.2
                },
                volume: -8         // 提高军鼓音量(从-10调整到-8)
            });
            
            // 使用NoiseSynth代替MetalSynth作为高音镲，更少的数字伪影
            const hihat = new Tone.NoiseSynth({
                noise: { 
                    type: 'white',    
                    playbackRate: 5,  
                },
                envelope: {
                    attack: 0.0005,    
                    decay: 0.03,       
                    sustain: 0,        
                    release: 0.03      
                },
                volume: -25,           // 降低高音镲音量(从-20调整到-25)
                
                // 添加高通滤波，去除所有低频成分
                filter: {
                    type: 'highpass',
                    frequency: 7000,   
                    Q: 1.2
                },
            });
            
            console.log("调整鼓组音量：低音通鼓音量-1dB，军鼓音量-8dB，高音镲音量-25dB");
            
            // 将所有鼓组合成器放入对象并返回
            return this._storeSynth('drumKit', { kick, snare, hihat });
        } catch (error) {
            console.error("创建鼓组时出错:", error);
            
            // 返回一个简单的备用鼓组
            const fallbackKit = {
                kick: new Tone.MembraneSynth({ volume: -6 }),
                snare: new Tone.NoiseSynth({ volume: -14 }),
                hihat: new Tone.MetalSynth({ volume: -20 })
            };
            
            return this._storeSynth('drumKit', fallbackKit);
        }
    }
    
    /**
     * 创建一个 AM 合成器
     * @param {Object} options - 合成器选项
     * @returns {Tone.AMSynth} 配置好的 AM 合成器
     */
    createAMSynth(options = {}) {
        try {
            // 默认设置与提供的选项合并
            const settings = {
                harmonicity: 3,
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 1
                },
                modulation: { type: 'square' },
                modulationEnvelope: {
                    attack: 0.5,
                    decay: 0.1,
                    sustain: 0.5,
                    release: 0.5
                },
                volume: -12,
                ...options
            };
            
            // 创建 AM 合成器
            const amSynth = new Tone.AMSynth(settings);
            
            // 确保连接到目的地以便立即听到声音（可选）
            // amSynth.toDestination();
            
            return this._storeSynth('am', amSynth);
        } catch (error) {
            console.error("创建 AM 合成器时出错:", error);
            
            // 返回一个简单的备用合成器
            const fallbackSynth = new Tone.AMSynth().toDestination();
            fallbackSynth.volume.value = -15;
            return fallbackSynth;
        }
    }
    
    /**
     * 创建一个猫叫声合成器
     * @param {Object} options - 合成器选项
     * @returns {Tone.MonoSynth} 配置好的猫叫声合成器
     */
    createCatSynth(options = {}) {
        try {
            // 默认设置与提供的选项合并 - 模拟猫叫声的参数
            const settings = {
                oscillator: { 
                    type: 'sawtooth'  // 锯齒波最接近猫叫声的粗糙质感
                },
                envelope: {
                    attack: 0.1,      // 稍慢的起音模拟猫叫开始
                    decay: 0.1,       // 快速衰减
                    sustain: 0.3,     // 中等持续
                    release: 2.0      // 较长的释放模拟猫叫的余音
                },
                filter: {
                    Q: 6,             // 高共振峰值使声音更尖锐
                    type: "bandpass", // 带通滤波器模拟猫叫声的频率特性
                    rolloff: -12      // 滚降率
                },
                filterEnvelope: {
                    attack: 0.04,     // 快速滤波器包络起音
                    attackCurve: "exponential",
                    decay: 0.5,
                    decayCurve: "exponential",
                    sustain: 0.3,
                    release: 0.6,
                    baseFrequency: 800, // 围绕猫叫声的主要频率
                    octaves: 2          // 滤波器包络范围
                },
                portamento: 0.15,     // 滑音时间
                volume: -10,          // 音量
                ...options
            };
            
            // 创建单音合成器作为猫叫声合成器基础
            const catSynth = new Tone.MonoSynth(settings);
            
            // 输出创建信息
            console.log("创建猫叫声合成器:", {
                type: settings.oscillator.type,
                volume: settings.volume
            });
            
            return this._storeSynth('cat', catSynth);
        } catch (error) {
            console.error("创建猫叫声合成器时出错:", error);
            
            // 返回一个简单的备用合成器
            const fallbackSynth = new Tone.MonoSynth().toDestination();
            fallbackSynth.volume.value = -15;
            return fallbackSynth;
        }
    }    /**
     * 创建一个基于采样的猫叫声采样器
     * @param {Object} options - 采样器选项
     * @returns {Tone.Sampler} 配置好的猫叫采样器
     */
    createCatSampler(options = {}) {
        try {
            // 定义猫叫采样，使用正确的路径
            const catSamples = {
                "C4": "miao/1.wav", 
                "D4": "miao/2.wav",
                "E4": "miao/3.wav", 
                "F4": "miao/4.wav",
                "G4": "miao/5.wav",
                "A4": "miao/6.wav"
            };
              // 默认设置与提供的选项合并
            const settings = {
                urls: catSamples,
                baseUrl: "/", // 设置基础URL，确保从public目录加载
                release: 1.5,
                attack: 0.1,
                volume: -10, // 降低25%音量（从-5减少到-8.75dB）
                ...options,onload: () => {
                    console.log("猫叫声采样器加载完成，所有样本已准备就绪");
                    // 设置一个自定义标志，表示采样器已经准备好
                    if (catSampler) {
                        // 不直接设置内置的loaded属性，而是使用自己的isLoaded标志
                        catSampler._isLoaded = true;
                        
                        // 如果有待触发的声音，现在触发
                        if (catSampler.pendingTriggers && catSampler.pendingTriggers.length > 0) {
                            catSampler.pendingTriggers.forEach(trigger => {
                                try {
                                    console.log(`触发延迟的猫叫采样: ${trigger.note}`);
                                    catSampler.triggerAttackRelease(trigger.note, trigger.duration, trigger.time);
                                } catch (err) {
                                    console.warn("触发延迟的猫叫采样失败:", err);
                                }
                            });
                            catSampler.pendingTriggers = [];
                        }
                    }
                }
            };
            
            // 创建采样器，不要立即连接到目的地，让audioEngine来处理连接
            const catSampler = new Tone.Sampler(settings);
            
            console.log("创建猫叫声采样器，使用真实猫叫音频");
              // 存储触发队列，用于在采样器加载完成前尝试触发的声音
            catSampler.pendingTriggers = [];
            catSampler._isLoaded = false; // 使用自定义标志而不是直接设置loaded属性
              // 添加安全触发方法
            catSampler.safeTriggerAttackRelease = function(note, duration, time) {
                if (this._isLoaded || this.loaded) { // 检查自定义标志或内置loaded属性
                    // 如果已加载，直接触发
                    console.log(`直接触发猫叫采样: ${note}`);
                    return this.triggerAttackRelease(note, duration, time);
                } else {
                    // 如果尚未加载，将此触发添加到待处理队列
                    console.log(`延迟触发猫叫采样: ${note} (等待加载)`);
                    this.pendingTriggers.push({ note, duration, time });
                    return this;
                }
            };
            
            // 存储并返回
            return this._storeSynth('catSampler', catSampler);
        } catch (error) {
            console.error("创建猫叫采样器时出错:", error);
            
            // 返回一个简单的备用合成器，使用合成猫叫声作为后备
            console.warn("使用合成猫叫声作为后备");
            return this.createCatSynth({
                volume: -8,
                portamento: 0.2
            });
        }
    }

    /**
     * 创建一个测试音
     * 用于验证音频系统是否工作
     */
    createTestTone() {
        try {
            // 创建一个简单的振荡器
            const osc = new Tone.Oscillator({
                type: "sine",
                frequency: "C4",
                volume: -20
            }).toDestination();
            
            // 启动振荡器并在一秒后停止
            osc.start();
            
            setTimeout(() => {
                osc.stop();
                osc.dispose();
            }, 1000);
            
            console.log("播放测试音频...");
            return true;
        } catch (error) {
            console.error("创建测试音时出错:", error);
            return false;
        }
    }

    /**
     * 根据采样创建采样器
     * @param {Object} samples - 采样映射
     * @param {Object} options - 采样器选项
     * @returns {Tone.Sampler} 创建的采样器
     */
    createSampler(samples, options = {}) {
        // 创建采样器
        const sampler = new Tone.Sampler({
            urls: samples,
            ...options
        });
        
        // 存储并返回
        return this._storeSynth('sampler', sampler);
    }
    
    /**
     * 存储合成器并生成ID
     * @param {string} type - 合成器类型
     * @param {Object} synth - 合成器实例
     * @returns {Object} 带有ID的合成器
     * @private
     */
    _storeSynth(type, synth) {
        const id = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        synth.id = id;
        this.synths.set(id, synth);
        return synth;
    }
    
    /**
     * 获取合成器
     * @param {string} id - 合成器ID
     * @returns {Object|null} 合成器或null
     */
    getSynth(id) {
        return this.synths.get(id) || null;
    }
    
    /**
     * 释放合成器资源
     * @param {string|Object} synthOrId - 合成器或其ID
     */
    disposeSynth(synthOrId) {
        const id = typeof synthOrId === 'string' ? synthOrId : synthOrId.id;
        const synth = this.synths.get(id);
        
        if (synth) {
            // 如果是鼓组，需要单独释放每个部件
            if (id.startsWith('drumKit')) {
                ['kick', 'snare', 'hihat'].forEach(part => {
                    if (synth[part] && typeof synth[part].dispose === 'function') {
                        synth[part].dispose();
                    }
                });
            } else if (typeof synth.dispose === 'function') {
                synth.dispose();
            }
            
            this.synths.delete(id);
        }
    }
    
    /**
     * 释放所有合成器资源
     */
    disposeAll() {
        this.synths.forEach((synth, id) => {
            this.disposeSynth(id);
        });
        
        this.synths.clear();
    }
}

export default SynthFactory;