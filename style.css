// 전역 변수
let currentPdfFile = null;
let pdfDoc = null;
let pdfPages = [];
let selectedPageIndex = -1;
let gifFile = null;
let gifFrames = [];
let gifPosition = { x: 50, y: 50, width: 100, height: 100 };
let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0 };
let resizeHandle = null;
let animationIntervals = [];

// DOM 요소들
const elements = {
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
    btnPreview: document.getElementById('btnPreview'),
    processingOverlay: document.getElementById('processingOverlay'),
    viewerSection: document.getElementById('viewerSection'),
    viewerCanvas: document.getElementById('viewerCanvas'),
    viewerContainer: document.getElementById('viewerContainer')
};

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('PDF GIF 애플리케이션 초기화');
    initializeEventListeners();
    checkBrowserSupport();
});

// 브라우저 지원 확인
function checkBrowserSupport() {
    const features = {
        fileReader: typeof FileReader !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined',
        pdfjs: typeof pdfjsLib !== 'undefined',
        gifuct: typeof gifuct !== 'undefined'
    };

    console.log('브라우저 지원 상태:', features);
    
    if (!features.fileReader || !features.canvas || !features.pdfjs) {
        alert('브라우저가 필요한 기능을 지원하지 않습니다. 최신 브라우저를 사용해주세요.');
        return false;
    }
    
    if (!features.gifuct) {
        console.warn('GIF 처리 라이브러리가 로드되지 않았습니다. 기본 처리 방식을 사용합니다.');
    }
    
    return true;
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 파일 업로드
    elements.pdfInput.addEventListener('change', handlePdfUpload);
    elements.gifInput.addEventListener('change', handleGifUpload);

    // PDF 드래그 앤 드롭
    elements.pdfUploadBox.addEventListener('dragover', handleDragOver);
    elements.pdfUploadBox.addEventListener('dragleave', handleDragLeave);
    elements.pdfUploadBox.addEventListener('drop', handleDrop);

    // GIF 업로드 영역 클릭
    elements.gifUploadArea.addEventListener('click', () => {
        elements.gifInput.click();
    });

    // GIF 오버레이 드래그 이벤트
    elements.gifOverlay.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 컨트롤 입력 이벤트
    document.getElementById('posX').addEventListener('input', updateGifPosition);
    document.getElementById('posY').addEventListener('input', updateGifPosition);
    document.getElementById('gifWidth').addEventListener('input', updateGifPosition);
    document.getElementById('gifHeight').addEventListener('input', updateGifPosition);
}

// PDF 업로드 처리
async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        await loadPdf(file);
    } else {
        alert('PDF 파일만 업로드 가능합니다.');
    }
}

// 드래그 앤 드롭 핸들러
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
        alert('PDF 파일만 업로드 가능합니다.');
    }
}

// PDF 로드 및 썸네일 생성
async function loadPdf(file) {
    showProcessing('PDF 분석 중...', 'PDF 정보를 읽고 있습니다');
    
    try {
        currentPdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        
        // PDF.js로 로드
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        });
        
        pdfDoc = await loadingTask.promise;
        pdfPages = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            pdfPages.push(await pdfDoc.getPage(i));
        }
        
        console.log('PDF 로드 성공:', pdfPages.length, '페이지');
        
        // UI 업데이트
        document.getElementById('pdfFileName').textContent = file.name;
        document.getElementById('pdfPageCount').textContent = `총 페이지 수: ${pdfPages.length}`;
        
        // 페이지 썸네일 생성
        await generatePageThumbnails();
        
        elements.uploadSection.style.display = 'none';
        elements.workspace.style.display = 'block';
        
        hideProcessing();
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 읽을 수 없습니다: ' + error.message);
        hideProcessing();
    }
}

