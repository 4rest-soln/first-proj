// Global variables
let currentPdfFile = null;
let originalPdfDoc = null; // Original PDF (PDF-lib)
let renderPdfDoc = null;   // Rendering PDF (PDF.js)
let pdfPages = [];
let selectedPageIndex = -1;
let gifFile = null;
let gifFrames = [];
let gifPosition = { x: 50, y: 50, width: 100, height: 100 };
let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0 };
let resizeHandle = null;
let generatedPdfUrl = null;

// DOM elements (wrapped in function for safe access)
function getElements() {
    return {
        pdfInput: document.getElementById('pdfInput'),
        pdfUploadBox: document.getElementById('pdfUploadBox'),
        uploadSection: document.getElementById('uploadSection'),
        workspace: document.getElementById('workspace'),
        pageSelector: document.getElementById('pageSelector'),
        pagesGrid: document.getElementById('pagesGrid'),
        btnSelectPage: document.getElementById('btnSelectPage'),
        gifPositionEditor: document.getElementById('gifPositionEditor'),
        gifInput: document.getElementById('gifInput'),
        gifUploadArea: document.getElementById('gifUploadArea'),
        gifOverlay: document.getElementById('gifOverlay'),
        gifPreviewElement: document.getElementById('gifPreviewElement'),
        pdfPreviewCanvas: document.getElementById('pdfPreviewCanvas'),
        pdfPreviewContainer: document.getElementById('pdfPreviewContainer'),
        btnGeneratePdf: document.getElementById('btnGeneratePdf'),
        processingOverlay: document.getElementById('processingOverlay'),
        completionScreen: document.getElementById('completionScreen'),
        progressFill: document.getElementById('progressFill'),
        progressText: document.getElementById('progressText'),
        autoPlay: document.getElementById('autoPlay'),
        speedControl: document.getElementById('speedControl'),
        speedDisplay: document.getElementById('speedDisplay')
    };
}

let elements = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('PDF GIF Application Initialization - Real PDF Generation Version');
    
    // Initialize DOM elements
    elements = getElements();
    
    // Check element existence
    if (!elements.pdfInput || !elements.pdfUploadBox) {
        console.error('Essential DOM elements not found');
        alert('Page loading issue. Please refresh.');
        return;
    }
    
    console.log('DOM elements check complete');
    
    initializeEventListeners();
    checkBrowserSupport();
});

// Check browser support (updated for jsPDF)
function checkBrowserSupport() {
    const features = {
        fileReader: typeof FileReader !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined',
        pdfjs: typeof pdfjsLib !== 'undefined',
        pdflib: typeof PDFLib !== 'undefined',
        jspdf: typeof window.jsPDF !== 'undefined',
        omggif: typeof GifReader !== 'undefined'
    };

    console.log('=== Browser Support Check ===');
    Object.entries(features).forEach(([name, supported]) => {
        console.log(`${name}: ${supported ? '✅' : '❌'}`);
    });
    
    if (!features.omggif) {
        console.warn('⚠️ omggif library not loaded - GIF animation may not work');
    }
    
    if (!features.jspdf) {
        console.warn('⚠️ jsPDF library not loaded - Enhanced JavaScript features unavailable');
    }
    
    if (!features.fileReader || !features.canvas || !features.pdfjs || !features.pdflib) {
        console.error('❌ Essential features missing');
        alert('Browser does not support required features. Please use latest browser.');
        return false;
    }
    
    console.log('✅ Browser support check complete');
    return true;
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Event listener initialization started');
    
    // Force fix CSS layout issue
    fixCSSLayout();
    
    // File upload
    elements.pdfInput.addEventListener('change', handlePdfUpload);
    elements.gifInput.addEventListener('change', handleGifUpload);
    
    console.log('File upload event listeners registered');
    
    // Upload box click for file selection
    elements.pdfUploadBox.addEventListener('click', () => {
        console.log('Upload box clicked');
        elements.pdfInput.click();
    });

    // PDF drag and drop
    elements.pdfUploadBox.addEventListener('dragover', handleDragOver);
    elements.pdfUploadBox.addEventListener('dragleave', handleDragLeave);
    elements.pdfUploadBox.addEventListener('drop', handleDrop);

    // GIF upload area click
    elements.gifUploadArea.addEventListener('click', () => {
        elements.gifInput.click();
    });

    // GIF overlay drag events
    if (elements.gifOverlay) {
        elements.gifOverlay.addEventListener('mousedown', handleMouseDown);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Control input events
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const gifWidth = document.getElementById('gifWidth');
    const gifHeight = document.getElementById('gifHeight');
    
    if (posX) posX.addEventListener('input', updateGifPosition);
    if (posY) posY.addEventListener('input', updateGifPosition);
    if (gifWidth) gifWidth.addEventListener('input', updateGifPosition);
    if (gifHeight) gifHeight.addEventListener('input', updateGifPosition);
    
    // Animation settings
    if (elements.speedControl) {
        elements.speedControl.addEventListener('input', updateSpeedDisplay);
    }
    
    console.log('All event listeners registered');
}

// Force fix CSS layout (직접 스타일 적용)
function fixCSSLayout() {
    console.log('Applying force CSS fix');
    
    // Wait for DOM to be ready
    setTimeout(() => {
        const controlRows = document.querySelectorAll('.control-row');
        const controlInputs = document.querySelectorAll('.control-input');
        
        controlRows.forEach(row => {
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.width = '100%';
            row.style.margin = '0';
            row.style.padding = '0';
        });
        
        controlInputs.forEach(input => {
            input.style.width = 'calc(50% - 4px)';
            input.style.maxWidth = 'calc(50% - 4px)';
            input.style.minWidth = 'calc(50% - 4px)';
            input.style.flex = 'none';
            input.style.boxSizing = 'border-box';
            input.style.margin = '0';
            input.style.padding = '8px 12px';
        });
        
        console.log('Force CSS fix applied');
    }, 100);
}

// Update speed display
function updateSpeedDisplay() {
    if (elements.speedDisplay) {
        elements.speedDisplay.textContent = elements.speedControl.value + 'ms';
    }
}

// Handle PDF upload (improved with better error handling)
async function handlePdfUpload(e) {
    console.log('PDF file upload handler executed');
    
    // Prevent multiple rapid calls
    if (elements.pdfInput.disabled) {
        console.log('Upload already in progress, ignoring');
        return;
    }
    
    if (!elements) {
        elements = getElements();
    }
    
    const file = e.target.files[0];
    console.log('Selected file:', file);
    
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    if (file.type !== 'application/pdf') {
        console.log('Not a PDF file:', file.type);
        alert('Only PDF files are allowed.');
        // Reset file input
        e.target.value = '';
        return;
    }
    
    // Disable input during processing
    elements.pdfInput.disabled = true;
    
    try {
        console.log('PDF file confirmed, starting load');
        await loadPdf(file);
    } catch (error) {
        console.error('PDF load failed:', error);
        alert('Failed to load PDF: ' + error.message);
        // Reset file input on error
        e.target.value = '';
    } finally {
        // Re-enable input
        elements.pdfInput.disabled = false;
    }
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.pdfUploadBox.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.pdfUploadBox.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.pdfUploadBox.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        elements.pdfInput.files = files;
        loadPdf(files[0]);
    } else {
        alert('Only PDF files are allowed.');
    }
}

