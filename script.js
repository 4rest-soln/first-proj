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
let isUploadInProgress = false; // 업로드 중복 방지

// DOM 요소 가져오기
function getElements() {
    return {
        pdfInput: document.getElementById('pdfInput'),
        selectFileBtn: document.getElementById('selectFileBtn'),
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
        speedDisplay: document.getElementById('speedDisplay'),
        asciiResolution: document.getElementById('asciiResolution')
    };
}

let elements = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 크롬 호환 PDF GIF 생성기 초기화 ===');
    
    // DOM 요소 초기화
    elements = getElements();
    
    // 필수 요소 존재 확인
    console.log('DOM 요소 확인:');
    console.log('- pdfInput:', !!elements.pdfInput);
    console.log('- selectFileBtn:', !!elements.selectFileBtn);
    console.log('- pdfUploadBox:', !!elements.pdfUploadBox);
    
    if (!elements.pdfInput || !elements.selectFileBtn) {
        console.error('필수 DOM 요소가 없습니다');
        alert('페이지 로딩 문제가 발생했습니다. 새로고침해주세요.');
        return;
    }
    
    console.log('DOM 요소 확인 완료');
    
    // 즉시 테스트 이벤트 리스너 추가 (디버깅용)
    elements.selectFileBtn.addEventListener('click', function(e) {
        console.log('=== 버튼 클릭 감지됨 ===');
        console.log('Event:', e);
        console.log('Target:', e.target);
        console.log('isUploadInProgress:', isUploadInProgress);
        
        e.preventDefault();
        e.stopPropagation();
        
        if (isUploadInProgress) {
            console.log('업로드 진행 중이므로 무시');
            return;
        }
        
        console.log('파일 입력 요소 클릭 시도');
        
        if (elements.pdfInput) {
            try {
                elements.pdfInput.click();
                console.log('파일 입력 클릭 성공');
            } catch (error) {
                console.error('파일 입력 클릭 실패:', error);
            }
        } else {
            console.error('pdfInput 요소가 null입니다');
        }
    });
    
    console.log('테스트 이벤트 리스너 추가 완료');
    
    initializeEventListeners();
    checkBrowserSupport();
});

// 브라우저 지원 확인
function checkBrowserSupport() {
    const features = {
        fileReader: typeof FileReader !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined',
        pdfjs: typeof pdfjsLib !== 'undefined',
        pdflib: typeof PDFLib !== 'undefined',
        gifuct: typeof gifuct !== 'undefined'
    };

    console.log('=== 브라우저 지원 확인 ===');
    Object.entries(features).forEach(([name, supported]) => {
        console.log(`${name}: ${supported ? '✅' : '❌'}`);
    });
    
    if (!features.gifuct) {
        console.warn('⚠️ gifuct-js 라이브러리가 로드되지 않았습니다');
        console.log('omggif 대체 사용을 시도합니다');
    }
    
    if (!features.fileReader || !features.canvas || !features.pdfjs || !features.pdflib) {
        console.error('❌ 필수 기능이 누락되었습니다');
        alert('브라우저가 필요한 기능을 지원하지 않습니다. 최신 브라우저를 사용해주세요.');
        return false;
    }
    
    console.log('✅ 브라우저 지원 확인 완료');
    return true;
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    console.log('이벤트 리스너 초기화 시작');
    
    // 요소 존재 확인
    if (!elements.selectFileBtn) {
        console.error('selectFileBtn 요소를 찾을 수 없습니다');
        return;
    }
    
    if (!elements.pdfInput) {
        console.error('pdfInput 요소를 찾을 수 없습니다');
        return;
    }
    
    // 파일 업로드 이벤트
    elements.selectFileBtn.addEventListener('click', handleFileButtonClick);
    elements.pdfInput.addEventListener('change', handlePdfUpload);
    elements.gifInput.addEventListener('change', handleGifUpload);
    
    console.log('파일 버튼 이벤트 리스너 등록됨');
    
    // 업로드 박스 클릭
    elements.pdfUploadBox.addEventListener('click', handleUploadBoxClick);

    // 드래그 앤 드롭
    elements.pdfUploadBox.addEventListener('dragover', handleDragOver);
    elements.pdfUploadBox.addEventListener('dragleave', handleDragLeave);
    elements.pdfUploadBox.addEventListener('drop', handleDrop);

    // GIF 업로드 영역
    elements.gifUploadArea.addEventListener('click', () => {
        elements.gifInput.click();
    });

    // GIF 오버레이 드래그
    if (elements.gifOverlay) {
        elements.gifOverlay.addEventListener('mousedown', handleMouseDown);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 컨트롤 입력 이벤트
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const gifWidth = document.getElementById('gifWidth');
    const gifHeight = document.getElementById('gifHeight');
    
    if (posX) posX.addEventListener('input', updateGifPosition);
    if (posY) posY.addEventListener('input', updateGifPosition);
    if (gifWidth) gifWidth.addEventListener('input', updateGifPosition);
    if (gifHeight) gifHeight.addEventListener('input', updateGifPosition);
    
    // 애니메이션 설정
    if (elements.speedControl) {
        elements.speedControl.addEventListener('input', updateSpeedDisplay);
    }
    
    console.log('모든 이벤트 리스너 등록 완료');
}

// 파일 버튼 클릭 처리 (수정된 부분)
function handleFileButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('파일 선택 버튼 클릭');
    
    if (isUploadInProgress) {
        console.log('업로드 진행 중이므로 무시');
        return;
    }
    
    // 직접 파일 입력 요소 클릭
    if (elements.pdfInput) {
        elements.pdfInput.click();
    } else {
        console.error('pdfInput 요소를 찾을 수 없음');
    }
}

