// DOM Elements - Upload
const dropArea = document.getElementById('drop-area');
const fileElem = document.getElementById('fileElem');
const uploadSection = document.getElementById('uploadSection');
const videoSection = document.getElementById('videoSection');

// Video Elements
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas ? canvas.getContext('2d') : null;
const bboxCanvas = document.getElementById('bboxCanvas');
const bboxCtx = bboxCanvas ? bboxCanvas.getContext('2d') : null;

// Video Controls
const controlPlay = document.getElementById('playPauseBtn');
const seekBar = document.getElementById('seekBar');
const currentTimeSpan = document.getElementById('currentTime');
const totalTimeSpan = document.getElementById('duration');
const frameInfo = document.getElementById('currentFrame');
const framePrevBtn = document.getElementById('frameBackBtn');
const frameNextBtn = document.getElementById('frameForwardBtn');

// Analysis Controls
const analyzeVideoBtn = document.getElementById('analyze-video-btn');
const analyzeFrameBtn = document.getElementById('analyzeFrameBtn');
const selectAthleteBtn = document.getElementById('selectAthleteBtn');
const clearSelectionBtn = document.getElementById('clearBboxBtn');
const downloadSnapshotBtn = document.getElementById('downloadSnapshotBtn');

// Overlay Controls
const overlayOpacitySlider = document.getElementById('opacitySlider');
const opacityValueSpan = document.getElementById('opacityValue');
const keypointSizeSlider = document.getElementById('keypointSizeSlider');
const sizeValueSpan = document.getElementById('keypointSizeValue');
const lineWidthSlider = document.getElementById('lineWidthSlider');
const widthValueSpan = document.getElementById('lineWidthValue');
const showLabelsCheck = document.getElementById('showLabelsCheck');
const showAnglesCheck = document.getElementById('showAnglesCheck');
const showSkeletonCheck = document.getElementById('showSkeletonCheck');
const colorCodeCheck = document.getElementById('colorCodedCheck');

// Data Displays
const anglesDisplay = document.getElementById('anglesDisplay');
const frameHistory = document.getElementById('frameHistory');
const rawDataSection = document.getElementById('rawDataContent');
const rawDataHeader = document.getElementById('rawDataHeader');
const jsonOutput = document.getElementById('jsonOutput');

// State
let analysisData = null;
let currentFrameIndex = 0;
let overlayVisible = true;
let frameAnalysisMode = false;
let bboxSelectionMode = false;
let selectedBbox = null;
let bboxStart = null;
let frameHistoryData = [];
let isPlaying = false;

// Overlay Settings
let overlaySettings = {
    opacity: 0.8,
    keypointSize: 8,
    lineWidth: 3,
    showLabels: true,
    showAngles: true,
    showSkeleton: true,
    colorCode: true
};

// ===== INITIALIZATION =====

// Initialize button states on page load
if (analyzeFrameBtn) analyzeFrameBtn.disabled = true;
if (clearSelectionBtn) clearSelectionBtn.disabled = true;

// ===== EVENT LISTENERS =====

// Drag and drop handlers
if (dropArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);
    dropArea.addEventListener('click', () => fileElem.click());
}

// Select button in upload section
const selectButton = document.getElementById('selectButton');
if (selectButton && fileElem) {
    selectButton.addEventListener('click', () => fileElem.click());
}