// 페이지 썸네일 생성
async function generatePageThumbnails() {
    elements.pagesGrid.innerHTML = '';
    
    console.log('썸네일 생성 시작, 총 페이지:', pdfPages.length);
    
    for (let i = 0; i < pdfPages.length; i++) {
        try {
            const page = pdfPages[i];
            const scale = 0.5;
            const viewport = page.getViewport({ scale });
            
            // 캔버스 생성
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // 페이지 렌더링
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // 썸네일 요소 생성
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-thumbnail';
            thumbnail.dataset.pageIndex = i;
            
            const imgSrc = canvas.toDataURL('image/png');
            thumbnail.innerHTML = `
                <img src="${imgSrc}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 8px;" alt="Page ${i + 1}">
                <div class="page-number">페이지 ${i + 1}</div>
            `;
            
            thumbnail.addEventListener('click', () => selectPage(i));
            elements.pagesGrid.appendChild(thumbnail);
            
        } catch (error) {
            console.error(`페이지 ${i + 1} 썸네일 생성 실패:`, error);
            
            // 실패 시 기본 썸네일
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-thumbnail';
            thumbnail.dataset.pageIndex = i;
            thumbnail.innerHTML = `
                <div style="width: 150px; height: 200px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-bottom: 8px;">
                    <span style="color: #6b7280;">페이지 ${i + 1}</span>
                </div>
                <div class="page-number">페이지 ${i + 1}</div>
            `;
            
            thumbnail.addEventListener('click', () => selectPage(i));
            elements.pagesGrid.appendChild(thumbnail);
        }
    }
}

// 페이지 선택
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

// GIF 업로드로 진행
function proceedToGifUpload() {
    if (selectedPageIndex === -1) {
        alert('페이지를 선택해주세요.');
        return;
    }
    
    updateStep(2);
    elements.pageSelector.style.display = 'none';
    elements.gifPositionEditor.style.display = 'block';
    
    renderPagePreview();
}

// 페이지 미리보기 렌더링
async function renderPagePreview() {
    try {
        const page = pdfPages[selectedPageIndex];
        
        // 컨테이너 크기에 맞춰 스케일 계산
        const containerWidth = elements.pdfPreviewContainer.clientWidth - 4;
        const tempViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / tempViewport.width, 800 / tempViewport.height);
        const viewport = page.getViewport({ scale });
        
        // 캔버스 크기 설정
        elements.pdfPreviewCanvas.width = viewport.width;
        elements.pdfPreviewCanvas.height = viewport.height;
        
        // 페이지 렌더링
        const renderContext = {
            canvasContext: elements.pdfPreviewCanvas.getContext('2d'),
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        console.log('페이지 미리보기 렌더링 완료');
        
    } catch (error) {
        console.error('페이지 미리보기 렌더링 실패:', error);
        showErrorCanvas('페이지 렌더링 실패');
    }
}

// 에러 캔버스 표시
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

// GIF 업로드 처리
async function handleGifUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'image/gif') {
        showProcessing('GIF 처리 중...', 'GIF 프레임을 추출하고 있습니다');
        
        try {
            gifFile = file;
            gifFrames = await extractGifFrames(file);
            
            // 미리보기 생성
            const reader = new FileReader();
            reader.onload = function(e) {
                elements.gifUploadArea.innerHTML = `
                    <img src="${e.target.result}" class="gif-preview" alt="GIF Preview">
                    <p>GIF 업로드됨 (${gifFrames.length}개 프레임)</p>
                `;
                elements.gifUploadArea.classList.add('has-gif');
                
                showGifOverlay();
                updateStep(3);
                hideProcessing();
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('GIF 처리 실패:', error);
            alert('GIF 파일을 처리할 수 없습니다: ' + error.message);
            hideProcessing();
        }
    } else {
        alert('GIF 파일만 업로드 가능합니다.');
    }
}

