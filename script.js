// ==================== 전역 변수 ====================
let currentPdfFile = null;
let originalPdfDoc = null;
let renderPdfDoc = null;
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

// DOM 요소 캐시
let elements = {};

// 처리 단계 추적
let processingSteps = [];

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== PDF GIF Application 시작 ===');
    
    initializeElements();
    initializeEventListeners();
    checkBrowserSupport();
    
    console.log('초기화 완료');
});

function initializeElements() {
    elements = {
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
        processingSteps: document.getElementById('processingSteps'),
        autoPlay: document.getElementById('autoPlay'),
        speedControl: document.getElementById('speedControl'),
        speedDisplay: document.getElementById('speedDisplay'),
        maxFrames: document.getElementById('maxFrames')
    };
    
    // 요소 존재 확인
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);
    
    if (missingElements.length > 0) {
        console.error('누락된 DOM 요소:', missingElements);
    }
}

function initializeEventListeners() {
    // 파일 업로드
    if (elements.pdfInput) {
        elements.pdfInput.addEventListener('change', handlePdfUpload);
    }
    if (elements.gifInput) {
        elements.gifInput.addEventListener('change', handleGifUpload);
    }

    // 업로드 박스 클릭
    if (elements.pdfUploadBox) {
        elements.pdfUploadBox.addEventListener('click', () => elements.pdfInput?.click());
        elements.pdfUploadBox.addEventListener('dragover', handleDragOver);
        elements.pdfUploadBox.addEventListener('dragleave', handleDragLeave);
        elements.pdfUploadBox.addEventListener('drop', handleDrop);
    }

    // GIF 업로드 영역
    if (elements.gifUploadArea) {
        elements.gifUploadArea.addEventListener('click', () => elements.gifInput?.click());
    }

    // GIF 오버레이 드래그
    if (elements.gifOverlay) {
        elements.gifOverlay.addEventListener('mousedown', handleMouseDown);
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 컨트롤 입력
    const controls = ['posX', 'posY', 'gifWidth', 'gifHeight'];
    controls.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateGifPosition);
        }
    });

    // 속도 컨트롤
    if (elements.speedControl) {
        elements.speedControl.addEventListener('input', updateSpeedDisplay);
    }
    
    console.log('이벤트 리스너 등록 완료');
}

function checkBrowserSupport() {
    const support = {
        fileReader: typeof FileReader !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined',
        pdfjs: typeof pdfjsLib !== 'undefined',
        pdflib: typeof PDFLib !== 'undefined',
        omggif: typeof GifReader !== 'undefined'
    };

    console.log('=== 브라우저 지원 확인 ===');
    Object.entries(support).forEach(([feature, supported]) => {
        console.log(`${feature}: ${supported ? '✅' : '❌'}`);
    });
    
    const unsupported = Object.entries(support)
        .filter(([_, supported]) => !supported)
        .map(([feature]) => feature);
    
    if (unsupported.length > 0) {
        console.warn('지원되지 않는 기능:', unsupported);
        if (unsupported.includes('pdfjs') || unsupported.includes('pdflib')) {
            alert('필수 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해 주세요.');
        }
    }
    
    return unsupported.length === 0;
}

// ==================== PDF 업로드 및 처리 ====================
async function handlePdfUpload(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('PDF 파일만 선택할 수 있습니다.');
        e.target.value = '';
        return;
    }
    
    console.log('PDF 파일 선택됨:', file.name);
    
    // 중복 처리 방지
    if (elements.pdfInput.disabled) return;
    elements.pdfInput.disabled = true;
    
    try {
        await loadPdf(file);
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 읽을 수 없습니다: ' + error.message);
    } finally {
        elements.pdfInput.disabled = false;
    }
}

async function loadPdf(file) {
    showProcessing('PDF 분석 중...', 'PDF 파일을 읽고 있습니다');
    addProcessingStep('PDF 파일 읽기 시작');
    updateProgress(5);
    
    try {
        currentPdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        addProcessingStep('파일 읽기 완료');
        updateProgress(20);
        
        // PDF-lib으로 로드 (편집용)
        originalPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        addProcessingStep('PDF-lib 로드 완료');
        updateProgress(40);
        
        // PDF.js로 로드 (렌더링용)
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        });
        
        renderPdfDoc = await loadingTask.promise;
        addProcessingStep('PDF.js 로드 완료');
        updateProgress(60);
        
        // 페이지 로드
        pdfPages = [];
        for (let i = 1; i <= renderPdfDoc.numPages; i++) {
            pdfPages.push(await renderPdfDoc.getPage(i));
        }
        addProcessingStep(`${pdfPages.length}개 페이지 로드 완료`);
        updateProgress(80);
        
        // UI 업데이트
        updatePdfInfo(file.name, pdfPages.length);
        await generatePageThumbnails();
        
        updateProgress(100);
        addProcessingStep('썸네일 생성 완료');
        
        // 화면 전환
        elements.uploadSection.style.display = 'none';
        elements.workspace.style.display = 'block';
        
        hideProcessing();
        console.log('PDF 로드 완료');
        
    } catch (error) {
        addProcessingStep('오류: ' + error.message);
        throw error;
    }
}

function updatePdfInfo(filename, pageCount) {
    const filenameEl = document.getElementById('pdfFileName');
    const pageCountEl = document.getElementById('pdfPageCount');
    
    if (filenameEl) filenameEl.textContent = filename;
    if (pageCountEl) pageCountEl.textContent = `총 페이지 수: ${pageCount}`;
}

async function generatePageThumbnails() {
    if (!elements.pagesGrid) return;
    
    elements.pagesGrid.innerHTML = '';
    addProcessingStep('페이지 썸네일 생성 중...');
    
    for (let i = 0; i < pdfPages.length; i++) {
        try {
            const page = pdfPages[i];
            const scale = 0.4; // 썸네일 크기 조정
            const viewport = page.getViewport({ scale });
            
            // 캔버스 생성
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // 페이지 렌더링
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // 썸네일 요소 생성
            const thumbnail = createThumbnailElement(i, canvas.toDataURL('image/png'));
            elements.pagesGrid.appendChild(thumbnail);
            
        } catch (error) {
            console.error(`페이지 ${i + 1} 썸네일 생성 실패:`, error);
            
            // 오류 발생 시 기본 썸네일
            const thumbnail = createThumbnailElement(i, null);
            elements.pagesGrid.appendChild(thumbnail);
        }
    }
}

function createThumbnailElement(pageIndex, imageDataUrl) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'page-thumbnail';
    thumbnail.dataset.pageIndex = pageIndex;
    
    if (imageDataUrl) {
        thumbnail.innerHTML = `
            <img src="${imageDataUrl}" alt="페이지 ${pageIndex + 1}">
            <div class="page-number">페이지 ${pageIndex + 1}</div>
        `;
    } else {
        thumbnail.innerHTML = `
            <div style="width: 150px; height: 200px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-bottom: 8px;">
                <span style="color: #6b7280;">페이지 ${pageIndex + 1}</span>
            </div>
            <div class="page-number">페이지 ${pageIndex + 1}</div>
        `;
    }
    
    thumbnail.addEventListener('click', () => selectPage(pageIndex));
    return thumbnail;
}

