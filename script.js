// PDF GIF Animator - Chrome PDFium 최적화 버전 (완전 수정)
// 전역 변수
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

// 디버그 로깅
const DEBUG = true;
function log(message, data = null) {
    if (DEBUG) {
        console.log(`[PDF-GIF] ${message}`, data || '');
        updateDebugPanel(`${new Date().toLocaleTimeString()} - ${message}`);
    }
}

// DOM 초기화
document.addEventListener('DOMContentLoaded', function() {
    log('애플리케이션 초기화 시작');
    
    if (!checkLibraries()) {
        alert('필수 라이브러리를 로드할 수 없습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    initializeEventListeners();
    log('초기화 완료');
});

// 라이브러리 체크
function checkLibraries() {
    const libs = {
        'PDF.js': typeof pdfjsLib !== 'undefined',
        'PDF-lib': typeof PDFLib !== 'undefined',
        'omggif': typeof GifReader !== 'undefined'
    };
    
    for (const [name, loaded] of Object.entries(libs)) {
        log(`${name}: ${loaded ? '✅' : '❌'}`);
        if (!loaded) return false;
    }
    return true;
}

// 이벤트 리스너 초기화 (완전히 수정됨)
function initializeEventListeners() {
    log('이벤트 리스너 초기화 시작');
    
    // PDF 업로드 관련
    const pdfInput = document.getElementById('pdfInput');
    const pdfUploadBox = document.getElementById('pdfUploadBox');
    const pdfSelectBtn = document.getElementById('pdfSelectBtn');
    
    // 파일 입력 변경 이벤트
    if (pdfInput) {
        pdfInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                handlePdfFile(e.target.files[0]);
            }
        });
    }
    
    // PDF 선택 버튼 클릭
    if (pdfSelectBtn) {
        pdfSelectBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            pdfInput.click();
        });
    }
    
    // 업로드 박스 클릭 (버튼 제외)
    if (pdfUploadBox) {
        pdfUploadBox.addEventListener('click', function(e) {
            // 버튼을 클릭한 경우는 제외
            if (e.target.id !== 'pdfSelectBtn' && !e.target.closest('button')) {
                e.preventDefault();
                pdfInput.click();
            }
        });
        
        // 드래그 앤 드롭
        pdfUploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            pdfUploadBox.classList.add('drag-over');
        });
        
        pdfUploadBox.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            pdfUploadBox.classList.remove('drag-over');
        });
        
        pdfUploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            pdfUploadBox.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                handlePdfFile(files[0]);
            } else if (files.length > 0) {
                alert('PDF 파일만 업로드 가능합니다.');
            }
        });
    }
    
    // GIF 업로드 관련
    const gifInput = document.getElementById('gifInput');
    const gifUploadArea = document.getElementById('gifUploadArea');
    
    if (gifInput) {
        gifInput.addEventListener('change', handleGifUpload);
        log('GIF input 이벤트 리스너 등록');
    }
    
    if (gifUploadArea) {
        gifUploadArea.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            log('GIF 업로드 영역 클릭');
            gifInput.click();
        });
        log('GIF 업로드 영역 이벤트 리스너 등록');
    }
    
    // 페이지 선택 버튼
    const btnSelectPage = document.getElementById('btnSelectPage');
    if (btnSelectPage) {
        btnSelectPage.addEventListener('click', proceedToGifUpload);
    }
    
    // PDF 생성 버튼
    const btnGeneratePdf = document.getElementById('btnGeneratePdf');
    if (btnGeneratePdf) {
        btnGeneratePdf.addEventListener('click', generateOptimizedPdf);
    }
    
    // 이전 버튼
    const btnBackToPage = document.getElementById('btnBackToPage');
    if (btnBackToPage) {
        btnBackToPage.addEventListener('click', backToPageSelection);
    }
    
    // 완료 화면 버튼들
    const btnDownloadPdf = document.getElementById('btnDownloadPdf');
    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', downloadGeneratedPdf);
    }
    
    const btnPreview = document.getElementById('btnPreview');
    if (btnPreview) {
        btnPreview.addEventListener('click', previewInBrowser);
    }
    
    const btnStartOver = document.getElementById('btnStartOver');
    if (btnStartOver) {
        btnStartOver.addEventListener('click', startOver);
    }
    
    // 디버그 버튼
    const btnShowDebug = document.getElementById('btnShowDebug');
    if (btnShowDebug) {
        btnShowDebug.addEventListener('click', function(e) {
            e.preventDefault();
            showDebugInfo();
        });
    }
    
    const btnCloseDebug = document.getElementById('btnCloseDebug');
    if (btnCloseDebug) {
        btnCloseDebug.addEventListener('click', closeDebugPanel);
    }
    
    // GIF 오버레이 드래그
    const gifOverlay = document.getElementById('gifOverlay');
    if (gifOverlay) {
        gifOverlay.addEventListener('mousedown', handleMouseDown);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 컨트롤 입력
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const gifWidth = document.getElementById('gifWidth');
    const gifHeight = document.getElementById('gifHeight');
    const speedControl = document.getElementById('speedControl');
    
    if (posX) posX.addEventListener('input', updateGifFromControls);
    if (posY) posY.addEventListener('input', updateGifFromControls);
    if (gifWidth) gifWidth.addEventListener('input', updateGifFromControls);
    if (gifHeight) gifHeight.addEventListener('input', updateGifFromControls);
    
    if (speedControl) {
        speedControl.addEventListener('input', function() {
            document.getElementById('speedDisplay').textContent = this.value + 'ms';
        });
    }
    
    log('모든 이벤트 리스너 등록 완료');
}