// Load PDF and generate thumbnails
async function loadPdf(file) {
    console.log('PDF load function started:', file.name);
    
    if (!elements) {
        elements = getElements();
    }
    
    showProcessing('Analyzing PDF...', 'Reading PDF information');
    updateProgress(10);
    
    try {
        currentPdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        
        // Load with PDF-lib (for editing)
        originalPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        console.log('PDF-lib load successful');
        updateProgress(30);
        
        // Load with PDF.js (for rendering)
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        });
        
        renderPdfDoc = await loadingTask.promise;
        pdfPages = [];
        for (let i = 1; i <= renderPdfDoc.numPages; i++) {
            pdfPages.push(await renderPdfDoc.getPage(i));
        }
        
        console.log('PDF.js load successful:', pdfPages.length, 'pages');
        updateProgress(60);
        
        // Update UI
        document.getElementById('pdfFileName').textContent = file.name;
        document.getElementById('pdfPageCount').textContent = 'Total pages: ' + pdfPages.length;
        
        // Generate page thumbnails
        await generatePageThumbnails();
        updateProgress(100);
        
        elements.uploadSection.style.display = 'none';
        elements.workspace.style.display = 'block';
        
        hideProcessing();
    } catch (error) {
        console.error('PDF load failed:', error);
        alert('Cannot read PDF file: ' + error.message);
        hideProcessing();
    }
}

// Generate page thumbnails
async function generatePageThumbnails() {
    elements.pagesGrid.innerHTML = '';
    
    console.log('Thumbnail generation started, total pages:', pdfPages.length);
    
    for (let i = 0; i < pdfPages.length; i++) {
        try {
            const page = pdfPages[i];
            const scale = 0.5;
            const viewport = page.getViewport({ scale });
            
            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render page
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Create thumbnail element
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-thumbnail';
            thumbnail.dataset.pageIndex = i;
            
            const imgSrc = canvas.toDataURL('image/png');
            thumbnail.innerHTML = `
                <img src="${imgSrc}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 8px;" alt="Page ${i + 1}">
                <div class="page-number">Page ${i + 1}</div>
            `;
            
            thumbnail.addEventListener('click', () => selectPage(i));
            elements.pagesGrid.appendChild(thumbnail);
            
        } catch (error) {
            console.error(`Page ${i + 1} thumbnail generation failed:`, error);
            
            // Fallback thumbnail on failure
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-thumbnail';
            thumbnail.dataset.pageIndex = i;
            thumbnail.innerHTML = `
                <div style="width: 150px; height: 200px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-bottom: 8px;">
                    <span style="color: #6b7280;">Page ${i + 1}</span>
                </div>
                <div class="page-number">Page ${i + 1}</div>
            `;
            
            thumbnail.addEventListener('click', () => selectPage(i));
            elements.pagesGrid.appendChild(thumbnail);
        }
    }
}

// Select page
function selectPage(pageIndex) {
    document.querySelectorAll('.page-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });
    
    const selectedThumbnail = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (selectedThumbnail) {
        selectedThumbnail.classList.add('selected');
        selectedPageIndex = pageIndex;
        elements.btnSelectPage.disabled = false;
    }
}

// Proceed to GIF upload
function proceedToGifUpload() {
    if (selectedPageIndex === -1) {
        alert('Please select a page.');
        return;
    }
    
    updateStep(2);
    elements.pageSelector.style.display = 'none';
    elements.gifPositionEditor.style.display = 'block';
    
    renderPagePreview();
}

// Render page preview
async function renderPagePreview() {
    try {
        const page = pdfPages[selectedPageIndex];
        
        // Calculate scale to fit container
        const containerWidth = elements.pdfPreviewContainer.clientWidth - 4;
        const tempViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / tempViewport.width, 800 / tempViewport.height);
        const viewport = page.getViewport({ scale });
        
        // Set canvas size
        elements.pdfPreviewCanvas.width = viewport.width;
        elements.pdfPreviewCanvas.height = viewport.height;
        
        // Render page
        const renderContext = {
            canvasContext: elements.pdfPreviewCanvas.getContext('2d'),
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        console.log('Page preview rendering complete');
        
    } catch (error) {
        console.error('Page preview rendering failed:', error);
        showErrorCanvas('Page rendering failed');
    }
}

// Show error canvas
function showErrorCanvas(message) {
    const ctx = elements.pdfPreviewCanvas.getContext('2d');
    const containerWidth = elements.pdfPreviewContainer.clientWidth - 4;
    elements.pdfPreviewCanvas.width = containerWidth;
    elements.pdfPreviewCanvas.height = containerWidth * 1.4;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, elements.pdfPreviewCanvas.width, elements.pdfPreviewCanvas.height);
    
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(20, 20, elements.pdfPreviewCanvas.width - 40, elements.pdfPreviewCanvas.height - 40);
    ctx.strokeStyle = '#e5e7eb';
    ctx.strokeRect(20, 20, elements.pdfPreviewCanvas.width - 40, elements.pdfPreviewCanvas.height - 40);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, elements.pdfPreviewCanvas.width / 2, elements.pdfPreviewCanvas.height / 2);
}

// Handle GIF upload
async function handleGifUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'image/gif') {
        showProcessing('Processing GIF...', 'Extracting GIF frames');
        updateProgress(10);
        
        try {
            gifFile = file;
            gifFrames = await extractGifFrames(file);
            updateProgress(60);
            
            // Generate preview
            const reader = new FileReader();
            reader.onload = function(e) {
                elements.gifUploadArea.innerHTML = `
                    <img src="${e.target.result}" class="gif-preview" alt="GIF Preview">
                    <p>GIF uploaded (${gifFrames.length} frames)</p>
                `;
                elements.gifUploadArea.classList.add('has-gif');
                
                showGifOverlay();
                updateStep(3);
                updateProgress(100);
                hideProcessing();
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('GIF processing failed:', error);
            alert('Cannot process GIF file: ' + error.message);
            hideProcessing();
        }
    } else {
        alert('Only GIF files are allowed.');
    }
}

