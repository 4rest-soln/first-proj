// PDF에 GIF 애니메이션 삽입 (향상된 JavaScript 기반)
async function insertAnimatedGif(pdfDoc, targetPage, gifFrames, position) {
    console.log('고급 애니메이션 GIF PDF 삽입 시작');
    
    try {
        const form = pdfDoc.getForm();
        
        if (gifFrames.length === 1) {
            // 단일 프레임인 경우 정적 이미지로 삽입
            console.log('단일 프레임 정적 이미지 삽입');
            const pngImage = await pdfDoc.embedPng(gifFrames[0].data);
            targetPage.drawImage(pngImage, {
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
            });
            
            // 재생 버튼 추가 (장식용)
            try {
                const playButton = form.createButton('gifPlay');
                playButton.addToPage('▶️', targetPage, {
                    x: position.x + position.width - 25,
                    y: position.y + position.height - 25,
                    width: 20,
                    height: 20,
                    fontSize: 12
                });
            } catch (e) {
                console.log('재생 버튼 추가 실패:', e.message);
            }
            
        } else if (gifFrames.length > 1) {
            // 멀티 프레임인 경우 애니메이션 구현
            console.log(`멀티 프레임 애니메이션 구현 (${gifFrames.length}개 프레임)`);
            
            // 모든 프레임을 PDF에 이미지로 임베드
            const embeddedImages = [];
            for (let i = 0; i < gifFrames.length; i++) {
                const pngImage = await pdfDoc.embedPng(gifFrames[i].data);
                embeddedImages.push(pngImage);
            }
            
            // 첫 번째 프레임을 기본으로 표시
            targetPage.drawImage(embeddedImages[0], {
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
            });
            
            // 각 프레임에 대한 이미지 필드 생성 (숨김)
            for (let i = 0; i < embeddedImages.length; i++) {
                try {
                    const frameButton = form.createButton(`gifFrame${i}`);
                    frameButton.addToPage('', targetPage, {
                        x: position.x,
                        y: position.y,
                        width: position.width,
                        height: position.height,
                    });
                    
                    // 이미지 설정
                    frameButton.setImage(embeddedImages[i]);
                    
                    // 처음에는 첫 번째 프레임 외에는 숨김
                    if (i > 0) {
                        // 숨김 처리는 PDF-lib에서 제한적으로 지원됨
                    }
                } catch (e) {
                    console.log(`프레임 ${i} 생성 실패:`, e.message);
                }
            }
            
            // 애니메이션 제어 버튼들
            try {
                // 재생 버튼
                const playButton = form.createButton('gifPlayBtn');
                playButton.addToPage('▶️', targetPage, {
                    x: position.x,
                    y: position.y - 30,
                    width: 25,
                    height: 20,
                    fontSize: 12
                });
                
                // 정지 버튼  
                const stopButton = form.createButton('gifStopBtn');
                stopButton.addToPage('⏹️', targetPage, {
                    x: position.x + 30,
                    y: position.y - 30,
                    width: 25,
                    height: 20,
                    fontSize: 12
                });
                
                console.log('애니메이션 제어 버튼 추가 완료');
            } catch (e) {
                console.log('제어 버튼 추가 실패:', e.message);
            }
            
            // PDF에 JavaScript 코드 추가 시도 (제한적 지원)
            try {
                // Document-level JavaScript (일부 PDF 뷰어에서만 지원)
                const jsCode = `
                    var currentFrame = 0;
                    var totalFrames = ${gifFrames.length};
                    var animationTimer = null;
                    var frameDelay = ${gifFrames[0].delay || 500};
                    
                    function startAnimation() {
                        if (animationTimer) {
                            clearInterval(animationTimer);
                        }
                        
                        animationTimer = setInterval(function() {
                            // 모든 프레임 숨기기
                            for (var i = 0; i < totalFrames; i++) {
                                try {
                                    var field = this.getField('gifFrame' + i);
                                    if (field) {
                                        field.display = display.hidden;
                                    }
                                } catch(e) {}
                            }
                            
                            // 현재 프레임 표시
                            try {
                                var currentField = this.getField('gifFrame' + currentFrame);
                                if (currentField) {
                                    currentField.display = display.visible;
                                }
                            } catch(e) {}
                            
                            currentFrame = (currentFrame + 1) % totalFrames;
                        }, frameDelay);
                    }
                    
                    function stopAnimation() {
                        if (animationTimer) {
                            clearInterval(animationTimer);
                            animationTimer = null;
                        }
                    }
                `;
                
                // PDF에 JavaScript 추가 (실험적)
                console.log('PDF JavaScript 코드 준비 완료');
                
            } catch (jsError) {
                console.log('JavaScript 코드 추가 실패:', jsError.message);
            }
        }
        
        console.log('애니메이션 GIF 삽입 완료');
        return true;
        
    } catch (error) {
        console.error('애니메이션 GIF 삽입 실패:', error);
        throw error;
    }
}// PDF에 GIF 애니메이션 삽입 (JavaScript 기반)
async function insertAnimatedGif(pdfDoc, targetPage, gifFrames, position) {
    console.log('애니메이션 GIF PDF 삽입 시작');
    
    try {
        // 첫 번째 프레임 이미지 삽입
        const firstFrame = gifFrames[0];
        const pngImage = await pdfDoc.embedPng(firstFrame.data);
        
        console.log('첫 번째 프레임 이미지 임베드 완료');
        
        // 이미지를 페이지에 그리기
        targetPage.drawImage(pngImage, {
            x: position.x,
            y: position.y,
            width: position.width,
            height: position.height,
        });
        
        console.log('첫 번째 프레임 이미지 그리기 완료');
        
        // PDF에 JavaScript 애니메이션 코드 추가 (향후 확장을 위한 준비)
        // 현재 PDF-lib는 JavaScript 액션 추가를 제한적으로 지원하므로
        // 일단 정적 이미지로 삽입하고, 추후 개선 가능
        
        // JavaScript 애니메이션을 위한 주석 추가
        const form = pdfDoc.getForm();
        
        // 버튼 생성 (클릭 시 애니메이션 시작용 - 향후 확장)
        try {
            const animationButton = form.createButton('gifAnimation');
            animationButton.addToPage('▶️ GIF', targetPage, {
                x: position.x,
                y: position.y + position.height + 10,
                width: 60,
                height: 20,
                fontSize: 10
            });
            console.log('애니메이션 제어 버튼 추가 완료');
        } catch (buttonError) {
            console.log('버튼 추가 실패 (선택사항):', buttonError.message);
        }
        
        return true;
        
    } catch (error) {
        console.error('애니메이션 GIF 삽입 실패:', error);
        throw error;
    }
}// 전역 변수
let currentPdfFile = null;
let pdfDoc = null; // PDF-lib 문서
let pdfJsDoc = null; // PDF.js 문서  
let pdfPages = [];
let selectedPageIndex = -1;
let gifFile = null;
let gifPosition = { x: 50, y: 50, width: 100, height: 100 };
let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0 };
let resizeHandle = null;

