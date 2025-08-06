// PDF GIF Animator - Chrome PDFium 최적화 버전
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

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // PDF 업로드
    const pdfInput = document.getElementById('pdfInput');
    const pdfUploadBox = document.getElementById('pdfUploadBox');
    
    pdfInput.addEventListener('change', handlePdfUpload);
    pdfUploadBox.addEventListener('click', () => pdfInput.click());
    
    // 드래그 앤 드롭
    pdfUploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfUploadBox.classList.add('drag-over');
    });
    
    pdfUploadBox.addEventListener('dragleave', () => {
        pdfUploadBox.classList.remove('drag-over');
    });
    
    pdfUploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfUploadBox.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            pdfInput.files = files;
            handlePdfUpload({ target: { files: files } });
        }
    });
    
    // GIF 업로드
    const gifInput = document.getElementById('gifInput');
    const gifUploadArea = document.getElementById('gifUploadArea');
    
    gifInput.addEventListener('change', handleGifUpload);
    gifUploadArea.addEventListener('click', () => gifInput.click());
    
    // GIF 오버레이 드래그
    const gifOverlay = document.getElementById('gifOverlay');
    if (gifOverlay) {
        gifOverlay.addEventListener('mousedown', handleMouseDown);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 컨트롤 입력
    document.getElementById('posX').addEventListener('input', updateGifFromControls);
    document.getElementById('posY').addEventListener('input', updateGifFromControls);
    document.getElementById('gifWidth').addEventListener('input', updateGifFromControls);
    document.getElementById('gifHeight').addEventListener('input', updateGifFromControls);
    document.getElementById('speedControl').addEventListener('input', function() {
        document.getElementById('speedDisplay').textContent = this.value + 'ms';
    });
}

// PDF 업로드 처리
async function handlePdfUpload(e) {
    const file = e.target.files[0];
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
        alert('PDF 파일을 읽을 수 없습니다.');
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
    if (!file || file.type !== 'image/gif') {
        alert('GIF 파일을 선택해주세요.');
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
        };
        reader.readAsDataURL(file);
        
        hideProcessing();
    } catch (error) {
        log('GIF 처리 실패', error);
        alert('GIF 파일을 처리할 수 없습니다.');
        hideProcessing();
    }
}

// GIF 프레임 추출 (개선된 버전)
async function extractGifFrames(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    try {
        const reader = new GifReader(uint8Array);
        const frameCount = reader.numFrames();
        const maxFrames = parseInt(document.getElementById('maxFrames').value) || 10;
        const framesToExtract = Math.min(frameCount, maxFrames);
        
        log(`GIF 프레임 추출: ${framesToExtract}/${frameCount} 프레임`);
        updateProcessingDetails(`${framesToExtract}개 프레임 추출 중...`);
        
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
                canvas.toBlob(resolve, 'image/png', 0.8); // 압축률 조정
            });
            
            frames.push({
                data: await blob.arrayBuffer(),
                dataUrl: canvas.toDataURL('image/png', 0.8),
                delay: Math.max(frameInfo.delay * 10, 100)
            });
            
            updateProgress(10 + (i / framesToExtract) * 40);
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
    const canvas = document.getElementById('pdfPreviewCanvas');
    
    // 초기 위치 설정
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
    
    // 컨트롤 업데이트
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