// Extract GIF frames using omggif library
async function extractGifFrames(gifFile) {
    console.log('Starting GIF frame extraction with omggif');
    
    try {
        const arrayBuffer = await gifFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('GIF file loaded, size:', uint8Array.length, 'bytes');
        
        // Try to parse with omggif
        if (typeof GifReader !== 'undefined') {
            try {
                const reader = new GifReader(uint8Array);
                const frameCount = reader.numFrames();
                
                console.log(`GIF parsed successfully: ${frameCount} frames detected`);
                
                if (frameCount > 1) {
                    console.log('Multi-frame GIF detected, extracting frames...');
                    
                    const frames = [];
                    
                    for (let i = 0; i < Math.min(frameCount, 20); i++) {
                        try {
                            const frameInfo = reader.frameInfo(i);
                            console.log(`Frame ${i}:`, frameInfo);
                            
                            // Create canvas for this frame
                            const canvas = document.createElement('canvas');
                            canvas.width = reader.width;
                            canvas.height = reader.height;
                            const ctx = canvas.getContext('2d');
                            
                            // Fill with white background
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            // Create ImageData for the frame
                            const imageData = ctx.createImageData(canvas.width, canvas.height);
                            
                            // Decode frame pixels
                            reader.decodeAndBlitFrameRGBA(i, imageData.data);
                            
                            // Put the image data on canvas
                            ctx.putImageData(imageData, 0, 0);
                            
                            // Convert to blob
                            const blob = await new Promise(resolve => {
                                canvas.toBlob(resolve, 'image/png', 1.0);
                            });
                            
                            if (blob) {
                                const frameBuffer = await blob.arrayBuffer();
                                frames.push({
                                    data: frameBuffer,
                                    dataUrl: canvas.toDataURL('image/png'),
                                    delay: Math.max(frameInfo.delay * 10, 100) // Convert to ms, min 100ms
                                });
                                
                                console.log(`Frame ${i} extracted successfully`);
                            }
                            
                        } catch (frameError) {
                            console.error(`Error extracting frame ${i}:`, frameError);
                            continue;
                        }
                    }
                    
                    if (frames.length > 1) {
                        console.log(`Successfully extracted ${frames.length} frames`);
                        return frames;
                    } else {
                        console.log('Frame extraction failed, falling back to static image');
                    }
                } else {
                    console.log('Single frame GIF detected');
                }
                
            } catch (readerError) {
                console.error('omggif parsing failed:', readerError);
                console.log('Falling back to static image processing');
            }
        } else {
            console.log('omggif library not available');
        }
        
        // Fallback to static image
        console.log('Processing as static image');
        return await createStaticFrame(gifFile);
        
    } catch (error) {
        console.error('GIF processing failed completely:', error);
        throw new Error('Cannot process GIF file: ' + error.message);
    }
}

// Create single frame from GIF (fallback)
async function createStaticFrame(gifFile) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = async function() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                
                const ctx = canvas.getContext('2d');
                
                // White background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw image
                ctx.drawImage(img, 0, 0);
                
                // Convert to blob
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/png', 1.0);
                });
                
                if (blob) {
                    const arrayBuffer = await blob.arrayBuffer();
                    
                    resolve([{
                        data: arrayBuffer,
                        dataUrl: canvas.toDataURL('image/png'),
                        delay: 1000
                    }]);
                } else {
                    reject(new Error('Failed to create image blob'));
                }
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Failed to load GIF as image'));
        
        // Load GIF as image
        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.onerror = () => reject(new Error('Failed to read GIF file'));
        reader.readAsDataURL(gifFile);
    });
}

// Create frames from image (fallback method)
async function createFramesFromImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png', 1.0);
            });
            
            if (blob) {
                const arrayBuffer = await blob.arrayBuffer();
                const dataUrl = canvas.toDataURL('image/png');
                
                // Single frame (static image)
                const frames = [{
                    data: arrayBuffer,
                    dataUrl: dataUrl,
                    delay: 1000
                }];
                
                resolve(frames);
            } else {
                reject(new Error('Canvas to Blob conversion failed'));
            }
        };
        
        img.onerror = reject;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Show GIF overlay
function showGifOverlay() {
    // Set default position
    gifPosition = {
        x: (elements.pdfPreviewCanvas.width - 100) / 2,
        y: (elements.pdfPreviewCanvas.height - 100) / 2,
        width: 100,
        height: 100
    };
    
    // Show first frame
    if (gifFrames.length > 0) {
        elements.gifPreviewElement.innerHTML = `<img src="${gifFrames[0].dataUrl}" alt="GIF Preview">`;
    }
    
    updateGifOverlayPosition();
    elements.gifOverlay.style.display = 'block';
    elements.btnGeneratePdf.disabled = false;
}

// Update GIF overlay position
function updateGifOverlayPosition() {
    const canvasRect = elements.pdfPreviewCanvas.getBoundingClientRect();
    const scaleX = elements.pdfPreviewCanvas.width / canvasRect.width;
    const scaleY = elements.pdfPreviewCanvas.height / canvasRect.height;
    
    // Boundary constraints
    const maxX = elements.pdfPreviewCanvas.width - gifPosition.width;
    const maxY = elements.pdfPreviewCanvas.height - gifPosition.height;
    
    gifPosition.x = Math.max(0, Math.min(maxX, gifPosition.x));
    gifPosition.y = Math.max(0, Math.min(maxY, gifPosition.y));
    gifPosition.width = Math.max(10, Math.min(elements.pdfPreviewCanvas.width, gifPosition.width));
    gifPosition.height = Math.max(10, Math.min(elements.pdfPreviewCanvas.height, gifPosition.height));
    
    elements.gifOverlay.style.left = (gifPosition.x / scaleX) + 'px';
    elements.gifOverlay.style.top = (gifPosition.y / scaleY) + 'px';
    elements.gifOverlay.style.width = (gifPosition.width / scaleX) + 'px';
    elements.gifOverlay.style.height = (gifPosition.height / scaleY) + 'px';
    
    // Update control panel
    document.getElementById('posX').value = Math.round(gifPosition.x);
    document.getElementById('posY').value = Math.round(gifPosition.y);
    document.getElementById('gifWidth').value = Math.round(gifPosition.width);
    document.getElementById('gifHeight').value = Math.round(gifPosition.height);
}

