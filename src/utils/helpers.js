/**
 * Helper utilities for the Interactive Music Generator
 */

// Format object detection results for display
export function formatDetectionResults(predictions) {
    if (!predictions || predictions.length === 0) {
        return 'No objects detected';
    }
    
    return predictions.map(prediction => {
        const { class: className, score } = prediction;
        const percentage = Math.round(score * 100);
        return `${className} (${percentage}%)`;
    }).join(', ');
}

// Normalize coordinates to 0-1 range
export function normalizeCoordinates(x, y, width, height) {
    return {
        x: x / width,
        y: y / height
    };
}

// Map a value from one range to another
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// Debounce function to limit execution rate
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Generate a color based on a string (for visualization)
export function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
}

// Save settings to localStorage
export function saveSettings(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Error saving settings', e);
        return false;
    }
}

// Load settings from localStorage
export function loadSettings(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
        console.error('Error loading settings', e);
        return defaultValue;
    }
}

// Format time in mm:ss
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}