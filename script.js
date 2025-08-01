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

// Check browser support (updated)
function checkBrowserSupport() {
    const features = {
        fileReader: typeof FileReader !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined',
        pdfjs: typeof pdfjsLib !== 'undefined',
        pdflib: typeof PDFLib !== 'undefined',
        omggif: typeof GifReader !== 'undefined'
    };

    console.log('=== Browser Support Check ===');
    Object.entries(features).forEach(([name, supported]) => {
        console.log(`${name}: ${supported ? '✅' : '❌'}`);
    });
    
    if (!features.omggif) {
        console.warn('⚠️ omggif library not loaded - GIF animation may not work');
        console.log('Will fall back to static image processing');
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