// ==================== 페이지 선택 ====================
function selectPage(pageIndex) {
    // 이전 선택 해제
    document.querySelectorAll('.page-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });
    
    // 새 선택
    const selectedThumbnail = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (selectedThumbnail) {
        selectedThumbnail.classList.add('selected');
        selectedPageIndex = pageIndex;
        elements.btnSelectPage.disabled = false;
        
        console.log('페이지 선택됨:', pageIndex + 1);
    }
}

function proceedToGifUpload() {
    if (selectedPageIndex === -1) {
        alert('페이지를 선택해주세요.');
        return;
    }
    
    console.log('GIF 업로드 단계로 진행');
    updateStep(2);
    elements.pageSelector.style.display = 'none';
    elements.gifPositionEditor.style.display = 'block';
    
    renderPagePreview();
}

async function renderPagePreview() {
    if (!elements.pdfPreviewCanvas || selectedPageIndex === -1) return;
    
    try {
        const page = pdfPages[selectedPageIndex];
        
        // 컨테이너에 맞는 스케일 계산
        const containerWidth = elements.pdfPreviewContainer.clientWidth - 4;
        const tempViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / tempViewport.width, 600 / tempViewport.height);
        const viewport = page.getViewport({ scale });
        
        // 캔버스 크기 설정
        elements.pdfPreviewCanvas.width = viewport.width;
        elements.pdfPreviewCanvas.height = viewport.height;
        
        // 페이지 렌더링
        await page.render({
            canvasContext: elements.pdfPreviewCanvas.getContext('2d'),
            viewport: viewport
        }).promise;
        
        console.log('페이지 미리보기 렌더링 완료');
        
    } catch (error) {
        console.error('페이지 미리보기 렌더링 실패:', error);
        showErrorCanvas('페이지 렌더링 실패');
    }
}

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

// ==================== GIF 업로드 및 처리 ====================
async function handleGifUpload(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'image/gif') {
        alert('GIF 파일만 선택할 수 있습니다.');
        e.target.value = '';
        return;
    }
    
    showProcessing('GIF 처리 중...', 'GIF 프레임을 추출하고 있습니다');
    addProcessingStep('GIF 파일 분석 시작');
    updateProgress(10);
    
    try {
        gifFile = file;
        gifFrames = await extractGifFrames(file);
        
        if (gifFrames.length === 0) {
            throw new Error('GIF 프레임을 추출할 수 없습니다');
        }
        
        addProcessingStep(`${gifFrames.length}개 프레임 추출 완료`);
        updateProgress(80);
        
        // 프레임 수 제한 확인
        const maxFrames = parseInt(elements.maxFrames?.value || 20);
        if (gifFrames.length > maxFrames) {
            gifFrames = gifFrames.slice(0, maxFrames);
            addProcessingStep(`프레임 수를 ${maxFrames}개로 제한`);
        }
        
        // GIF 미리보기 생성
        displayGifPreview(file);
        showGifOverlay();
        
        updateStep(3);
        updateProgress(100);
        hideProcessing();
        
        console.log('GIF 처리 완료:', gifFrames.length, '프레임');
        
    } catch (error) {
        console.error('GIF 처리 실패:', error);
        alert('GIF 파일을 처리할 수 없습니다: ' + error.message);
        hideProcessing();
    }
}

async function extractGifFrames(gifFile) {
    console.log('GIF 프레임 추출 시작');
    
    try {
        const arrayBuffer = await gifFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // omggif 라이브러리 사용
        if (typeof GifReader !== 'undefined') {
            return await extractWithOmggif(uint8Array);
        }
        
        // 폴백: 정적 이미지로 처리
        console.log('omggif 라이브러리 없음, 정적 이미지로 처리');
        return await createStaticFrame(gifFile);
        
    } catch (error) {
        console.error('GIF 프레임 추출 실패:', error);
        throw error;
    }
}

async function extractWithOmggif(uint8Array) {
    try {
        const reader = new GifReader(uint8Array);
        const frameCount = reader.numFrames();
        
        console.log(`GIF 분석: ${frameCount}개 프레임 발견`);
        addProcessingStep(`${frameCount}개 프레임 발견`);
        updateProgress(30);
        
        if (frameCount <= 1) {
            console.log('단일 프레임 GIF 또는 정적 이미지');
            return await createStaticFrame(new Blob([uint8Array], { type: 'image/gif' }));
        }
        
        const frames = [];
        const maxFrames = Math.min(frameCount, parseInt(elements.maxFrames?.value || 20));
        
        for (let i = 0; i < maxFrames; i++) {
            try {
                const frameInfo = reader.frameInfo(i);
                
                // 캔버스 생성
                const canvas = document.createElement('canvas');
                canvas.width = reader.width;
                canvas.height = reader.height;
                const ctx = canvas.getContext('2d');
                
                // 배경색 설정
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // 프레임 데이터 생성
                const imageData = ctx.createImageData(canvas.width, canvas.height);
                
                // 프레임 디코딩
                reader.decodeAndBlitFrameRGBA(i, imageData.data);
                
                // 캔버스에 그리기
                ctx.putImageData(imageData, 0, 0);
                
                // PNG 블롭으로 변환
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/png', 1.0);
                });
                
                if (blob) {
                    const frameBuffer = await blob.arrayBuffer();
                    frames.push({
                        data: frameBuffer,
                        dataUrl: canvas.toDataURL('image/png'),
                        delay: Math.max(frameInfo.delay * 10, 100) // 최소 100ms
                    });
                    
                    // 진행상황 업데이트
                    const progress = 30 + (i / maxFrames) * 40;
                    updateProgress(progress);
                }
                
            } catch (frameError) {
                console.error(`프레임 ${i} 처리 실패:`, frameError);
                continue;
            }
        }
        
        addProcessingStep(`${frames.length}개 프레임 변환 완료`);
        
        if (frames.length === 0) {
            throw new Error('유효한 프레임을 추출할 수 없습니다');
        }
        
        return frames;
        
    } catch (error) {
        console.error('omggif 처리 실패:', error);
        
        // 폴백
        console.log('정적 이미지로 폴백');
        return await createStaticFrame(new Blob([uint8Array], { type: 'image/gif' }));
    }
}

async function createStaticFrame(gifFile) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = async function() {
            try {
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
                    resolve([{
                        data: arrayBuffer,
                        dataUrl: canvas.toDataURL('image/png'),
                        delay: 1000
                    }]);
                } else {
                    reject(new Error('이미지 변환 실패'));
                }
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        
        // 파일을 데이터 URL로 변환
        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(gifFile);
    });
}

function displayGifPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        elements.gifUploadArea.innerHTML = `
            <img src="${e.target.result}" class="gif-preview" alt="GIF 미리보기">
            <p>GIF 업로드됨 (${gifFrames.length}개 프레임)</p>
            <small>클릭하여 다른 파일 선택</small>
        `;
        elements.gifUploadArea.classList.add('has-gif');
    };
    reader.readAsDataURL(file);
}

function showGifOverlay() {
    // 기본 위치 설정
    gifPosition = {
        x: Math.max(0, (elements.pdfPreviewCanvas.width - 100) / 2),
        y: Math.max(0, (elements.pdfPreviewCanvas.height - 100) / 2),
        width: 100,
        height: 100
    };
    
    // 첫 번째 프레임 표시
    if (gifFrames.length > 0) {
        elements.gifPreviewElement.innerHTML = `<img src="${gifFrames[0].dataUrl}" alt="GIF 미리보기">`;
    }
    
    updateGifOverlayPosition();
    elements.gifOverlay.style.display = 'block';
    elements.btnGeneratePdf.disabled = false;
    
    console.log('GIF 오버레이 표시됨');
}

// ==================== GIF 위치 조정 ====================
function updateGifOverlayPosition() {
    if (!elements.pdfPreviewCanvas || !elements.gifOverlay) return;
    
    const canvasRect = elements.pdfPreviewCanvas.getBoundingClientRect();
    const scaleX = elements.pdfPreviewCanvas.width / canvasRect.width;
    const scaleY = elements.pdfPreviewCanvas.height / canvasRect.height;
    
    // 경계 제한
    const maxX = elements.pdfPreviewCanvas.width - gifPosition.width;
    const maxY = elements.pdfPreviewCanvas.height - gifPosition.height;
    
    gifPosition.x = Math.max(0, Math.min(maxX, gifPosition.x));
    gifPosition.y = Math.max(0, Math.min(maxY, gifPosition.y));
    gifPosition.width = Math.max(20, Math.min(elements.pdfPreviewCanvas.width - gifPosition.x, gifPosition.width));
    gifPosition.height = Math.max(20, Math.min(elements.pdfPreviewCanvas.height - gifPosition.y, gifPosition.height));
    
    // 오버레이 위치 업데이트
    elements.gifOverlay.style.left = (gifPosition.x / scaleX) + 'px';
    elements.gifOverlay.style.top = (gifPosition.y / scaleY) + 'px';
    elements.gifOverlay.style.width = (gifPosition.width / scaleX) + 'px';
    elements.gifOverlay.style.height = (gifPosition.height / scaleY) + 'px';
    
    // 컨트롤 패널 업데이트
    updateControlValues();
}