// 업로드 박스 클릭 처리 (수정된 부분)
function handleUploadBoxClick(e) {
    // 버튼이나 그 자식 요소 클릭 시에는 중복 처리 방지
    if (e.target.closest('#selectFileBtn')) {
        console.log('버튼 영역 클릭 - 중복 처리 방지');
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('업로드 박스 클릭');
    
    if (isUploadInProgress) {
        console.log('업로드 진행 중이므로 무시');
        return;
    }
    
    if (elements.pdfInput) {
        elements.pdfInput.click();
    } else {
        console.error('pdfInput 요소를 찾을 수 없음');
    }
}

// 속도 표시 업데이트
function updateSpeedDisplay() {
    if (elements.speedDisplay) {
        elements.speedDisplay.textContent = elements.speedControl.value + 'ms';
    }
}

// PDF 업로드 처리 (수정된 부분)
async function handlePdfUpload(e) {
    console.log('PDF 파일 업로드 처리 시작');
    
    e.preventDefault();
    e.stopPropagation();
    
    // 중복 호출 방지
    if (isUploadInProgress) {
        console.log('이미 업로드 진행 중');
        return;
    }
    
    const file = e.target.files[0];
    console.log('선택된 파일:', file);
    
    if (!file) {
        console.log('파일이 선택되지 않음');
        return;
    }
    
    if (file.type !== 'application/pdf') {
        console.log('PDF 파일이 아님:', file.type);
        alert('PDF 파일만 업로드 가능합니다.');
        resetFileInput();
        return;
    }
    
    isUploadInProgress = true;
    elements.selectFileBtn.disabled = true;
    
    try {
        console.log('PDF 파일 확인 완료, 로딩 시작');
        await loadPdf(file);
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 읽을 수 없습니다: ' + error.message);
        hideProcessing();
        throw error;
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
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
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

// GIF 업로드 단계로 진행
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
        
        const containerWidth = elements.pdfPreviewContainer.clientWidth - 4;
        const tempViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / tempViewport.width, 800 / tempViewport.height);
        const viewport = page.getViewport({ scale });
        
        elements.pdfPreviewCanvas.width = viewport.width;
        elements.pdfPreviewCanvas.height = viewport.height;
        
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
        updateProgress(10);
        
        try {
            gifFile = file;
            gifFrames = await extractGifFramesWithGifuct(file);
            updateProgress(60);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                elements.gifUploadArea.innerHTML = `
                    <img src="${e.target.result}" class="gif-preview" alt="GIF Preview">
                    <p>GIF 업로드 완료 (${gifFrames.length} 프레임)</p>
                `;
                elements.gifUploadArea.classList.add('has-gif');
                
                showGifOverlay();
                updateStep(3);
                updateProgress(100);
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

// gifuct-js를 사용한 GIF 프레임 추출 (개선된 버전)
async function extractGifFramesWithGifuct(gifFile) {
    console.log('gifuct-js를 사용한 GIF 프레임 추출 시작');
    
    try {
        const arrayBuffer = await gifFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('GIF 파일 로드 완료, 크기:', uint8Array.length, 'bytes');
        
        // gifuct-js 사용
        if (typeof gifuct !== 'undefined') {
            try {
                const gif = gifuct.parseGIF(uint8Array);
                const frames = gifuct.decompressFrames(gif, true); // buildPatch=true (합성 완료된 패치)
                
                console.log(`GIF 파싱 성공: ${frames.length} 프레임 감지`);
                
                if (frames.length > 1) {
                    console.log('멀티 프레임 GIF 감지, 프레임 추출 중...');
                    
                    const maxFrames = 15; // 최대 프레임 수 제한
                    const take = Math.min(frames.length, maxFrames);
                    const W = gif.lsd.width;
                    const H = gif.lsd.height;
                    
                    const extractedFrames = [];
                    
                    for (let i = 0; i < take; i++) {
                        const canvas = document.createElement('canvas');
                        canvas.width = W;
                        canvas.height = H;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        
                        // 흰 배경으로 합성 (투명 픽셀 대비)
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, W, H);
                        
                        const imgData = ctx.createImageData(W, H);
                        imgData.data.set(frames[i].patch);
                        ctx.putImageData(imgData, 0, 0);
                        
                        const blob = await new Promise(resolve => {
                            canvas.toBlob(resolve, 'image/png', 1.0);
                        });
                        
                        if (blob) {
                            const frameBuffer = await blob.arrayBuffer();
                            extractedFrames.push({
                                data: frameBuffer,
                                dataUrl: canvas.toDataURL('image/png'),
                                delay: Math.max((frames[i].delay || 10) * 10, 100) // 1/100s → ms, 최소 100ms
                            });
                            
                            console.log(`프레임 ${i} 추출 성공`);
                        }
                    }
                    
                    if (extractedFrames.length > 1) {
                        console.log(`성공적으로 ${extractedFrames.length} 프레임 추출 완료`);
                        return extractedFrames;
                    } else {
                        console.log('프레임 추출 실패, 정적 이미지로 대체');
                    }
                } else {
                    console.log('단일 프레임 GIF 감지');
                }
                
            } catch (gifuctError) {
                console.error('gifuct-js 파싱 실패:', gifuctError);
                console.log('대체 방법으로 처리 시도');
            }
        } else {
            console.log('gifuct-js 라이브러리 없음, 대체 방법 사용');
        }
        
        // 대체: 정적 이미지로 처리
        console.log('정적 이미지로 처리');
        return await createStaticFrame(gifFile);
        
    } catch (error) {
        console.error('GIF 처리 완전 실패:', error);
        throw new Error('GIF 파일을 처리할 수 없습니다: ' + error.message);
    }
}

// 정적 프레임 생성 (대체 방법)
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
                    reject(new Error('이미지 blob 생성 실패'));
                }
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('GIF를 이미지로 로드 실패'));
        
        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.onerror = () => reject(new Error('GIF 파일 읽기 실패'));
        reader.readAsDataURL(gifFile);
    });
}