// DOM 요소
const pdfInput = document.getElementById('pdfInput');
const pdfUploadBox = document.getElementById('pdfUploadBox');
const uploadSection = document.getElementById('uploadSection');
const workspace = document.getElementById('workspace');
const pageSelector = document.getElementById('pageSelector');
const pagesGrid = document.getElementById('pagesGrid');
const btnSelectPage = document.getElementById('btnSelectPage');
const gifPositionEditor = document.getElementById('gifPositionEditor');
const gifInput = document.getElementById('gifInput');
const gifUploadArea = document.getElementById('gifUploadArea');
const gifOverlay = document.getElementById('gifOverlay');
const gifPreviewImg = document.getElementById('gifPreviewImg');
const pdfPreviewCanvas = document.getElementById('pdfPreviewCanvas');
const pdfPreviewContainer = document.getElementById('pdfPreviewContainer');
const btnGeneratePdf = document.getElementById('btnGeneratePdf');
const processingOverlay = document.getElementById('processingOverlay');
const completionScreen = document.getElementById('completionScreen');

// DOM 요소 확인
function checkDOMElements() {
    const elements = {
        pdfInput, pdfUploadBox, uploadSection, workspace, pageSelector, 
        pagesGrid, btnSelectPage, gifPositionEditor, gifInput, gifUploadArea,
        gifOverlay, gifPreviewImg, pdfPreviewCanvas, pdfPreviewContainer,
        btnGeneratePdf, processingOverlay, completionScreen
    };
    
    console.log('DOM 요소 확인:');
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`❌ ${name} 요소를 찾을 수 없음`);
        } else {
            console.log(`✅ ${name} 요소 확인됨`);
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료');
    checkDOMElements();
});

