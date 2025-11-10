// DOM Elements
const dropArea = document.getElementById('drop-area');
const fileElem = document.getElementById('fileElem');
const selectButton = document.getElementById('selectButton');
const loading = document.getElementById('loading');
const videoContainer = document.getElementById('videoContainer');
const dataSection = document.getElementById('dataSection');
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const jsonOutput = document.getElementById('jsonOutput');
const anglesDiv = document.getElementById('angles');
const mockWarning = document.getElementById('mockWarning');
const currentFrameSpan = document.getElementById('currentFrame');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const toggleOverlayBtn = document.getElementById('toggleOverlay');

// State
let analysisData = null;
let currentFrameIndex = 0;
let overlayVisible = true;

// Event Listeners
selectButton.addEventListener('click', () => fileElem.click());
fileElem.addEventListener('change', (e) => handleFiles(e.target.files));

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
});

dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);

// Video control listeners
playBtn.addEventListener('click', () => video.play());
pauseBtn.addEventListener('click', () => video.pause());
toggleOverlayBtn.addEventListener('click', () => {
    overlayVisible = !overlayVisible;
    if (!overlayVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        drawOverlay();
    }
});

video.addEventListener('timeupdate', () => {
    updateFrameIndex();
    if (overlayVisible) {
        drawOverlay();
    }
});

video.addEventListener('loadedmetadata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
});

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
    
    // Display video locally
    try {
        const videoURL = URL.createObjectURL(file);
        video.src = videoURL;
        console.log('Video preview created successfully');
    } catch (e) {
        console.error('Failed to create video preview:', e);
    }
    
    // Upload and analyze
    console.log('Starting upload process...');
    uploadVideo(file);
}

async function uploadVideo(file) {
    console.log('=== UPLOAD STARTED ===');
    console.log('Target endpoint: /upload');
    console.log('File to upload:', file.name, '(' + (file.size / 1024 / 1024).toFixed(2) + ' MB)');
    
    loading.style.display = 'block';
    videoContainer.style.display = 'none';
    dataSection.style.display = 'none';
    
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
        loading.style.display = 'none';
        console.log('=== UPLOAD PROCESS ENDED ===');
    }
}

function displayResults(data) {
    videoContainer.style.display = 'block';
    dataSection.style.display = 'block';
    
    // Show mock warning if applicable
    if (data.mock) {
        mockWarning.style.display = 'block';
    } else {
        mockWarning.style.display = 'none';
    }
    
    // Display JSON
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    
    // Display angles from first frame
    if (data.frames && data.frames.length > 0) {
        displayAngles(data.frames[0].angles);
    }
}

function displayAngles(angles) {
    if (!angles) {
        anglesDiv.innerHTML = '<p>No angle data available</p>';
        return;
    }
    
    anglesDiv.innerHTML = '';
    for (const [joint, angle] of Object.entries(angles)) {
        const div = document.createElement('div');
        div.className = 'angle-item';
        div.textContent = `${joint}: ${angle.toFixed(1)}°`;
        anglesDiv.appendChild(div);
    }
}

function updateFrameIndex() {
    if (!video.duration || !analysisData || !analysisData.frames) return;
    
    const fps = 30; // Assume 30 fps
    const totalFrames = analysisData.frames.length;
    const currentTime = video.currentTime;
    const frameIndex = Math.floor(currentTime * fps);
    
    currentFrameIndex = Math.min(frameIndex, totalFrames - 1);
    currentFrameSpan.textContent = currentFrameIndex;
    
    // Update angles display for current frame
    if (analysisData.frames[currentFrameIndex]) {
        displayAngles(analysisData.frames[currentFrameIndex].angles);
    }
}

function drawOverlay() {
    if (!analysisData || !analysisData.frames || currentFrameIndex >= analysisData.frames.length) {
        return;
    }
    
    const frame = analysisData.frames[currentFrameIndex];
    if (!frame || !frame.keypoints) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const keypoints = frame.keypoints;
    
    // Draw keypoints
    ctx.fillStyle = 'lime';
    keypoints.forEach(kp => {
        const x = kp.x * canvas.width;
        const y = kp.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = '12px Arial';
        ctx.strokeText(kp.name, x + 10, y - 10);
        ctx.fillText(kp.name, x + 10, y - 10);
        ctx.fillStyle = 'lime';
    });
    
    // Draw skeleton connections
    drawSkeleton(keypoints);
    
    // Draw angles
    if (frame.angles) {
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 16px Arial';
        let y = 30;
        for (const [joint, angle] of Object.entries(frame.angles)) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(`${joint}: ${angle.toFixed(1)}°`, 10, y);
            ctx.fillText(`${joint}: ${angle.toFixed(1)}°`, 10, y);
            y += 25;
        }
    }
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
    
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 3;
    
    connections.forEach(([start, end]) => {
        const startKp = kpMap[start];
        const endKp = kpMap[end];
        
        if (startKp && endKp) {
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