if (fileElem) {
    fileElem.addEventListener('change', (e) => handleFiles(e.target.files));
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Video control listeners
if (controlPlay && video) {
    controlPlay.addEventListener('click', () => {
        if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
    });
}

if (video) {
    video.addEventListener('play', () => {
        isPlaying = true;
        if (controlPlay) controlPlay.innerHTML = '⏸';
    });

    video.addEventListener('pause', () => {
        isPlaying = false;
        if (controlPlay) controlPlay.innerHTML = '▶';
    });

    video.addEventListener('timeupdate', () => {
        updateVideoControls();
        if (overlayVisible && !frameAnalysisMode) {
            drawOverlay();
        }
    });

    video.addEventListener('loadedmetadata', () => {
        if (canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        if (bboxCanvas) {
            bboxCanvas.width = video.videoWidth;
            bboxCanvas.height = video.videoHeight;
        }
        updateVideoControls();
    });
}

if (seekBar && video) {
    seekBar.addEventListener('input', () => {
        const time = (seekBar.value / 100) * video.duration;
        video.currentTime = time;
    });
}

if (framePrevBtn && video) {
    framePrevBtn.addEventListener('click', () => {
        video.currentTime = Math.max(0, video.currentTime - (1 / 30));
    });
}

if (frameNextBtn && video) {
    frameNextBtn.addEventListener('click', () => {
        video.currentTime = Math.min(video.duration, video.currentTime + (1 / 30));
    });
}

// Analysis button listeners
if (analyzeVideoBtn) {
    analyzeVideoBtn.addEventListener('click', analyzeVideo);
}

if (analyzeFrameBtn) {
    analyzeFrameBtn.addEventListener('click', analyzeCurrentFrame);
}

if (selectAthleteBtn) {
    selectAthleteBtn.addEventListener('click', enableBboxSelection);
}

if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', clearBboxSelection);
}

if (downloadSnapshotBtn) {
    downloadSnapshotBtn.addEventListener('click', downloadSnapshot);
}

// Overlay control listeners
if (overlayOpacitySlider) {
    overlayOpacitySlider.addEventListener('input', (e) => {
        overlaySettings.opacity = parseFloat(e.target.value) / 100; // Convert 0-100 to 0-1
        if (opacityValueSpan) opacityValueSpan.textContent = e.target.value + '%';
        drawOverlay();
    });
}

if (keypointSizeSlider) {
    keypointSizeSlider.addEventListener('input', (e) => {
        overlaySettings.keypointSize = parseInt(e.target.value);
        if (sizeValueSpan) sizeValueSpan.textContent = overlaySettings.keypointSize + 'px';
        drawOverlay();
    });
}

if (lineWidthSlider) {
    lineWidthSlider.addEventListener('input', (e) => {
        overlaySettings.lineWidth = parseInt(e.target.value);
        if (widthValueSpan) widthValueSpan.textContent = overlaySettings.lineWidth + 'px';
        drawOverlay();
    });
}

if (showLabelsCheck) {
    showLabelsCheck.addEventListener('change', (e) => {
        overlaySettings.showLabels = e.target.checked;
        drawOverlay();
    });
}

if (showAnglesCheck) {
    showAnglesCheck.addEventListener('change', (e) => {
        overlaySettings.showAngles = e.target.checked;
        drawOverlay();
    });
}

if (showSkeletonCheck) {
    showSkeletonCheck.addEventListener('change', (e) => {
        overlaySettings.showSkeleton = e.target.checked;
        drawOverlay();
    });
}

if (colorCodeCheck) {
    colorCodeCheck.addEventListener('change', (e) => {
        overlaySettings.colorCode = e.target.checked;
        drawOverlay();
    });
}

// Raw data collapsible section
if (rawDataHeader && rawDataSection) {
    rawDataHeader.addEventListener('click', () => {
        rawDataSection.classList.toggle('collapsed');
        rawDataHeader.classList.toggle('expanded');
    });
}

// Bbox canvas listeners (for athlete selection)
if (bboxCanvas) {
    bboxCanvas.addEventListener('mousedown', onBboxMouseDown);
    bboxCanvas.addEventListener('mousemove', onBboxMouseMove);
    bboxCanvas.addEventListener('mouseup', onBboxMouseUp);
}


// File handling
function handleFiles(files) {
    console.log('=== FILE SELECTION ===');
    console.log('Files received:', files);
    
    if (!files || files.length === 0) {
        console.warn('No files selected');
        return;
    }
    
    const file = files[0];
    console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
    });
    
    if (!file.type.startsWith('video/')) {
        const errorMsg = `Invalid file type: ${file.type}. Please select a video file (MP4, MOV, AVI, etc.)`;
        console.error(errorMsg);
        alert(errorMsg);
        return;
    }
    
    console.log('File validation passed. Creating local video preview...');
    
    // Show video section and hide upload section
    if (uploadSection) uploadSection.style.display = 'none';
    if (videoSection) videoSection.style.display = 'block';
    
    // Display video locally
    try {
        if (video) {
            const videoURL = URL.createObjectURL(file);
            video.src = videoURL;
            console.log('Video preview created successfully');
            
            // Enable analyze frame button once video is loaded (without bbox)
            video.addEventListener('loadeddata', () => {
                if (analyzeFrameBtn) analyzeFrameBtn.disabled = false;
                showToast('Video Loaded', 'Pause at any frame and click "Analyze Current Frame"', 'success');
            }, { once: true });
        }
    } catch (e) {
        console.error('Failed to create video preview:', e);
    }
    
    console.log('Video loaded. Use frame controls to analyze specific frames.');
}