function updateControlValues() {
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const gifWidth = document.getElementById('gifWidth');
    const gifHeight = document.getElementById('gifHeight');
    
    if (posX) posX.value = Math.round(gifPosition.x);
    if (posY) posY.value = Math.round(gifPosition.y);
    if (gifWidth) gifWidth.value = Math.round(gifPosition.width);
    if (gifHeight) gifHeight.value = Math.round(gifPosition.height);
}

function updateGifPosition() {
    const x = parseFloat(document.getElementById('posX')?.value || 0);
    const y = parseFloat(document.getElementById('posY')?.value || 0);
    const width = parseFloat(document.getElementById('gifWidth')?.value || 100);
    const height = parseFloat(document.getElementById('gifHeight')?.value || 100);
    
    gifPosition = { x, y, width, height };
    updateGifOverlayPosition();
}

function updateSpeedDisplay() {
    if (elements.speedDisplay && elements.speedControl) {
        elements.speedDisplay.textContent = elements.speedControl.value + 'ms';
    }
}

// ==================== 마우스 이벤트 처리 ====================
function handleMouseDown(e) {
    e.preventDefault();
    
    if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        resizeHandle = e.target.classList[1]; // nw, ne, sw, se
    } else {
        isDragging = true;
    }
    
    const rect = elements.pdfPreviewContainer.getBoundingClientRect();
    dragStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    console.log('마우스 이벤트 시작:', isDragging ? '드래그' : '리사이즈');
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
    if (isDragging || isResizing) {
        console.log('마우스 이벤트 종료');
    }
    
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
}

// ==================== 드래그 앤 드롭 ====================
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.pdfUploadBox?.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.pdfUploadBox?.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.pdfUploadBox?.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        elements.pdfInput.files = files;
        loadPdf(files[0]);
    } else {
        alert('PDF 파일만 업로드할 수 있습니다.');
    }
}

// ==================== PDF 생성 ====================
async function generateAdvancedPdf() {
    if (!gifFrames.length || selectedPageIndex === -1 || !originalPdfDoc) {
        alert('필요한 데이터가 누락되었습니다.');
        return;
    }
    
    showProcessing('올바른 방식으로 PDF 생성 중...', '한 페이지에서 필드 겹치기 방식으로 애니메이션 생성');
    addProcessingStep('올바른 PDF 생성 방식 시작');
    updateProgress(5);
    updateStep(4);
    
    try {
        console.log('=== 올바른 단일 페이지 애니메이션 PDF 생성 시작 ===');
        
        // 새 PDF 문서 생성
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        addProcessingStep('원본 페이지들 복사 중...');
        updateProgress(15);
        
        // 모든 페이지 복사 (원본 구조 유지)
        for (let i = 0; i < originalPages.length; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // 선택된 페이지에만 애니메이션 추가
            if (i === selectedPageIndex) {
                console.log(`페이지 ${i + 1}에 단일 페이지 애니메이션 추가`);
                addProcessingStep(`페이지 ${i + 1}에 겹침 필드 애니메이션 추가`);
                await addOverlappingFieldAnimation(newPdfDoc, addedPage, i);
            }
            
            const progress = 15 + ((i + 1) / originalPages.length) * 60;
            updateProgress(progress);
        }
        
        addProcessingStep('애니메이션 JavaScript 추가 중...');
        updateProgress(80);
        
        // 애니메이션 제어 JavaScript 추가
        const controlJS = createOverlappingFieldJavaScript(selectedPageIndex, gifFrames.length);
        newPdfDoc.addJavaScript('OverlappingFieldAnimation', controlJS);
        
        addProcessingStep('PDF 파일 생성 중...');
        updateProgress(90);
        
        // PDF 저장
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        if (generatedPdfUrl) {
            URL.revokeObjectURL(generatedPdfUrl);
        }
        generatedPdfUrl = URL.createObjectURL(blob);
        
        addProcessingStep('단일 페이지 애니메이션 PDF 생성 완료!');
        updateProgress(100);
        
        setTimeout(() => {
            hideProcessing();
            showCompletionScreen();
        }, 1000);
        
        console.log('단일 페이지 애니메이션 PDF 생성 완료');
        
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        addProcessingStep('오류: ' + error.message);
        alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
        hideProcessing();
    }
}

async function addOverlappingFieldAnimation(pdfDoc, page, pageIndex) {
    try {
        console.log('겹침 필드 애니메이션 추가');
        
        // 페이지 크기 및 좌표 계산
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        // PDF 좌표계로 변환
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('애니메이션 위치:', { pdfX, pdfY, pdfWidth, pdfHeight });
        
        // 단일 프레임 처리
        if (gifFrames.length === 1) {
            console.log('단일 프레임 이미지 추가');
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            page.drawImage(embeddedImage, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
            });
            return true;
        }
        
        // 멀티 프레임 애니메이션 - 이미지를 페이지에 직접 그린 후 필드로 덮기
        console.log(`${gifFrames.length}개 프레임 겹침 필드 애니메이션 설정`);
        
        // 모든 프레임 이미지를 페이지에 직접 그리기 (겹쳐서)
        const embeddedImages = [];
        for (let i = 0; i < gifFrames.length; i++) {
            const embeddedImage = await pdfDoc.embedPng(gifFrames[i].data);
            embeddedImages.push(embeddedImage);
            
            // 모든 프레임을 같은 위치에 그리기
            page.drawImage(embeddedImage, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
            });
        }
        
        // 투명한 사각형 필드들을 각 이미지 위에 생성 (덮개 역할)
        const form = pdfDoc.getForm();
        const fieldNames = [];
        
        for (let i = 0; i < embeddedImages.length; i++) {
            const fieldName = `cover_${pageIndex}_${i}`;
            fieldNames.push(fieldName);
            
            try {
                // PDF-lib 버전 호환성을 위한 안전한 버튼 필드 생성
                const rect = PDFLib.PDFRectangle.of(pdfX, pdfY, pdfX + pdfWidth, pdfY + pdfHeight);
                
                // 직접 PDF 딕셔너리 조작으로 필드 생성 (addToPage 사용 안 함)
                const buttonDict = pdfDoc.context.obj({
                    Type: 'Annot',
                    Subtype: 'Widget',
                    FT: 'Btn',
                    T: PDFLib.PDFString.of(fieldName),
                    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
                    F: 4, // Print flag
                    Ff: 65536, // PushButton flag
                    BS: pdfDoc.context.obj({
                        Type: 'Border',
                        W: 0 // 테두리 없음
                    }),
                    BG: [1, 1, 1, 0], // 투명 배경
                    AP: pdfDoc.context.obj({
                        N: pdfDoc.context.obj({
                            Type: 'XObject',
                            Subtype: 'Form',
                            BBox: [0, 0, rect.width, rect.height],
                            Matrix: [1, 0, 0, 1, 0, 0]
                        })
                    })
                });
                
                // 첫 번째 프레임 외에는 숨김 처리
                if (i > 0) {
                    buttonDict.set(PDFLib.PDFName.of('F'), PDFLib.PDFNumber.of(6)); // Hidden + Print
                }
                
                // 페이지에 필드 추가
                const buttonRef = pdfDoc.context.register(buttonDict);
                const pageDict = page.node;
                const annots = pageDict.lookup(PDFLib.PDFName.of('Annots'), PDFLib.PDFArray) || pdfDoc.context.obj([]);
                annots.push(buttonRef);
                pageDict.set(PDFLib.PDFName.of('Annots'), annots);
                
                // 폼에 필드 등록
                const acroForm = pdfDoc.catalog.lookup(PDFLib.PDFName.of('AcroForm'));
                if (acroForm) {
                    const fields = acroForm.lookup(PDFLib.PDFName.of('Fields'), PDFLib.PDFArray) || pdfDoc.context.obj([]);
                    fields.push(buttonRef);
                    acroForm.set(PDFLib.PDFName.of('Fields'), fields);
                }
                
                console.log(`커버 필드 ${i} 생성 완료: ${fieldName}`);
                
            } catch (fieldError) {
                console.error(`커버 필드 ${i} 생성 실패:`, fieldError);
                
                // 폴백: 주석으로 마킹
                try {
                    const annotDict = pdfDoc.context.obj({
                        Type: 'Annot',
                        Subtype: 'Square',
                        Rect: [pdfX, pdfY, pdfX + pdfWidth, pdfY + pdfHeight],
                        T: PDFLib.PDFString.of(fieldName),
                        F: i === 0 ? 4 : 6, // 첫 번째만 보이기
                        C: [0, 0, 0, 0], // 투명
                        IC: [0, 0, 0, 0] // 투명 내부
                    });
                    
                    const annotRef = pdfDoc.context.register(annotDict);
                    const pageDict = page.node;
                    const annots = pageDict.lookup(PDFLib.PDFName.of('Annots'), PDFLib.PDFArray) || pdfDoc.context.obj([]);
                    annots.push(annotRef);
                    pageDict.set(PDFLib.PDFName.of('Annots'), annots);
                    
                    console.log(`폴백 주석 ${i} 생성`);
                    
                } catch (annotError) {
                    console.error(`주석 폴백도 실패:`, annotError);
                }
            }
        }
        
        console.log('겹침 필드 애니메이션 설정 완료');
        return { success: true, fieldNames };
        
    } catch (error) {
        console.error('겹침 필드 애니메이션 추가 실패:', error);
        
        // 완전한 폴백: 첫 번째 프레임만 이미지로 추가
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
            
            console.log('완전 폴백: 정적 이미지만 추가');
            return { success: false, fallback: true };
            
        } catch (fallbackError) {
            console.error('완전 폴백도 실패:', fallbackError);
            return { success: false, fallback: false };
        }
    }
}