// PDF 파일 처리 (통합 함수)
async function handlePdfFile(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('PDF 파일을 선택해주세요.');
        return;
    }
    
    log('PDF 업로드 시작', file.name);
    showProcessing('PDF 분석 중...', 'PDF 파일을 읽고 있습니다');
    
    try {
        currentPdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        
        // PDF-lib로 로드 (편집용)
        originalPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        log('PDF-lib 로드 성공');
        
        // PDF.js로 로드 (렌더링용)
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        renderPdfDoc = await loadingTask.promise;
        
        // 페이지 로드
        pdfPages = [];
        for (let i = 1; i <= renderPdfDoc.numPages; i++) {
            pdfPages.push(await renderPdfDoc.getPage(i));
        }
        
        log(`PDF 로드 완료: ${pdfPages.length} 페이지`);
        
        // UI 업데이트
        document.getElementById('pdfFileName').textContent = file.name;
        document.getElementById('pdfPageCount').textContent = `총 페이지: ${pdfPages.length}`;
        
        await generatePageThumbnails();
        
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('workspace').style.display = 'block';
        
        hideProcessing();
    } catch (error) {
        log('PDF 로드 실패', error);
        alert('PDF 파일을 읽을 수 없습니다: ' + error.message);
        hideProcessing();
    }
}

// 페이지 썸네일 생성
async function generatePageThumbnails() {
    const pagesGrid = document.getElementById('pagesGrid');
    pagesGrid.innerHTML = '';
    
    for (let i = 0; i < pdfPages.length; i++) {
        const page = pdfPages[i];
        const scale = 0.3;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'page-thumbnail';
        thumbnail.dataset.pageIndex = i;
        thumbnail.innerHTML = `
            <img src="${canvas.toDataURL()}" alt="Page ${i + 1}">
            <div class="page-number">페이지 ${i + 1}</div>
        `;
        
        thumbnail.addEventListener('click', () => selectPage(i));
        pagesGrid.appendChild(thumbnail);
    }
}

// 페이지 선택
function selectPage(index) {
    document.querySelectorAll('.page-thumbnail').forEach(t => t.classList.remove('selected'));
    document.querySelector(`[data-page-index="${index}"]`).classList.add('selected');
    selectedPageIndex = index;
    document.getElementById('btnSelectPage').disabled = false;
    log(`페이지 ${index + 1} 선택됨`);
}

// GIF 업로드 단계로 진행
function proceedToGifUpload() {
    if (selectedPageIndex === -1) {
        alert('페이지를 선택해주세요.');
        return;
    }
    
    updateStep(2);
    document.getElementById('pageSelector').style.display = 'none';
    document.getElementById('gifPositionEditor').style.display = 'block';
    
    renderPagePreview();
}

// 페이지 프리뷰 렌더링
async function renderPagePreview() {
    const page = pdfPages[selectedPageIndex];
    const container = document.getElementById('pdfPreviewContainer');
    const canvas = document.getElementById('pdfPreviewCanvas');
    
    const containerWidth = container.clientWidth - 4;
    const scale = containerWidth / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
    }).promise;
    
    log('페이지 프리뷰 렌더링 완료');
}