// GIF 오버레이 표시
function showGifOverlay() {
    gifPosition = {
        x: (elements.pdfPreviewCanvas.width - 100) / 2,
        y: (elements.pdfPreviewCanvas.height - 100) / 2,
        width: 100,
        height: 100
    };
    
    if (gifFrames.length > 0) {
        elements.gifPreviewElement.innerHTML = `<img src="${gifFrames[0].dataUrl}" alt="GIF Preview">`;
    }
    
    updateGifOverlayPosition();
    elements.gifOverlay.style.display = 'block';
    elements.btnGeneratePdf.disabled = false;
}

// GIF 오버레이 위치 업데이트
function updateGifOverlayPosition() {
    const canvasRect = elements.pdfPreviewCanvas.getBoundingClientRect();
    const scaleX = elements.pdfPreviewCanvas.width / canvasRect.width;
    const scaleY = elements.pdfPreviewCanvas.height / canvasRect.height;
    
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

// 크롬 호환 PDF 생성 (텍스트 필드 프레임버퍼 방식)
async function generateCompatiblePdf() {
    if (!gifFrames.length || selectedPageIndex === -1 || !originalPdfDoc) {
        alert('필요한 데이터가 누락되었습니다.');
        return;
    }
    
    showProcessing('크롬 호환 PDF 생성 중...', '텍스트 필드 프레임버퍼 애니메이션 생성');
    updateProgress(5);
    updateStep(4);
    
    try {
        console.log('=== 크롬 호환 PDF 생성 시작 ===');
        
        const animationMode = document.querySelector('input[name="animationMode"]:checked').value;
        
        if (animationMode === 'ascii') {
            console.log('텍스트 애니메이션 모드 (크롬 최적화)');
            await generateAsciiAnimationPdf();
        } else {
            console.log('버튼 애니메이션 모드 (Acrobat 전용)');
            await generateButtonAnimationPdf();
        }
        
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
        hideProcessing();
    }
}

// ASCII 애니메이션 PDF 생성 (크롬 최적화)
async function generateAsciiAnimationPdf() {
    try {
        console.log('ASCII 애니메이션 PDF 생성 시작');
        
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        console.log(`${originalPages.length} 페이지 처리 중`);
        updateProgress(10);
        
        // 모든 페이지 복사
        for (let i = 0; i < originalPages.length; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // 선택된 페이지에 ASCII 애니메이션 추가
            if (i === selectedPageIndex) {
                console.log(`페이지 ${i + 1}에 ASCII 애니메이션 추가`);
                await addAsciiAnimation(newPdfDoc, addedPage, i);
            }
            
            updateProgress(10 + (i + 1) / originalPages.length * 70);
        }
        
        // 전역 JavaScript 추가
        const globalJS = `
console.println("크롬 호환 ASCII 애니메이션 PDF 로드됨");

// 전역 디버그 함수
function debugAsciiAnimation() {
    if (typeof AsciiAnimation !== 'undefined') {
        console.println("=== ASCII 애니메이션 디버그 ===");
        console.println("현재 프레임: " + AsciiAnimation.currentFrame);
        console.println("총 프레임: " + AsciiAnimation.totalFrames);
        console.println("재생 중: " + AsciiAnimation.isPlaying);
        console.println("자동 재생: " + AsciiAnimation.autoPlay);
        console.println("==========================");
    } else {
        console.println("AsciiAnimation이 아직 초기화되지 않음");
    }
}

// 수동 프레임 전환 테스트
function testAsciiFrame() {
    if (typeof AsciiAnimation !== 'undefined') {
        console.println("수동 프레임 전환 테스트");
        AsciiAnimation.nextFrame();
    }
}
`;
        
        newPdfDoc.addJavaScript('GlobalAsciiAnimationSystem', globalJS);
        updateProgress(85);
        
        // PDF 저장
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
        console.error('ASCII 애니메이션 PDF 생성 실패:', error);
        throw error;
    }
}

// ASCII 애니메이션 추가
async function addAsciiAnimation(pdfDoc, page, pageIndex) {
    try {
        console.log('ASCII 애니메이션 추가 시작');
        
        // 페이지 크기 계산
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('애니메이션 위치:', { pdfX, pdfY, pdfWidth, pdfHeight });
        
        // ASCII 해상도 설정
        const resolution = elements.asciiResolution.value.split('x');
        const asciiCols = parseInt(resolution[0]);
        const asciiRows = parseInt(resolution[1]);
        
        console.log(`ASCII 해상도: ${asciiCols}x${asciiRows}`);
        
        // GIF 프레임을 ASCII로 변환
        const asciiFrames = await convertFramesToAscii(gifFrames, asciiCols, asciiRows);
        updateProgress(50);
        
        if (asciiFrames.length === 1) {
            // 단일 프레임 - 정적 텍스트로 표시
            const form = pdfDoc.getForm();
            const textField = form.createTextField(`static_ascii_${pageIndex}`);
            
            textField.addToPage(page, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                backgroundColor: PDFLib.rgb(1, 1, 1),
                borderWidth: 1,
                borderColor: PDFLib.rgb(0.7, 0.7, 0.7),
                multiline: true,
                fontSize: Math.max(6, Math.min(pdfWidth / asciiCols, pdfHeight / asciiRows))
            });
            
            textField.setText(asciiFrames[0]);
            console.log('정적 ASCII 텍스트 추가 완료');
            return;
        }
        
        // 멀티 프레임 - 각 행에 대해 텍스트 필드 생성
        const form = pdfDoc.getForm();
        const rowHeight = pdfHeight / asciiRows;
        const fontSize = Math.max(4, Math.min(pdfWidth / asciiCols, rowHeight * 0.8));
        
        console.log(`${asciiRows}개 행 텍스트 필드 생성, 폰트 크기: ${fontSize}`);
        
        // 각 행에 대해 텍스트 필드 생성
        for (let row = 0; row < asciiRows; row++) {
            const textField = form.createTextField(`ascii_row_${pageIndex}_${row}`);
            
            textField.addToPage(page, {
                x: pdfX,
                y: pdfY + (asciiRows - row - 1) * rowHeight,
                width: pdfWidth,
                height: rowHeight,
                backgroundColor: PDFLib.rgb(1, 1, 1),
                borderWidth: 0,
                fontSize: fontSize,
                fontFamily: 'Courier' // 고정폭 폰트
            });
            
            // 첫 번째 프레임의 해당 행으로 초기화
            const firstFrameLines = asciiFrames[0].split('\n');
            textField.setText(firstFrameLines[row] || '');
        }
        
        // 애니메이션 제어 JavaScript
        const animationScript = `
console.println("ASCII 애니메이션 시스템 로드됨 - 페이지 ${pageIndex}");

var AsciiAnimation = {
    pageIndex: ${pageIndex},
    currentFrame: 0,
    totalFrames: ${asciiFrames.length},
    frameDelay: ${parseInt(elements.speedControl.value)},
    autoPlay: ${elements.autoPlay.checked},
    isPlaying: false,
    animationTimer: null,
    rows: ${asciiRows},
    
    // 프레임 데이터 (각 프레임은 행별로 분할됨)
    frameData: [${asciiFrames.map(frame => {
        const lines = frame.split('\n');
        return `[${lines.map(line => `"${line.replace(/"/g, '\\"')}"`).join(', ')}]`;
    }).join(', ')}],
    
    init: function() {
        console.println("ASCII 애니메이션 초기화");
        this.currentFrame = 0;
        this.showFrame(0);
        
        if (this.autoPlay && this.totalFrames > 1) {
            var self = this;
            app.setTimeOut("AsciiAnimation.startAnimation()", 1000);
        }
    },
    
    showFrame: function(frameIndex) {
        console.println("ASCII 프레임 표시: " + frameIndex);
        
        try {
            var frameLines = this.frameData[frameIndex];
            for (var row = 0; row < this.rows; row++) {
                var fieldName = "ascii_row_" + this.pageIndex + "_" + row;
                var field = this.getField(fieldName);
                if (field && frameLines[row] !== undefined) {
                    field.value = frameLines[row];
                }
            }
        } catch (e) {
            console.println("프레임 표시 오류: " + e.message);
        }
    },
    
    nextFrame: function() {
        var oldFrame = this.currentFrame;
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        
        console.println("프레임 전환: " + oldFrame + " -> " + this.currentFrame);
        
        this.showFrame(this.currentFrame);
        
        if (this.isPlaying && this.autoPlay) {
            var self = this;
            this.animationTimer = app.setTimeOut("AsciiAnimation.nextFrame()", this.frameDelay);
        }
    },
    
    startAnimation: function() {
        console.println("ASCII 애니메이션 시작");
        this.isPlaying = true;
        
        if (this.animationTimer) {
            app.clearTimeOut(this.animationTimer);
        }
        
        if (this.totalFrames > 1) {
            var self = this;
            this.animationTimer = app.setTimeOut("AsciiAnimation.nextFrame()", this.frameDelay);
        }
        
        return "Stop Animation";
    },
    
    stopAnimation: function() {
        console.println("ASCII 애니메이션 정지");
        this.isPlaying = false;
        
        if (this.animationTimer) {
            app.clearTimeOut(this.animationTimer);
            this.animationTimer = null;
        }
        
        return "Play Animation";
    },
    
    toggleAnimation: function() {
        if (this.isPlaying) {
            return this.stopAnimation();
        } else {
            return this.startAnimation();
        }
    }
};

// 애니메이션 초기화
app.setTimeOut("AsciiAnimation.init()", 1500);
`;
        
        // JavaScript를 PDF에 추가
        pdfDoc.addJavaScript(`AsciiAnimation_${pageIndex}`, animationScript);
        
        // 제어 버튼 추가 (자동재생이 아닌 경우)
        if (!elements.autoPlay.checked) {
            const controlBtn = form.createButton(`ascii_control_${pageIndex}`);
            
            controlBtn.addToPage(page, {
                x: pdfX,
                y: pdfY - 40,
                width: Math.min(pdfWidth, 100),
                height: 30,
                backgroundColor: PDFLib.rgb(0.2, 0.4, 0.8),
                borderColor: PDFLib.rgb(0.1, 0.2, 0.6),
                borderWidth: 1
            });
            
            try {
                controlBtn.setAction(
                    PDFLib.PDFAction.createJavaScript(`
                        var newCaption = AsciiAnimation.toggleAnimation();
                        this.buttonSetCaption(newCaption);
                    `)
                );
                console.log('ASCII 제어 버튼 추가 완료');
            } catch (actionError) {
                console.log('버튼 액션 설정 실패:', actionError.message);
            }
        }
        
        console.log('ASCII 애니메이션 설정 완료');
        return true;
        
    } catch (error) {
        console.error('ASCII 애니메이션 추가 실패:', error);
        
        // 대체: 첫 번째 프레임을 정적 텍스트로 표시
        try {
            const form = pdfDoc.getForm();
            const textField = form.createTextField(`fallback_ascii_${pageIndex}`);
            
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
            const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
            
            textField.addToPage(page, {
                x: gifPosition.x * scaleX,
                y: pageHeight - (gifPosition.y + gifPosition.height) * scaleY,
                width: gifPosition.width * scaleX,
                height: gifPosition.height * scaleY,
                backgroundColor: PDFLib.rgb(1, 1, 1),
                borderWidth: 1
            });
            
            textField.setText('ASCII 애니메이션 로드 실패');
            console.log('대체 텍스트 추가 완료');
        } catch (fallbackError) {
            console.error('대체 텍스트도 실패:', fallbackError);
        }
        
        return false;
    }
}