// GIF 프레임 추출 (개선된 버전)
async function extractGifFrames(gifFile) {
    console.log('GIF 프레임 추출 시작');
    
    try {
        const arrayBuffer = await gifFile.arrayBuffer();
        
        // gifuct-js를 사용한 프레임 추출
        if (typeof gifuct !== 'undefined') {
            try {
                const gif = gifuct.parseGIF(arrayBuffer);
                const frames = gifuct.decompressFrames(gif, true);
                
                console.log(`GIF 파싱 성공: ${frames.length}개 프레임`);
                
                const frameData = [];
                const maxFrames = Math.min(frames.length, 20); // 최대 20프레임
                
                for (let i = 0; i < maxFrames; i++) {
                    const frame = frames[i];
                    const canvas = document.createElement('canvas');
                    canvas.width = gif.lsd.width;
                    canvas.height = gif.lsd.height;
                    const ctx = canvas.getContext('2d');
                    
                    // 프레임을 캔버스에 그리기
                    const imageData = new ImageData(
                        new Uint8ClampedArray(frame.patch),
                        frame.dims.width,
                        frame.dims.height
                    );
                    
                    // 배경 처리
                    if (i === 0 || frame.disposalType === 2) {
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = frame.dims.width;
                    tempCanvas.height = frame.dims.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
                    
                    // 프레임을 데이터 URL로 변환
                    const dataUrl = canvas.toDataURL('image/png');
                    frameData.push({
                        dataUrl: dataUrl,
                        delay: frame.delay || 100
                    });
                }
                
                if (frameData.length > 0) {
                    console.log(`프레임 추출 완료: ${frameData.length}개`);
                    return frameData;
                }
            } catch (gifuctError) {
                console.log('gifuct-js 실패, 대안 방법 사용:', gifuctError.message);
            }
        }
        
        // 대안: 기본 이미지로 처리
        console.log('기본 이미지 처리 방식 사용');
        return await createFramesFromImage(gifFile);
        
    } catch (error) {
        console.error('GIF 프레임 추출 실패:', error);
        throw error;
    }
}

// 이미지에서 프레임 생성 (대안 방법)
async function createFramesFromImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const dataUrl = canvas.toDataURL('image/png');
            
            // 단일 프레임을 여러 번 복사
            const frames = [];
            for (let i = 0; i < 1; i++) { // 정적 이미지이므로 1프레임만
                frames.push({
                    dataUrl: dataUrl,
                    delay: 1000
                });
            }
            
            resolve(frames);
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

// GIF 오버레이 표시
function showGifOverlay() {
    // 기본 위치 설정
    gifPosition = {
        x: (elements.pdfPreviewCanvas.width - 100) / 2,
        y: (elements.pdfPreviewCanvas.height - 100) / 2,
        width: 100,
        height: 100
    };
    
    // 첫 번째 프레임 표시
    if (gifFrames.length > 0) {
        elements.gifPreviewElement.innerHTML = `<img src="${gifFrames[0].dataUrl}" alt="GIF Preview">`;
    }
    
    updateGifOverlayPosition();
    elements.gifOverlay.style.display = 'block';
    elements.btnPreview.disabled = false;
}

// GIF 오버레이 위치 업데이트
function updateGifOverlayPosition() {
    const canvasRect = elements.pdfPreviewCanvas.getBoundingClientRect();
    const scaleX = elements.pdfPreviewCanvas.width / canvasRect.width;
    const scaleY = elements.pdfPreviewCanvas.height / canvasRect.height;
    
    // 경계 제한
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
    
    // 컨트롤 패널 업데이트
    document.getElementById('posX').value = Math.round(gifPosition.x);
    document.getElementById('posY').value = Math.round(gifPosition.y);
    document.getElementById('gifWidth').value = Math.round(gifPosition.width);
    document.getElementById('gifHeight').value = Math.round(gifPosition.height);
}

// 컨트롤에서 GIF 위치 업데이트
function updateGifPosition() {
    const x = parseFloat(document.getElementById('posX').value) || 0;
    const y = parseFloat(document.getElementById('posY').value) || 0;
    const width = parseFloat(document.getElementById('gifWidth').value) || 100;
    const height = parseFloat(document.getElementById('gifHeight').value) || 100;
    
    gifPosition = { x, y, width, height };
    updateGifOverlayPosition();
}

// 마우스 이벤트 처리
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

// 미리보기 표시
function showPreview() {
    if (!gifFrames.length || selectedPageIndex === -1) {
        alert('필요한 데이터가 없습니다.');
        return;
    }
    
    updateStep(4);
    elements.workspace.style.display = 'none';
    elements.viewerSection.style.display = 'block';
    
    renderViewer();
}

// 뷰어 렌더링
async function renderViewer() {
    try {
        const page = pdfPages[selectedPageIndex];
        
        // 뷰어 컨테이너 크기 계산
        const containerWidth = elements.viewerContainer.clientWidth - 4;
        const tempViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / tempViewport.width, window.innerHeight * 0.7 / tempViewport.height);
        const viewport = page.getViewport({ scale });
        
        // 캔버스 설정
        elements.viewerCanvas.width = viewport.width;
        elements.viewerCanvas.height = viewport.height;
        elements.viewerCanvas.style.width = viewport.width + 'px';
        elements.viewerCanvas.style.height = viewport.height + 'px';
        
        // 페이지 렌더링
        const renderContext = {
            canvasContext: elements.viewerCanvas.getContext('2d'),
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // 애니메이션 오버레이 생성
        createAnimatedOverlay(scale);
        
    } catch (error) {
        console.error('뷰어 렌더링 실패:', error);
        alert('미리보기 생성에 실패했습니다.');
    }
}

// 애니메이션 오버레이 생성
function createAnimatedOverlay(scale) {
    // 기존 오버레이 제거
    const existingOverlays = elements.viewerContainer.querySelectorAll('.animated-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    // 애니메이션 인터벌 정리
    animationIntervals.forEach(interval => clearInterval(interval));
    animationIntervals = [];
    
    // 새 오버레이 생성
    const overlay = document.createElement('div');
    overlay.className = 'animated-overlay';
    
    // 위치 계산 (PDF 좌표계에서 화면 좌표계로 변환)
    const scaleX = elements.viewerCanvas.width / elements.pdfPreviewCanvas.width;
    const scaleY = elements.viewerCanvas.height / elements.pdfPreviewCanvas.height;
    
    const overlayX = gifPosition.x * scaleX;
    const overlayY = gifPosition.y * scaleY;
    const overlayWidth = gifPosition.width * scaleX;
    const overlayHeight = gifPosition.height * scaleY;
    
    overlay.style.left = overlayX + 'px';
    overlay.style.top = overlayY + 'px';
    overlay.style.width = overlayWidth + 'px';
    overlay.style.height = overlayHeight + 'px';
    
    // 이미지 엘리먼트 생성
    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    overlay.appendChild(img);
    elements.viewerContainer.appendChild(overlay);
    
    // 애니메이션 시작
    if (gifFrames.length > 1) {
        let currentFrame = 0;
        
        function nextFrame() {
            img.src = gifFrames[currentFrame].dataUrl;
            currentFrame = (currentFrame + 1) % gifFrames.length;
        }
        
        nextFrame(); // 첫 프레임 즉시 표시
        
        const interval = setInterval(nextFrame, gifFrames[0].delay || 500);
        animationIntervals.push(interval);
    } else {
        // 정적 이미지
        img.src = gifFrames[0].dataUrl;
    }
}

// 편집으로 돌아가기
function backToEditor() {
    elements.viewerSection.style.display = 'none';
    elements.workspace.style.display = 'block';
    updateStep(3);
    
    // 애니메이션 정리
    animationIntervals.forEach(interval => clearInterval(interval));
    animationIntervals = [];
}

// 이전 단계로
function backToPageSelection() {
    elements.gifPositionEditor.style.display = 'none';
    elements.pageSelector.style.display = 'block';
    updateStep(1);
    
    // 상태 초기화
    gifFile = null;
    gifFrames = [];
    elements.gifOverlay.style.display = 'none';
    elements.gifUploadArea.innerHTML = '<p>GIF 파일을 선택하세요</p>';
    elements.gifUploadArea.classList.remove('has-gif');
    elements.btnPreview.disabled = true;
}

// HTML 다운로드
function downloadHTML() {
    try {
        const htmlContent = generateHTMLViewer();
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf-gif-${Date.now()}.html`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        alert('HTML 파일이 다운로드되었습니다!');
        
    } catch (error) {
        alert('다운로드에 실패했습니다.');
    }
}

// HTML 뷰어 생성
function generateHTMLViewer() {
    const canvasDataUrl = elements.viewerCanvas.toDataURL('image/png');
    const frameDataUrls = gifFrames.map(frame => frame.dataUrl);
    const frameDelays = gifFrames.map(frame => frame.delay || 500);
    
    // 위치 계산
    const scaleX = elements.viewerCanvas.width / elements.pdfPreviewCanvas.width;
    const scaleY = elements.viewerCanvas.height / elements.pdfPreviewCanvas.height;
    
    const overlayX = gifPosition.x * scaleX;
    const overlayY = gifPosition.y * scaleY;
    const overlayWidth = gifPosition.width * scaleX;
    const overlayHeight = gifPosition.height * scaleY;
    
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF with Animated GIF</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
        }
        .viewer-container {
            position: relative;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
            max-width: 100%;
            max-height: 90vh;
        }
        .pdf-background {
            display: block;
            max-width: 100%;
            height: auto;
        }
        .animated-gif {
            position: absolute;
            left: ${overlayX}px;
            top: ${overlayY}px;
            width: ${overlayWidth}px;
            height: ${overlayHeight}px;
            pointer-events: none;
        }
        .controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .controls button {
            margin: 0 5px;
            padding: 8px 16px;
            border: none;
            background: #4F46E5;
            color: white;
            border-radius: 4px;
            cursor: pointer;
        }
        .controls button:hover {
            background: #4338CA;
        }
        .controls button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .controls { 
                position: static; 
                margin-bottom: 10px;
                text-align: center;
            }
            .animated-gif {
                left: ${overlayX * 0.8}px;
                top: ${overlayY * 0.8}px;
                width: ${overlayWidth * 0.8}px;
                height: ${overlayHeight * 0.8}px;
            }
        }
    </style>
</head>
<body>
    <div class="controls">
        <button onclick="toggleAnimation()" id="toggleBtn">일시정지</button>
        <button onclick="resetAnimation()">처음부터</button>
        <span id="frameInfo">프레임: 1/${frameDataUrls.length}</span>
    </div>
    
    <div class="viewer-container">
        <img src="${canvasDataUrl}" alt="PDF Background" class="pdf-background">
        <img src="${frameDataUrls[0]}" alt="Animated GIF" class="animated-gif" id="animatedGif">
    </div>

    <script>
        const frames = ${JSON.stringify(frameDataUrls)};
        const delays = ${JSON.stringify(frameDelays)};
        let currentFrame = 0;
        let animationInterval = null;
        let isPlaying = true;

        function startAnimation() {
            if (frames.length <= 1) return;
            
            animationInterval = setInterval(() => {
                currentFrame = (currentFrame + 1) % frames.length;
                document.getElementById('animatedGif').src = frames[currentFrame];
                document.getElementById('frameInfo').textContent = 
                    \`프레임: \${currentFrame + 1}/\${frames.length}\`;
            }, delays[0] || 500);
        }

        function stopAnimation() {
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            }
        }

        function toggleAnimation() {
            const btn = document.getElementById('toggleBtn');
            if (isPlaying) {
                stopAnimation();
                btn.textContent = '재생';
                isPlaying = false;
            } else {
                startAnimation();
                btn.textContent = '일시정지';
                isPlaying = true;
            }
        }

        function resetAnimation() {
            stopAnimation();
            currentFrame = 0;
            document.getElementById('animatedGif').src = frames[0];
            document.getElementById('frameInfo').textContent = \`프레임: 1/\${frames.length}\`;
            
            if (isPlaying) {
                startAnimation();
            }
        }

        // 페이지 로드 시 애니메이션 시작
        document.addEventListener('DOMContentLoaded', function() {
            if (frames.length > 1) {
                startAnimation();
            } else {
                document.getElementById('toggleBtn').disabled = true;
                document.getElementById('frameInfo').textContent = '정적 이미지';
            }
        });

        // 페이지 언로드 시 애니메이션 정리
        window.addEventListener('beforeunload', function() {
            stopAnimation();
        });
    </script>
</body>
</html>`;
}

// 처리 중 표시
function showProcessing(title, message) {
    document.getElementById('processingTitle').textContent = title;
    document.getElementById('processingMessage').textContent = message;
    elements.processingOverlay.style.display = 'flex';
}

// 처리 중 숨기기
function hideProcessing() {
    elements.processingOverlay.style.display = 'none';
}

// 새로 시작
function startOver() {
    // 애니메이션 정리
    animationIntervals.forEach(interval => clearInterval(interval));
    animationIntervals = [];
    
    // 상태 초기화
    currentPdfFile = null;
    pdfDoc = null;
    pdfPages = [];
    selectedPageIndex = -1;
    gifFile = null;
    gifFrames = [];
    
    // URL 정리
    const existingOverlays = document.querySelectorAll('.animated-overlay img, .animated-overlay video');
    existingOverlays.forEach(element => {
        if (element.src && element.src.startsWith('blob:')) {
            URL.revokeObjectURL(element.src);
        }
    });
    
    // 페이지 새로고침
    location.reload();
}

// 단계 업데이트
function updateStep(step) {
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.step) <= step) {
            el.classList.add('active');
        }
    });
}