function createOverlappingFieldJavaScript(pageIndex, frameCount) {
    const autoPlay = elements.autoPlay?.checked !== false;
    const frameDelay = parseInt(elements.speedControl?.value || 500);
    
    return `
// === 겹침 필드 기반 애니메이션 시스템 ===
console.println("겹침 필드 애니메이션 시스템 로드됨 - 페이지 ${pageIndex}");

var OverlapAnimation_${pageIndex} = {
    pageIndex: ${pageIndex},
    currentFrame: 0,
    totalFrames: ${frameCount},
    frameDelay: ${frameDelay},
    autoPlay: ${autoPlay},
    isRunning: false,
    timer: null,
    
    // 안전한 필드 접근
    getFieldSafely: function(fieldName) {
        try {
            return this.getField(fieldName);
        } catch (e) {
            console.println("필드 접근 실패: " + fieldName);
            return null;
        }
    },
    
    // 모든 커버 필드 숨기기
    hideAllCovers: function() {
        for (var i = 0; i < this.totalFrames; i++) {
            try {
                var fieldName = "cover_${pageIndex}_" + i;
                var field = this.getFieldSafely(fieldName);
                if (field) {
                    field.display = display.hidden;
                }
            } catch (e) {
                console.println("커버 " + i + " 숨김 실패: " + e.message);
            }
        }
    },
    
    // 특정 커버 필드만 표시 (해당 프레임 보이기)
    showCover: function(frameIndex) {
        try {
            var fieldName = "cover_${pageIndex}_" + frameIndex;
            var field = this.getFieldSafely(fieldName);
            if (field) {
                field.display = display.visible;
                console.println("프레임 " + frameIndex + " 표시됨 (커버 숨김)");
            }
        } catch (e) {
            console.println("커버 " + frameIndex + " 표시 실패: " + e.message);
        }
    },
    
    // 다음 프레임으로 전환
    nextFrame: function() {
        console.println("프레임 전환: " + this.currentFrame + " -> " + ((this.currentFrame + 1) % this.totalFrames));
        
        // 모든 커버 숨기고 (모든 이미지 보이기)
        this.hideAllCovers();
        
        // 다음 프레임으로
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        
        // 현재 프레임만 커버로 가리기 (다른 프레임들은 보이게)
        for (var i = 0; i < this.totalFrames; i++) {
            if (i !== this.currentFrame) {
                this.showCover(i);
            }
        }
        
        // 계속 실행
        if (this.isRunning && this.autoPlay) {
            var self = this;
            try {
                this.timer = app.setTimeOut(function() { 
                    self.nextFrame(); 
                }, this.frameDelay);
            } catch (timerError) {
                console.println("타이머 설정 실패: " + timerError.message);
                this.isRunning = false;
            }
        }
    },
    
    // 애니메이션 시작
    start: function() {
        console.println("겹침 필드 애니메이션 시작");
        this.isRunning = true;
        
        if (this.timer) {
            try { app.clearTimeOut(this.timer); } catch (e) {}
            this.timer = null;
        }
        
        // 첫 번째 프레임 표시 (다른 모든 커버 표시)
        this.hideAllCovers();
        for (var i = 1; i < this.totalFrames; i++) {
            this.showCover(i);
        }
        this.currentFrame = 0;
        
        if (this.totalFrames > 1) {
            var self = this;
            try {
                this.timer = app.setTimeOut(function() { 
                    self.nextFrame(); 
                }, this.frameDelay);
            } catch (e) {
                console.println("시작 타이머 실패: " + e.message);
                this.isRunning = false;
            }
        }
    },
    
    // 애니메이션 정지
    stop: function() {
        console.println("겹침 필드 애니메이션 정지");
        this.isRunning = false;
        
        if (this.timer) {
            try { app.clearTimeOut(this.timer); } catch (e) {}
            this.timer = null;
        }
    },
    
    // 초기화
    init: function() {
        console.println("겹침 필드 애니메이션 초기화");
        
        // 첫 번째 프레임만 보이도록 설정
        this.hideAllCovers();
        for (var i = 1; i < this.totalFrames; i++) {
            this.showCover(i);
        }
        this.currentFrame = 0;
        
        // 자동재생
        if (this.autoPlay && this.totalFrames > 1) {
            var self = this;
            try {
                app.setTimeOut(function() { 
                    self.start(); 
                }, 2000);
            } catch (e) {
                console.println("자동재생 시작 실패: " + e.message);
            }
        }
    }
};

// 자동 초기화
try {
    app.setTimeOut(function() {
        OverlapAnimation_${pageIndex}.init();
    }, 1500);
} catch (e) {
    console.println("초기화 스케줄링 실패: " + e.message);
}

console.println("겹침 필드 애니메이션 준비 완료 - ${frameCount}개 프레임");
`;
}

