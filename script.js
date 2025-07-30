// 전역 변수
let currentPdfFile = null;
let pdfDoc = null;
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
        pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        pdfPages = pdfDoc.getPages();
        
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
        alert('PDF 파일을 읽을 수 없습니다.');
        hideProcessing();
    }
}

// 페이지 썸네일 생성
async function generatePageThumbnails() {
    pagesGrid.innerHTML = '';
    
    for (let i = 0; i < pdfPages.length; i++) {
        const page = pdfPages[i];
        const { width, height } = page.getSize();
        
        // 썸네일용 캔버스 생성
        const canvas = document.createElement('canvas');
        const scale = 200 / Math.max(width, height); // 썸네일 크기 조정
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 간단한 페이지 표현 (실제 렌더링 대신)
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
        ctx.strokeStyle = '#d1d5db';
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        // 페이지 번호 표시
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${i + 1}`, canvas.width / 2, canvas.height / 2);
        
        // 썸네일 요소 생성
        const thumbnail = document.createElement('div');
        thumbnail.className = 'page-thumbnail';
        thumbnail.dataset.pageIndex = i;
        thumbnail.innerHTML = `
            ${canvas.outerHTML}
            <div class="page-number">페이지 ${i + 1}</div>
        `;
        
        thumbnail.addEventListener('click', () => selectPage(i));
        pagesGrid.appendChild(thumbnail);
    }
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
    const page = pdfPages[selectedPageIndex];
    const { width, height } = page.getSize();
    
    // 캔버스 크기 설정
    const containerWidth = pdfPreviewContainer.clientWidth - 4; // 보더 고려
    const scale = containerWidth / width;
    
    pdfPreviewCanvas.width = width * scale;
    pdfPreviewCanvas.height = height * scale;
    
    const ctx = pdfPreviewCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, pdfPreviewCanvas.width, pdfPreviewCanvas.height);
    
    // 간단한 페이지 표현
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(20, 20, pdfPreviewCanvas.width - 40, pdfPreviewCanvas.height - 40);
    ctx.strokeStyle = '#e5e7eb';
    ctx.strokeRect(20, 20, pdfPreviewCanvas.width - 40, pdfPreviewCanvas.height - 40);
    
    // 텍스트 라인 표시
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        const y = 60 + i * 30;
        if (y < pdfPreviewCanvas.height - 40) {
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(pdfPreviewCanvas.width - 40, y);
            ctx.stroke();
        }
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
    if (!gifFile || selectedPageIndex === -1) {
        alert('필요한 데이터가 없습니다.');
        return;
    }
    
    showProcessing('GIF 삽입 중...', 'PDF를 생성하고 있습니다');
    updateStep(4);
    
    try {
        // 새로운 PDF 문서 생성 (원본 보호)
        const arrayBuffer = await currentPdfFile.arrayBuffer();
        const newPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = newPdfDoc.getPages();
        const targetPage = pages[selectedPageIndex];
        
        // 페이지 크기 가져오기
        const { width: pageWidth, height: pageHeight } = targetPage.getSize();
        
        // 캔버스 좌표를 PDF 좌표로 변환
        const scaleX = pageWidth / pdfPreviewCanvas.width;
        const scaleY = pageHeight / pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY; // PDF는 하단이 원점
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        // GIF를 PNG로 변환
        const gifImageData = await convertGifToPng(gifFile);
        const pngImage = await newPdfDoc.embedPng(gifImageData);
        
        // 이미지를 페이지에 그리기
        targetPage.drawImage(pngImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        // PDF 저장
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // 다운로드 준비
        window.generatedPdfUrl = url;
        window.generatedPdfName = `gif_inserted_${Date.now()}.pdf`;
        
        hideProcessing();
        showCompletion();
        
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
        hideProcessing();
    }
}

// GIF를 PNG로 변환
async function convertGifToPng(gifFile) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(async (blob) => {
                const arrayBuffer = await blob.arrayBuffer();
                resolve(arrayBuffer);
            }, 'image/png');
        };
        img.onerror = reject;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.readAsDataURL(gifFile);
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

// 완료 화면 표시
function showCompletion() {
    workspace.style.display = 'none';
    completionScreen.style.display = 'block';
}

// PDF 다운로드
function downloadPDF() {
    if (window.generatedPdfUrl && window.generatedPdfName) {
        const a = document.createElement('a');
        a.href = window.generatedPdfUrl;
        a.download = window.generatedPdfName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