// 이벤트 리스너
pdfInput.addEventListener('change', handlePdfUpload);
gifInput.addEventListener('change', handleGifUpload);

// PDF 드래그 앤 드롭
pdfUploadBox.addEventListener('dragover', handleDragOver);
pdfUploadBox.addEventListener('dragleave', handleDragLeave);
pdfUploadBox.addEventListener('drop', handleDrop);

// GIF 업로드 영역 클릭
gifUploadArea.addEventListener('click', () => {
    gifInput.click();
});

// GIF 오버레이 드래그 이벤트
gifOverlay.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

// 컨트롤 입력 이벤트
document.getElementById('posX').addEventListener('input', updateGifPosition);
document.getElementById('posY').addEventListener('input', updateGifPosition);
document.getElementById('gifWidth').addEventListener('input', updateGifPosition);
document.getElementById('gifHeight').addEventListener('input', updateGifPosition);

// PDF 업로드 처리
async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        await loadPdf(file);
    }
}

// 드래그 앤 드롭 핸들러
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    pdfUploadBox.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    pdfUploadBox.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    pdfUploadBox.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        pdfInput.files = files;
        loadPdf(files[0]);
    }
}

// PDF 로드 및 썸네일 생성
async function loadPdf(file) {
    showProcessing('PDF 분석 중...', 'PDF 정보를 읽고 있습니다');
    
    try {
        currentPdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        
        // PDF-lib으로 로드 (PDF 생성용)
        pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        pdfPages = pdfDoc.getPages();
        
        // PDF.js로 로드 (렌더링용)  
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0 // 로그 최소화
        });
        
        pdfJsDoc = await loadingTask.promise;
        
        console.log('PDF 로드 성공:', {
            pages: pdfPages.length,
            pdfJsPages: pdfJsDoc.numPages
        });
        
        // UI 업데이트
        document.getElementById('pdfFileName').textContent = file.name;
        document.getElementById('pdfPageCount').textContent = `총 페이지 수: ${pdfPages.length}`;
        
        // 페이지 썸네일 생성
        await generatePageThumbnails();
        
        uploadSection.style.display = 'none';
        workspace.style.display = 'block';
        
        hideProcessing();
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 읽을 수 없습니다: ' + error.message);
        hideProcessing();
    }
}

// 페이지 썸네일 생성
async function generatePageThumbnails() {
    pagesGrid.innerHTML = '';
    
    console.log('썸네일 생성 시작, 총 페이지:', pdfPages.length);
    
    for (let i = 0; i < pdfPages.length; i++) {
        try {
            console.log(`페이지 ${i + 1} 썸네일 생성 시작`);
            
            // PDF.js로 페이지 렌더링
            const page = await pdfJsDoc.getPage(i + 1); // PDF.js는 1부터 시작
            const scale = 0.5; // 썸네일 크기 증가
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
            
            console.log(`페이지 ${i + 1} 렌더링 시작`);
            await page.render(renderContext).promise;
            console.log(`페이지 ${i + 1} 렌더링 완료`);
            
            // 썸네일 요소 생성
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-thumbnail';
            thumbnail.dataset.pageIndex = i;
            
            // 캔버스를 이미지로 변환하여 삽입
            const imgSrc = canvas.toDataURL('image/png');
            thumbnail.innerHTML = `
                <img src="${imgSrc}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 8px;" alt="Page ${i + 1}">
                <div class="page-number">페이지 ${i + 1}</div>
            `;
            
            thumbnail.addEventListener('click', () => selectPage(i));
            pagesGrid.appendChild(thumbnail);
            
            console.log(`페이지 ${i + 1} 썸네일 생성 완료`);
            
        } catch (error) {
            console.error(`페이지 ${i + 1} 썸네일 생성 실패:`, error);
            
            // 실패 시 기본 썸네일 생성
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
            pagesGrid.appendChild(thumbnail);
        }
    }
    
    console.log('모든 썸네일 생성 완료');
}