async function uploadVideo(file) {
    console.log('=== UPLOAD STARTED ===');
    console.log('Target endpoint: /upload');
    console.log('File to upload:', file.name, '(' + (file.size / 1024 / 1024).toFixed(2) + ' MB)');
    
    // Show loading toast
    showToast('Uploading', 'Analyzing video with AI...', 'info');
    
    // Disable analyze button during upload
    if (analyzeVideoBtn) analyzeVideoBtn.disabled = true;
    
    const formData = new FormData();
    formData.append('file', file);
    console.log('FormData created with file attached');
    
    const startTime = Date.now();
    
    try {
        console.log('Sending POST request to /upload...');
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Response received after ${elapsed}s`);
        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            // Try to get error details from response body
            let errorDetails = '';
            try {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                errorDetails = errorText;
            } catch (e) {
                console.error('Could not read error response body:', e);
            }
            
            throw new Error(`Upload failed (${response.status} ${response.statusText}): ${errorDetails || 'No additional details'}`);
        }
        
        console.log('Parsing JSON response...');
        const data = await response.json();
        console.log('JSON parsed successfully:', data);
        
        analysisData = data;
        
        console.log('=== UPLOAD SUCCESSFUL ===');
        console.log('Frames analyzed:', data.frames ? data.frames.length : 0);
        console.log('Mock data:', data.mock || false);
        
        displayResults(data);
        
    } catch (error) {
        console.error('=== UPLOAD FAILED ===');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Check for specific error types
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('Network error - server may be unreachable');
            alert('Failed to connect to server. Is the Spring Boot app running on port 8080?\n\nError: ' + error.message);
        } else if (error.message.includes('413')) {
            alert('File too large. Try a smaller video or adjust server upload limits.\n\nError: ' + error.message);
        } else if (error.message.includes('415')) {
            alert('Unsupported file type. Try converting your video to MP4.\n\nError: ' + error.message);
        } else {
            alert('Failed to upload video:\n\n' + error.message + '\n\nCheck browser console (F12) for details.');
        }
    } finally {
        // Re-enable analyze button
        if (analyzeVideoBtn) analyzeVideoBtn.disabled = false;
        console.log('=== UPLOAD PROCESS ENDED ===');
    }
}

function displayResults(data) {
    if (uploadSection) uploadSection.style.display = 'none';
    if (videoSection) videoSection.style.display = 'block';
    
    // Display JSON
    if (jsonOutput) jsonOutput.textContent = JSON.stringify(data, null, 2);
    
    // Display angles from first frame
    if (data.frames && data.frames.length > 0) {
        displayAngles(data.frames[0].angles);
    }
    
    if (data.mock) {
        showToast('Mock Data', 'MediaPipe not available - using mock data', 'warning');
    } else {
        showToast('Success', `Analyzed ${data.frames.length} frames`, 'success');
    }
}

function displayAngles(angles) {
    console.log('displayAngles called with:', {
        anglesDisplayExists: !!anglesDisplay,
        angles: angles,
        angleCount: angles ? Object.keys(angles).length : 0
    });
    
    if (!anglesDisplay) {
        console.warn('anglesDisplay element not found');
        return;
    }
    
    if (!angles || Object.keys(angles).length === 0) {
        anglesDisplay.innerHTML = '<div class="placeholder-text">No angle data available</div>';
        return;
    }
    
    anglesDisplay.innerHTML = '';
    for (const [joint, angle] of Object.entries(angles)) {
        const div = document.createElement('div');
        div.className = 'angle-item';
        div.innerHTML = `
            <span class="angle-name">${joint.replace('_', ' ')}</span>
            <span class="angle-value">${angle.toFixed(1)}°</span>
        `;
        anglesDisplay.appendChild(div);
    }
    console.log(`Added ${Object.keys(angles).length} angles to display`);
}

function analyzeVideo() {
    // Trigger full video analysis
    // This will upload the entire video to Flask for processing
    if (!video || !video.src) {
        showToast('Error', 'No video loaded', 'error');
        return;
    }
    
    // Get the original file from the file input
    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('Error', 'Video file not found. Please reload the video.', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    uploadVideo(file);
}

function updateFrameIndex() {
    if (!video.duration || !analysisData || !analysisData.frames) return;
    
    const fps = 30; // Assume 30 fps
    const totalFrames = analysisData.frames.length;
    const currentTime = video.currentTime;
    const frameIndex = Math.floor(currentTime * fps);
    
    currentFrameIndex = Math.min(frameIndex, totalFrames - 1);
    
    // Update angles display for current frame
    if (analysisData.frames[currentFrameIndex]) {
        displayAngles(analysisData.frames[currentFrameIndex].angles);
    }
}

function drawOverlay() {
    if (!ctx || !canvas) return;
    
    if (!analysisData || !analysisData.frames || currentFrameIndex >= analysisData.frames.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    const frame = analysisData.frames[currentFrameIndex];
    if (!frame || !frame.keypoints) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = overlaySettings.opacity;
    
    const keypoints = frame.keypoints;
    
    // Draw skeleton first (if enabled)
    if (overlaySettings.showSkeleton) {
        drawSkeleton(keypoints);
    }
    
    // Draw keypoints
    keypoints.forEach(kp => {
        const x = kp.x * canvas.width;
        const y = kp.y * canvas.height;
        
        // Color code by side if enabled
        let color = 'lime';
        if (overlaySettings.colorCode) {
            if (kp.name.includes('left')) {
                color = '#3b82f6'; // Blue for left side
            } else if (kp.name.includes('right')) {
                color = '#ef4444'; // Red for right side
            }
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, overlaySettings.keypointSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label if enabled
        if (overlaySettings.showLabels) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.font = '12px Arial';
            ctx.strokeText(kp.name, x + 10, y - 10);
            ctx.fillText(kp.name, x + 10, y - 10);
        }
    });
    
    // Draw angles if enabled
    if (overlaySettings.showAngles && frame.angles) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.font = 'bold 14px Arial';
        
        let y = 30;
        for (const [joint, angle] of Object.entries(frame.angles)) {
            const text = `${joint}: ${angle.toFixed(1)}°`;
            const metrics = ctx.measureText(text);
            const padding = 8;
            
            // Draw background
            ctx.fillRect(5, y - 18, metrics.width + padding * 2, 24);
            
            // Draw text
            ctx.fillStyle = '#fbbf24'; // Yellow
            ctx.fillText(text, 5 + padding, y);
            
            y += 28;
        }
    }
    
    ctx.globalAlpha = 1.0;
}

function drawSkeleton(keypoints) {
    const connections = [
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'],
        ['right_knee', 'right_ankle']
    ];
    
    const kpMap = {};
    keypoints.forEach(kp => {
        kpMap[kp.name] = kp;
    });
    
    ctx.lineWidth = overlaySettings.lineWidth;
    
    connections.forEach(([point1, point2]) => {
        const kp1 = kpMap[point1];
        const kp2 = kpMap[point2];
        
        if (kp1 && kp2) {
            // Color code by side if enabled
            if (overlaySettings.colorCode) {
                if (point1.includes('left') || point2.includes('left')) {
                    ctx.strokeStyle = '#3b82f6'; // Blue for left side
                } else if (point1.includes('right') || point2.includes('right')) {
                    ctx.strokeStyle = '#ef4444'; // Red for right side
                } else {
                    ctx.strokeStyle = '#06b6d4'; // Cyan for center
                }
            } else {
                ctx.strokeStyle = '#06b6d4'; // Default cyan
            }
            
            ctx.beginPath();
            ctx.moveTo(kp1.x * canvas.width, kp1.y * canvas.height);
            ctx.lineTo(kp2.x * canvas.width, kp2.y * canvas.height);
            ctx.stroke();
        }
    });
}

// ===== HELPER FUNCTIONS =====

function updateVideoControls() {
    if (!video || !video.duration) return;
    
    // Update seek bar
    const progress = (video.currentTime / video.duration) * 100;
    if (seekBar) seekBar.value = progress;
    
    // Update time display
    if (currentTimeSpan) currentTimeSpan.textContent = formatTime(video.currentTime);
    if (totalTimeSpan) totalTimeSpan.textContent = formatTime(video.duration);
    
    // Update frame info
    const fps = 30; // Assuming 30fps
    const currentFrame = Math.floor(video.currentTime * fps);
    const totalFrames = Math.floor(video.duration * fps);
    if (frameInfo) frameInfo.textContent = currentFrame; // Just the number, HTML has "Frame: " already
    currentFrameIndex = currentFrame;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function downloadSnapshot() {
    if (!video || !canvas) {
        showToast('Error', 'Video not loaded', 'error');
        return;
    }
    
    // Create a temporary canvas combining video frame and overlay
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    
    // Draw video frame
    tempCtx.drawImage(video, 0, 0);
    
    // Draw overlay if visible
    if (overlayVisible && analysisData) {
        tempCtx.globalAlpha = overlaySettings.opacity;
        tempCtx.drawImage(canvas, 0, 0);
        tempCtx.globalAlpha = 1.0;
    }
    
    // Convert to blob and download
    tempCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gym-analysis-frame-${currentFrameIndex}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Success', 'Snapshot downloaded', 'success');
    }, 'image/png');
}

function addToFrameHistory(frameData) {
    console.log('addToFrameHistory called with:', {
        hasFrameData: !!frameData,
        currentFrame: currentFrameIndex,
        videoTime: video ? video.currentTime : 'no video',
        canvasExists: !!canvas,
        historyLength: frameHistoryData.length
    });
    
    if (!frameData) {
        console.warn('No frameData provided to addToFrameHistory');
        return;
    }
    
    frameHistoryData.push({
        frameNum: currentFrameIndex,
        timestamp: video.currentTime,
        data: frameData,
        thumbnail: canvas.toDataURL('image/jpeg', 0.5)
    });
    
    console.log(`Added frame to history. Total frames: ${frameHistoryData.length}`);
    renderFrameHistory();
}

function renderFrameHistory() {
    console.log('renderFrameHistory called:', {
        frameHistoryExists: !!frameHistory,
        historyDataLength: frameHistoryData.length
    });
    
    if (!frameHistory) {
        console.warn('frameHistory element not found');
        return;
    }
    
    frameHistory.innerHTML = '';
    
    if (frameHistoryData.length === 0) {
        frameHistory.innerHTML = '<div class="placeholder-text">No frames analyzed yet</div>';
        return;
    }
    
    console.log(`Rendering ${frameHistoryData.length} history items`);
    
    frameHistoryData.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        if (item.frameNum === currentFrameIndex) {
            historyItem.classList.add('active');
        }
        
        historyItem.innerHTML = `
            <img src="${item.thumbnail}" class="history-thumbnail" alt="Frame ${item.frameNum}">
            <span class="history-frame-num">${item.frameNum}</span>
        `;
        
        historyItem.addEventListener('click', () => {
            video.currentTime = item.timestamp;
            analysisData = item.data;
            drawOverlay();
        });
        
        frameHistory.appendChild(historyItem);
    });
}

// ===== FRAME-BY-FRAME ANALYSIS =====

bboxCanvas.addEventListener('mousedown', onBboxMouseDown);
bboxCanvas.addEventListener('mousemove', onBboxMouseMove);
bboxCanvas.addEventListener('mouseup', onBboxMouseUp);

function enableBboxSelection() {
    if (!bboxCanvas || !video) return;
    
    bboxSelectionMode = true;
    video.pause();
    bboxCanvas.style.cursor = 'crosshair';
    showToast('Selection Mode', 'Click and drag to select athlete region', 'info');
    if (selectAthleteBtn) selectAthleteBtn.disabled = true;
    if (analyzeFrameBtn) analyzeFrameBtn.disabled = true; // Disable until bbox is drawn
    if (clearSelectionBtn) clearSelectionBtn.disabled = true; // Disable until bbox is drawn
}

function clearBboxSelection() {
    if (!bboxCanvas || !bboxCtx) return;
    
    selectedBbox = null;
    bboxStart = null;
    bboxSelectionMode = false;
    bboxCanvas.style.cursor = 'default';
    bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height);
    
    // Re-enable select athlete button so user can select another region
    if (selectAthleteBtn) selectAthleteBtn.disabled = false;
    
    // Disable analyze and clear buttons until new bbox is drawn
    if (analyzeFrameBtn) analyzeFrameBtn.disabled = true;
    if (clearSelectionBtn) clearSelectionBtn.disabled = true;
    
    showToast('Selection Cleared', 'Draw a new region or analyze without selection', 'info');
}

function onBboxMouseDown(e) {
    if (!bboxSelectionMode) return;
    
    const rect = bboxCanvas.getBoundingClientRect();
    const scaleX = bboxCanvas.width / rect.width;
    const scaleY = bboxCanvas.height / rect.height;
    
    bboxStart = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function onBboxMouseMove(e) {
    if (!bboxSelectionMode || !bboxStart) return;
    
    const rect = bboxCanvas.getBoundingClientRect();
    const scaleX = bboxCanvas.width / rect.width;
    const scaleY = bboxCanvas.height / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    // Draw temporary bbox with solid line (changed from dashed)
    bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height);
    bboxCtx.strokeStyle = 'lime';
    bboxCtx.lineWidth = 3;
    bboxCtx.setLineDash([]); // Solid line instead of dashed
    bboxCtx.strokeRect(
        bboxStart.x,
        bboxStart.y,
        currentX - bboxStart.x,
        currentY - bboxStart.y
    );
}

function onBboxMouseUp(e) {
    if (!bboxSelectionMode || !bboxStart) return;
    
    const rect = bboxCanvas.getBoundingClientRect();
    const scaleX = bboxCanvas.width / rect.width;
    const scaleY = bboxCanvas.height / rect.height;
    
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;
    
    // Normalize bbox (handle reverse drag)
    const x = Math.min(bboxStart.x, endX);
    const y = Math.min(bboxStart.y, endY);
    const width = Math.abs(endX - bboxStart.x);
    const height = Math.abs(endY - bboxStart.y);
    
    if (width > 20 && height > 20) {  // Minimum size
        selectedBbox = { x, y, width, height };
        
        // Draw final bbox with solid line
        bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height);
        bboxCtx.strokeStyle = 'lime';
        bboxCtx.lineWidth = 3;
        bboxCtx.setLineDash([]); // Solid line
        bboxCtx.strokeRect(x, y, width, height);
        
        // Exit selection mode
        bboxSelectionMode = false;
        bboxCanvas.style.cursor = 'default';
        
        // Enable analyze and clear buttons
        if (analyzeFrameBtn) analyzeFrameBtn.disabled = false;
        if (clearSelectionBtn) clearSelectionBtn.disabled = false;
        
        // Re-enable select athlete button
        if (selectAthleteBtn) selectAthleteBtn.disabled = false;
        
        // Show success message
        showToast('Athlete Selected', 'Region selected. Click "Analyze Current Frame" to analyze.', 'success');
    } else {
        // Selection too small, cancel
        bboxSelectionMode = false;
        bboxCanvas.style.cursor = 'default';
        if (selectAthleteBtn) selectAthleteBtn.disabled = false;
        showToast('Selection Too Small', 'Please draw a larger region', 'warning');
    }
    
    bboxStart = null;
}

async function analyzeCurrentFrame() {
    console.log('=== ANALYZE CURRENT FRAME ===');
    
    if (!video || !canvas) {
        showToast('Error', 'Video not loaded', 'error');
        return;
    }
    
    video.pause();
    
    showToast('Analyzing', 'Capturing and analyzing frame...', 'info');
    if (analyzeFrameBtn) analyzeFrameBtn.disabled = true;
    
    try {
        // Capture current video frame to canvas at full resolution
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        console.log(`Frame captured: ${tempCanvas.width}x${tempCanvas.height}`);
        
        // Convert to blob
        const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg', 0.95));
        console.log(`Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg');
        
        // Add bounding box if selected (convert to normalized coordinates)
        if (selectedBbox) {
            const bbox = {
                x: selectedBbox.x / canvas.width,
                y: selectedBbox.y / canvas.height,
                width: selectedBbox.width / canvas.width,
                height: selectedBbox.height / canvas.height
            };
            formData.append('bbox_x', bbox.x);
            formData.append('bbox_y', bbox.y);
            formData.append('bbox_width', bbox.width);
            formData.append('bbox_height', bbox.height);
            console.log('Bounding box (normalized):', bbox);
        }
        
        console.log('Sending frame to Flask API for MediaPipe analysis...');
        
        // Send to Flask API directly
        const FLASK_API_URL = 'http://localhost:5000/analyze_frame';
        const response = await fetch(FLASK_API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Analysis failed (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Frame analysis result:', data);
        console.log('Data structure check:', {
            hasKeypoints: !!data.keypoints,
            keypointCount: data.keypoints ? data.keypoints.length : 0,
            hasAngles: !!data.angles,
            frameSize: `${data.frame_width}x${data.frame_height}`,
            bboxApplied: data.bbox_applied
        });
        
        // Check if we have valid data
        if (!data.keypoints || data.keypoints.length === 0) {
            console.warn('No keypoints found in response');
            showToast('Warning', 'No pose detected in frame', 'warning');
            if (analyzeFrameBtn) analyzeFrameBtn.disabled = false;
            return;
        }
        
        console.log(`Found ${data.keypoints.length} keypoints`);
        
        // Switch to frame analysis mode
        frameAnalysisMode = true;
        
        // Store frame dimensions for proper scaling
        data.frame_width = data.frame_width || video.videoWidth;
        data.frame_height = data.frame_height || video.videoHeight;
        
        // Draw keypoints with proper scaling
        drawFrameAnalysisOverlay(data);
        
        // Update data display
        displayAngles(data.angles || {});
        if (jsonOutput) jsonOutput.textContent = JSON.stringify(data, null, 2);
        
        // Add to frame history
        addToFrameHistory(data);
        
        showToast('Success', 'Frame analyzed successfully', 'success');
        
        // Re-enable the analyze button so user can analyze more frames
        if (analyzeFrameBtn) analyzeFrameBtn.disabled = false;
        
    } catch (error) {
        console.error('Frame analysis error:', error);
        
        // Check if Flask API is unavailable
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showToast('Error', 'Cannot connect to Flask API. Make sure it\'s running on http://localhost:5000', 'error');
        } else {
            showToast('Error', 'Analysis failed: ' + error.message, 'error');
        }
        
        // Re-enable buttons on error so user can try again
        if (analyzeFrameBtn) analyzeFrameBtn.disabled = false;
    }
}

function drawFrameAnalysisOverlay(data) {
    console.log('drawFrameAnalysisOverlay called with:', {
        hasData: !!data,
        hasKeypoints: !!(data && data.keypoints),
        keypointCount: data && data.keypoints ? data.keypoints.length : 0,
        canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'null',
        ctxExists: !!ctx,
        opacity: overlaySettings.opacity
    });
    
    if (!ctx || !canvas) {
        console.error('Canvas or context not available');
        return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!data.keypoints || data.keypoints.length === 0) {
        console.warn('No keypoints in frame analysis result');
        return;
    }
    
    ctx.globalAlpha = overlaySettings.opacity;
    
    const keypoints = data.keypoints;
    
    console.log(`Drawing ${keypoints.length} keypoints on ${canvas.width}x${canvas.height} canvas`);
    console.log('First keypoint:', keypoints[0]);

    
    // Create keypoint map
    const kpMap = {};
    keypoints.forEach(kp => {
        kpMap[kp.name] = kp;
    });
    
    // Draw skeleton connections first (if enabled)
    if (overlaySettings.showSkeleton) {
        const connections = [
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_elbow'],
            ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'],
            ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'],
            ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle']
        ];
        
        ctx.lineWidth = overlaySettings.lineWidth;
        
        connections.forEach(([start, end]) => {
            const startKp = kpMap[start];
            const endKp = kpMap[end];
            
            if (startKp && endKp) {
                // Color code by side if enabled
                if (overlaySettings.colorCode) {
                    if (start.includes('left') || end.includes('left')) {
                        ctx.strokeStyle = '#3b82f6';
                    } else if (start.includes('right') || end.includes('right')) {
                        ctx.strokeStyle = '#ef4444';
                    } else {
                        ctx.strokeStyle = '#06b6d4';
                    }
                } else {
                    ctx.strokeStyle = '#06b6d4';
                }
                
                const x1 = startKp.x * canvas.width;
                const y1 = startKp.y * canvas.height;
                const x2 = endKp.x * canvas.width;
                const y2 = endKp.y * canvas.height;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

            }
        });
    }
    
    // Draw keypoints
    keypoints.forEach(kp => {
        const x = kp.x * canvas.width;
        const y = kp.y * canvas.height;
        
        // Color code by side if enabled
        let color = 'lime';
        if (overlaySettings.colorCode) {
            if (kp.name.includes('left')) {
                color = '#3b82f6';
            } else if (kp.name.includes('right')) {
                color = '#ef4444';
            }
        }
        
        // Draw circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, overlaySettings.keypointSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label with background (if enabled)
        if (overlaySettings.showLabels) {
            ctx.font = 'bold 12px Arial';
            const label = kp.name.replace('_', ' ');
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x + 10, y - 20, textWidth + 8, 18);
            
            ctx.fillStyle = 'white';
            ctx.fillText(label, x + 14, y - 6);
        }
    });
    
    // Draw angles (if enabled)
    if (overlaySettings.showAngles && data.angles) {
        ctx.font = 'bold 14px Arial';
        
        let yPos = 30;
        for (const [joint, angle] of Object.entries(data.angles)) {
            const text = `${joint}: ${angle.toFixed(1)}°`;
            const metrics = ctx.measureText(text);
            const padding = 8;
            
            // Draw background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(5, yPos - 18, metrics.width + padding * 2, 24);
            
            // Draw text
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(text, 5 + padding, yPos);
            
            yPos += 28;
        }
    }
    
    ctx.globalAlpha = 1.0;
}

function updateFrameIndex() {
    if (!video.duration) return;
    
    const fps = 30;
    const currentTime = video.currentTime;
    const frameIndex = Math.floor(currentTime * fps);
    
    currentFrameIndex = frameIndex;
    currentFrameSpan.textContent = currentFrameIndex;
    currentTimeSpan.textContent = currentTime.toFixed(2);
}
