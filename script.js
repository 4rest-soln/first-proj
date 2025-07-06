// PDF.js 초기화
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 전역 변수
let pdfDoc = null;
let currentPdf = null;
let selectedPage = null;
let selectedArea = null;
let gifFrames = null;
let isSelecting = false;
let startX = 0;
let startY = 0;

// DOM 요소
const pdfInput = document.getElementById('pdfInput');
const pdfUploadBox = document.getElementById('pdfUploadBox');
const uploadSection = document.getElementById('uploadSection');
const workspace = document.getElementById('workspace');
const pageGrid = document.getElementById('pageGrid');
const pageDetail = document.getElementById('pageDetail');
const pageCanvas = document.getElementById('pageCanvas');
const selectionOverlay = document.getElementById('selectionOverlay');
const btnAddGif = document.getElementById('btnAddGif');
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

// PDF 로드
async function loadPdf(file) {
    showProcessing('PDF 로딩 중...', '페이지를 분석하고 있습니다');
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        currentPdf = arrayBuffer;
        
        // PDF.js로 로드
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        pdfDoc = await loadingTask.promise;
        
        // 페이지 썸네일 생성
        await generateThumbnails();
        
        // UI 업데이트
        uploadSection.style.display = 'none';
        workspace.style.display = 'block';
        
        hideProcessing();
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 읽을 수 없습니다.');
        hideProcessing();
    }
}

// 썸네일 생성
async function generateThumbnails() {
    pageGrid.innerHTML = '';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // 썸네일 컨테이너 생성
        const thumbnail = document.createElement('div');
        thumbnail.className = 'page-thumbnail';
        thumbnail.onclick = () => selectPage(i);
        
        thumbnail.appendChild(canvas);
        
        const pageNumber = document.createElement('div');
        pageNumber.className = 'page-number';
        pageNumber.textContent = `${i}페이지`;
        thumbnail.appendChild(pageNumber);
        
        pageGrid.appendChild(thumbnail);
    }
}

// 페이지 선택
async function selectPage(pageNum) {
    selectedPage = pageNum;
    
    // 단계 업데이트
    updateStep(2);
    
    // 페이지 상세 보기
    pageGrid.style.display = 'none';
    pageDetail.style.display = 'block';
    
    // 페이지 정보 업데이트
    document.getElementById('pageInfo').textContent = `${pageNum} / ${pdfDoc.numPages} 페이지`;
    
    // 선택한 페이지 렌더링
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    
    pageCanvas.width = viewport.width;
    pageCanvas.height = viewport.height;
    
    const context = pageCanvas.getContext('2d');
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // 마우스 및 터치 이벤트 설정
    setupSelectionEvents();
}

// 영역 선택 이벤트 설정
function setupSelectionEvents() {
    // 마우스 이벤트
    pageCanvas.addEventListener('mousedown', startSelection);
    pageCanvas.addEventListener('mousemove', updateSelection);
    pageCanvas.addEventListener('mouseup', endSelection);
    
    // 터치 이벤트
    pageCanvas.addEventListener('touchstart', startTouchSelection, { passive: false });
    pageCanvas.addEventListener('touchmove', updateTouchSelection, { passive: false });
    pageCanvas.addEventListener('touchend', endTouchSelection, { passive: false });
}