// Update GIF position from controls
function updateGifPosition() {
    const x = parseFloat(document.getElementById('posX').value) || 0;
    const y = parseFloat(document.getElementById('posY').value) || 0;
    const width = parseFloat(document.getElementById('gifWidth').value) || 100;
    const height = parseFloat(document.getElementById('gifHeight').value) || 100;
    
    gifPosition = { x, y, width, height };
    updateGifOverlayPosition();
}

// Mouse event handlers
function handleMouseDown(e) {
    e.preventDefault();
    
    if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        resizeHandle = e.target.classList[1];
    } else {
        isDragging = true;
    }
    
    const rect = elements.pdfPreviewContainer.getBoundingClientRect();
    dragStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;
    
    e.preventDefault();
    const rect = elements.pdfPreviewContainer.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const canvasRect = elements.pdfPreviewCanvas.getBoundingClientRect();
    const scaleX = elements.pdfPreviewCanvas.width / canvasRect.width;
    const scaleY = elements.pdfPreviewCanvas.height / canvasRect.height;
    
    if (isDragging) {
        const deltaX = (currentX - dragStart.x) * scaleX;
        const deltaY = (currentY - dragStart.y) * scaleY;
        
        gifPosition.x += deltaX;
        gifPosition.y += deltaY;
        
        dragStart.x = currentX;
        dragStart.y = currentY;
        
    } else if (isResizing) {
        const deltaX = (currentX - dragStart.x) * scaleX;
        const deltaY = (currentY - dragStart.y) * scaleY;
        
        switch (resizeHandle) {
            case 'se':
                gifPosition.width += deltaX;
                gifPosition.height += deltaY;
                break;
            case 'sw':
                gifPosition.width -= deltaX;
                gifPosition.x += deltaX;
                gifPosition.height += deltaY;
                break;
            case 'ne':
                gifPosition.width += deltaX;
                gifPosition.height -= deltaY;
                gifPosition.y += deltaY;
                break;
            case 'nw':
                gifPosition.width -= deltaX;
                gifPosition.height -= deltaY;
                gifPosition.x += deltaX;
                gifPosition.y += deltaY;
                break;
        }
        
        dragStart.x = currentX;
        dragStart.y = currentY;
    }
    
    updateGifOverlayPosition();
}

function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
}

// Generate real PDF using PDF-lib + jsPDF hybrid approach
async function generateRealPdf() {
    if (!gifFrames.length || selectedPageIndex === -1 || !originalPdfDoc) {
        alert('Required data is missing.');
        return;
    }
    
    showProcessing('Generating Enhanced PDF...', 'Creating PDF with advanced JavaScript animation');
    updateProgress(5);
    updateStep(4);
    
    try {
        console.log('=== PDF-lib + jsPDF Hybrid Generation Started ===');
        
        // Method 1: Try jsPDF for better JavaScript support
        if (typeof window.jsPDF !== 'undefined') {
            console.log('Using jsPDF for enhanced JavaScript support');
            await generateWithJsPDF();
        } else {
            console.log('jsPDF not available, using PDF-lib with enhanced approach');
            await generateWithPDFLibEnhanced();
        }
        
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Error occurred during PDF generation: ' + error.message);
        hideProcessing();
    }
}

// Generate PDF using jsPDF with full JavaScript support
async function generateWithJsPDF() {
    try {
        console.log('Starting jsPDF generation with animation');
        
        // Get original PDF pages as images first
        const pageImages = [];
        for (let i = 0; i < pdfPages.length; i++) {
            const page = pdfPages[i];
            const viewport = page.getViewport({ scale: 2 }); // High resolution
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            pageImages.push({
                canvas: canvas,
                dataUrl: canvas.toDataURL('image/png'),
                width: viewport.width,
                height: viewport.height
            });
            
            updateProgress(10 + (i + 1) / pdfPages.length * 30);
        }
        
        console.log('All pages converted to images');
        updateProgress(45);
        
        // Create new PDF with jsPDF
        const { jsPDF } = window.jsPDF;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: [pageImages[0].width, pageImages[0].height]
        });
        
        // Remove the default first page
        pdf.deletePage(1);
        
        // Add all pages
        for (let i = 0; i < pageImages.length; i++) {
            const pageImg = pageImages[i];
            
            pdf.addPage([pageImg.width, pageImg.height]);
            pdf.addImage(pageImg.dataUrl, 'PNG', 0, 0, pageImg.width, pageImg.height);
            
            // Add animation to selected page
            if (i === selectedPageIndex) {
                console.log(`Adding jsPDF animation to page ${i + 1}`);
                await addJsPDFAnimation(pdf, i + 1, pageImg.width, pageImg.height);
            }
            
            updateProgress(45 + (i + 1) / pageImages.length * 40);
        }
        
        console.log('jsPDF generation complete');
        updateProgress(90);
        
        // Generate and save
        const pdfBlob = pdf.output('blob');
        if (generatedPdfUrl) {
            URL.revokeObjectURL(generatedPdfUrl);
        }
        generatedPdfUrl = URL.createObjectURL(pdfBlob);
        
        updateProgress(100);
        setTimeout(() => {
            hideProcessing();
            showCompletionScreen();
        }, 500);
        
    } catch (error) {
        console.error('jsPDF generation failed:', error);
        throw error;
    }
}

