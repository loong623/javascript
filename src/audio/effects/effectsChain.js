import * as Tone from 'tone';

/**
 * 管理音频效果链的类
 */
class EffectsChain {
    constructor() {
        // 存储创建的效果链
        this.chains = new Map();
    }
    
    /**
     * 创建效果链
     * @param {Object} effects - 包含效果的对象
     * @returns {Object} 创建的效果链对象
     */
    createChain(effects) {
        // 验证输入
        if (!effects || typeof effects !== 'object') {
            throw new Error('效果必须是一个包含Tone.js效果的对象');
        }
        
        // 如果没有效果，返回一个直通
        if (Object.keys(effects).length === 0) {
            return { _throughNode: new Tone.Volume(0).toDestination() };
        }
        
        // 创建效果链
        let previousEffect = null;
        let firstEffect = null;
        
        // 处理所有效果
        for (const [name, effect] of Object.entries(effects)) {
            if (!effect) continue;
            
            // 检查是否是有效的Tone效果
            if (typeof effect.connect !== 'function') {
                console.warn(`跳过无效效果 "${name}"`);
                continue;
            }
            
            // 存储第一个效果的引用
            if (!firstEffect) {
                firstEffect = effect;
            }
            
            // 连接到前一个效果
            if (previousEffect) {
                previousEffect.connect(effect);
            }
            
            previousEffect = effect;
        }
        
        // 创建链对象
        const chain = {
            ...effects,
            input: firstEffect,
            output: previousEffect || firstEffect
        };
        
        // 存储创建的链
        const id = `chain_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.chains.set(id, chain);
        
        return chain;
    }
    
    /**
     * 将乐器连接到效果链
     * @param {Object|Array} instruments - 要连接的乐器
     * @param {Object} chain - 效果链对象
     */
    connectInstruments(instruments, chain) {
        if (!chain || !chain.input) {
            console.warn('无效的效果链');
            return;
        }
        
        // 连接单个乐器
        const connectOne = (instrument) => {
            if (typeof instrument.connect === 'function') {
                instrument.connect(chain.input);
            } else {
                console.warn('无法连接乐器，它没有connect方法');
            }
        };
        
        // 处理数组或对象
        if (Array.isArray(instruments)) {
            instruments.forEach(connectOne);
        } else if (typeof instruments === 'object') {
            Object.values(instruments).forEach(connectOne);
        } else {
            connectOne(instruments);
        }
    }
    
    /**
     * 断开乐器与效果链的连接
     * @param {Object|Array} instruments - 要断开的乐器
     * @param {Object} chain - 效果链对象
     */
    disconnectInstruments(instruments, chain) {
        if (!chain || !chain.input) return;
        
        // 断开单个乐器
        const disconnectOne = (instrument) => {
            if (typeof instrument.disconnect === 'function') {
                instrument.disconnect(chain.input);
            }
        };
        
        // 处理数组或对象
        if (Array.isArray(instruments)) {
            instruments.forEach(disconnectOne);
        } else if (typeof instruments === 'object') {
            Object.values(instruments).forEach(disconnectOne);
        } else {
            disconnectOne(instruments);
        }
    }
    
    /**
     * 更新效果链中的特定效果
     * @param {Object} chain - 效果链对象
     * @param {string} effectName - 效果名称
     * @param {Object} settings - 新设置
     */
    updateEffect(chain, effectName, settings) {
        if (!chain || !chain[effectName]) {
            console.warn(`效果链中找不到效果 "${effectName}"`);
            return;
        }
        
        const effect = chain[effectName];
        
        // 更新设置
        if (typeof effect.set === 'function') {
            effect.set(settings);
        } else {
            // 手动设置属性
            Object.entries(settings).forEach(([key, value]) => {
                // 处理嵌套属性，如wet.value
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    if (effect[parent]) {
                        effect[parent][child] = value;
                    }
                } else if (effect[key] !== undefined) {
                    // 直接设置属性
                    effect[key] = value;
                }
            });
        }
    }
    
    /**
     * 为效果链创建旁通开关
     * @param {Object} chain - 效果链对象
     * @param {string} effectName - 效果名称
     * @returns {function} 切换函数
     */
    createBypassToggle(chain, effectName) {
        if (!chain || !chain[effectName]) {
            console.warn(`效果链中找不到效果 "${effectName}"`);
            return () => {};
        }
        
        const effect = chain[effectName];
        
        // 存储初始wet值（如果有）
        const initialWet = effect.wet ? effect.wet.value : null;
        
        // 返回切换函数
        return (bypass) => {
            if (effect.wet && initialWet !== null) {
                // 使用wet参数旁通
                effect.wet.value = bypass ? 0 : initialWet;
            } else if (typeof effect.bypass === 'function') {
                // 使用专用bypass方法
                effect.bypass(bypass);
            } else if (effect.wet) {
                // 退路情况只使用wet
                effect.wet.value = bypass ? 0 : 1;
            }
        };
    }
    
    /**
     * 释放效果链资源
     * @param {Object} chain - 要释放的效果链
     */
    disposeChain(chain) {
        if (!chain) return;
        
        // 释放每个效果
        Object.values(chain).forEach(effect => {
            if (effect && typeof effect.dispose === 'function') {
                effect.dispose();
            }
        });
        
        // 从存储中移除
        for (const [id, storedChain] of this.chains.entries()) {
            if (storedChain === chain) {
                this.chains.delete(id);
                break;
            }
        }
    }
}

export default EffectsChain;