// GIF 프레임을 ASCII로 변환
async function convertFramesToAscii(frames, cols, rows) {
    console.log(`${frames.length} 프레임을 ${cols}x${rows} ASCII로 변환 시작`);
    
    const asciiChars = ' .:-=+*#%@█';
    const asciiFrames = [];
    
    for (let i = 0; i < frames.length; i++) {
        try {
            // 이미지를 캔버스에 그리기
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = frames[i].dataUrl;
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = cols;
            canvas.height = rows;
            const ctx = canvas.getContext('2d');
            
            // 이미지를 ASCII 해상도로 리사이즈하여 그리기
            ctx.drawImage(img, 0, 0, cols, rows);
            
            // 픽셀 데이터 가져오기
            const imageData = ctx.getImageData(0, 0, cols, rows);
            const pixels = imageData.data;
            
            // ASCII 변환
            let asciiFrame = '';
            for (let y = 0; y < rows; y++) {
                let line = '';
                for (let x = 0; x < cols; x++) {
                    const offset = (y * cols + x) * 4;
                    const r = pixels[offset];
                    const g = pixels[offset + 1];
                    const b = pixels[offset + 2];
                    
                    // 밝기 계산 (0-1)
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                    
                    // ASCII 문자 선택
                    const charIndex = Math.floor(brightness * (asciiChars.length - 1));
                    line += asciiChars[charIndex];
                }
                asciiFrame += line + (y < rows - 1 ? '\n' : '');
            }
            
            asciiFrames.push(asciiFrame);
            console.log(`프레임 ${i} ASCII 변환 완료`);
            
        } catch (error) {
            console.error(`프레임 ${i} ASCII 변환 실패:`, error);
            // 대체: 빈 프레임
            asciiFrames.push(' '.repeat(cols).split('').join('').repeat(rows).match(new RegExp(`.{1,${cols}}`, 'g')).join('\n'));
        }
    }
    
    console.log(`ASCII 변환 완료: ${asciiFrames.length} 프레임`);
    return asciiFrames;
}