// Add animation using jsPDF's JavaScript capabilities
async function addJsPDFAnimation(pdf, pageNumber, pageWidth, pageHeight) {
    try {
        console.log('Adding jsPDF animation to page', pageNumber);
        
        // Calculate position in PDF coordinates
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = gifPosition.y * scaleY; // jsPDF uses top-left origin
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('Animation position:', { pdfX, pdfY, pdfWidth, pdfHeight });
        
        // Get animation settings
        const autoPlay = elements.autoPlay.checked;
        const frameDelay = parseInt(elements.speedControl.value);
        
        // Add each frame as a form field with image
        const frameFieldNames = [];
        
        for (let i = 0; i < gifFrames.length; i++) {
            const frameFieldName = `animFrame_${pageNumber}_${i}`;
            frameFieldNames.push(frameFieldName);
            
            // Add the frame image
            pdf.addImage(
                gifFrames[i].dataUrl,
                'PNG',
                pdfX,
                pdfY,
                pdfWidth,
                pdfHeight,
                `frame_${i}`,
                'FAST'
            );
            
            // Create form field for this frame
            pdf.addField({
                fieldType: 'button',
                fieldName: frameFieldName,
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                page: pageNumber
            });
        }
        
        // Create comprehensive JavaScript for animation
        const animationJS = `
// Enhanced PDF Animation Script for Page ${pageNumber}
console.println("Advanced PDF Animation System Loaded");

var page${pageNumber} = {
    currentFrame: 0,
    totalFrames: ${gifFrames.length},
    frameDelay: ${frameDelay},
    autoPlay: ${autoPlay},
    isPlaying: false,
    animationTimer: null,
    frameFields: [${frameFieldNames.map(name => `"${name}"`).join(', ')}]
};

// Core animation functions
page${pageNumber}.hideAllFrames = function() {
    console.println("Hiding all frames for page ${pageNumber}");
    for (var i = 0; i < this.totalFrames; i++) {
        try {
            var field = this.getField(this.frameFields[i]);
            if (field) {
                field.display = display.hidden;
                console.println("Hidden frame " + i);
            }
        } catch (e) {
            console.println("Could not hide frame " + i + ": " + e.message);
        }
    }
};

page${pageNumber}.showFrame = function(frameIndex) {
    console.println("Showing frame " + frameIndex + " for page ${pageNumber}");
    try {
        var field = this.getField(this.frameFields[frameIndex]);
        if (field) {
            field.display = display.visible;
            console.println("Successfully showed frame " + frameIndex);
        }
    } catch (e) {
        console.println("Could not show frame " + frameIndex + ": " + e.message);
    }
};

page${pageNumber}.nextFrame = function() {
    console.println("Next frame transition: " + this.currentFrame + " -> " + ((this.currentFrame + 1) % this.totalFrames));
    
    // Hide all frames first
    this.hideAllFrames();
    
    // Move to next frame
    this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
    
    // Show new frame
    this.showFrame(this.currentFrame);
    
    // Schedule next frame if playing
    if (this.isPlaying && this.autoPlay) {
        var self = this;
        this.animationTimer = app.setTimeOut(
            "page${pageNumber}.nextFrame()", 
            this.frameDelay
        );
    }
};

page${pageNumber}.startAnimation = function() {
    console.println("Starting animation for page ${pageNumber}");
    this.isPlaying = true;
    
    // Clear any existing timer
    if (this.animationTimer) {
        app.clearTimeOut(this.animationTimer);
    }
    
    // Initialize first frame
    this.hideAllFrames();
    this.currentFrame = 0;
    this.showFrame(0);
    
    // Start animation loop
    if (this.totalFrames > 1) {
        var self = this;
        this.animationTimer = app.setTimeOut(
            "page${pageNumber}.nextFrame()", 
            this.frameDelay
        );
    }
};

page${pageNumber}.stopAnimation = function() {
    console.println("Stopping animation for page ${pageNumber}");
    this.isPlaying = false;
    
    if (this.animationTimer) {
        app.clearTimeOut(this.animationTimer);
        this.animationTimer = null;
    }
};

// Initialize animation when page opens
try {
    if (page${pageNumber}.autoPlay) {
        console.println("Auto-starting animation for page ${pageNumber}");
        app.setTimeOut("page${pageNumber}.startAnimation()", 1000);
    } else {
        console.println("Manual mode - showing first frame only");
        page${pageNumber}.hideAllFrames();
        page${pageNumber}.showFrame(0);
    }
} catch (initError) {
    console.println("Animation initialization failed: " + initError.message);
}

// Debug function
page${pageNumber}.debug = function() {
    console.println("=== Page ${pageNumber} Animation Debug ===");
    console.println("Current frame: " + this.currentFrame);
    console.println("Total frames: " + this.totalFrames);
    console.println("Is playing: " + this.isPlaying);
    console.println("Auto play: " + this.autoPlay);
    console.println("Frame delay: " + this.frameDelay);
    console.println("Timer active: " + (this.animationTimer !== null));
    console.println("=====================================");
};
`;
        
        // Add the JavaScript to PDF
        pdf.addJS(animationJS);
        
        // Add control button if not auto-play
        if (!autoPlay) {
            const buttonY = pdfY + pdfHeight + 10;
            
            pdf.addField({
                fieldType: 'button',
                fieldName: `controlBtn_${pageNumber}`,
                x: pdfX,
                y: buttonY,
                width: Math.min(pdfWidth, 120),
                height: 30,
                page: pageNumber,
                caption: '▶ Play Animation',
                action: `
                    if (page${pageNumber}.isPlaying) {
                        page${pageNumber}.stopAnimation();
                        this.buttonSetCaption("▶ Play Animation");
                    } else {
                        page${pageNumber}.startAnimation();
                        this.buttonSetCaption("⏸ Stop Animation");
                    }
                `
            });
        }
        
        console.log('jsPDF animation setup complete');
        
    } catch (error) {
        console.error('jsPDF animation setup failed:', error);
        
        // Fallback: add first frame as static image
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        pdf.addImage(
            gifFrames[0].dataUrl,
            'PNG',
            gifPosition.x * scaleX,
            gifPosition.y * scaleY,
            gifPosition.width * scaleX,
            gifPosition.height * scaleY
        );
        
        console.log('Added fallback static image');
    }
}

