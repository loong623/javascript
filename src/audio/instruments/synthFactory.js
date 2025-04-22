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
                pitchDecay: 0.05,
                octaves: 5,
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.001,
                    decay: 0.4,
                    sustain: 0.01,
                    release: 1.4
                }
            });
            
            const snare = new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0.01,
                    release: 0.3
                }
            });
            
            const hihat = new Tone.MetalSynth({
                frequency: 800,
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    release: 0.02
                },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            });
            
            // 设置音量
            const level = -5;
            kick.volume.value = level - 10;
            snare.volume.value = level - 15;
            hihat.volume.value = level - 20;
            
            // 将所有鼓声连接到输出
            // 默认我们不连接到输出，因为我们会通过效果链连接
            // kick.toDestination();
            // snare.toDestination();
            // hihat.toDestination();
            
            console.log("鼓组已创建，音量级别:", level);
            
            // 返回包含所有鼓声的对象
            return this._storeSynth('drumKit', { kick, snare, hihat });
        } catch (error) {
            console.error("创建鼓组时出错:", error);
            
            // 返回一个简单的备用鼓组
            return this._storeSynth('drumKit', {
                kick: new Tone.MembraneSynth().toDestination(),
                snare: new Tone.NoiseSynth().toDestination(),
                hihat: new Tone.MetalSynth().toDestination()
            });
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