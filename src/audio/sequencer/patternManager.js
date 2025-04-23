/**
 * 音乐模式管理器
 * 定义和管理所有音乐模式
 */
class PatternManager {
    constructor() {
        this._initializePatterns();
    }
    
    /**
     * 初始化所有音乐模式
     * @private
     */
    _initializePatterns() {
        // 音阶定义
        this.scales = {
            major: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
            minor: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4'],
            pentatonic: ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4'],
            blues: ['C3', 'Eb3', 'F3', 'F#3', 'G3', 'Bb3', 'C4', 'Eb4', 'F4', 'F#4', 'G4', 'Bb4']
        };
        
        // 节奏模式 - 更加多样化的节奏
        this.rhythmPatterns = {
            // 基本节奏 - 简单稳定但有变化
            basic: ['8n', '4n', '8n', '2n', '8n.', '4n', '8n', '1n'],
            
            // 电子音乐节奏 - 短促且有节奏感
            techno: ['16n', '8n', '16n', '8n.', '8t', '16n', '16n', '4n+8n'],
            
            // 爵士风格 - 摇摆感和不规则性
            jazz: ['8t', '4t', '8t', '2t', '4t', '8t', '16t', '4t.'],
            
            // 拉丁节奏 - 丰富的切分音和复合节奏
            latin: ['16n', '8n.', '16n', '8n', '16n', '4n.', '8n', '16n']
        };
        
        // 鼓模式 - 更加丰富多样的鼓点
        this.drumPatterns = {
            // 基本鼓点 - 简单但是有变化
            basic: {
                kick: ['C2', null, null, 'C2', null, null, 'C2', null],
                snare: [null, null, 'C2', null, null, null, 'C2', null],
                hihat: ['F#2', null, 'F#2', null, 'F#2', null, 'F#2', 'F#2']
            },
            
            // 电子音乐鼓点 - 更密集和律动感强
            techno: {
                kick: ['C2', null, 'C2', 'C2', null, 'C2', null, 'C2'],
                snare: [null, null, 'C2', null, null, null, 'C2', 'C2'],
                hihat: ['F#2', 'F#2', null, 'F#2', 'F#2', null, 'F#2', null]
            },
            
            // 爵士鼓点 - 更自由和摇摆感
            jazz: {
                kick: ['C2', null, null, 'C2', null, 'C2', null, null],
                snare: [null, null, 'C2', null, 'C2', null, null, 'C2'],
                hihat: ['F#2', null, 'F#2', 'F#2', null, 'F#2', null, 'F#2']
            },
            
            // 拉丁鼓点 - 复杂和切分音丰富
            latin: {
                kick: ['C2', null, 'C2', null, null, 'C2', null, 'C2'],
                snare: [null, 'C2', null, 'C2', null, null, 'C2', null],
                hihat: ['F#2', null, 'F#2', null, 'F#2', 'F#2', null, 'F#2']
            }
        };
        
        // 音色映射 (对象类名到振荡器类型)
        this.timbres = {
            'person': 'sine',
            'bottle': 'square',
            'cup': 'triangle',
            'book': 'sawtooth',
            'cell phone': 'fmsine',
            'keyboard': 'fmtriangle',
            'remote': 'amsine',
            'mouse': 'fatsawtooth',
            'laptop': 'pulse'
        };
    }
    
    /**
     * 获取音阶
     * @returns {Object} 音阶对象
     */
    getScales() {
        return { ...this.scales };
    }
    
    /**
     * 获取节奏模式
     * @returns {Object} 节奏模式对象
     */
    getRhythmPatterns() {
        return { ...this.rhythmPatterns };
    }
    
    /**
     * 获取鼓模式
     * @returns {Object} 鼓模式对象
     */
    getDrumPatterns() {
        return { ...this.drumPatterns };
    }
    
    /**
     * 获取音色映射
     * @returns {Object} 音色映射对象
     */
    getTimbres() {
        return { ...this.timbres };
    }
    
    /**
     * 创建自定义音阶
     * @param {string} name - 音阶名称
     * @param {Array} notes - 音符数组
     * @returns {boolean} 是否成功创建
     */
    createCustomScale(name, notes) {
        if (!name || !Array.isArray(notes) || notes.length === 0) {
            return false;
        }
        
        this.scales[name] = [...notes];
        return true;
    }
    
    /**
     * 创建自定义节奏模式
     * @param {string} name - 模式名称
     * @param {Array} durations - 持续时间数组
     * @returns {boolean} 是否成功创建
     */
    createCustomRhythmPattern(name, durations) {
        if (!name || !Array.isArray(durations) || durations.length === 0) {
            return false;
        }
        
        this.rhythmPatterns[name] = [...durations];
        return true;
    }
    
    /**
     * 创建自定义鼓模式
     * @param {string} name - 模式名称
     * @param {Object} pattern - 鼓模式对象
     * @returns {boolean} 是否成功创建
     */
    createCustomDrumPattern(name, pattern) {
        if (!name || !pattern) {
            return false;
        }
        
        this.drumPatterns[name] = { ...pattern };
        return true;
    }
    
    /**
     * 添加自定义音色
     * @param {string} objectClass - 对象类名
     * @param {string} oscillatorType - 振荡器类型
     * @returns {boolean} 是否成功添加
     */
    addCustomTimbre(objectClass, oscillatorType) {
        if (!objectClass || !oscillatorType) {
            return false;
        }
        
        this.timbres[objectClass] = oscillatorType;
        return true;
    }
}

export default PatternManager;