async function generateMultiPageAnimation() {
    console.log('멀티 페이지 애니메이션 생성');
    
    // 새 PDF 문서 생성
    const newPdfDoc = await PDFLib.PDFDocument.create();
    const originalPages = originalPdfDoc.getPages();
    
    addProcessingStep('기본 페이지들 복사 중...');
    updateProgress(10);
    
    // 애니메이션이 들어갈 페이지 전까지 복사
    for (let i = 0; i < selectedPageIndex; i++) {
        const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
        newPdfDoc.addPage(copiedPage);
    }
    
    addProcessingStep('애니메이션 프레임 페이지들 생성 중...');
    const animationStartProgress = 20;
    const animationEndProgress = 70;
    
    // 각 GIF 프레임을 별도 페이지로 생성
    for (let frameIndex = 0; frameIndex < gifFrames.length; frameIndex++) {
        try {
            // 원본 페이지 복사
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [selectedPageIndex]);
            const animPage = newPdfDoc.addPage(copiedPage);
            
            // 이미지를 페이지에 직접 그리기 (폼 필드 없음)
            await addImageDirectlyToPage(newPdfDoc, animPage, frameIndex);
            
            const progress = animationStartProgress + 
                ((frameIndex + 1) / gifFrames.length) * (animationEndProgress - animationStartProgress);
            updateProgress(progress);
            
            console.log(`프레임 ${frameIndex + 1}/${gifFrames.length} 페이지 생성 완료`);
            
        } catch (frameError) {
            console.error(`프레임 ${frameIndex} 페이지 생성 실패:`, frameError);
            addProcessingStep(`프레임 ${frameIndex} 오류, 건너뜀`);
        }
    }
    
    addProcessingStep('나머지 페이지들 복사 중...');
    updateProgress(75);
    
    // 애니메이션 페이지 이후의 페이지들 복사
    for (let i = selectedPageIndex + 1; i < originalPages.length; i++) {
        const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
        newPdfDoc.addPage(copiedPage);
    }
    
    // 페이지 자동 전환 JavaScript 추가
    addProcessingStep('페이지 전환 JavaScript 추가 중...');
    updateProgress(85);
    
    const pageTransitionJS = createPageTransitionJavaScript(selectedPageIndex, gifFrames.length);
    newPdfDoc.addJavaScript('PageTransitionAnimation', pageTransitionJS);
    
    addProcessingStep('PDF 파일 생성 중...');
    updateProgress(90);
    
    // PDF 저장
    const pdfBytes = await newPdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
    generatedPdfUrl = URL.createObjectURL(blob);
    
    addProcessingStep('멀티 페이지 애니메이션 PDF 생성 완료!');
    updateProgress(100);
    
    setTimeout(() => {
        hideProcessing();
        showCompletionScreen();
    }, 1000);
    
    console.log('멀티 페이지 애니메이션 PDF 생성 완료');
}

async function generateSingleFramePdf() {
    console.log('단일 프레임 PDF 생성');
    
    const newPdfDoc = await PDFLib.PDFDocument.create();
    const originalPages = originalPdfDoc.getPages();
    
    addProcessingStep('모든 페이지 복사 중...');
    updateProgress(20);
    
    // 모든 페이지 복사
    for (let i = 0; i < originalPages.length; i++) {
        const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
        const addedPage = newPdfDoc.addPage(copiedPage);
        
        // 선택된 페이지에만 이미지 추가
        if (i === selectedPageIndex) {
            await addImageDirectlyToPage(newPdfDoc, addedPage, 0);
        }
        
        const progress = 20 + ((i + 1) / originalPages.length) * 60;
        updateProgress(progress);
    }
    
    addProcessingStep('PDF 파일 생성 중...');
    updateProgress(90);
    
    // PDF 저장
    const pdfBytes = await newPdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
    generatedPdfUrl = URL.createObjectURL(blob);
    
    addProcessingStep('단일 프레임 PDF 생성 완료!');
    updateProgress(100);
    
    setTimeout(() => {
        hideProcessing();
        showCompletionScreen();
    }, 1000);
    
    console.log('단일 프레임 PDF 생성 완료');
}

async function addImageDirectlyToPage(pdfDoc, page, frameIndex) {
    try {
        // 페이지 크기 및 좌표 계산
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        // PDF 좌표계로 변환
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        // 이미지 임베드 및 그리기
        const embeddedImage = await pdfDoc.embedPng(gifFrames[frameIndex].data);
        page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        console.log(`프레임 ${frameIndex} 이미지가 페이지에 직접 추가됨`);
        return true;
        
    } catch (error) {
        console.error(`프레임 ${frameIndex} 이미지 추가 실패:`, error);
        return false;
    }
}

function createPageTransitionJavaScript(startPageIndex, frameCount) {
    const autoPlay = elements.autoPlay?.checked !== false;
    const frameDelay = parseInt(elements.speedControl?.value || 500);
    
    return `
// === 페이지 전환 기반 애니메이션 시스템 ===
console.println("페이지 전환 애니메이션 시스템 로드됨");

var PageAnimation = {
    startPage: ${startPageIndex},
    frameCount: ${frameCount},
    frameDelay: ${frameDelay},
    autoPlay: ${autoPlay},
    currentFrame: 0,
    isRunning: false,
    timer: null,
    
    // 특정 프레임 페이지로 이동
    goToFrame: function(frameIndex) {
        try {
            var targetPage = this.startPage + frameIndex;
            if (targetPage >= 0 && targetPage < this.numPages) {
                this.pageNum = targetPage;
                console.println("페이지 " + targetPage + "로 이동 (프레임 " + frameIndex + ")");
            }
        } catch (e) {
            console.println("페이지 이동 실패: " + e.message);
        }
    },
    
    // 다음 프레임으로 전환
    nextFrame: function() {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        this.goToFrame(this.currentFrame);
        
        if (this.isRunning && this.autoPlay) {
            var self = this;
            try {
                this.timer = app.setTimeOut(function() {
                    self.nextFrame();
                }, this.frameDelay);
            } catch (timerError) {
                console.println("타이머 설정 실패: " + timerError.message);
                this.isRunning = false;
            }
        }
    },
    
    // 애니메이션 시작
    start: function() {
        console.println("페이지 전환 애니메이션 시작");
        this.isRunning = true;
        
        if (this.timer) {
            try {
                app.clearTimeOut(this.timer);
            } catch (e) {}
            this.timer = null;
        }
        
        // 첫 번째 애니메이션 프레임으로 이동
        this.goToFrame(0);
        this.currentFrame = 0;
        
        if (this.frameCount > 1) {
            var self = this;
            try {
                this.timer = app.setTimeOut(function() {
                    self.nextFrame();
                }, this.frameDelay);
            } catch (e) {
                console.println("애니메이션 시작 실패: " + e.message);
                this.isRunning = false;
            }
        }
    },
    
    // 애니메이션 정지
    stop: function() {
        console.println("페이지 전환 애니메이션 정지");
        this.isRunning = false;
        
        if (this.timer) {
            try {
                app.clearTimeOut(this.timer);
            } catch (e) {}
            this.timer = null;
        }
    },
    
    // 초기화
    init: function() {
        console.println("페이지 전환 애니메이션 초기화");
        
        // 첫 번째 애니메이션 페이지로 이동
        this.goToFrame(0);
        this.currentFrame = 0;
        
        // 자동재생 시작
        if (this.autoPlay && this.frameCount > 1) {
            var self = this;
            try {
                app.setTimeOut(function() {
                    self.start();
                }, 2000); // 2초 후 시작
            } catch (e) {
                console.println("자동재생 스케줄링 실패: " + e.message);
            }
        }
    }
};

// 문서 열기 시 자동 초기화
try {
    if (typeof app !== 'undefined') {
        app.setTimeOut(function() {
            PageAnimation.init();
        }, 1500);
    }
} catch (initError) {
    console.println("초기화 실패: " + initError.message);
}

// 수동 제어 함수들
function startPageAnimation() {
    PageAnimation.start();
}

function stopPageAnimation() {
    PageAnimation.stop();
}

function nextAnimationFrame() {
    PageAnimation.nextFrame();
}

console.println("페이지 전환 애니메이션 준비 완료");
console.println("프레임 수: ${frameCount}, 시작 페이지: ${startPageIndex}");
`;
}