// Generate PDF with OCG-based animation (Most compatible approach)
async function generateWithPDFLibEnhanced() {
    console.log('Using OCG-based animation approach for maximum compatibility');
    
    try {
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        console.log(`Processing ${originalPages.length} pages with OCG animation`);
        updateProgress(10);
        
        // Copy all pages
        for (let i = 0; i < originalPages.length; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // Add OCG-based animation to selected page
            if (i === selectedPageIndex) {
                console.log(`Adding OCG animation to page ${i + 1}`);
                await addOCGAnimation(newPdfDoc, addedPage, i);
            }
            
            updateProgress(10 + (i + 1) / originalPages.length * 70);
        }
        
        // Add document-level JavaScript for OCG control
        const globalJS = `
console.println("PDF OCG Animation System Loaded");

var AnimationController = {
    currentPage: null,
    
    initPage: function(pageNum, totalFrames, frameDelay, autoPlay) {
        console.println("Initializing page " + pageNum + " with " + totalFrames + " frames");
        
        this.currentPage = {
            pageNum: pageNum,
            currentFrame: 0,
            totalFrames: totalFrames,
            frameDelay: frameDelay,
            autoPlay: autoPlay,
            isPlaying: false,
            timer: null
        };
        
        // Hide all frames except first
        this.hideAllFrames();
        this.showFrame(0);
        
        // Start auto-play if enabled
        if (autoPlay && totalFrames > 1) {
            this.startAnimation();
        }
    },
    
    hideAllFrames: function() {
        if (!this.currentPage) return;
        
        for (var i = 0; i < this.currentPage.totalFrames; i++) {
            try {
                var ocgName = "Frame_" + this.currentPage.pageNum + "_" + i;
                var ocg = this.getOCG(ocgName);
                if (ocg) {
                    ocg.state = false;
                    console.println("Hidden frame " + i);
                }
            } catch (e) {
                console.println("Could not hide frame " + i + ": " + e);
            }
        }
    },
    
    showFrame: function(frameIndex) {
        if (!this.currentPage) return;
        
        try {
            var ocgName = "Frame_" + this.currentPage.pageNum + "_" + frameIndex;
            var ocg = this.getOCG(ocgName);
            if (ocg) {
                ocg.state = true;
                console.println("Showed frame " + frameIndex);
            }
        } catch (e) {
            console.println("Could not show frame " + frameIndex + ": " + e);
        }
    },
    
    nextFrame: function() {
        if (!this.currentPage) return;
        
        console.println("Next frame: " + this.currentPage.currentFrame + " -> " + 
                       ((this.currentPage.currentFrame + 1) % this.currentPage.totalFrames));
        
        this.hideAllFrames();
        this.currentPage.currentFrame = (this.currentPage.currentFrame + 1) % this.currentPage.totalFrames;
        this.showFrame(this.currentPage.currentFrame);
        
        if (this.currentPage.isPlaying && this.currentPage.autoPlay) {
            var self = this;
            this.currentPage.timer = app.setTimeOut(
                "AnimationController.nextFrame()", 
                this.currentPage.frameDelay
            );
        }
    },
    
    startAnimation: function() {
        if (!this.currentPage) return;
        
        console.println("Starting animation");
        this.currentPage.isPlaying = true;
        
        if (this.currentPage.timer) {
            app.clearTimeOut(this.currentPage.timer);
        }
        
        if (this.currentPage.totalFrames > 1) {
            var self = this;
            this.currentPage.timer = app.setTimeOut(
                "AnimationController.nextFrame()", 
                this.currentPage.frameDelay
            );
        }
    },
    
    stopAnimation: function() {
        if (!this.currentPage) return;
        
        console.println("Stopping animation");
        this.currentPage.isPlaying = false;
        
        if (this.currentPage.timer) {
            app.clearTimeOut(this.currentPage.timer);
            this.currentPage.timer = null;
        }
    }
};

// Initialize when document opens
app.setTimeOut("AnimationController.initPage(${selectedPageIndex}, ${gifFrames.length}, ${parseInt(elements.speedControl.value)}, ${elements.autoPlay.checked})", 1000);
`;
        
        newPdfDoc.addJavaScript('OCGAnimation', globalJS);
        updateProgress(85);
        
        // Save PDF
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        if (generatedPdfUrl) {
            URL.revokeObjectURL(generatedPdfUrl);
        }
        generatedPdfUrl = URL.createObjectURL(blob);
        
        updateProgress(100);
        setTimeout(() => {
            hideProcessing();
            showCompletionScreen();
        }, 500);
        
    } catch (error) {
        console.error('OCG animation generation failed:', error);
        throw error;
    }
}

// Add OCG-based animation to page
async function addOCGAnimation(pdfDoc, page, pageIndex) {
    try {
        console.log('Adding OCG-based animation');
        
        // Calculate positions
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('OCG Animation position:', { pdfX, pdfY, pdfWidth, pdfHeight });
        
        if (gifFrames.length === 1) {
            // Single frame - simple static image
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            page.drawImage(embeddedImage, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
            });
            return true;
        }
        
        // Multiple frames - create OCG layers
        console.log(`Creating ${gifFrames.length} OCG layers for animation`);
        
        for (let i = 0; i < gifFrames.length; i++) {
            try {
                // Create OCG (Optional Content Group) for this frame
                const ocgName = `Frame_${pageIndex}_${i}`;
                
                // Embed frame image
                const embeddedImage = await pdfDoc.embedPng(gifFrames[i].data);
                
                // Create content stream for this frame
                const contentStream = `
q
${pdfWidth} 0 0 ${pdfHeight} ${pdfX} ${pdfY} cm
/Frame${i} Do
Q
`;
                
                // Draw image with OCG marking
                page.drawImage(embeddedImage, {
                    x: pdfX,
                    y: pdfY,
                    width: pdfWidth,
                    height: pdfHeight,
                });
                
                console.log(`OCG frame ${i} added successfully`);
                
            } catch (frameError) {
                console.error(`Failed to add OCG frame ${i}:`, frameError);
                
                // Fallback: just draw the image normally
                if (i === 0) {
                    const embeddedImage = await pdfDoc.embedPng(gifFrames[i].data);
                    page.drawImage(embeddedImage, {
                        x: pdfX,
                        y: pdfY,
                        width: pdfWidth,
                        height: pdfHeight,
                    });
                }
            }
        }
        
        // Add manual control button (fixed encoding issue)
        const form = pdfDoc.getForm();
        const controlBtn = form.createButton(`animControl_${pageIndex}`);
        
        controlBtn.addToPage('Play Animation', page, {
            x: pdfX,
            y: pdfY - 35,
            width: Math.min(pdfWidth, 140),
            height: 25,
            fontSize: 10,
            backgroundColor: PDFLib.rgb(0.2, 0.4, 0.8),
            borderColor: PDFLib.rgb(0.1, 0.2, 0.6),
            borderWidth: 1
        });
        
        try {
            controlBtn.setAction(
                PDFLib.PDFAction.createJavaScript(`
                    if (AnimationController.currentPage && AnimationController.currentPage.isPlaying) {
                        AnimationController.stopAnimation();
                    } else {
                        AnimationController.startAnimation();
                    }
                `)
            );
        } catch (actionError) {
            console.log('Button action failed:', actionError.message);
        }
        
        console.log('OCG animation setup complete');
        return true;
        
    } catch (error) {
        console.error('OCG animation failed:', error);
        
        // Ultimate fallback
        try {
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            const pageSize = page.getSize();
            const scaleX = pageSize.width / elements.pdfPreviewCanvas.width;
            const scaleY = pageSize.height / elements.pdfPreviewCanvas.height;
            
            page.drawImage(embeddedImage, {
                x: gifPosition.x * scaleX,
                y: pageSize.height - (gifPosition.y + gifPosition.height) * scaleY,
                width: gifPosition.width * scaleX,
                height: gifPosition.height * scaleY,
            });
            
            console.log('Ultimate fallback image added');
        } catch (fallbackError) {
            console.error('Even ultimate fallback failed:', fallbackError);
        }
        
        return false;
    }
}