// 버튼 애니메이션 PDF 생성 (Acrobat 전용)
async function generateButtonAnimationPdf() {
    try {
        console.log('버튼 애니메이션 PDF 생성 시작 (Acrobat 전용)');
        
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        console.log(`${originalPages.length} 페이지 처리 중`);
        updateProgress(10);
        
        // 모든 페이지 복사
        for (let i = 0; i < originalPages.length; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // 선택된 페이지에 버튼 애니메이션 추가
            if (i === selectedPageIndex) {
                console.log(`페이지 ${i + 1}에 버튼 애니메이션 추가`);
                await addButtonAnimation(newPdfDoc, addedPage, i);
            }
            
            updateProgress(10 + (i + 1) / originalPages.length * 70);
        }
        
        // 전역 JavaScript 추가
        const globalJS = `
console.println("Acrobat 버튼 애니메이션 PDF 로드됨");

function debugButtonAnimation() {
    if (typeof ButtonAnimation !== 'undefined') {
        console.println("=== 버튼 애니메이션 디버그 ===");
        console.println("현재 프레임: " + ButtonAnimation.currentFrame);
        console.println("총 프레임: " + ButtonAnimation.totalFrames);
        console.println("재생 중: " + ButtonAnimation.isPlaying);
        console.println("========================");
    }
}
`;
        
        newPdfDoc.addJavaScript('GlobalButtonAnimationSystem', globalJS);
        updateProgress(85);
        
        // PDF 저장
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
        console.error('버튼 애니메이션 PDF 생성 실패:', error);
        throw error;
    }
}