async function addAdvancedAnimationToPage(pdfDoc, page, pageIndex) {
    try {
        console.log('향상된 애니메이션 시스템 추가');
        
        // 페이지 크기 및 좌표 계산
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        // PDF 좌표계로 변환 (bottom-left origin)
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('애니메이션 위치:', { pdfX, pdfY, pdfWidth, pdfHeight });
        
        // 단일 프레임 처리
        if (gifFrames.length === 1) {
            console.log('단일 프레임 이미지 추가');
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            page.drawImage(embeddedImage, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
            });
            return true;
        }
        
        // 멀티 프레임 애니메이션
        console.log(`${gifFrames.length}개 프레임 애니메이션 설정`);
        
        // 이미지 임베드
        const embeddedImages = [];
        for (let i = 0; i < gifFrames.length; i++) {
            const embeddedImage = await pdfDoc.embedPng(gifFrames[i].data);
            embeddedImages.push(embeddedImage);
        }
        
        // 첫 번째 프레임을 페이지에 직접 그리기
        page.drawImage(embeddedImages[0], {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        // 폼 필드 생성
        const form = pdfDoc.getForm();
        const frameFields = [];
        
        for (let i = 0; i < embeddedImages.length; i++) {
            const fieldName = `frame_${pageIndex}_${i}`;
            
            // 버튼 필드 생성
            const buttonField = form.createButton(fieldName);
            
            buttonField.addToPage(page, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                backgroundColor: PDFLib.rgb(1, 1, 1),
                borderWidth: 0
            });
            
            // 첫 번째 프레임 외에는 숨김
            if (i > 0) {
                try {
                    buttonField.setHidden(true);
                } catch (hideError) {
                    console.log(`프레임 ${i} 숨김 실패:`, hideError.message);
                }
            }
            
            frameFields.push(buttonField);
        }
        
        // 애니메이션 JavaScript 생성
        const animationJS = createAnimationJavaScript(pageIndex, gifFrames.length);
        pdfDoc.addJavaScript(`Animation_Page_${pageIndex}`, animationJS);
        
        // 컨트롤 버튼 추가 (자동재생이 아닌 경우)
        const autoPlay = elements.autoPlay?.checked !== false;
        if (!autoPlay) {
            await addControlButton(form, page, pageIndex, pdfX, pdfY, pdfWidth);
        }
        
        console.log('향상된 애니메이션 설정 완료');
        return true;
        
    } catch (error) {
        console.error('애니메이션 추가 실패:', error);
        
        // 폴백: 첫 번째 프레임만 추가
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
            
            console.log('폴백: 정적 이미지 추가');
        } catch (fallbackError) {
            console.error('폴백도 실패:', fallbackError);
        }
        
        return false;
    }
}

function createAnimationJavaScript(pageIndex, frameCount) {
    const autoPlay = elements.autoPlay?.checked !== false;
    const frameDelay = parseInt(elements.speedControl?.value || 500);
    
    return `
// === 수정된 Chrome PDF 뷰어 호환 애니메이션 시스템 ===
console.println("페이지 ${pageIndex} 향상된 애니메이션 시스템 로드");

var EnhancedAnimation_${pageIndex} = {
    pageIndex: ${pageIndex},
    currentFrame: 0,
    totalFrames: ${frameCount},
    frameDelay: ${frameDelay},
    autoPlay: ${autoPlay},
    isRunning: false,
    timer: null,
    
    // 안전한 필드 접근
    getFrameField: function(frameIndex) {
        var fieldName = "animFrame${pageIndex}_" + frameIndex;
        try {
            var field = this.getField(fieldName);
            if (!field) {
                // 폴백 필드명 시도
                fieldName = "animFrame${pageIndex}_" + frameIndex + "_btn";
                field = this.getField(fieldName);
            }
            return field;
        } catch (e) {
            console.println("필드 접근 실패: " + fieldName + " - " + e.message);
            return null;
        }
    },
    
    // 초기화
    init: function() {
        console.println("향상된 애니메이션 시스템 초기화 - 페이지 ${pageIndex}");
        
        try {
            // 필드 존재 확인
            var validFields = 0;
            for (var i = 0; i < this.totalFrames; i++) {
                var field = this.getFrameField(i);
                if (field) {
                    validFields++;
                }
            }
            
            console.println("유효한 필드 수: " + validFields + "/" + this.totalFrames);
            
            if (validFields === 0) {
                console.println("유효한 애니메이션 필드가 없습니다");
                return;
            }
            
            // 모든 프레임 숨기기
            this.hideAllFrames();
            
            // 첫 번째 프레임 표시
            this.showFrame(0);
            this.currentFrame = 0;
            
            // 자동재생 시작
            if (this.autoPlay && this.totalFrames > 1) {
                var self = this;
                setTimeout(function() {
                    self.startAnimation();
                }, 1500); // 더 긴 지연시간
            }
            
            console.println("페이지 ${pageIndex} 애니메이션 초기화 완료");
            
        } catch (e) {
            console.println("애니메이션 초기화 오류: " + e.message);
        }
    },
    
    // 모든 프레임 숨기기 (향상된 버전)
    hideAllFrames: function() {
        for (var i = 0; i < this.totalFrames; i++) {
            try {
                var field = this.getFrameField(i);
                if (field) {
                    // 여러 방법으로 숨기기 시도
                    if (typeof field.display !== 'undefined') {
                        field.display = display.hidden;
                    }
                    if (typeof field.hidden !== 'undefined') {
                        field.hidden = true;
                    }
                    if (typeof field.style !== 'undefined') {
                        field.style.visibility = 'hidden';
                    }
                }
            } catch (e) {
                console.println("프레임 " + i + " 숨김 실패: " + e.message);
            }
        }
    },
    
    // 특정 프레임 표시 (향상된 버전)
    showFrame: function(frameIndex) {
        try {
            var field = this.getFrameField(frameIndex);
            if (field) {
                // 여러 방법으로 표시 시도
                if (typeof field.display !== 'undefined') {
                    field.display = display.visible;
                }
                if (typeof field.hidden !== 'undefined') {
                    field.hidden = false;
                }
                if (typeof field.style !== 'undefined') {
                    field.style.visibility = 'visible';
                }
                console.println("프레임 " + frameIndex + " 표시됨");
            } else {
                console.println("프레임 " + frameIndex + " 필드를 찾을 수 없음");
            }
        } catch (e) {
            console.println("프레임 " + frameIndex + " 표시 실패: " + e.message);
        }
    },
    
    // 다음 프레임으로 이동
    nextFrame: function() {
        console.println("프레임 전환: " + this.currentFrame + " -> " + ((this.currentFrame + 1) % this.totalFrames));
        
        // 현재 프레임 숨기기
        this.hideAllFrames();
        
        // 다음 프레임으로
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        
        // 새 프레임 표시
        this.showFrame(this.currentFrame);
        
        // 계속 실행 중이면 다음 프레임 예약
        if (this.isRunning && this.autoPlay) {
            var self = this;
            try {
                this.timer = app.setTimeOut(function() {
                    self.nextFrame();
                }, this.frameDelay);
            } catch (timerError) {
                console.println("타이머 설정 실패: " + timerError.message);
                // 폴백: 브라우저 setTimeout 시도
                try {
                    this.timer = setTimeout(function() {
                        self.nextFrame();
                    }, this.frameDelay);
                } catch (fallbackError) {
                    console.println("폴백 타이머도 실패: " + fallbackError.message);
                    this.isRunning = false;
                }
            }
        }
    },
    
    // 애니메이션 시작
    startAnimation: function() {
        console.println("애니메이션 시작 - 페이지 ${pageIndex}");
        this.isRunning = true;
        
        // 기존 타이머 정리
        this.stopTimer();
        
        if (this.totalFrames > 1) {
            var self = this;
            try {
                this.timer = app.setTimeOut(function() {
                    self.nextFrame();
                }, this.frameDelay);
            } catch (timerError) {
                console.println("app.setTimeOut 실패, 폴백 사용");
                try {
                    this.timer = setTimeout(function() {
                        self.nextFrame();
                    }, this.frameDelay);
                } catch (fallbackError) {
                    console.println("모든 타이머 방법 실패");
                    this.isRunning = false;
                }
            }
        }
    },
    
    // 애니메이션 정지
    stopAnimation: function() {
        console.println("애니메이션 정지 - 페이지 ${pageIndex}");
        this.isRunning = false;
        this.stopTimer();
    },
    
    // 타이머 정리
    stopTimer: function() {
        if (this.timer) {
            try {
                if (typeof app !== 'undefined' && app.clearTimeOut) {
                    app.clearTimeOut(this.timer);
                } else {
                    clearTimeout(this.timer);
                }
            } catch (e) {
                console.println("타이머 정리 실패: " + e.message);
            }
            this.timer = null;
        }
    },
    
    // 애니메이션 토글
    toggleAnimation: function() {
        if (this.isRunning) {
            this.stopAnimation();
            return "▶ 재생";
        } else {
            this.startAnimation();
            return "⏸ 정지";
        }
    },
    
    // 수동 프레임 진행 (테스트용)
    manualNext: function() {
        this.stopAnimation();
        this.nextFrame();
    }
};

// 안전한 자동 초기화
try {
    if (typeof app !== 'undefined') {
        app.setTimeOut(function() {
            EnhancedAnimation_${pageIndex}.init();
        }, 1000);
    } else {
        // 폴백: 브라우저 setTimeout
        setTimeout(function() {
            EnhancedAnimation_${pageIndex}.init();
        }, 1000);
    }
} catch (initError) {
    console.println("자동 초기화 실패: " + initError.message);
    
    // 마지막 폴백: 즉시 실행
    try {
        EnhancedAnimation_${pageIndex}.init();
    } catch (immediateError) {
        console.println("즉시 초기화도 실패: " + immediateError.message);
    }
}
`;
}