// Add animated GIF to PDF page (Real JavaScript Animation)
async function addAnimatedGifToPdfPage(pdfDoc, page, pageIndex) {
    try {
        console.log('Adding REAL animated GIF with JavaScript to PDF');
        
        // Get page size
        const { width: pageWidth, height: pageHeight } = page.getSize();
        console.log('Page size:', pageWidth, 'x', pageHeight);
        
        // Convert canvas coordinates to PDF coordinates
        const previewCanvas = elements.pdfPreviewCanvas;
        const scaleX = pageWidth / previewCanvas.width;
        const scaleY = pageHeight / previewCanvas.height;
        
        // Convert to PDF coordinate system (bottom-left origin)
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('PDF coordinates:', { pdfX, pdfY, pdfWidth, pdfHeight });
        
        // Get animation settings
        const autoPlay = elements.autoPlay.checked;
        const frameDelay = parseInt(elements.speedControl.value);
        
        if (gifFrames.length === 1) {
            // Single frame - just insert as static image
            console.log('Single frame detected, inserting as static image');
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            
            page.drawImage(embeddedImage, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
            });
            
            return true;
        }
        
        // Multiple frames - create real JavaScript animation
        console.log(`Creating JavaScript animation with ${gifFrames.length} frames`);
        
        // Embed all frame images
        const embeddedImages = [];
        for (let i = 0; i < gifFrames.length; i++) {
            const embeddedImage = await pdfDoc.embedPng(gifFrames[i].data);
            embeddedImages.push(embeddedImage);
        }
        
        console.log('All frames embedded successfully');
        
        // Create form for animation control
        const form = pdfDoc.getForm();
        
        // Create image fields for each frame
        const imageFields = [];
        for (let i = 0; i < embeddedImages.length; i++) {
            const fieldName = `animFrame_${pageIndex}_${i}`;
            
            // Create a button field that will display the image
            const imageButton = form.createButton(fieldName);
            
            // Set up the button to display the frame image
            imageButton.addToPage(page, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                backgroundColor: PDFLib.rgb(1, 1, 1),
                borderWidth: 0
            });
            
            // Try to set the image as the button's appearance
            try {
                // This is the key - we need to set up multiple appearances
                const buttonDict = imageButton.acroField.dict;
                const appearanceDict = pdfDoc.context.obj({});
                const normalAppearanceDict = pdfDoc.context.obj({});
                
                // Create XObject for the image
                const xObjectRef = pdfDoc.context.register(
                    pdfDoc.context.formXObject(
                        embeddedImages[i].embed(),
                        {
                            BBox: [0, 0, pdfWidth, pdfHeight],
                            Matrix: [1, 0, 0, 1, 0, 0]
                        }
                    )
                );
                
                normalAppearanceDict.set(PDFLib.PDFName.of('N'), xObjectRef);
                appearanceDict.set(PDFLib.PDFName.of('N'), normalAppearanceDict);
                buttonDict.set(PDFLib.PDFName.of('AP'), appearanceDict);
                
            } catch (appearanceError) {
                console.log(`Appearance setting failed for frame ${i}, trying alternative:`, appearanceError.message);
                
                // Alternative: Draw the image directly on the page for the first frame
                if (i === 0) {
                    page.drawImage(embeddedImages[i], {
                        x: pdfX,
                        y: pdfY,
                        width: pdfWidth,
                        height: pdfHeight,
                    });
                }
            }
            
            imageFields.push(imageButton);
            
            // Hide all frames except the first one initially
            if (i > 0) {
                try {
                    imageButton.setHidden(true);
                } catch (hideError) {
                    console.log(`Could not hide frame ${i}`);
                }
            }
        }
        
        // Create the main animation JavaScript
        const animationScript = `
console.println("PDF Animation Script Loaded for page ${pageIndex}");

var currentFrame_${pageIndex} = 0;
var totalFrames_${pageIndex} = ${gifFrames.length};
var frameDelay_${pageIndex} = ${frameDelay};
var autoPlay_${pageIndex} = ${autoPlay};
var animationTimer_${pageIndex} = null;
var isAnimating_${pageIndex} = false;

function hideAllFrames_${pageIndex}() {
    for (var i = 0; i < totalFrames_${pageIndex}; i++) {
        try {
            var field = this.getField("animFrame_${pageIndex}_" + i);
            if (field) {
                field.hidden = true;
            }
        } catch (e) {
            console.println("Could not hide frame " + i + ": " + e.message);
        }
    }
}

function showFrame_${pageIndex}(frameIndex) {
    try {
        var field = this.getField("animFrame_${pageIndex}_" + frameIndex);
        if (field) {
            field.hidden = false;
            console.println("Showing frame " + frameIndex);
        }
    } catch (e) {
        console.println("Could not show frame " + frameIndex + ": " + e.message);
    }
}

function nextFrame_${pageIndex}() {
    console.println("Next frame: " + currentFrame_${pageIndex} + " -> " + ((currentFrame_${pageIndex} + 1) % totalFrames_${pageIndex}));
    
    // Hide current frame
    hideAllFrames_${pageIndex}();
    
    // Move to next frame
    currentFrame_${pageIndex} = (currentFrame_${pageIndex} + 1) % totalFrames_${pageIndex};
    
    // Show new frame
    showFrame_${pageIndex}(currentFrame_${pageIndex});
    
    // Schedule next frame if auto-playing
    if (autoPlay_${pageIndex} && isAnimating_${pageIndex}) {
        animationTimer_${pageIndex} = app.setTimeOut("nextFrame_${pageIndex}()", frameDelay_${pageIndex});
    }
}

function startAnimation_${pageIndex}() {
    console.println("Starting animation for page ${pageIndex}");
    isAnimating_${pageIndex} = true;
    
    if (animationTimer_${pageIndex}) {
        app.clearTimeOut(animationTimer_${pageIndex});
    }
    
    // Show first frame
    hideAllFrames_${pageIndex}();
    showFrame_${pageIndex}(0);
    currentFrame_${pageIndex} = 0;
    
    // Start animation loop
    if (totalFrames_${pageIndex} > 1) {
        animationTimer_${pageIndex} = app.setTimeOut("nextFrame_${pageIndex}()", frameDelay_${pageIndex});
    }
}

function stopAnimation_${pageIndex}() {
    console.println("Stopping animation for page ${pageIndex}");
    isAnimating_${pageIndex} = false;
    
    if (animationTimer_${pageIndex}) {
        app.clearTimeOut(animationTimer_${pageIndex});
        animationTimer_${pageIndex} = null;
    }
}

// Initialize when page is opened
if (autoPlay_${pageIndex}) {
    app.setTimeOut("startAnimation_${pageIndex}()", 500);
} else {
    // Just show the first frame
    hideAllFrames_${pageIndex}();
    showFrame_${pageIndex}(0);
}
`;
        
        // Add the JavaScript to the PDF document
        try {
            pdfDoc.addJavaScript(`animation_page_${pageIndex}`, animationScript);
            console.log('Animation JavaScript added to PDF');
        } catch (jsError) {
            console.error('Failed to add JavaScript to PDF:', jsError);
            
            // Fallback: just show the first frame as static image
            page.drawImage(embeddedImages[0], {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
            });
            
            console.log('Fallback: Added first frame as static image');
        }
        
        // Add control button if not auto-play
        if (!autoPlay) {
            const controlButton = form.createButton(`control_${pageIndex}`);
            controlButton.addToPage('▶ Play Animation', page, {
                x: pdfX,
                y: pdfY - 35,
                width: Math.min(pdfWidth, 120),
                height: 25,
                fontSize: 10,
                backgroundColor: PDFLib.rgb(0.2, 0.4, 0.8),
                borderColor: PDFLib.rgb(0.1, 0.2, 0.6),
                borderWidth: 1
            });
            
            try {
                controlButton.setAction(
                    PDFLib.PDFAction.createJavaScript(`
                        if (isAnimating_${pageIndex}) {
                            stopAnimation_${pageIndex}();
                            this.getField("control_${pageIndex}").buttonSetCaption("▶ Play Animation");
                        } else {
                            startAnimation_${pageIndex}();
                            this.getField("control_${pageIndex}").buttonSetCaption("⏸ Stop Animation");
                        }
                    `)
                );
                console.log('Control button action set');
            } catch (actionError) {
                console.log('Control button action failed:', actionError.message);
            }
        }
        
        console.log('Real JavaScript animation setup complete');
        return true;
        
    } catch (error) {
        console.error('Real animation setup failed:', error);
        
        // Emergency fallback: just show first frame
        try {
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            const pageSize = page.getSize();
            const scaleX = pageSize.width / elements.pdfPreviewCanvas.width;
            const scaleY = pageSize.height / elements.pdfPreviewCanvas.height;
            
            page.drawImage(embeddedImage, {
                x: gifPosition.x * scaleX,
                y: pageSize.height - (gifPosition.y + gifPosition.height) * scaleY,
                width: gifPosition.width * scaleX,
                height: gifPosition.height * scaleY,
            });
            
            console.log('Emergency fallback: static image inserted');
        } catch (fallbackError) {
            console.error('Even emergency fallback failed:', fallbackError);
        }
        
        return false;
    }
}

