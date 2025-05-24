// Debug UI Elements
console.log('=== UI Debug Information ===');

// Check if detection mode select exists
const detectionSelect = document.getElementById('detection-mode-select');
console.log('Detection Mode Select:', detectionSelect);

// Check if color ball info exists
const colorInfo = document.getElementById('color-ball-info');
console.log('Color Ball Info:', colorInfo);

// Check if object list exists
const objectList = document.getElementById('object-list');
console.log('Object List:', objectList);

// Check if control panel exists
const controlPanel = document.querySelector('.object-detection-panel');
console.log('Control Panel:', controlPanel);

// Check all controls elements
const allControlElements = document.querySelectorAll('.detection-controls *');
console.log('All control elements:', allControlElements);

// Check if controls are initialized
setTimeout(() => {
    console.log('=== After 2 seconds ===');
    console.log('Detection Mode Select:', document.getElementById('detection-mode-select'));
    console.log('Detection Mode Select Value:', document.getElementById('detection-mode-select')?.value);
}, 2000);