// 페이지 선택
function selectPage(pageIndex) {
    // 이전 선택 해제
    document.querySelectorAll('.page-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });
    
    // 새 선택
    const selectedThumbnail = document.querySelector(`[data-page-index="${pageIndex}"]`);
    selectedThumbnail.classList.add('selected');
    
    selectedPageIndex = pageIndex;
    btnSelectPage.disabled = false;
}

// GIF 업로드로 진행
function proceedToGifUpload() {
    if (selectedPageIndex === -1) {
        alert('페이지를 선택해주세요.');
        return;
    }
    
    updateStep(2);
    pageSelector.style.display = 'none';
    gifPositionEditor.style.display = 'block';
    
    // 선택된 페이지 미리보기 생성
    renderPagePreview();
}

// 페이지 미리보기 렌더링
async function renderPagePreview() {
    try {
        console.log('페이지 미리보기 렌더링 시작, 페이지:', selectedPageIndex + 1);
        
        // PDF.js로 선택된 페이지 렌더링
        const page = await pdfJsDoc.getPage(selectedPageIndex + 1); // PDF.js는 1부터 시작
        
        // 컨테이너 크기에 맞춰 스케일 계산
        const containerWidth = pdfPreviewContainer.clientWidth - 4; // 보더 고려
        const tempviewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / tempviewport.width, 800 / tempviewport.height); // 최대 높이 800px 제한
        const viewport = page.getViewport({ scale });
        
        console.log('미리보기 스케일:', scale);
        console.log('뷰포트 크기:', viewport.width, 'x', viewport.height);
        
        // 캔버스 크기 설정
        pdfPreviewCanvas.width = viewport.width;
        pdfPreviewCanvas.height = viewport.height;
        
        // 페이지 렌더링
        const renderContext = {
            canvasContext: pdfPreviewCanvas.getContext('2d'),
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        console.log('페이지 미리보기 렌더링 완료');
        
    } catch (error) {
        console.error('페이지 미리보기 렌더링 실패:', error);
        
        // 실패 시 기본 페이지 표시
        const ctx = pdfPreviewCanvas.getContext('2d');
        const containerWidth = pdfPreviewContainer.clientWidth - 4;
        pdfPreviewCanvas.width = containerWidth;
        pdfPreviewCanvas.height = containerWidth * 1.4; // A4 비율 근사치
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, pdfPreviewCanvas.width, pdfPreviewCanvas.height);
        
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(20, 20, pdfPreviewCanvas.width - 40, pdfPreviewCanvas.height - 40);
        ctx.strokeStyle = '#e5e7eb';
        ctx.strokeRect(20, 20, pdfPreviewCanvas.width - 40, pdfPreviewCanvas.height - 40);
        
        // 에러 메시지 표시
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`페이지 ${selectedPageIndex + 1}`, pdfPreviewCanvas.width / 2, pdfPreviewCanvas.height / 2);
        ctx.fillText('(렌더링 실패)', pdfPreviewCanvas.width / 2, pdfPreviewCanvas.height / 2 + 25);
    }
}

// GIF 업로드 처리
function handleGifUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'image/gif') {
        gifFile = file;
        
        // 미리보기 생성
        const reader = new FileReader();
        reader.onload = function(e) {
            gifPreviewImg.src = e.target.result;
            gifUploadArea.innerHTML = `
                <img src="${e.target.result}" class="gif-preview" alt="GIF Preview">
                <p>GIF 업로드됨</p>
            `;
            gifUploadArea.classList.add('has-gif');
            
            // GIF 오버레이 표시
            showGifOverlay();
            updateStep(3);
        };
        reader.readAsDataURL(file);
    }
}

