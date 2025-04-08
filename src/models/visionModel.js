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
    }

    async loadModel() {
        try {
            this.model = await cocoSsd.load();
            this.isLoaded = true;
            return true;
        } catch (error) {
            console.error('Error loading vision model:', error);
            return false;
        }
    }

    isModelLoaded() {
        return this.isLoaded;
    }

    setRunningState(state) {
        this.isRunning = state;
    }

    async detectObjects(videoElement) {
        if (!this.isLoaded || !this.isRunning) return [];
        
        // Run detection
        const predictions = await this.model.detect(videoElement);

        // Filter for objects we're interested in
        const filteredPredictions = predictions.filter(prediction => 
            this.objectsToDetect.includes(prediction.class)
        );

        // Sort by confidence
        filteredPredictions.sort((a, b) => b.score - a.score);
        
        this.latestPredictions = filteredPredictions;
        return filteredPredictions;
    }
    
    getLatestPredictions() {
        return this.latestPredictions;
    }
    
    // Add objects to detect
    addObjectClass(className) {
        if (!this.objectsToDetect.includes(className)) {
            this.objectsToDetect.push(className);
            return true;
        }
        return false;
    }
    
    // Remove objects from detection list
    removeObjectClass(className) {
        const index = this.objectsToDetect.indexOf(className);
        if (index !== -1) {
            this.objectsToDetect.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // Get list of objects to detect
    getObjectsToDetect() {
        return [...this.objectsToDetect];
    }
}

export default VisionModel;