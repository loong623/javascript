import * as Tone from 'tone';

class AudioEngine {
    constructor() {
        // Initialize main synths
        this.synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                type: 'sine',
                attack: 0.1,
                decay: 0.2,
                sustain: 0.6,
                release: 1.2
            },
            volume: -10
        });

        // Add noise gate to remove background noise
        this.noiseGate = new Tone.Gate({
            threshold: -50, // Lower threshold to catch more noise
            smoothing: 0.1, // Quick response
            attack: 0.01,
            release: 0.1
        }).toDestination();

        // Add effects with proper cleanup
        this.reverb = new Tone.Reverb({
            decay: 1.5,
            wet: 0.2,
            preDelay: 0.1
        });

        this.delay = new Tone.FeedbackDelay({
            delayTime: "8n", 
            feedback: 0.1,
            wet: 0.1
        });

        // Create a master volume control
        this.masterVolume = new Tone.Volume(-5).toDestination();
        
        // Connect effects chain with noise gate
        this.synth.chain(this.reverb, this.delay, this.noiseGate, this.masterVolume);
        
        // Add a bass synth for lower register
        this.bassSynth = new Tone.MonoSynth({
            oscillator: {
                type: 'triangle'
            },
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
        }).chain(this.reverb, this.delay, this.noiseGate, this.masterVolume);
        
        // Add a glide synth for right side
        this.glideSynth = new Tone.MonoSynth({
            oscillator: {
                type: 'sawtooth'
            },
            envelope: {
                attack: 0.05,
                decay: 0.2,
                sustain: 0.8,
                release: 2
            },
            portamento: 0.2,
            volume: -15
        }).chain(this.reverb, this.delay, this.noiseGate, this.masterVolume);

        // Drum sounds
        this.drumKit = {
            kick: new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 5,
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.001,
                    decay: 0.4,
                    sustain: 0.01,
                    release: 1.4,
                },
                volume: -10
            }).toDestination(),
            
            snare: new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0.02,
                    release: 0.8
                },
                volume: -15
            }).toDestination(),
            
            hihat: new Tone.MetalSynth({
                frequency: 200,
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    sustain: 0.001,
                    release: 0.3
                },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5,
                volume: -20
            }).toDestination()
        };

        // Initialize patterns
        this.currentPattern = null;
        this.isPlaying = false;
        this.drumLoop = null;
        
        // Keep track of active notes to avoid overlapping triggers
        this.activeNotes = new Set();
        this.lastNoteTime = Date.now();
        
        // Define drum patterns based on rhythm types
        this.drumPatterns = {
            basic: {
                kick: ['C2', null, null, null, 'C2', null, null, null],
                snare: [null, null, 'C2', null, null, null, 'C2', null],
                hihat: ['F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2']
            },
            techno: {
                kick: ['C2', null, null, 'C2', 'C2', null, null, 'C2'],
                snare: [null, null, 'C2', null, null, null, 'C2', 'C2'],
                hihat: ['F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2']
            },
            jazz: {
                kick: ['C2', null, 'C2', null, null, 'C2', null, 'C2'],
                snare: [null, null, 'C2', null, 'C2', null, null, 'C2'],
                hihat: ['F#2', null, 'F#2', null, 'F#2', null, 'F#2', null]
            },
            latin: {
                kick: ['C2', null, null, 'C2', null, 'C2', null, null],
                snare: [null, null, 'C2', null, 'C2', null, 'C2', 'C2'],
                hihat: ['F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2', 'F#2']
            }
        };

        // Note mapping
        this.scales = {
            major: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
            minor: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4'],
            pentatonic: ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4'],
            blues: ['C3', 'Eb3', 'F3', 'F#3', 'G3', 'Bb3', 'C4', 'Eb4', 'F4', 'F#4', 'G4', 'Bb4']
        };
        this.currentScale = 'major';

        // Rhythm patterns
        this.rhythmPatterns = {
            basic: ['8n', '4n', '2n', '1n'],
            techno: ['16n', '8n', '8n.', '4n'],
            jazz: ['8t', '4t', '2t', '1t'],
            latin: ['16n', '8n', '8n.', '4n.']
        };
        this.currentRhythmPattern = 'basic';

        // Timbres (oscillator types)
        this.timbres = {
            'person': 'sine',
            'bottle': 'square',
            'cup': 'triangle',
            'book': 'sawtooth',
            'cell phone': 'fmsine',
            'keyboard': 'fmtriangle',
            'remote': 'amsine',
            'mouse': 'fatsawtooth'
        };
        
        // Track the BPM
        this.bpm = 120;
        Tone.Transport.bpm.value = this.bpm;

        // Initialize state
        this.isPlaying = false;
        this.drumLoop = null;
        this.activeNotes = new Set();
        this.lastBeatTime = 0;
        this.beatInterval = 0.5; // Default to 120 BPM (0.5 seconds per beat)
    }

    // Start audio context
    async start() {
        if (this.isPlaying) return;
        
        // Ensure we're using the same audio context
        await Tone.start();
        
        // Reset effects
        this.reverb.wet.value = 0.2;
        this.delay.wet.value = 0.1;
        this.noiseGate.set({ threshold: -50 });
        
        // Start transport
        Tone.Transport.start();
        this.isPlaying = true;
        
        // Start drum loop
        this.startDrumLoop();
    }

    // Stop all sound
    stop() {
        if (!this.isPlaying) return;
        
        // Stop drum loop
        if (this.drumLoop) {
            this.drumLoop.stop();
            this.drumLoop = null;
        }
        
        // Release all notes
        this.synth.releaseAll();
        this.bassSynth.releaseAll();
        this.glideSynth.releaseAll();
        
        // Stop all drum sounds
        Object.values(this.drumKit).forEach(drum => {
            drum.triggerRelease();
        });
        
        // Stop transport
        Tone.Transport.stop();
        Tone.Transport.cancel();
        
        // Reset effects
        this.reverb.wet.value = 0;
        this.delay.wet.value = 0;
        this.noiseGate.set({ threshold: -100 }); // Fully close the gate
        
        // Clear active notes
        this.activeNotes.clear();
        
        this.isPlaying = false;
    }

    // Start the drum loop based on selected pattern
    startDrumLoop() {
        // Stop existing loop if any
        if (this.drumLoop) {
            this.drumLoop.stop();
            this.drumLoop = null;
        }
        
        const pattern = this.drumPatterns[this.currentRhythmPattern];
        
        // Create a sequencer for each drum
        const kickSeq = new Tone.Sequence((time, note) => {
            if (note) this.drumKit.kick.triggerAttackRelease(note, '8n', time);
        }, pattern.kick, '8n').start(0);
        
        const snareSeq = new Tone.Sequence((time, note) => {
            if (note) this.drumKit.snare.triggerAttackRelease(note, '8n', time);
        }, pattern.snare, '8n').start(0);
        
        const hihatSeq = new Tone.Sequence((time, note) => {
            if (note) this.drumKit.hihat.triggerAttackRelease(note, '16n', time);
        }, pattern.hihat, '8n').start(0);
        
        this.drumLoop = {
            kick: kickSeq,
            snare: snareSeq,
            hihat: hihatSeq,
            stop: () => {
                kickSeq.stop();
                snareSeq.stop();
                hihatSeq.stop();
                kickSeq.dispose();
                snareSeq.dispose();
                hihatSeq.dispose();
            }
        };
    }

    // Play a note with beat synchronization
    playNote(note, duration = '8n', isRightSide = false, isLeftSide = false) {
        if (!this.isPlaying) return;
        
        // Get current transport time
        const now = Tone.Transport.seconds;
        
        // Check if enough time has passed since last beat
        if (now - this.lastBeatTime < this.beatInterval * 0.5) return;
        
        // Update last beat time
        this.lastBeatTime = now;
        
        // Prevent duplicate notes
        if (this.activeNotes.has(note)) return;
        this.activeNotes.add(note);
        
        // Select appropriate synth
        const synth = isRightSide ? this.glideSynth : 
                     isLeftSide ? this.bassSynth : 
                     this.synth;
        
        // Play the note
        synth.triggerAttackRelease(note, duration);
        
        // Remove from active notes after duration
        setTimeout(() => {
            this.activeNotes.delete(note);
        }, Tone.Time(duration).toSeconds() * 1000);
    }

    // Set synth parameters
    setTimbre(objectClass) {
        // Map object class to timbre
        let oscType = this.timbres[objectClass] || 'sine';
        
        // Update all voices in the polysynth
        this.synth.set({
            oscillator: {
                type: oscType
            }
        });
        
        return oscType;
    }

    // Set BPM and update beat interval
    setBPM(bpm) {
        this.beatInterval = 60 / bpm; // Convert BPM to seconds per beat
        Tone.Transport.bpm.value = bpm;
    }

    // Map Y coordinate to note (adjusted for better range)
    mapToNote(y) {
        const notes = this.scales[this.currentScale];
        // Use a smaller range of the scale for more musical results
        const index = Math.floor(y * (notes.length * 0.8));
        return notes[Math.min(index, notes.length - 1)];
    }

    // Map X coordinate to rhythm
    mapToRhythm(x) {
        const rhythms = this.rhythmPatterns[this.currentRhythmPattern];
        const index = Math.floor(x * rhythms.length);
        return rhythms[Math.min(index, rhythms.length - 1)];
    }

    // Create pattern based on object position
    createPattern(x, y, objectClass) {
        const note = this.mapToNote(y);
        const rhythm = this.mapToRhythm(x);
        const timbre = this.setTimbre(objectClass);
        
        // Determine if in left or right zone
        const isRightSide = x > 0.7; // Right 30% of screen
        const isLeftSide = x < 0.3;  // Left 30% of screen
        
        return { note, rhythm, timbre, isRightSide, isLeftSide };
    }

    // Generate music based on detected objects
    generateMusic(predictions) {
        if (predictions.length === 0 || !this.isPlaying) return;

        // Get the first detected object
        const object = predictions[0];
        const [x, y, width, height] = object.bbox;
        
        // Get canvas dimensions from the video element
        const canvasWidth = predictions[0].videoWidth || 640;
        const canvasHeight = predictions[0].videoHeight || 480;
        
        // Calculate normalized position (0-1)
        const normalizedX = x / canvasWidth;
        const normalizedY = 1 - (y / canvasHeight); // Invert Y so higher position = higher note
        
        // Create music pattern
        const pattern = this.createPattern(normalizedX, normalizedY, object.class);
        
        // Play the note with correct synth based on position
        this.playNote(pattern.note, pattern.rhythm, pattern.isRightSide, pattern.isLeftSide);
        
        return pattern;
    }

    // Set the current scale
    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
            return true;
        }
        return false;
    }

    // Set the current rhythm pattern and update drums
    setRhythmPattern(patternName) {
        if (this.rhythmPatterns[patternName]) {
            this.currentRhythmPattern = patternName;
            
            // Restart drum loop with new pattern
            if (this.isPlaying) {
                this.startDrumLoop();
            }
            
            return true;
        }
        return false;
    }
    
    // Set the master volume level
    setVolume(level) {
        // Convert 0-100 range to dB
        Tone.Destination.volume.value = Tone.gainToDb(level/100);
    }
}

export default AudioEngine;