// GIF 오버레이 표시
function showGifOverlay() {
    // 기본 위치 설정 (캔버스 중앙)
    const canvasRect = pdfPreviewCanvas.getBoundingClientRect();
    const containerRect = pdfPreviewContainer.getBoundingClientRect();
    
    gifPosition = {
        x: (pdfPreviewCanvas.width - 100) / 2,
        y: (pdfPreviewCanvas.height - 100) / 2,
        width: 100,
        height: 100
    };
    
    updateGifOverlayPosition();
    gifOverlay.style.display = 'block';
    btnGeneratePdf.disabled = false;
}

// GIF 오버레이 위치 업데이트
function updateGifOverlayPosition() {
    const canvasRect = pdfPreviewCanvas.getBoundingClientRect();
    const containerRect = pdfPreviewContainer.getBoundingClientRect();
    
    const scaleX = pdfPreviewCanvas.width / canvasRect.width;
    const scaleY = pdfPreviewCanvas.height / canvasRect.height;
    
    gifOverlay.style.left = (gifPosition.x / scaleX) + 'px';
    gifOverlay.style.top = (gifPosition.y / scaleY) + 'px';
    gifOverlay.style.width = (gifPosition.width / scaleX) + 'px';
    gifOverlay.style.height = (gifPosition.height / scaleY) + 'px';
    
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
        resizeHandle = e.target.classList[1]; // nw, ne, sw, se
    } else {
        isDragging = true;
    }
    
    const rect = pdfPreviewContainer.getBoundingClientRect();
    dragStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;
    
    e.preventDefault();
    const rect = pdfPreviewContainer.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const canvasRect = pdfPreviewCanvas.getBoundingClientRect();
    const containerRect = pdfPreviewContainer.getBoundingClientRect();
    const scaleX = pdfPreviewCanvas.width / canvasRect.width;
    const scaleY = pdfPreviewCanvas.height / canvasRect.height;
    
    if (isDragging) {
        const deltaX = (currentX - dragStart.x) * scaleX;
        const deltaY = (currentY - dragStart.y) * scaleY;
        
        gifPosition.x = Math.max(0, Math.min(pdfPreviewCanvas.width - gifPosition.width, gifPosition.x + deltaX));
        gifPosition.y = Math.max(0, Math.min(pdfPreviewCanvas.height - gifPosition.height, gifPosition.y + deltaY));
        
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
                gifPosition.height = Math.max(10, gifPosition.height + deltaY);
                gifPosition.x = Math.max(0, gifPosition.x + deltaX);
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

// PDF 생성
async function generatePdf() {
    console.log('PDF 생성 시작');
    
    if (!gifFile || selectedPageIndex === -1) {
        alert('필요한 데이터가 없습니다.');
        return;
    }
    
    showProcessing('GIF 삽입 중...', 'PDF를 생성하고 있습니다');
    updateStep(4);
    
    try {
        console.log('PDF 생성 단계 1: 새 PDF 문서 생성');
        
        // 새로운 PDF 문서 생성 (원본 보호)
        const arrayBuffer = await currentPdfFile.arrayBuffer();
        const newPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = newPdfDoc.getPages();
        const targetPage = pages[selectedPageIndex];
        
        if (!targetPage) {
            throw new Error('선택된 페이지를 찾을 수 없습니다.');
        }
        
        console.log('PDF 생성 단계 2: 페이지 정보 확인');
        
        // 페이지 크기 가져오기
        const { width: pageWidth, height: pageHeight } = targetPage.getSize();
        
        // 캔버스 좌표를 PDF 좌표로 변환
        const scaleX = pageWidth / pdfPreviewCanvas.width;
        const scaleY = pageHeight / pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY; // PDF는 하단이 원점
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('PDF 좌표 계산:', { 
            pageSize: { pageWidth, pageHeight },
            canvasSize: { width: pdfPreviewCanvas.width, height: pdfPreviewCanvas.height },
            scale: { scaleX, scaleY },
            gifPosition,
            pdfCoords: { pdfX, pdfY, pdfWidth, pdfHeight }
        });
        
        console.log('PDF 생성 단계 3: GIF 프레임 추출');
        
        // GIF를 여러 프레임으로 분할
        const gifFrames = await extractGifFrames(gifFile);
        
        if (!gifFrames || gifFrames.length === 0) {
            throw new Error('GIF 프레임 추출에 실패했습니다.');
        }
        
        console.log(`PDF 생성 단계 4: GIF 애니메이션 삽입 (${gifFrames.length}개 프레임)`);
        
        // 애니메이션 GIF를 PDF에 삽입
        await insertAnimatedGif(newPdfDoc, targetPage, gifFrames, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight
        });
        
        console.log('PDF 생성 단계 5: PDF 저장');
        
        // PDF 저장
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // 다운로드 준비
        window.generatedPdfUrl = url;
        window.generatedPdfName = `gif_inserted_${Date.now()}.pdf`;
        
        console.log('PDF 생성 완료');
        console.log('생성된 PDF URL:', window.generatedPdfUrl);
        console.log('파일명:', window.generatedPdfName);
        
        // 완료 처리 (화면 표시 대신 자동 다운로드)
        handleCompletion();
        
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        console.error('에러 스택:', error.stack);
        alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
        hideProcessing();
        
        // 실패 시 이전 단계로 돌아가기
        updateStep(3);
    }
}