// 버튼 애니메이션 추가
async function addButtonAnimation(pdfDoc, page, pageIndex) {
    try {
        console.log('버튼 애니메이션 추가 시작');
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        if (gifFrames.length === 1) {
            // 단일 프레임 - 정적 이미지
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            page.drawImage(embeddedImage, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
            });
            console.log('정적 이미지 추가 완료');
            return;
        }
        
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
            const fieldName = `button_frame_${pageIndex}_${i}`;
            const button = form.createButton(fieldName);
            
            button.addToPage(page, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                borderWidth: 0
            });
            
            // 첫 번째 프레임 제외하고 숨김 (display 방식 사용)
            if (i > 0) {
                // hidden 플래그 사용하지 않음 - JavaScript에서 display 제어
            }
            
            frameFields.push(fieldName);
        }
        
        // 버튼 애니메이션 JavaScript (display 토글 방식)
        const animationScript = `
console.println("버튼 애니메이션 시스템 로드됨 - 페이지 ${pageIndex}");

var ButtonAnimation = {
    pageIndex: ${pageIndex},
    currentFrame: 0,
    totalFrames: ${gifFrames.length},
    frameDelay: ${parseInt(elements.speedControl.value)},
    autoPlay: ${elements.autoPlay.checked},
    isPlaying: false,
    animationTimer: null,
    frameFields: [${frameFields.map(name => `"${name}"`).join(', ')}],
    
    init: function() {
        console.println("버튼 애니메이션 초기화");
        this.hideAllFrames();
        this.showFrame(0);
        
        if (this.autoPlay && this.totalFrames > 1) {
            var self = this;
            app.setTimeOut("ButtonAnimation.startAnimation()", 1000);
        }
    },
    
    hideAllFrames: function() {
        for (var i = 0; i < this.totalFrames; i++) {
            try {
                var field = this.getField(this.frameFields[i]);
                if (field) {
                    field.display = display.hidden;
                }
            } catch (e) {
                console.println("프레임 숨김 실패 " + i + ": " + e.message);
            }
        }
    },
    
    showFrame: function(frameIndex) {
        try {
            var field = this.getField(this.frameFields[frameIndex]);
            if (field) {
                field.display = display.visible;
                console.println("프레임 표시: " + frameIndex);
            }
        } catch (e) {
            console.println("프레임 표시 실패 " + frameIndex + ": " + e.message);
        }
    },
    
    nextFrame: function() {
        this.hideAllFrames();
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        this.showFrame(this.currentFrame);
        
        if (this.isPlaying && this.autoPlay) {
            var self = this;
            this.animationTimer = app.setTimeOut("ButtonAnimation.nextFrame()", this.frameDelay);
        }
    },
    
    startAnimation: function() {
        console.println("버튼 애니메이션 시작");
        this.isPlaying = true;
        
        if (this.animationTimer) {
            app.clearTimeOut(this.animationTimer);
        }
        
        if (this.totalFrames > 1) {
            var self = this;
            this.animationTimer = app.setTimeOut("ButtonAnimation.nextFrame()", this.frameDelay);
        }
        
        return "Stop Animation";
    },
    
    stopAnimation: function() {
        console.println("버튼 애니메이션 정지");
        this.isPlaying = false;
        
        if (this.animationTimer) {
            app.clearTimeOut(this.animationTimer);
            this.animationTimer = null;
        }
        
        return "Play Animation";
    },
    
    toggleAnimation: function() {
        if (this.isPlaying) {
            return this.stopAnimation();
        } else {
            return this.startAnimation();
        }
    }
};

app.setTimeOut("ButtonAnimation.init()", 1500);
`;
        
        pdfDoc.addJavaScript(`ButtonAnimation_${pageIndex}`, animationScript);
        
        // 제어 버튼
        if (!elements.autoPlay.checked) {
            const controlBtn = form.createButton(`button_control_${pageIndex}`);
            
            controlBtn.addToPage(page, {
                x: pdfX,
                y: pdfY - 40,
                width: Math.min(pdfWidth, 100),
                height: 30,
                backgroundColor: PDFLib.rgb(0.8, 0.4, 0.2),
                borderColor: PDFLib.rgb(0.6, 0.2, 0.1),
                borderWidth: 1
            });
            
            try {
                controlBtn.setAction(
                    PDFLib.PDFAction.createJavaScript(`
                        var newCaption = ButtonAnimation.toggleAnimation();
                        this.buttonSetCaption(newCaption);
                    `)
                );
                console.log('버튼 제어 버튼 추가 완료');
            } catch (actionError) {
                console.log('버튼 액션 설정 실패:', actionError.message);
            }
        }
        
        console.log('버튼 애니메이션 설정 완료');
        return true;
        
    } catch (error) {
        console.error('버튼 애니메이션 추가 실패:', error);
        
        // 대체: 첫 번째 프레임을 정적 이미지로
        try {
            const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
            const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
            
            page.drawImage(embeddedImage, {
                x: gifPosition.x * scaleX,
                y: pageHeight - (gifPosition.y + gifPosition.height) * scaleY,
                width: gifPosition.width * scaleX,
                height: gifPosition.height * scaleY,
            });
            
            console.log('대체 정적 이미지 추가 완료');
        } catch (fallbackError) {
            console.error('대체 이미지도 실패:', fallbackError);
        }
        
        return false;
    }
}