// GIF 업로드 처리
async function handleGifUpload(e) {
    const file = e.target.files[0];
    log('GIF 파일 선택:', file);
    
    if (!file) {
        log('파일이 선택되지 않음');
        return;
    }
    
    if (file.type !== 'image/gif') {
        alert('GIF 파일을 선택해주세요.');
        log('GIF가 아닌 파일 선택됨:', file.type);
        return;
    }
    
    log('GIF 업로드 시작', file.name);
    showProcessing('GIF 처리 중...', 'GIF 프레임을 추출하고 있습니다');
    
    try {
        gifFile = file;
        gifFrames = await extractGifFrames(file);
        
        // 프리뷰 업데이트
        const reader = new FileReader();
        reader.onload = function(e) {
            const gifUploadArea = document.getElementById('gifUploadArea');
            gifUploadArea.innerHTML = `
                <img src="${e.target.result}" class="gif-preview" alt="GIF">
                <p>${gifFrames.length} 프레임</p>
            `;
            gifUploadArea.classList.add('has-gif');
            
            showGifOverlay(e.target.result);
            updateStep(3);
            document.getElementById('btnGeneratePdf').disabled = false;
            log('GIF 업로드 완료');
        };
        reader.readAsDataURL(file);
        
        hideProcessing();
    } catch (error) {
        log('GIF 처리 실패', error);
        alert('GIF 파일을 처리할 수 없습니다: ' + error.message);
        hideProcessing();
    }
}

// GIF 프레임 추출
async function extractGifFrames(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    try {
        const reader = new GifReader(uint8Array);
        const frameCount = reader.numFrames();
        const maxFrames = parseInt(document.getElementById('maxFrames').value) || 10;
        const framesToExtract = Math.min(frameCount, maxFrames);
        
        log(`GIF 프레임 추출: ${framesToExtract}/${frameCount} 프레임`);
        
        const frames = [];
        
        for (let i = 0; i < framesToExtract; i++) {
            const frameInfo = reader.frameInfo(i);
            const canvas = document.createElement('canvas');
            canvas.width = reader.width;
            canvas.height = reader.height;
            const ctx = canvas.getContext('2d');
            
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            reader.decodeAndBlitFrameRGBA(i, imageData.data);
            ctx.putImageData(imageData, 0, 0);
            
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png', 0.8);
            });
            
            frames.push({
                data: await blob.arrayBuffer(),
                dataUrl: canvas.toDataURL('image/png', 0.8),
                delay: Math.max(frameInfo.delay * 10, 100)
            });
        }
        
        log(`${frames.length}개 프레임 추출 완료`);
        return frames;
        
    } catch (error) {
        log('GIF 파싱 실패, 정적 이미지로 처리', error);
        
        // 폴백: 단일 프레임으로 처리
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        return [{
            data: await blob.arrayBuffer(),
            dataUrl: canvas.toDataURL('image/png'),
            delay: 1000
        }];
    }
}

// GIF 오버레이 표시
function showGifOverlay(imageSrc) {
    const overlay = document.getElementById('gifOverlay');
    const previewElement = document.getElementById('gifPreviewElement');
    
    gifPosition = {
        x: 50,
        y: 50,
        width: 100,
        height: 100
    };
    
    previewElement.innerHTML = `<img src="${imageSrc}" alt="GIF">`;
    updateGifOverlayPosition();
    overlay.style.display = 'block';
}