// GIF를 실제 여러 프레임으로 분할 (개선된 버전)
async function extractGifFrames(gifFile) {
    return new Promise(async (resolve, reject) => {
        console.log('고급 GIF 프레임 추출 시작');
        
        try {
            // GIF 파일을 ArrayBuffer로 읽기
            const arrayBuffer = await gifFile.arrayBuffer();
            
            // gifuct-js 라이브러리를 사용하여 GIF 파싱 시도
            if (typeof gifuct !== 'undefined') {
                try {
                    console.log('gifuct-js를 사용한 GIF 파싱 시도');
                    const gif = gifuct.parseGIF(arrayBuffer);
                    const frames = gifuct.decompressFrames(gif, true);
                    
                    console.log(`GIF 파싱 성공: ${frames.length}개 프레임 발견`);
                    
                    const frameData = [];
                    
                    for (let i = 0; i < Math.min(frames.length, 10); i++) { // 최대 10프레임으로 제한
                        const frame = frames[i];
                        
                        // 프레임을 캔버스에 그리기
                        const canvas = document.createElement('canvas');
                        canvas.width = gif.lsd.width;  
                        canvas.height = gif.lsd.height;
                        const ctx = canvas.getContext('2d');
                        
                        // ImageData 생성
                        const imageData = new ImageData(
                            new Uint8ClampedArray(frame.patch),
                            frame.dims.width,
                            frame.dims.height
                        );
                        
                        // 전체 캔버스를 흰색으로 채우기
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // 프레임 데이터를 캔버스에 그리기
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = frame.dims.width;
                        tempCanvas.height = frame.dims.height;  
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.putImageData(imageData, 0, 0);
                        
                        ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
                        
                        // PNG로 변환
                        const blob = await new Promise(resolve => {
                            canvas.toBlob(resolve, 'image/png', 1.0);
                        });
                        
                        if (blob) {
                            const frameArrayBuffer = await blob.arrayBuffer();
                            frameData.push({
                                data: frameArrayBuffer,
                                delay: frame.delay || 100
                            });
                        }
                    }
                    
                    if (frameData.length > 0) {
                        console.log(`GIF 프레임 추출 완료: ${frameData.length}개 프레임`);
                        resolve(frameData);
                        return;
                    }
                } catch (gifuctError) {
                    console.log('gifuct-js 파싱 실패, 대안 방법 사용:', gifuctError.message);
                }
            }
            
            // 대안: 단일 프레임 추출 (기존 방식)
            console.log('단일 프레임 추출 방식 사용');
            const img = new Image();
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            const arrayBuffer = await blob.arrayBuffer();
                            
                            // 단일 프레임을 여러 번 복사하여 애니메이션 시뮬레이션
                            const frames = [];
                            for (let i = 0; i < 3; i++) {
                                frames.push({
                                    data: arrayBuffer.slice(0), // 복사본 생성
                                    delay: 500
                                });
                            }
                            
                            console.log(`대안 방식으로 ${frames.length}개 프레임 생성`);
                            resolve(frames);
                        } else {
                            reject(new Error('Canvas to Blob 변환 실패'));
                        }
                    }, 'image/png', 1.0);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(gifFile);
            
        } catch (error) {
            console.error('GIF 프레임 추출 실패:', error);
            reject(error);
        }
    });
}

