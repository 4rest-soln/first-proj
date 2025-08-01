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

// Check browser support
function checkBrowserSupport() {
    const features = {
        fileReader: typeof FileReader !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined',
        pdfjs: typeof pdfjsLib !== 'undefined',
        pdflib: typeof PDFLib !== 'undefined',
        gifuct: typeof gifuct !== 'undefined'
    };

    console.log('Browser support status:', features);
    
    // Check gifuct-js more thoroughly
    if (typeof gifuct !== 'undefined') {
        console.log('gifuct-js details:', {
            type: typeof gifuct,
            hasParseGIF: typeof gifuct.parseGIF === 'function',
            hasDecompressFrames: typeof gifuct.decompressFrames === 'function',
            methods: Object.keys(gifuct)
        });
    } else {
        console.warn('gifuct-js library not loaded. Check if the CDN link is correct.');
        console.log('Falling back to basic image processing for GIF files.');
    }
    
    if (!features.fileReader || !features.canvas || !features.pdfjs || !features.pdflib) {
        alert('Browser does not support required features. Please use latest browser.');
        return false;
    }
    
    return true;
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Event listener initialization started');
    
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

// Update speed display
function updateSpeedDisplay() {
    if (elements.speedDisplay) {
        elements.speedDisplay.textContent = elements.speedControl.value + 'ms';
    }
}

// Handle PDF upload
async function handlePdfUpload(e) {
    console.log('PDF file upload handler executed');
    
    if (!elements) {
        elements = getElements();
    }
    
    const file = e.target.files[0];
    console.log('Selected file:', file);
    
    if (file && file.type === 'application/pdf') {
        console.log('PDF file confirmed, starting load');
        await loadPdf(file);
    } else {
        console.log('Not a PDF file:', file ? file.type : 'no file');
        alert('Only PDF files are allowed.');
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

// Extract GIF frames (improved version with better error handling)
async function extractGifFrames(gifFile) {
    console.log('GIF frame extraction started');
    
    try {
        const arrayBuffer = await gifFile.arrayBuffer();
        console.log('GIF file size:', arrayBuffer.byteLength, 'bytes');
        
        // Try using gifuct-js for frame extraction
        if (typeof gifuct !== 'undefined' && gifuct.parseGIF) {
            try {
                console.log('Attempting to parse GIF with gifuct-js');
                const gif = gifuct.parseGIF(arrayBuffer);
                console.log('GIF parsed successfully, global screen descriptor:', gif.lsd);
                
                const frames = gifuct.decompressFrames(gif, true);
                console.log(`GIF decompression successful: ${frames.length} frames found`);
                
                if (frames.length > 1) {
                    const frameData = [];
                    const maxFrames = Math.min(frames.length, 30); // Max 30 frames
                    
                    for (let i = 0; i < maxFrames; i++) {
                        try {
                            const frame = frames[i];
                            console.log(`Processing frame ${i + 1}:`, {
                                dims: frame.dims,
                                delay: frame.delay,
                                disposalType: frame.disposalType
                            });
                            
                            const canvas = document.createElement('canvas');
                            canvas.width = gif.lsd.width;
                            canvas.height = gif.lsd.height;
                            const ctx = canvas.getContext('2d');
                            
                            // Handle background based on disposal method
                            if (i === 0 || frame.disposalType === 2) {
                                // Clear canvas and set white background
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.fillStyle = 'white';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                console.log(`Frame ${i}: Applied background clear`);
                            } else if (frame.disposalType === 1) {
                                // Keep previous frame (do nothing)
                                console.log(`Frame ${i}: Keeping previous frame`);
                            }
                            
                            // Create ImageData from frame patch
                            const imageData = new ImageData(
                                new Uint8ClampedArray(frame.patch),
                                frame.dims.width,
                                frame.dims.height
                            );
                            
                            // Draw frame patch at correct position
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = frame.dims.width;
                            tempCanvas.height = frame.dims.height;
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCtx.putImageData(imageData, 0, 0);
                            
                            ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
                            
                            // Convert to PNG blob for PDF-lib
                            const blob = await new Promise(resolve => {
                                canvas.toBlob(resolve, 'image/png', 1.0);
                            });
                            
                            if (blob) {
                                const frameArrayBuffer = await blob.arrayBuffer();
                                frameData.push({
                                    data: frameArrayBuffer,
                                    dataUrl: canvas.toDataURL('image/png'),
                                    delay: Math.max(frame.delay || 100, 50) // Minimum 50ms delay
                                });
                                console.log(`Frame ${i + 1} processed successfully`);
                            } else {
                                console.error(`Frame ${i + 1} blob creation failed`);
                            }
                            
                        } catch (frameError) {
                            console.error(`Error processing frame ${i + 1}:`, frameError);
                            continue; // Skip this frame and continue
                        }
                    }
                    
                    if (frameData.length > 1) {
                        console.log(`Multi-frame GIF processing complete: ${frameData.length} frames extracted`);
                        return frameData;
                    } else {
                        console.log('Only one valid frame extracted, treating as static image');
                    }
                } else {
                    console.log('Single frame GIF detected');
                }
                
            } catch (gifuctError) {
                console.error('gifuct-js parsing failed:', gifuctError);
                console.log('Falling back to static image processing');
            }
        } else {
            console.log('gifuct-js not available or not properly loaded');
            console.log('Available gifuct methods:', typeof gifuct === 'object' ? Object.keys(gifuct) : 'not an object');
        }
        
        // Fallback: process as basic image
        console.log('Using basic image processing method');
        return await createFramesFromImage(gifFile);
        
    } catch (error) {
        console.error('GIF frame extraction failed:', error);
        throw error;
    }
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

// Generate real PDF (core function)
async function generateRealPdf() {
    if (!gifFrames.length || selectedPageIndex === -1 || !originalPdfDoc) {
        alert('Required data is missing.');
        return;
    }
    
    showProcessing('Generating Real PDF...', 'Creating complete PDF with animated GIF');
    updateProgress(5);
    updateStep(4);
    
    try {
        console.log('=== Real PDF generation started ===');
        
        // 1. Create new PDF document
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        console.log(`Processing ${originalPages.length} pages`);
        updateProgress(10);
        
        // 2. Copy all pages to new document
        for (let i = 0; i < originalPages.length; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // Add GIF animation to selected page
            if (i === selectedPageIndex) {
                console.log(`Adding GIF animation to page ${i + 1}`);
                await addAnimatedGifToPdfPage(newPdfDoc, addedPage, i);
            }
            
            updateProgress(10 + (i + 1) / originalPages.length * 70);
        }
        
        console.log('All pages copied');
        updateProgress(85);
        
        // 3. Set PDF metadata
        newPdfDoc.setTitle('PDF with Animated GIF');
        newPdfDoc.setCreator('PDF GIF Generator');
        newPdfDoc.setProducer('PDF GIF Web App');
        newPdfDoc.setCreationDate(new Date());
        
        // 4. Save PDF
        console.log('PDF saving started');
        const pdfBytes = await newPdfDoc.save();
        updateProgress(95);
        
        // 5. Create download URL
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        if (generatedPdfUrl) {
            URL.revokeObjectURL(generatedPdfUrl);
        }
        generatedPdfUrl = URL.createObjectURL(blob);
        
        console.log('PDF generation complete');
        updateProgress(100);
        
        // Show completion screen
        setTimeout(() => {
            hideProcessing();
            showCompletionScreen();
        }, 500);
        
    } catch (error) {
        console.error('PDF generation failed:', error);
        console.error('Error stack:', error.stack);
        alert('Error occurred during PDF generation: ' + error.message);
        hideProcessing();
    }
}

// Add animated GIF to PDF page
async function addAnimatedGifToPdfPage(pdfDoc, page, pageIndex) {
    try {
        console.log('Animated GIF insertion started');
        
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
        
        // Embed all frames to PDF
        const embeddedFrames = [];
        for (let i = 0; i < gifFrames.length; i++) {
            const frame = gifFrames[i];
            const embeddedImage = await pdfDoc.embedPng(frame.data);
            embeddedFrames.push({
                image: embeddedImage,
                delay: frame.delay
            });
        }
        
        console.log(`${embeddedFrames.length} frames embedded`);
        
        // JavaScript action-based animation implementation
        const autoPlay = elements.autoPlay.checked;
        const frameDelay = parseInt(elements.speedControl.value);
        
        // Draw first frame as default
        page.drawImage(embeddedFrames[0].image, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        // Add animation JavaScript for multiple frames
        if (embeddedFrames.length > 1) {
            // Create PDF form
            const form = pdfDoc.getForm();
            
            // Create hidden text fields for each frame (for animation)
            const frameFields = [];
            for (let i = 0; i < embeddedFrames.length; i++) {
                const fieldName = `frame_${pageIndex}_${i}`;
                const textField = form.createTextField(fieldName);
                textField.addToPage(page, {
                    x: pdfX,
                    y: pdfY,
                    width: pdfWidth,
                    height: pdfHeight,
                    backgroundColor: PDFLib.rgb(1, 1, 1),
                    borderColor: PDFLib.rgb(0, 0, 0),
                    borderWidth: 0,
                });
                
                // Try to set frame image as background
                try {
                    textField.setImage(embeddedFrames[i].image);
                } catch (e) {
                    console.log(`Frame ${i} image setting failed, using alternative method`);
                }
                
                textField.setFontSize(0); // Hide text
                frameFields.push(textField);
                
                // Show only first frame
                if (i > 0) {
                    // Hide processing (may not be fully supported)
                    try {
                        textField.setHidden(true);
                    } catch (e) {
                        console.log('Field hiding failed');
                    }
                }
            }
            
            // JavaScript action for animation control
            const animationScript = `
var currentFrame_${pageIndex} = 0;
var totalFrames_${pageIndex} = ${embeddedFrames.length};
var frameDelay_${pageIndex} = ${frameDelay};
var autoPlay_${pageIndex} = ${autoPlay};
var animationTimer_${pageIndex} = null;

function nextFrame_${pageIndex}() {
    // Hide current frame
    try {
        this.getField("frame_${pageIndex}_" + currentFrame_${pageIndex}).hidden = true;
    } catch (e) {}
    
    // Move to next frame
    currentFrame_${pageIndex} = (currentFrame_${pageIndex} + 1) % totalFrames_${pageIndex};
    
    // Show new frame
    try {
        this.getField("frame_${pageIndex}_" + currentFrame_${pageIndex}).hidden = false;
    } catch (e) {}
    
    // Schedule next frame for auto play
    if (autoPlay_${pageIndex}) {
        animationTimer_${pageIndex} = app.setTimeOut("nextFrame_${pageIndex}()", frameDelay_${pageIndex});
    }
}

function startAnimation_${pageIndex}() {
    if (animationTimer_${pageIndex}) {
        app.clearTimeOut(animationTimer_${pageIndex});
    }
    if (autoPlay_${pageIndex}) {
        nextFrame_${pageIndex}();
    }
}

// Auto start when page opens
if (autoPlay_${pageIndex}) {
    app.setTimeOut("startAnimation_${pageIndex}()", 100);
}
`;
            
            // Add JavaScript action to page (if possible)
            try {
                // Add document-level JavaScript
                pdfDoc.addJavaScript('animation_' + pageIndex, animationScript);
                console.log('JavaScript animation script added');
            } catch (jsError) {
                console.log('JavaScript addition failed, using alternative method:', jsError.message);
                
                // Alternative: overlay all frames with slight position shifts
                for (let i = 1; i < embeddedFrames.length; i++) {
                    page.drawImage(embeddedFrames[i].image, {
                        x: pdfX + (i * 2), // Slight position shift
                        y: pdfY + (i * 2),
                        width: pdfWidth - (i * 4),
                        height: pdfHeight - (i * 4),
                        opacity: 0.3 // Semi-transparent display
                    });
                }
            }
            
            // Add animation start button (if not auto play)
            if (!autoPlay) {
                const startButton = form.createButton('startBtn_' + pageIndex);
                startButton.addToPage('Play', page, {
                    x: pdfX,
                    y: pdfY - 30,
                    width: 60,
                    height: 25,
                    fontSize: 10,
                    backgroundColor: PDFLib.rgb(0.31, 0.27, 0.9),
                    borderColor: PDFLib.rgb(0, 0, 0),
                    borderWidth: 1
                });
                
                // Button click action
                try {
                    startButton.setAction(
                        PDFLib.PDFAction.createJavaScript(`startAnimation_${pageIndex}()`)
                    );
                } catch (actionError) {
                    console.log('Button action setting failed:', actionError.message);
                }
            }
        }
        
        console.log('Animated GIF insertion complete');
        return true;
        
    } catch (error) {
        console.error('Animated GIF insertion failed:', error);
        
        // Fallback: insert only first frame as static
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
            
            console.log('Fallback static image insertion complete');
        } catch (fallbackError) {
            console.error('Fallback insertion also failed:', fallbackError);
        }
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