// 에러 처리 함수
function handleError(error, context) {
    console.error(`${context}:`, error);
    
    let userMessage = '처리 중 오류가 발생했습니다.';
    
    if (error.message) {
        if (error.message.includes('Invalid PDF')) {
            userMessage = '유효하지 않은 PDF 파일입니다.';
        } else if (error.message.includes('memory') || error.message.includes('size')) {
            userMessage = '파일이 너무 큽니다. 더 작은 파일을 사용해주세요.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            userMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
        }
    }
    
    alert(userMessage);
    hideProcessing();
}

// 메모리 사용량 모니터링 (선택적)
function checkMemoryUsage() {
    if ('memory' in performance) {
        const memory = performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        
        console.log(`메모리 사용량: ${usedMB}MB / ${totalMB}MB`);
        
        // 메모리 사용량이 너무 높으면 경고
        if (usedMB > 500) {
            console.warn('메모리 사용량이 높습니다. 성능에 영향을 줄 수 있습니다.');
        }
    }
}

// 디버깅을 위한 정보 출력
function debugInfo() {
    console.log('=== PDF GIF 디버그 정보 ===');
    console.log('PDF 로드됨:', !!pdfDoc);
    console.log('선택된 페이지:', selectedPageIndex);
    console.log('GIF 프레임 수:', gifFrames.length);
    console.log('GIF 위치:', gifPosition);
    console.log('브라우저 지원:');
    console.log('- FileReader:', typeof FileReader !== 'undefined');
    console.log('- Canvas:', typeof HTMLCanvasElement !== 'undefined');
    console.log('- PDF.js:', typeof pdfjsLib !== 'undefined');
    console.log('- gifuct-js:', typeof gifuct !== 'undefined');
    checkMemoryUsage();
    console.log('==========================');
}

// 전역 함수로 노출 (디버깅용)
window.debugPdfGif = debugInfo;

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    animationIntervals.forEach(interval => clearInterval(interval));
    
    // Blob URL 정리
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
        URL.revokeObjectURL(img.src);
    });
});

// 전역 에러 핸들러
window.addEventListener('error', function(e) {
    console.error('전역 에러:', e.error);
    if (elements.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }
});

// Promise rejection 핸들러
window.addEventListener('unhandledrejection', function(e) {
    console.error('처리되지 않은 Promise 에러:', e.reason);
    e.preventDefault(); // 기본 에러 출력 방지
    
    if (elements.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
});