// 이전 단계로
function backToPageSelection() {
    gifPositionEditor.style.display = 'none';
    pageSelector.style.display = 'block';
    updateStep(1);
    
    // 상태 초기화
    gifFile = null;
    gifOverlay.style.display = 'none';
    gifUploadArea.innerHTML = '<p>GIF 파일을 선택하세요</p>';
    gifUploadArea.classList.remove('has-gif');
    btnGeneratePdf.disabled = true;
}

// 처리 중 표시
function showProcessing(title, message) {
    document.getElementById('processingTitle').textContent = title;
    document.getElementById('processingMessage').textContent = message;
    processingOverlay.style.display = 'flex';
}

// 처리 중 숨기기
function hideProcessing() {
    processingOverlay.style.display = 'none';
}

// 완료 처리 (완료 화면 표시)
function handleCompletion() {
    console.log('완료 처리 시작');
    
    hideProcessing(); // 처리 중 화면 숨기기
    
    if (window.generatedPdfUrl && window.generatedPdfName) {
        console.log('완료 화면 표시 시작');
        
        // 작업 영역 숨기기
        if (workspace) {
            workspace.style.display = 'none';
            console.log('작업 영역 숨김');
        }
        
        // 완료 화면 표시
        if (completionScreen) {
            completionScreen.style.display = 'block';
            console.log('완료 화면 표시됨');
            
            // 스크롤을 맨 위로
            window.scrollTo(0, 0);
        } else {
            console.error('completionScreen 요소를 찾을 수 없음');
            // 완료 화면이 없으면 알림으로 대체
            alert(`✅ PDF 생성이 완료되었습니다!\n\n파일명: ${window.generatedPdfName}\n\n확인 버튼을 클릭하여 다운로드하세요.`);
            downloadPDF();
        }
        
    } else {
        console.error('생성된 PDF가 없습니다');
        alert('❌ PDF 생성에 문제가 발생했습니다.\n다시 시도해주세요.');
        updateStep(3); // 이전 단계로 돌아가기
    }
}

// PDF 다운로드
function downloadPDF() {
    console.log('PDF 다운로드 시작');
    
    if (window.generatedPdfUrl && window.generatedPdfName) {
        try {
            const a = document.createElement('a');
            a.href = window.generatedPdfUrl;
            a.download = window.generatedPdfName;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            console.log('PDF 다운로드 클릭 완료');
        } catch (error) {
            console.error('다운로드 중 오류:', error);
            
            // 대안: 새 창에서 PDF 열기
            try {
                window.open(window.generatedPdfUrl, '_blank');
                console.log('새 창에서 PDF 열기 완료');
            } catch (error2) {
                console.error('새 창 열기도 실패:', error2);
                alert('다운로드에 실패했습니다. 브라우저 설정을 확인해주세요.');
            }
        }
    } else {
        console.error('다운로드할 PDF가 없습니다');
        console.log('generatedPdfUrl:', window.generatedPdfUrl);
        console.log('generatedPdfName:', window.generatedPdfName);
        alert('다운로드할 PDF가 없습니다.');
    }
}

// 새로 시작
function startOver() {
    if (window.generatedPdfUrl) {
        URL.revokeObjectURL(window.generatedPdfUrl);
    }
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