// 최적화된 PDF 생성 (Chrome PDFium 특화)
async function generateOptimizedPdf() {
    if (!gifFrames.length || selectedPageIndex === -1) {
        alert('필요한 데이터가 없습니다.');
        return;
    }
    
    log('최적화된 PDF 생성 시작');
    showProcessing('PDF 생성 중...', 'Chrome에 최적화된 애니메이션 PDF를 생성하고 있습니다');
    updateStep(4);
    
    try {
        // 새 PDF 문서 생성
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        // 모든 페이지 복사
        for (let i = 0; i < originalPages.length; i++) {
            updateProcessingDetails(`페이지 ${i + 1}/${originalPages.length} 처리 중...`);
            updateProgress(10 + (i / originalPages.length) * 40);
            
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // 선택된 페이지에 애니메이션 추가
            if (i === selectedPageIndex) {
                log(`페이지 ${i + 1}에 애니메이션 추가`);
                await addOptimizedAnimation(newPdfDoc, addedPage, i);
            }
        }
        
        // PDF 저장
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

// Chrome PDFium에 최적화된 애니메이션 추가
async function addOptimizedAnimation(pdfDoc, page, pageIndex) {
    log('Chrome 최적화 애니메이션 추가 시작');
    
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const canvas = document.getElementById('pdfPreviewCanvas');
    
    // 좌표 변환
    const scaleX = pageWidth / canvas.width;
    const scaleY = pageHeight / canvas.height;
    
    const pdfX = gifPosition.x * scaleX;
    const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
    const pdfWidth = gifPosition.width * scaleX;
    const pdfHeight = gifPosition.height * scaleY;
    
    const form = pdfDoc.getForm();
    const autoPlay = document.getElementById('autoPlay').checked;
    const frameDelay = parseInt(document.getElementById('speedControl').value);
    
    log(`위치: (${pdfX}, ${pdfY}), 크기: ${pdfWidth}x${pdfHeight}`);
    log(`프레임: ${gifFrames.length}개, 속도: ${frameDelay}ms, 자동재생: ${autoPlay}`);
    
    // 프레임을 버튼 필드로 추가
    const frameButtons = [];
    for (let i = 0; i < gifFrames.length; i++) {
        updateProcessingDetails(`프레임 ${i + 1}/${gifFrames.length} 임베딩...`);
        
        const buttonName = `frame_${pageIndex}_${i}`;
        const button = form.createButton(buttonName);
        
        // PNG 이미지 임베드
        const pngImage = await pdfDoc.embedPng(gifFrames[i].data);
        
        // 버튼을 페이지에 추가
        button.addToPage(page, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            borderWidth: 0
        });
        
        // 버튼 아이콘으로 이미지 설정
        button.setImage(pngImage);
        
        // 첫 프레임 제외하고 숨김
        if (i > 0) {
            const widget = button.acroField.getWidgets()[0];
            widget.setHidden(true);
        }
        
        frameButtons.push(buttonName);
    }
    
    // JavaScript 애니메이션 코드 (Chrome PDFium 최적화)
    const animationJS = `
// Chrome PDFium 최적화 애니메이션 - 페이지 ${pageIndex + 1}
var anim_${pageIndex} = {
    frames: [${frameButtons.map(name => `"${name}"`).join(',')}],
    current: 0,
    total: ${gifFrames.length},
    delay: ${frameDelay},
    autoPlay: ${autoPlay},
    running: false,
    timer: null
};

// 초기화 함수
anim_${pageIndex}.init = function() {
    console.println("[Animation] Initializing page ${pageIndex + 1}");
    
    // 모든 프레임 숨기기
    for (var i = 0; i < this.total; i++) {
        try {
            var f = this.getField(this.frames[i]);
            if (f) {
                f.display = display.hidden;
            }
        } catch(e) {}
    }
    
    // 첫 프레임 표시
    try {
        var first = this.getField(this.frames[0]);
        if (first) {
            first.display = display.visible;
        }
    } catch(e) {}
    
    // 자동재생
    if (this.autoPlay && this.total > 1) {
        var self = this;
        app.setTimeOut("anim_${pageIndex}.start()", 1000);
    }
};

// 프레임 전환
anim_${pageIndex}.showFrame = function(index) {
    try {
        // 현재 프레임 숨기기
        var curr = this.getField(this.frames[this.current]);
        if (curr) {
            curr.display = display.hidden;
        }
        
        // 새 프레임 표시
        this.current = index % this.total;
        var next = this.getField(this.frames[this.current]);
        if (next) {
            next.display = display.visible;
        }
        
        console.println("[Animation] Frame " + this.current);
    } catch(e) {
        console.println("[Animation] Error: " + e.message);
    }
};

// 다음 프레임
anim_${pageIndex}.nextFrame = function() {
    this.showFrame((this.current + 1) % this.total);
    
    // 계속 재생
    if (this.running) {
        var self = this;
        this.timer = app.setTimeOut("anim_${pageIndex}.nextFrame()", this.delay);
    }
};

// 애니메이션 시작
anim_${pageIndex}.start = function() {
    console.println("[Animation] Starting");
    this.running = true;
    this.nextFrame();
};

// 애니메이션 정지
anim_${pageIndex}.stop = function() {
    console.println("[Animation] Stopping");
    this.running = false;
    if (this.timer) {
        app.clearTimeOut(this.timer);
        this.timer = null;
    }
};

// 토글
anim_${pageIndex}.toggle = function() {
    if (this.running) {
        this.stop();
        return "▶ Play";
    } else {
        this.start();
        return "⏸ Pause";
    }
};

// 페이지 열릴 때 초기화
try {
    app.setTimeOut("anim_${pageIndex}.init()", 500);
} catch(e) {
    console.println("[Animation] Init failed: " + e.message);
}
`;
    
    // JavaScript 추가
    pdfDoc.addJavaScript(`AnimationScript_${pageIndex}`, animationJS);
    
    // 컨트롤 버튼 추가 (수동 재생일 경우)
    if (!autoPlay) {
        const controlButton = form.createButton(`control_${pageIndex}`);
        controlButton.addToPage('▶ Play', page, {
            x: pdfX,
            y: pdfY - 40,
            width: Math.min(100, pdfWidth),
            height: 30,
            fontSize: 12,
            backgroundColor: PDFLib.rgb(0.2, 0.4, 0.8),
            borderColor: PDFLib.rgb(0, 0, 0),
            borderWidth: 1,
            textColor: PDFLib.rgb(1, 1, 1)
        });
        
        // 버튼 액션
        const buttonAction = `
            var caption = anim_${pageIndex}.toggle();
            this.getField("control_${pageIndex}").buttonSetCaption(caption);
        `;
        
        controlButton.setAction(PDFLib.PDFActionType.MouseUp, 
            PDFLib.PDFAction.createJavaScript(buttonAction));
    }
    
    log('애니메이션 추가 완료');
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
    link.click();
    
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
    location.reload();
}

// 이전 단계로
function backToPageSelection() {
    document.getElementById('gifPositionEditor').style.display = 'none';
    document.getElementById('pageSelector').style.display = 'block';
    updateStep(1);
    
    // 상태 초기화
    gifFile = null;
    gifFrames = [];
    document.getElementById('gifOverlay').style.display = 'none';
    document.getElementById('gifUploadArea').innerHTML = '<p>GIF 선택</p>';
    document.getElementById('gifUploadArea').classList.remove('has-gif');
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
    document.getElementById('processingTitle').textContent = title;
    document.getElementById('processingMessage').textContent = message;
    document.getElementById('processingOverlay').style.display = 'flex';
    updateProgress(0);
}

function hideProcessing() {
    document.getElementById('processingOverlay').style.display = 'none';
}

function updateProgress(percent) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = Math.round(percent) + '%';
}

function updateProcessingDetails(details) {
    document.getElementById('processingDetails').textContent = details;
}

function showCompletionScreen() {
    document.getElementById('workspace').style.display = 'none';
    document.getElementById('completionScreen').style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 디버그 함수들
function showDebugInfo() {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel.style.display === 'none') {
        updateDebugPanel('Debug panel opened');
        debugPanel.style.display = 'block';
    } else {
        debugPanel.style.display = 'none';
    }
}

function closeDebugPanel() {
    document.getElementById('debugPanel').style.display = 'none';
}

function updateDebugPanel(message) {
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
        debugContent.innerHTML = message + '<br>' + (debugContent.innerHTML || '');
        // 최대 20줄만 유지
        const lines = debugContent.innerHTML.split('<br>');
        if (lines.length > 20) {
            debugContent.innerHTML = lines.slice(0, 20).join('<br>');
        }
    }
}

// 전역 에러 핸들러
window.addEventListener('error', function(e) {
    log('에러 발생', e.error);
    console.error(e);
});

window.addEventListener('unhandledrejection', function(e) {
    log('Promise 거부', e.reason);
    console.error(e);
});

log('스크립트 로드 완료');