function createGlobalJavaScript() {
    return `
// === 단순화된 PDF 애니메이션 전역 시스템 ===
console.println("PDF 애니메이션 전역 시스템 로드됨 - 단순화 버전");

// 전역 유틸리티 함수
function debugAllAnimations() {
    console.println("=== 단순 애니메이션 디버그 정보 ===");
    
    // 사용 가능한 애니메이션 시스템 찾기
    var found = false;
    for (var i = 0; i < 10; i++) {
        try {
            var animSystem = eval("SimpleAnim_" + i);
            if (animSystem) {
                console.println("페이지 " + i + " 단순 애니메이션:");
                console.println("  - 현재 프레임: " + animSystem.currentFrame);
                console.println("  - 총 프레임: " + animSystem.totalFrames);
                console.println("  - 실행 중: " + animSystem.isRunning);
                console.println("  - 자동재생: " + animSystem.autoPlay);
                console.println("  - 필드 수: " + animSystem.fieldNames.length);
                found = true;
            }
        } catch (e) {
            // 해당 페이지 애니메이션 없음
        }
    }
    
    if (!found) {
        console.println("활성화된 애니메이션이 없습니다");
    }
    
    console.println("==========================");
}

// 수동 애니메이션 테스트 함수
function testAnimation(pageIndex) {
    try {
        var animSystem = eval("SimpleAnim_" + pageIndex);
        if (animSystem) {
            console.println("페이지 " + pageIndex + " 애니메이션 테스트");
            animSystem.nextFrame();
        } else {
            console.println("페이지 " + pageIndex + " 애니메이션을 찾을 수 없음");
        }
    } catch (e) {
        console.println("애니메이션 테스트 실패: " + e.message);
    }
}

// PDF 로드 완료 시 실행
console.println("Chrome PDF 뷰어에서 단순화된 애니메이션이 활성화됩니다");
console.println("체크박스 필드를 사용한 프레임 전환 방식");
`;
}

async function addControlButton(form, page, pageIndex, pdfX, pdfY, pdfWidth) {
    try {
        const controlButton = form.createButton(`animControl_${pageIndex}`);
        
        // 안전한 addToPage 호출
        controlButton.addToPage(page, {
            x: pdfX,
            y: Math.max(0, pdfY - 40), // 위치 보정
            width: Math.min(pdfWidth, 100),
            height: 30,
            fontSize: 10,
            backgroundColor: PDFLib.rgb(0.2, 0.4, 0.8),
            borderColor: PDFLib.rgb(0.1, 0.2, 0.6),
            borderWidth: 1
        });
        
        // 버튼 텍스트 설정
        try {
            controlButton.setText('▶ 재생');
        } catch (textError) {
            console.log('버튼 텍스트 설정 실패:', textError.message);
        }
        
        // 버튼 액션 설정
        try {
            controlButton.setAction(
                PDFLib.PDFAction.createJavaScript(`
                    try {
                        var newCaption = EnhancedAnimation_${pageIndex}.toggleAnimation();
                        this.buttonSetCaption(newCaption);
                    } catch (actionError) {
                        console.println("버튼 액션 오류: " + actionError.message);
                    }
                `)
            );
        } catch (actionError) {
            console.log('버튼 액션 설정 실패:', actionError.message);
        }
        
        // 테스트 버튼도 추가
        const testButton = form.createButton(`testControl_${pageIndex}`);
        
        testButton.addToPage(page, {
            x: pdfX + 110,
            y: Math.max(0, pdfY - 40),
            width: 80,
            height: 30,
            fontSize: 9,
            backgroundColor: PDFLib.rgb(0.8, 0.4, 0.2),
            borderColor: PDFLib.rgb(0.6, 0.2, 0.1),
            borderWidth: 1
        });
        
        try {
            testButton.setText('다음');
            testButton.setAction(
                PDFLib.PDFAction.createJavaScript(`
                    try {
                        EnhancedAnimation_${pageIndex}.manualNext();
                    } catch (testError) {
                        console.println("테스트 버튼 오류: " + testError.message);
                    }
                `)
            );
        } catch (testError) {
            console.log('테스트 버튼 설정 실패:', testError.message);
        }
        
        console.log('컨트롤 버튼들 추가 완료');
        
    } catch (error) {
        console.log('컨트롤 버튼 추가 실패:', error.message);
    }
}

// ==================== UI 관리 ====================
function showProcessing(title, message) {
    const titleEl = document.getElementById('processingTitle');
    const messageEl = document.getElementById('processingMessage');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (elements.processingOverlay) {
        elements.processingOverlay.style.display = 'flex';
    }
    
    // 처리 단계 초기화
    processingSteps = [];
    if (elements.processingSteps) {
        elements.processingSteps.innerHTML = '';
    }
}

function hideProcessing() {
    if (elements.processingOverlay) {
        elements.processingOverlay.style.display = 'none';
    }
}

function updateProgress(percent) {
    if (elements.progressFill) {
        elements.progressFill.style.width = percent + '%';
    }
    if (elements.progressText) {
        elements.progressText.textContent = Math.round(percent) + '%';
    }
}

function addProcessingStep(step) {
    processingSteps.push(step);
    
    if (elements.processingSteps) {
        const li = document.createElement('li');
        li.textContent = step;
        li.className = 'active';
        
        // 이전 단계들의 active 클래스 제거
        const prevSteps = elements.processingSteps.querySelectorAll('li');
        prevSteps.forEach(prevStep => prevStep.classList.remove('active'));
        
        elements.processingSteps.appendChild(li);
        
        // 스크롤을 맨 아래로
        elements.processingSteps.scrollTop = elements.processingSteps.scrollHeight;
    }
    
    console.log('처리 단계:', step);
}

function updateStep(step) {
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.step) <= step) {
            el.classList.add('active');
        }
    });
}

function showCompletionScreen() {
    elements.workspace.style.display = 'none';
    elements.completionScreen.style.display = 'block';
    window.scrollTo(0, 0);
    
    console.log('완료 화면 표시');
}

// ==================== 완료 후 기능 ====================
function downloadGeneratedPdf() {
    if (!generatedPdfUrl) {
        alert('생성된 PDF가 없습니다.');
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
        
        console.log('PDF 다운로드 시작:', fileName);
        
    } catch (error) {
        console.error('다운로드 실패:', error);
        
        // 대안: 새 창에서 열기
        try {
            window.open(generatedPdfUrl, '_blank');
        } catch (error2) {
            alert('다운로드에 실패했습니다. 브라우저 설정을 확인해주세요.');
        }
    }
}

