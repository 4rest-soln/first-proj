// 전역 변수
let currentPdfFile = null;
let pdfPageCount = 0;
let selectedPage = 1;
let selectedArea = {
    x: 20, y: 20, width: 50, height: 50
};
let gifFrames = null;

// DOM 요소
const pdfInput = document.getElementById('pdfInput');
const pdfUploadBox = document.getElementById('pdfUploadBox');
const uploadSection = document.getElementById('uploadSection');
const workspace = document.getElementById('workspace');
const pageSelector = document.getElementById('pageSelector');
const areaSettings = document.getElementById('areaSettings');
const gifInput = document.getElementById('gifInput');
const gifModal = document.getElementById('gifModal');
const gifPreview = document.getElementById('gifPreview');
const btnProcessGif = document.getElementById('btnProcessGif');
const processingOverlay = document.getElementById('processingOverlay');
const completionScreen = document.getElementById('completionScreen');

// 이벤트 리스너
pdfInput.addEventListener('change', handlePdfUpload);
gifInput.addEventListener('change', handleGifUpload);

// PDF 드래그 앤 드롭
pdfUploadBox.addEventListener('dragover', handleDragOver);
pdfUploadBox.addEventListener('dragleave', handleDragLeave);
pdfUploadBox.addEventListener('drop', handleDrop);

// GIF 드래그 앤 드롭
gifPreview.addEventListener('dragover', handleGifDragOver);
gifPreview.addEventListener('dragleave', handleGifDragLeave);
gifPreview.addEventListener('drop', handleGifDrop);

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

// GIF 드래그 앤 드롭 핸들러
function handleGifDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    gifPreview.classList.add('drag-over');
}

function handleGifDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    gifPreview.classList.remove('drag-over');
}

function handleGifDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    gifPreview.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'image/gif') {
        gifInput.files = files;
        handleGifUpload({ target: { files: files } });
    } else {
        alert('GIF 파일만 업로드 가능합니다.');
    }
}

// PDF 로드 (PDF-lib만 사용)
async function loadPdf(file) {
    showProcessing('PDF 분석 중...', 'PDF 정보를 읽고 있습니다');
    
    try {
        currentPdfFile = file;
        
        // PDF-lib로 페이지 수만 확인
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        pdfPageCount = pdfDoc.getPageCount();
        
        // UI 업데이트
        document.getElementById('pdfFileName').textContent = file.name;
        document.getElementById('pdfPageCount').textContent = `총 페이지 수: ${pdfPageCount}`;
        document.getElementById('pageNumber').max = pdfPageCount;
        document.getElementById('pageRange').textContent = `/ ${pdfPageCount}`;
        
        uploadSection.style.display = 'none';
        workspace.style.display = 'block';
        
        hideProcessing();
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 읽을 수 없습니다.');
        hideProcessing();
    }
}

// 페이지 선택
function selectPage() {
    const pageNum = parseInt(document.getElementById('pageNumber').value);
    
    if (pageNum < 1 || pageNum > pdfPageCount) {
        alert(`1부터 ${pdfPageCount}까지의 페이지 번호를 입력하세요.`);
        return;
    }
    
    selectedPage = pageNum;
    updateStep(2);
    
    pageSelector.style.display = 'none';
    areaSettings.style.display = 'block';
}

// 영역 설정 프리셋
function setPreset(size) {
    const presets = {
        small: { width: 30, height: 30 },
        medium: { width: 50, height: 50 },
        large: { width: 80, height: 80 }
    };
    
    const preset = presets[size];
    document.getElementById('width').value = preset.width;
    document.getElementById('height').value = preset.height;
}

// 이전 단계로
function backToPageSelection() {
    areaSettings.style.display = 'none';
    pageSelector.style.display = 'block';
    updateStep(1);
}

// GIF 업로드 진행
function proceedToGifUpload() {
    // 영역 설정 값 저장
    selectedArea = {
        x: parseFloat(document.getElementById('posX').value),
        y: parseFloat(document.getElementById('posY').value),
        width: parseFloat(document.getElementById('width').value),
        height: parseFloat(document.getElementById('height').value)
    };
    
    updateStep(3);
    gifModal.style.display = 'flex';
}

// GIF 모달 닫기
function closeGifModal() {
    gifModal.style.display = 'none';
    gifPreview.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="8" width="48" height="48" rx="8" stroke="#E5E7EB" stroke-width="2"/>
            <path d="M24 32L30 26L36 32M30 26V40" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>GIF 파일을 선택하거나 드래그하세요</p>
    `;
    btnProcessGif.disabled = true;
    gifFrames = null;
    updateStep(2);
}

// GIF 업로드 처리
async function handleGifUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'image/gif') {
        try {
            // 미리보기 표시
            const reader = new FileReader();
            reader.onload = function(e) {
                gifPreview.innerHTML = `<img src="${e.target.result}" alt="GIF Preview">`;
                btnProcessGif.disabled = false;
                
                // GIF 이미지를 Canvas로 변환
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    gifFrames = [{
                        canvas: canvas,
                        delay: 100
                    }];
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('GIF 로드 실패:', error);
            alert('GIF 파일을 읽을 수 없습니다.');
        }
    }
}

// GIF 처리 및 PDF 생성
async function processGif() {
    if (!gifFrames || !selectedArea || !currentPdfFile) {
        alert('필요한 데이터가 없습니다.');
        return;
    }
    
    closeGifModal();
    showProcessing('GIF 삽입 중...', 'PDF를 생성하고 있습니다');
    updateStep(4);
    
    try {
        // 새로운 ArrayBuffer로 PDF 로드
        const arrayBuffer = await currentPdfFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const page = pages[selectedPage - 1];
        
        // 페이지 크기 가져오기
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // mm를 PDF 포인트로 변환 (1mm = 2.834645669 points)
        const mmToPoints = 2.834645669;
        const pdfX = selectedArea.x * mmToPoints;
        const pdfY = pageHeight - (selectedArea.y + selectedArea.height) * mmToPoints;
        const pdfWidth = selectedArea.width * mmToPoints;
        const pdfHeight = selectedArea.height * mmToPoints;
        
        // GIF를 PNG로 변환하여 삽입
        const firstFrame = gifFrames[0];
        const pngDataUrl = firstFrame.canvas.toDataURL('image/png');
        const pngData = await fetch(pngDataUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngData);
        
        // 이미지를 페이지에 그리기
        page.drawImage(pngImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        // PDF 저장
        const pdfBytes = await pdfDoc.save();
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
        a.click();
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