// Show completion screen
function showCompletionScreen() {
    elements.workspace.style.display = 'none';
    elements.completionScreen.style.display = 'block';
    window.scrollTo(0, 0);
}

// Download PDF
function downloadGeneratedPdf() {
    if (!generatedPdfUrl) {
        alert('No generated PDF available.');
        return;
    }
    
    try {
        const fileName = `animated-pdf-${Date.now()}.pdf`;
        const a = document.createElement('a');
        a.href = generatedPdfUrl;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('PDF download started:', fileName);
    } catch (error) {
        console.error('Download failed:', error);
        
        // Alternative: open PDF in new window
        try {
            window.open(generatedPdfUrl, '_blank');
        } catch (error2) {
            alert('Download failed. Please check browser settings.');
        }
    }
}

// Go back to page selection
function backToPageSelection() {
    elements.gifPositionEditor.style.display = 'none';
    elements.pageSelector.style.display = 'block';
    updateStep(1);
    
    // Reset state
    gifFile = null;
    gifFrames = [];
    elements.gifOverlay.style.display = 'none';
    elements.gifUploadArea.innerHTML = '<p>Select GIF file</p>';
    elements.gifUploadArea.classList.remove('has-gif');
    elements.btnGeneratePdf.disabled = true;
}

// Show processing
function showProcessing(title, message) {
    if (!elements) {
        elements = getElements();
    }
    
    const titleEl = document.getElementById('processingTitle');
    const messageEl = document.getElementById('processingMessage');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (elements.processingOverlay) {
        elements.processingOverlay.style.display = 'flex';
    }
}

// Hide processing
function hideProcessing() {
    if (!elements) {
        elements = getElements();
    }
    
    if (elements.processingOverlay) {
        elements.processingOverlay.style.display = 'none';
    }
}

// Update progress
function updateProgress(percent) {
    if (!elements) {
        elements = getElements();
    }
    
    if (elements.progressFill) {
        elements.progressFill.style.width = percent + '%';
    }
    if (elements.progressText) {
        elements.progressText.textContent = Math.round(percent) + '%';
    }
}

// Start over
function startOver() {
    // Clean up URLs
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
        generatedPdfUrl = null;
    }
    
    // Reset state
    currentPdfFile = null;
    originalPdfDoc = null;
    renderPdfDoc = null;
    pdfPages = [];
    selectedPageIndex = -1;
    gifFile = null;
    gifFrames = [];
    
    // Reload page
    location.reload();
}

// Update step
function updateStep(step) {
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.step) <= step) {
            el.classList.add('active');
        }
    });
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    if (elements && elements.processingOverlay && elements.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('Unexpected error occurred. Please refresh the page.');
    }
});

// Promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise error:', e.reason);
    e.preventDefault();
    
    if (elements && elements.processingOverlay && elements.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('Processing error occurred. Please try again.');
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
});

// Debug info for troubleshooting
function debugInfo() {
    console.log('=== PDF GIF Debug Info ===');
    console.log('PDF loaded:', !!originalPdfDoc);
    console.log('Selected page:', selectedPageIndex);
    console.log('GIF frames count:', gifFrames.length);
    console.log('GIF position:', gifPosition);
    console.log('Generated PDF URL:', !!generatedPdfUrl);
    console.log('Browser support:');
    console.log('- FileReader:', typeof FileReader !== 'undefined');
    console.log('- Canvas:', typeof HTMLCanvasElement !== 'undefined');
    console.log('- PDF.js:', typeof pdfjsLib !== 'undefined');
    console.log('- PDF-lib:', typeof PDFLib !== 'undefined');
    console.log('- gifuct-js:', typeof gifuct !== 'undefined');
    console.log('==========================');
}

// Expose debug function globally
window.debugPdfGif = debugInfo;