// 완료 화면 표시
function showCompletionScreen() {
    elements.workspace.style.display = 'none';
    elements.completionScreen.style.display = 'block';
    window.scrollTo(0, 0);
}

// PDF 다운로드
function downloadGeneratedPdf() {
    if (!generatedPdfUrl) {
        alert('생성된 PDF가 없습니다.');
        return;
    }
    
    try {
        const fileName = `chrome-compatible-animated-pdf-${Date.now()}.pdf`;
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
        
        try {
            window.open(generatedPdfUrl, '_blank');
        } catch (error2) {
            alert('다운로드에 실패했습니다. 브라우저 설정을 확인해주세요.');
        }
    }
}

// 페이지 선택으로 돌아가기
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
    elements.btnGeneratePdf.disabled = true;
}

// 처리 중 표시
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

// 처리 중 숨김
function hideProcessing() {
    if (!elements) {
        elements = getElements();
    }
    
    if (elements.processingOverlay) {
        elements.processingOverlay.style.display = 'none';
    }
}

// 진행률 업데이트
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

// 처음부터 시작
function startOver() {
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
    isUploadInProgress = false;
    
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

// 전역 오류 처리
window.addEventListener('error', function(e) {
    console.error('전역 오류:', e.error);
    if (elements && elements.processingOverlay && elements.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('처리되지 않은 Promise 오류:', e.reason);
    e.preventDefault();
    
    if (elements && elements.processingOverlay && elements.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
});

// 디버그 정보
function debugInfo() {
    console.log('=== 크롬 호환 PDF GIF 디버그 정보 ===');
    console.log('PDF 로드됨:', !!originalPdfDoc);
    console.log('선택된 페이지:', selectedPageIndex);
    console.log('GIF 프레임 수:', gifFrames.length);
    console.log('GIF 위치:', gifPosition);
    console.log('생성된 PDF URL:', !!generatedPdfUrl);
    console.log('브라우저 지원:');
    console.log('- FileReader:', typeof FileReader !== 'undefined');
    console.log('- Canvas:', typeof HTMLCanvasElement !== 'undefined');
    console.log('- PDF.js:', typeof pdfjsLib !== 'undefined');
    console.log('- PDF-lib:', typeof PDFLib !== 'undefined');
    console.log('- gifuct-js:', typeof gifuct !== 'undefined');
    console.log('=====================================');
}

// 전역 디버그 함수 노출
window.debugChromeCompatiblePdfGif = debugInfo;error('PDF 로딩 실패:', error);
        alert('PDF 파일을 불러오는데 실패했습니다: ' + error.message);
        resetFileInput();
    } finally {
        isUploadInProgress = false;
        elements.selectFileBtn.disabled = false;
    }
}

// 파일 입력 초기화
function resetFileInput() {
    elements.pdfInput.value = '';
}

// 드래그 앤 드롭 처리
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
    
    if (isUploadInProgress) {
        console.log('업로드 진행 중이므로 드롭 무시');
        return;
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        // 파일 인풋에 설정하여 change 이벤트 트리거
        elements.pdfInput.files = files;
        const event = new Event('change', { bubbles: true });
        elements.pdfInput.dispatchEvent(event);
    } else {
        alert('PDF 파일만 업로드 가능합니다.');
    }
}

// PDF 로드 및 썸네일 생성
async function loadPdf(file) {
    console.log('PDF 로드 시작:', file.name);
    
    showProcessing('PDF 분석 중...', 'PDF 정보를 읽고 있습니다');
    updateProgress(10);
    
    try {
        currentPdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        
        // PDF-lib로 로드 (편집용)
        originalPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        console.log('PDF-lib 로드 성공');
        updateProgress(30);
        
        // PDF.js로 로드 (렌더링용)
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        });
        
        renderPdfDoc = await loadingTask.promise;
        pdfPages = [];
        for (let i = 1; i <= renderPdfDoc.numPages; i++) {
            pdfPages.push(await renderPdfDoc.getPage(i));
        }
        
        console.log('PDF.js 로드 성공:', pdfPages.length, '페이지');
        updateProgress(60);
        
        // UI 업데이트
        document.getElementById('pdfFileName').textContent = file.name;
        document.getElementById('pdfPageCount').textContent = '총 페이지 수: ' + pdfPages.length;
        
        // 페이지 썸네일 생성
        await generatePageThumbnails();
        updateProgress(100);
        
        elements.uploadSection.style.display = 'none';
        elements.workspace.style.display = 'block';
        
        hideProcessing();
    } catch (error) {
        console.