function previewPdf() {
    if (generatedPdfUrl) {
        window.open(generatedPdfUrl, '_blank');
    } else {
        alert('미리볼 PDF가 없습니다.');
    }
}

function startOver() {
    // URL 정리
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
        generatedPdfUrl = null;
    }
    
    // 상태 초기화
    currentPdfFile = null;
    originalPdfDoc = null;
    renderPdfDoc = null;
    pdfPages = [];
    selectedPageIndex = -1;
    gifFile = null;
    gifFrames = [];
    processingSteps = [];
    
    // 페이지 새로고침
    location.reload();
}

function backToPageSelection() {
    elements.gifPositionEditor.style.display = 'none';
    elements.pageSelector.style.display = 'block';
    updateStep(1);
    
    // 상태 초기화
    gifFile = null;
    gifFrames = [];
    if (elements.gifOverlay) elements.gifOverlay.style.display = 'none';
    if (elements.gifUploadArea) {
        elements.gifUploadArea.innerHTML = '<p>GIF 파일을 선택하세요</p>';
        elements.gifUploadArea.classList.remove('has-gif');
    }
    if (elements.btnGeneratePdf) elements.btnGeneratePdf.disabled = true;
    
    console.log('페이지 선택으로 돌아감');
}

// ==================== 디버그 기능 ====================
function showDebugInfo() {
    const debugModal = document.getElementById('debugModal');
    const debugInfo = document.getElementById('debugInfo');
    
    if (!debugModal || !debugInfo) return;
    
    const info = {
        '=== 시스템 상태 ===': '',
        'PDF 로드됨': !!originalPdfDoc,
        '선택된 페이지': selectedPageIndex + 1,
        'GIF 프레임 수': gifFrames.length,
        'GIF 위치': gifPosition,
        '생성된 PDF URL': !!generatedPdfUrl,
        '\n=== 브라우저 지원 ===': '',
        'FileReader': typeof FileReader !== 'undefined',
        'Canvas': typeof HTMLCanvasElement !== 'undefined',
        'PDF.js': typeof pdfjsLib !== 'undefined',
        'PDF-lib': typeof PDFLib !== 'undefined',
        'omggif': typeof GifReader !== 'undefined',
        '\n=== DOM 요소 ===': '',
        '누락된 요소': Object.entries(elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key),
        '\n=== 처리 단계 ===': '',
        '최근 처리 단계': processingSteps.slice(-5),
        '\n=== 오류 로그 ===': '',
        '콘솔 확인': 'F12를 눌러 개발자 도구에서 자세한 로그를 확인하세요'
    };
    
    let debugText = '';
    Object.entries(info).forEach(([key, value]) => {
        if (key.startsWith('===')) {
            debugText += key + '\n';
        } else if (key.startsWith('\n===')) {
            debugText += key + '\n';
        } else {
            debugText += `${key}: ${JSON.stringify(value, null, 2)}\n`;
        }
    });
    
    debugInfo.textContent = debugText;
    debugModal.style.display = 'flex';
}

function hideDebugInfo() {
    const debugModal = document.getElementById('debugModal');
    if (debugModal) {
        debugModal.style.display = 'none';
    }
}

// ==================== 전역 이벤트 처리 ====================
// 전역 오류 처리기
window.addEventListener('error', function(e) {
    console.error('전역 오류:', e.error);
    
    if (elements.processingOverlay && elements.processingOverlay.style.display !== 'none') {
        addProcessingStep('오류 발생: ' + e.error.message);
        setTimeout(() => {
            hideProcessing();
            alert('예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }, 2000);
    }
});

// Promise 거부 처리기
window.addEventListener('unhandledrejection', function(e) {
    console.error('처리되지 않은 Promise 오류:', e.reason);
    e.preventDefault();
    
    if (elements.processingOverlay && elements.processingOverlay.style.display !== 'none') {
        addProcessingStep('Promise 오류: ' + e.reason.message);
        setTimeout(() => {
            hideProcessing();
            alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        }, 2000);
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
});

// 브라우저 호환성 경고
window.addEventListener('load', function() {
    // Chrome이 아닌 브라우저에서 경고
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    if (!isChrome) {
        console.warn('Chrome 브라우저가 아닙니다. 애니메이션이 제대로 작동하지 않을 수 있습니다.');
        
        // 경고 메시지 표시
        setTimeout(() => {
            if (confirm('최적의 경험을 위해 Chrome 브라우저 사용을 권장합니다. 계속하시겠습니까?')) {
                console.log('사용자가 다른 브라우저에서 계속 진행을 선택했습니다.');
            }
        }, 1000);
    }
});

// ==================== 유틸리티 함수 ====================
function debugPdfGif() {
    console.log('=== PDF GIF 디버그 정보 ===');
    console.log('PDF 로드됨:', !!originalPdfDoc);
    console.log('선택된 페이지:', selectedPageIndex);
    console.log('GIF 프레임:', gifFrames.length);
    console.log('GIF 위치:', gifPosition);
    console.log('생성된 PDF:', !!generatedPdfUrl);
    console.log('처리 단계:', processingSteps);
    console.log('========================');
    
    return {
        pdfLoaded: !!originalPdfDoc,
        selectedPage: selectedPageIndex,
        gifFrames: gifFrames.length,
        gifPosition: gifPosition,
        generatedPdf: !!generatedPdfUrl,
        processingSteps: processingSteps
    };
}

// 성능 모니터링
function monitorPerformance() {
    if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('pdf-gif-start');
        
        return {
            end: function(label) {
                performance.mark('pdf-gif-end');
                performance.measure(label || 'pdf-gif-operation', 'pdf-gif-start', 'pdf-gif-end');
                
                const measures = performance.getEntriesByType('measure');
                const lastMeasure = measures[measures.length - 1];
                
                console.log(`성능 측정 - ${lastMeasure.name}: ${lastMeasure.duration.toFixed(2)}ms`);
                return lastMeasure.duration;
            }
        };
    }
    
    return { end: function() { return 0; } };
}

// 메모리 사용량 체크
function checkMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
        const memory = performance.memory;
        console.log('메모리 사용량:', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
        
        // 메모리 사용량이 너무 높으면 경고
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
            console.warn('메모리 사용량이 높습니다:', usagePercent.toFixed(1) + '%');
        }
        
        return usagePercent;
    }
    
    return 0;
}

// PDF 최적화 권장사항 체크
function checkOptimizationRecommendations() {
    const recommendations = [];
    
    if (gifFrames.length > 20) {
        recommendations.push(`프레임 수가 많습니다 (${gifFrames.length}개). 성능을 위해 20개 이하로 줄이는 것을 권장합니다.`);
    }
    
    if (gifPosition.width > 500 || gifPosition.height > 500) {
        recommendations.push('GIF 크기가 큽니다. 작은 크기로 조정하면 성능이 향상됩니다.');
    }
    
    const frameDelay = parseInt(elements.speedControl?.value || 500);
    if (frameDelay < 100) {
        recommendations.push('애니메이션 속도가 너무 빠릅니다. 100ms 이상을 권장합니다.');
    }
    
    if (recommendations.length > 0) {
        console.log('=== 최적화 권장사항 ===');
        recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
        console.log('===================');
    }
    
    return recommendations;
}

// 전역 노출
window.debugPdfGif = debugPdfGif;
window.showDebugInfo = showDebugInfo;
window.hideDebugInfo = hideDebugInfo;
window.monitorPerformance = monitorPerformance;
window.checkMemoryUsage = checkMemoryUsage;
window.checkOptimizationRecommendations = checkOptimizationRecommendations;

// 네비게이션 함수들을 전역으로 노출
window.proceedToGifUpload = proceedToGifUpload;
window.generateAdvancedPdf = generateAdvancedPdf;
window.downloadGeneratedPdf = downloadGeneratedPdf;
window.previewPdf = previewPdf;
window.startOver = startOver;
window.backToPageSelection = backToPageSelection;

console.log('=== PDF GIF 애플리케이션 로드 완료 ===');