// GIF 오버레이 위치 업데이트
function updateGifOverlayPosition() {
    const overlay = document.getElementById('gifOverlay');
    const canvas = document.getElementById('pdfPreviewCanvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    overlay.style.left = (gifPosition.x / scaleX) + 'px';
    overlay.style.top = (gifPosition.y / scaleY) + 'px';
    overlay.style.width = (gifPosition.width / scaleX) + 'px';
    overlay.style.height = (gifPosition.height / scaleY) + 'px';
    
    document.getElementById('posX').value = Math.round(gifPosition.x);
    document.getElementById('posY').value = Math.round(gifPosition.y);
    document.getElementById('gifWidth').value = Math.round(gifPosition.width);
    document.getElementById('gifHeight').value = Math.round(gifPosition.height);
}

// 컨트롤에서 GIF 위치 업데이트
function updateGifFromControls() {
    gifPosition.x = parseInt(document.getElementById('posX').value) || 0;
    gifPosition.y = parseInt(document.getElementById('posY').value) || 0;
    gifPosition.width = parseInt(document.getElementById('gifWidth').value) || 100;
    gifPosition.height = parseInt(document.getElementById('gifHeight').value) || 100;
    
    updateGifOverlayPosition();
}

// 마우스 이벤트 핸들러
function handleMouseDown(e) {
    e.preventDefault();
    
    if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        resizeHandle = e.target.classList[1];
    } else if (e.target.closest('.gif-overlay')) {
        isDragging = true;
    }
    
    const rect = document.getElementById('pdfPreviewContainer').getBoundingClientRect();
    dragStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;
    
    const rect = document.getElementById('pdfPreviewContainer').getBoundingClientRect();
    const canvas = document.getElementById('pdfPreviewCanvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    if (isDragging) {
        const deltaX = (currentX - dragStart.x) * scaleX;
        const deltaY = (currentY - dragStart.y) * scaleY;
        
        gifPosition.x = Math.max(0, Math.min(canvas.width - gifPosition.width, gifPosition.x + deltaX));
        gifPosition.y = Math.max(0, Math.min(canvas.height - gifPosition.height, gifPosition.y + deltaY));
        
        dragStart.x = currentX;
        dragStart.y = currentY;
        
    } else if (isResizing) {
        const deltaX = (currentX - dragStart.x) * scaleX;
        const deltaY = (currentY - dragStart.y) * scaleY;
        
        switch (resizeHandle) {
            case 'se':
                gifPosition.width = Math.max(10, gifPosition.width + deltaX);
                gifPosition.height = Math.max(10, gifPosition.height + deltaY);
                break;
            case 'sw':
                gifPosition.width = Math.max(10, gifPosition.width - deltaX);
                gifPosition.x = Math.max(0, gifPosition.x + deltaX);
                gifPosition.height = Math.max(10, gifPosition.height + deltaY);
                break;
            case 'ne':
                gifPosition.width = Math.max(10, gifPosition.width + deltaX);
                gifPosition.height = Math.max(10, gifPosition.height - deltaY);
                gifPosition.y = Math.max(0, gifPosition.y + deltaY);
                break;
            case 'nw':
                gifPosition.width = Math.max(10, gifPosition.width - deltaX);
                gifPosition.height = Math.max(10, gifPosition.height - deltaY);
                gifPosition.x = Math.max(0, gifPosition.x + deltaX);
                gifPosition.y = Math.max(0, gifPosition.y + deltaY);
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

// 최적화된 PDF 생성 (애니메이션 문제 해결)
async function generateOptimizedPdf() {
    if (!gifFrames.length || selectedPageIndex === -1) {
        alert('필요한 데이터가 없습니다.');
        return;
    }
    
    log('최적화된 PDF 생성 시작');
    showProcessing('PDF 생성 중...', 'Chrome에 최적화된 애니메이션 PDF를 생성하고 있습니다');
    updateStep(4);
    
    try {
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        // 페이지별 처리
        for (let i = 0; i < originalPages.length; i++) {
            updateProcessingDetails(`페이지 ${i + 1}/${originalPages.length} 처리 중...`);
            updateProgress(10 + (i / originalPages.length) * 40);
            
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            if (i === selectedPageIndex) {
                log(`페이지 ${i + 1}에 애니메이션 추가`);
                await addChromeOptimizedAnimation(newPdfDoc, addedPage, i);
            }
        }
        
        updateProcessingDetails('PDF 최종 생성 중...');
        updateProgress(90);
        
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        if (generatedPdfUrl) {
            URL.revokeObjectURL(generatedPdfUrl);
        }
        generatedPdfUrl = URL.createObjectURL(blob);
        
        // 완료 정보 업데이트
        document.getElementById('fileSize').textContent = formatFileSize(blob.size);
        document.getElementById('frameCount').textContent = gifFrames.length + '개';
        document.getElementById('animSpeed').textContent = document.getElementById('speedControl').value + 'ms';
        
        updateProgress(100);
        setTimeout(() => {
            hideProcessing();
            showCompletionScreen();
        }, 500);
        
    } catch (error) {
        log('PDF 생성 실패', error);
        alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
        hideProcessing();
    }
}

// Chrome PDFium 최적화 애니메이션 (완전히 재작성)
async function addChromeOptimizedAnimation(pdfDoc, page, pageIndex) {
    log('Chrome 최적화 애니메이션 추가 - 개선된 버전');
    
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const canvas = document.getElementById('pdfPreviewCanvas');
    
    const scaleX = pageWidth / canvas.width;
    const scaleY = pageHeight / canvas.height;
    
    const pdfX = gifPosition.x * scaleX;
    const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
    const pdfWidth = gifPosition.width * scaleX;
    const pdfHeight = gifPosition.height * scaleY;
    
    const form = pdfDoc.getForm();
    const autoPlay = document.getElementById('autoPlay').checked;
    const frameDelay = parseInt(document.getElementById('speedControl').value);
    
    log(`프레임 수: ${gifFrames.length}, 자동재생: ${autoPlay}, 속도: ${frameDelay}ms`);
    
    // 1. 모든 프레임 이미지를 버튼으로 추가
    const fieldNames = [];
    
    for (let i = 0; i < gifFrames.length; i++) {
        const fieldName = `f${pageIndex}_${i}`;
        const button = form.createButton(fieldName);
        
        // PNG 이미지 임베드
        const pngImage = await pdfDoc.embedPng(gifFrames[i].data);
        
        // 버튼 위젯 추가
        const widget = button.addToPage(page, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            borderWidth: 0
        });
        
        // 이미지 설정
        button.setImage(pngImage);
        
        // 초기 상태: 첫 프레임만 표시
        if (i === 0) {
            widget.setHidden(false);
        } else {
            widget.setHidden(true);
        }
        
        fieldNames.push(fieldName);
        log(`프레임 ${i + 1} 추가 완료`);
    }
    
    // 2. Document-level JavaScript 추가 (가장 호환성 높은 방식)
    const docJS = `
// PDFium Animation System - Page ${pageIndex + 1}
console.println("=== Animation Init for Page ${pageIndex + 1} ===");

// Animation state
var animState = {
    page: ${pageIndex},
    fields: [${fieldNames.map(n => '"' + n + '"').join(',')}],
    currentFrame: 0,
    frameCount: ${gifFrames.length},
    frameDelay: ${frameDelay},
    isPlaying: false,
    timer: null
};

// Hide all frames
function hideAllFrames() {
    for (var i = 0; i < animState.frameCount; i++) {
        try {
            var field = this.getField(animState.fields[i]);
            if (field != null) {
                field.hidden = true;
                field.display = display.hidden;
            }
        } catch(e) {
            console.println("Hide error: " + e);
        }
    }
}

// Show specific frame
function showFrame(index) {
    try {
        var field = this.getField(animState.fields[index]);
        if (field != null) {
            field.hidden = false;
            field.display = display.visible;
        }
    } catch(e) {
        console.println("Show error: " + e);
    }
}

// Animation loop
function animateFrame() {
    console.println("Frame: " + animState.currentFrame);
    
    // Hide all frames
    hideAllFrames();
    
    // Show current frame
    showFrame(animState.currentFrame);
    
    // Next frame
    animState.currentFrame = (animState.currentFrame + 1) % animState.frameCount;
    
    // Continue if playing
    if (animState.isPlaying) {
        animState.timer = app.setTimeOut("animateFrame()", animState.frameDelay);
    }
}

// Start animation
function startAnimation() {
    console.println("Starting animation");
    animState.isPlaying = true;
    animState.currentFrame = 0;
    animateFrame();
}

// Stop animation
function stopAnimation() {
    console.println("Stopping animation");
    animState.isPlaying = false;
    if (animState.timer != null) {
        app.clearTimeOut(animState.timer);
        animState.timer = null;
    }
}

// Initialize on document open
function initAnimation() {
    console.println("Initializing animation");
    hideAllFrames();
    showFrame(0);
    
    if (${autoPlay} && animState.frameCount > 1) {
        app.setTimeOut("startAnimation()", 1000);
    }
}

// Run initialization
app.setTimeOut("initAnimation()", 500);
`;
    
    // JavaScript 추가
    pdfDoc.addJavaScript('AnimationScript', docJS);
    
    // 3. Page Open 액션 추가 (추가 보장)
    const pageOpenJS = `
console.println("Page ${pageIndex + 1} opened");
if (typeof initAnimation === 'function') {
    initAnimation();
}
`;
    
    try {
        // 페이지 오픈 액션 설정
        const pageDict = page.node;
        const openAction = PDFLib.PDFDict.withContext(pdfDoc.context);
        openAction.set(PDFLib.PDFName.of('S'), PDFLib.PDFName.of('JavaScript'));
        openAction.set(PDFLib.PDFName.of('JS'), PDFLib.PDFString.of(pageOpenJS));
        
        // AA (Additional Actions) 딕셔너리 생성
        const aaDict = PDFLib.PDFDict.withContext(pdfDoc.context);
        aaDict.set(PDFLib.PDFName.of('O'), openAction);
        pageDict.set(PDFLib.PDFName.of('AA'), aaDict);
        
        log('Page Open 액션 추가 완료');
    } catch (error) {
        log('Page Open 액션 추가 실패:', error);
    }
    
    // 4. 수동 컨트롤 버튼 추가
    if (!autoPlay && gifFrames.length > 1) {
        const ctrlButton = form.createButton(`ctrl${pageIndex}`);
        
        const ctrlWidget = ctrlButton.addToPage(page, {
            x: pdfX,
            y: pdfY - 35,
            width: Math.min(80, pdfWidth),
            height: 25,
            borderWidth: 1,
            backgroundColor: PDFLib.rgb(0.2, 0.4, 0.8),
            borderColor: PDFLib.rgb(0, 0, 0),
            textColor: PDFLib.rgb(1, 1, 1)
        });
        
        ctrlButton.setText('Play');
        
        // 버튼 클릭 액션
        const buttonJS = `
if (animState.isPlaying) {
    stopAnimation();
    this.getField("ctrl${pageIndex}").buttonSetCaption("Play");
} else {
    startAnimation();
    this.getField("ctrl${pageIndex}").buttonSetCaption("Stop");
}
`;
        
        ctrlButton.addPushAction(PDFLib.PDFJavaScript.of(buttonJS));
    }
    
    log('애니메이션 설정 완료');
}

// UI 헬퍼 함수들
function updateStep(step) {
    document.querySelectorAll('.step').forEach((el, index) => {
        if (index < step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function showProcessing(title, message) {
    document.getElementById('processingTitle').textContent = title || '';
    document.getElementById('processingMessage').textContent = message || '';
    document.getElementById('processingOverlay').style.display = 'flex';
    updateProgress(0);
}

function hideProcessing() {
    document.getElementById('processingOverlay').style.display = 'none';
    document.getElementById('processingDetails').textContent = '';
}

function updateProgress(percent) {
    const fillElement = document.getElementById('progressFill');
    const textElement = document.getElementById('progressText');
    
    if (fillElement) {
        fillElement.style.width = Math.min(100, Math.max(0, percent)) + '%';
    }
    if (textElement) {
        textElement.textContent = Math.round(percent) + '%';
    }
}

function updateProcessingDetails(details) {
    const detailsElement = document.getElementById('processingDetails');
    if (detailsElement) {
        detailsElement.textContent = details || '';
    }
}

function showCompletionScreen() {
    document.getElementById('workspace').style.display = 'none';
    document.getElementById('completionScreen').style.display = 'block';
    window.scrollTo(0, 0);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// PDF 다운로드
function downloadGeneratedPdf() {
    if (!generatedPdfUrl) {
        alert('생성된 PDF가 없습니다.');
        return;
    }
    
    const link = document.createElement('a');
    link.href = generatedPdfUrl;
    link.download = `animated_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    log('PDF 다운로드 시작');
}

// 브라우저에서 미리보기
function previewInBrowser() {
    if (!generatedPdfUrl) {
        alert('생성된 PDF가 없습니다.');
        return;
    }
    
    window.open(generatedPdfUrl, '_blank');
    log('브라우저 미리보기 열기');
}

// 처음부터 다시 시작
function startOver() {
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
    
    // 상태 초기화
    currentPdfFile = null;
    originalPdfDoc = null;
    renderPdfDoc = null;
    pdfPages = [];
    selectedPageIndex = -1;
    gifFile = null;
    gifFrames = [];
    generatedPdfUrl = null;
    
    // UI 초기화
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('workspace').style.display = 'none';
    document.getElementById('completionScreen').style.display = 'none';
    document.getElementById('pdfInput').value = '';
    document.getElementById('gifInput').value = '';
    document.getElementById('pagesGrid').innerHTML = '';
    document.getElementById('gifUploadArea').innerHTML = '<p>GIF 선택</p>';
    document.getElementById('gifUploadArea').classList.remove('has-gif');
    document.getElementById('gifOverlay').style.display = 'none';
    
    // 단계 초기화
    updateStep(1);
    
    log('애플리케이션 완전 초기화');
}

// 이전 단계로
function backToPageSelection() {
    document.getElementById('gifPositionEditor').style.display = 'none';
    document.getElementById('pageSelector').style.display = 'block';
    updateStep(1);
    
    // GIF 상태 초기화
    gifFile = null;
    gifFrames = [];
    document.getElementById('gifOverlay').style.display = 'none';
    document.getElementById('gifUploadArea').innerHTML = '<p>GIF 선택</p>';
    document.getElementById('gifUploadArea').classList.remove('has-gif');
    document.getElementById('btnGeneratePdf').disabled = true;
    document.getElementById('gifInput').value = '';
}

// 디버그 함수들
function showDebugInfo() {
    const debugPanel = document.getElementById('debugPanel');
    if (!debugPanel) return;
    
    if (debugPanel.style.display === 'none') {
        updateDebugPanel('=== Debug Info ===');
        updateDebugPanel(`PDF loaded: ${!!originalPdfDoc}`);
        updateDebugPanel(`Pages: ${pdfPages.length}`);
        updateDebugPanel(`Selected page: ${selectedPageIndex + 1}`);
        updateDebugPanel(`GIF frames: ${gifFrames.length}`);
        updateDebugPanel(`Position: ${JSON.stringify(gifPosition)}`);
        updateDebugPanel(`Auto-play: ${document.getElementById('autoPlay').checked}`);
        updateDebugPanel(`Frame delay: ${document.getElementById('speedControl').value}ms`);
        updateDebugPanel('==================');
        debugPanel.style.display = 'block';
    } else {
        debugPanel.style.display = 'none';
    }
}

function closeDebugPanel() {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        debugPanel.style.display = 'none';
    }
}

function updateDebugPanel(message) {
    const debugContent = document.getElementById('debugContent');
    if (!debugContent) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const newLine = `[${timestamp}] ${message}`;
    
    const lines = debugContent.innerHTML.split('<br>').filter(Boolean);
    lines.unshift(newLine);
    
    if (lines.length > 30) {
        lines.splice(30);
    }
    
    debugContent.innerHTML = lines.join('<br>');
}

// 전역 에러 핸들러
window.addEventListener('error', function(e) {
    log('전역 에러:', e.message);
    console.error(e);
    
    if (document.getElementById('processingOverlay').style.display !== 'none') {
        hideProcessing();
        alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
});

window.addEventListener('unhandledrejection', function(e) {
    log('Promise 거부:', e.reason);
    console.error(e);
    
    if (document.getElementById('processingOverlay').style.display !== 'none') {
        hideProcessing();
        alert('처리 중 오류가 발생했습니다.');
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
});

// 디버그용 전역 함수 노출
window.pdfGifDebug = {
    getState: function() {
        return {
            pdfLoaded: !!originalPdfDoc,
            pages: pdfPages.length,
            selectedPage: selectedPageIndex,
            gifFrames: gifFrames.length,
            position: gifPosition,
            autoPlay: document.getElementById('autoPlay').checked,
            frameDelay: document.getElementById('speedControl').value
        };
    },
    testAnimation: function() {
        if (gifFrames.length > 0) {
            log('테스트 애니메이션 시작');
            let frame = 0;
            const interval = setInterval(() => {
                frame = (frame + 1) % gifFrames.length;
                document.getElementById('gifPreviewElement').innerHTML = 
                    `<img src="${gifFrames[frame].dataUrl}" alt="Frame ${frame}">`;
                
                if (frame === 0) {
                    clearInterval(interval);
                    log('테스트 애니메이션 완료');
                }
            }, 500);
        }
    },
    forceInit: function() {
        log('강제 초기화 실행');
        initializeEventListeners();
    }
};

log('스크립트 로드 완료 - v2.0');