// 터치 이벤트 핸들러
function startTouchSelection(e) {
    e.preventDefault();
    if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        startSelection({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

function updateTouchSelection(e) {
    e.preventDefault();
    if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        updateSelection({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

function endTouchSelection(e) {
    e.preventDefault();
    if (e.changedTouches && e.changedTouches[0]) {
        const touch = e.changedTouches[0];
        endSelection({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

// 선택 시작
function startSelection(e) {
    isSelecting = true;
    const rect = pageCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    selectionOverlay.style.display = 'block';
    selectionOverlay.style.left = startX + 'px';
    selectionOverlay.style.top = startY + 'px';
    selectionOverlay.style.width = '0px';
    selectionOverlay.style.height = '0px';
}

// 선택 업데이트
function updateSelection(e) {
    if (!isSelecting) return;
    
    const rect = pageCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    
    selectionOverlay.style.left = left + 'px';
    selectionOverlay.style.top = top + 'px';
    selectionOverlay.style.width = width + 'px';
    selectionOverlay.style.height = height + 'px';
}

// 선택 종료
function endSelection(e) {
    if (!isSelecting) return;
    isSelecting = false;
    
    const rect = pageCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    if (width > 10 && height > 10) {
        selectedArea = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: width,
            height: height
        };
        
        btnAddGif.disabled = false;
    } else {
        // 드래그 영역이 너무 작으면 선택 취소
        resetSelection();
    }
}

// 선택 영역 초기화
function resetSelection() {
    selectedArea = null;
    selectionOverlay.style.display = 'none';
    btnAddGif.disabled = true;
}

// 페이지 목록으로 돌아가기
function backToGrid() {
    // 이벤트 리스너 제거
    pageCanvas.removeEventListener('mousedown', startSelection);
    pageCanvas.removeEventListener('mousemove', updateSelection);
    pageCanvas.removeEventListener('mouseup', endSelection);
    pageCanvas.removeEventListener('touchstart', startTouchSelection);
    pageCanvas.removeEventListener('touchmove', updateTouchSelection);
    pageCanvas.removeEventListener('touchend', endTouchSelection);
    
    pageDetail.style.display = 'none';
    pageGrid.style.display = 'grid';
    resetSelection();
    updateStep(1);
}

// GIF 업로드 진행
function proceedToGifUpload() {
    if (!selectedArea) return;
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
    updateStep(2); // 단계를 2로 되돌림
}

// GIF 업로드 처리
async function handleGifUpload(e) {
    const file = e.target.files[0];
    if (file && file.type === 'image/gif') {
        // 미리보기 표시
        const reader = new FileReader();
        reader.onload = function(e) {
            gifPreview.innerHTML = `<img src="${e.target.result}" alt="GIF Preview">`;
            btnProcessGif.disabled = false;
        };
        reader.readAsDataURL(file);
        
        // GIF 파싱
        const arrayBuffer = await file.arrayBuffer();
        parseGif(new Uint8Array(arrayBuffer));
    }
}

// GIF 파싱
function parseGif(data) {
    const gif = new GIF(data);
    const frames = gif.decompressFrames(true);
    
    gifFrames = frames.map(frame => {
        const canvas = document.createElement('canvas');
        canvas.width = frame.dims.width;
        canvas.height = frame.dims.height;
        
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(frame.dims.width, frame.dims.height);
        imageData.data.set(frame.patch);
        ctx.putImageData(imageData, 0, 0);
        
        return {
            canvas: canvas,
            delay: frame.delay
        };
    });
}

// GIF 처리 및 PDF 생성
async function processGif() {
    if (!gifFrames || !selectedArea) return;
    
    closeGifModal();
    showProcessing('GIF 삽입 중...', 'PDF를 생성하고 있습니다');
    updateStep(4);
    
    try {
        // PDF-lib로 PDF 로드
        const pdfLibDoc = await PDFLib.PDFDocument.load(currentPdf);
        const pages = pdfLibDoc.getPages();
        const page = pages[selectedPage - 1];
        
        // 페이지 크기 가져오기
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Canvas 크기와 PDF 페이지 크기 비율 계산
        const scaleX = pageWidth / pageCanvas.width;
        const scaleY = pageHeight / pageCanvas.height;
        
        // 선택 영역을 PDF 좌표로 변환
        const pdfX = selectedArea.x * scaleX;
        const pdfY = pageHeight - (selectedArea.y + selectedArea.height) * scaleY;
        const pdfWidth = selectedArea.width * scaleX;
        const pdfHeight = selectedArea.height * scaleY;
        
        // 타임스탬프와 폼 객체를 한 번만 생성
        const timestamp = Date.now();
        const form = pdfLibDoc.getForm();
        
        // 각 프레임을 PDF에 삽입
        const imageFields = [];
        for (let i = 0; i < gifFrames.length; i++) {
            const frame = gifFrames[i];
            const pngDataUrl = frame.canvas.toDataURL('image/png');
            const pngData = await fetch(pngDataUrl).then(res => res.arrayBuffer());
            const pngImage = await pdfLibDoc.embedPng(pngData);
            
            // 이미지 필드 생성
            const fieldName = `gif_frame_${timestamp}_${i}`;
            const imageField = form.createButton(fieldName);
            
            // 위치와 크기 설정
            imageField.addToPage(page, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                borderWidth: 0
            });
            
            // 이미지 설정
            imageField.setImage(pngImage);
            
            // 첫 번째 프레임만 표시
            if (i > 0) {
                imageField.enableReadOnly();
            }
            
            imageFields.push({
                name: fieldName,
                delay: frame.delay
            });
        }
        
        // 재생 버튼 추가
        const playButtonName = `play_button_${timestamp}`;
        const playButton = form.createButton(playButtonName);
        playButton.addToPage(page, {
            x: pdfX + pdfWidth - 40,
            y: pdfY + pdfHeight - 40,
            width: 30,
            height: 30,
            borderWidth: 1
        });
        playButton.updateAppearances();
        
        // JavaScript 추가
        const jsCode = generatePlaybackScript(imageFields, playButtonName);
        pdfLibDoc.addJavaScript('GifPlayer', jsCode);
        
        // PDF 저장
        const pdfBytes = await pdfLibDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // 다운로드 준비
        window.generatedPdfUrl = url;
        window.generatedPdfName = `animated_${timestamp}.pdf`;
        
        hideProcessing();
        showCompletion();
        
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        alert('PDF 생성 중 오류가 발생했습니다.');
        hideProcessing();
    }
}

// 재생 스크립트 생성
function generatePlaybackScript(fields, playButtonName) {
    return `
var playing = false;
var currentFrame = 0;
var frames = ${JSON.stringify(fields)};
var intervalId = null;

function playGif() {
    if (playing) {
        stopGif();
        return;
    }
    
    playing = true;
    currentFrame = 0;
    
    intervalId = app.setInterval(function() {
        // 모든 프레임 숨기기
        for (var i = 0; i < frames.length; i++) {
            var field = this.getField(frames[i].name);
            if (field) {
                field.display = display.hidden;
            }
        }
        
        // 현재 프레임 표시
        var currentField = this.getField(frames[currentFrame].name);
        if (currentField) {
            currentField.display = display.visible;
        }
        
        currentFrame = (currentFrame + 1) % frames.length;
    }, 100);
}

function stopGif() {
    playing = false;
    if (intervalId) {
        app.clearInterval(intervalId);
        intervalId = null;
    }
    
    // 첫 번째 프레임으로 돌아가기
    for (var i = 0; i < frames.length; i++) {
        var field = this.getField(frames[i].name);
        if (field) {
            field.display = (i === 0) ? display.visible : display.hidden;
        }
    }
}

// 재생 버튼 클릭 시 GIF 재생 토글
this.getField('${playButtonName}').setAction("MouseUp", "playGif();");

// 문서 열리면 즉시 첫 프레임 외 모두 숨김
stopGif();
`;
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
    // Object URL 해제 (메모리 누수 방지)
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

// GIF 파서 클래스
class GIF {
    constructor(data) {
        this.data = data;
        this.pos = 0;
    }
    
    decompressFrames(buildPatch) {
        const frames = [];
        const gif = new GifReader(this.data);
        
        for (let i = 0; i < gif.numFrames(); i++) {
            const frameInfo = gif.frameInfo(i);
            const imageData = new Uint8ClampedArray(gif.width * gif.height * 4);
            
            gif.decodeAndBlitFrameRGBA(i, imageData);
            
            frames.push({
                dims: {
                    width: gif.width,
                    height: gif.height
                },
                patch: imageData,
                delay: frameInfo.delay * 10 // 10ms 단위로 변환
            });
        }
        
        return frames;
    }
}