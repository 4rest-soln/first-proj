// 실제 PDF 생성 (핵심 기능)
async function generateRealPdf() {
    if (!gifFrames.length || selectedPageIndex === -1 || !originalPdfDoc) {
        alert('필요한 데이터가 없습니다.');
        return;
    }
    
    showProcessing('실제 PDF 생성 중...', '움직이는 GIF가 포함된 완전한 PDF를 생성하고 있습니다');
    updateProgress(5);
    updateStep(4);
    
    try {
        console.log('=== 실제 PDF 생성 시작 ===');
        
        // 1. 새로운 PDF 문서 생성
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        console.log(`총 ${originalPages.length}개 페이지 처리 시작`);
        updateProgress(10);
        
        // 2. 모든 페이지를 새 문서로 복사
        for (let i = 0; i < originalPages.length; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // 선택된 페이지에 GIF 애니메이션 추가
            if (i === selectedPageIndex) {
                console.log(`페이지 ${i + 1}에 GIF 애니메이션 추가`);
                await addAnimatedGifToPdfPage(newPdfDoc, addedPage, i);
            }
            
            updateProgress(10 + (i + 1) / originalPages.length * 70);
        }
        
        console.log('모든 페이지 복사 완료');
        updateProgress(85);
        
        // 3. PDF 메타데이터 설정
        newPdfDoc.setTitle('PDF with Animated GIF');
        newPdfDoc.setCreator('PDF GIF Generator');
        newPdfDoc.setProducer('PDF GIF Web App');
        newPdfDoc.setCreationDate(new Date());
        
        // 4. PDF 저장
        console.log('PDF 저장 시작');
        const pdfBytes = await newPdfDoc.save();
        updateProgress(95);
        
        // 5. 다운로드 URL 생성
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        if (generatedPdfUrl) {
            URL.revokeObjectURL(generatedPdfUrl);
        }
        generatedPdfUrl = URL.createObjectURL(blob);
        
        console.log('PDF 생성 완료');
        updateProgress(100);
        
        // 완료 화면 표시
        setTimeout(() => {
            hideProcessing();
            showCompletionScreen();
        }, 500);
        
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        console.error('에러 스택:', error.stack);
        alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
        hideProcessing();
    }
}

// PDF 페이지에 애니메이션 GIF 추가
async function addAnimatedGifToPdfPage(pdfDoc, page, pageIndex) {
    try {
        console.log('애니메이션 GIF 삽입 시작');
        
        // 페이지 크기 가져오기
        const { width: pageWidth, height: pageHeight } = page.getSize();
        console.log('페이지 크기:', pageWidth, 'x', pageHeight);
        
        // 캔버스 좌표를 PDF 좌표로 변환
        const previewCanvas = elements.pdfPreviewCanvas;
        const scaleX = pageWidth / previewCanvas.width;
        const scaleY = pageHeight / previewCanvas.height;
        
        // PDF 좌표계 (좌하단이 원점)로 변환
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('PDF 좌표:', { pdfX, pdfY, pdfWidth, pdfHeight });
        
        // 모든 프레임을 PDF에 임베드
        const embeddedFrames = [];
        for (let i = 0; i < gifFrames.length; i++) {
            const frame = gifFrames[i];
            const embeddedImage = await pdfDoc.embedPng(frame.data);
            embeddedFrames.push({
                image: embeddedImage,
                delay: frame.delay
            });
        }
        
        console.log(`${embeddedFrames.length}개 프레임 임베드 완료`);
        
        // JavaScript 액션을 사용한 애니메이션 구현
        const autoPlay = elements.autoPlay.checked;
        const frameDelay = parseInt(elements.speedControl.value);
        
        // 첫 번째 프레임을 기본으로 그리기
        page.drawImage(embeddedFrames[0].image, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        // 여러 프레임이 있는 경우 애니메이션 JavaScript 추가
        if (embeddedFrames.length > 1) {
            // PDF 폼 생성
            const form = pdfDoc.getForm();
            
            // 애니메이션을 위한 숨겨진 텍스트 필드들 생성 (각 프레임용)
            const frameFields = [];
            for (let i = 0; i < embeddedFrames.length; i++) {
                const fieldName = `frame_${pageIndex}_${i}`;
                const textField = form.createTextField(fieldName);
                textField.addToPage(page, {
                    x: pdfX,
                    y: pdfY,
                    width: pdfWidth,
                    height: pdfHeight,
                    backgroundColor: PDFLib.rgb(1, 1, 1),
                    borderColor: PDFLib.rgb(0, 0, 0),
                    borderWidth: 0,
                });
                
                // 프레임 이미지를 배경으로 설정하려고 시도
                try {
                    textField.setImage(embeddedFrames[i].image);
                } catch (e) {
                    console.log(`Frame ${i} 이미지 설정 실패, 대안 방법 사용`);
                }
                
                textField.setFontSize(0); // 텍스트 숨기기
                frameFields.push(textField);
                
                // 첫 번째 프레임만 보이게 설정
                if (i > 0) {
                    // 숨김 처리 (완전히 지원되지 않을 수 있음)
                    try {
                        textField.setHidden(true);
                    } catch (e) {
                        console.log('필드 숨김 처리 실패');
                    }
                }
            }
            
            // 애니메이션 제어를 위한 JavaScript 액션
            const animationScript = `
var currentFrame_${pageIndex} = 0;
var totalFrames_${pageIndex} = ${embeddedFrames.length};
var frameDelay_${pageIndex} = ${frameDelay};
var autoPlay_${pageIndex} = ${autoPlay};
var animationTimer_${pageIndex} = null;

function nextFrame_${pageIndex}() {
    // 현재 프레임 숨기기
    try {
        this.getField("frame_${pageIndex}_" + currentFrame_${pageIndex}).hidden = true;
    } catch (e) {}
    
    // 다음 프레임으로 이동
    currentFrame_${pageIndex} = (currentFrame_${pageIndex} + 1) % totalFrames_${pageIndex};
    
    // 새 프레임 보이기
    try {
        this.getField("frame_${pageIndex}_" + currentFrame_${pageIndex}).hidden = false;
    } catch (e) {}
    
    // 자동 재생인 경우 다음 프레임 예약
    if (autoPlay_${pageIndex}) {
        animationTimer_${pageIndex} = app.setTimeOut("nextFrame_${pageIndex}()", frameDelay_${pageIndex});
    }
}

function startAnimation_${pageIndex}() {
    if (animationTimer_${pageIndex}) {
        app.clearTimeOut(animationTimer_${pageIndex});
    }
    if (autoPlay_${pageIndex}) {
        nextFrame_${pageIndex}();
    }
}

// 페이지 열릴 때 자동 시작
if (autoPlay_${pageIndex}) {
    app.setTimeOut("startAnimation_${pageIndex}()", 100);
}
`;
            
            // 페이지에 JavaScript 액션 추가 (가능한 경우)
            try {
                // PDF 문서 레벨 JavaScript 추가
                pdfDoc.addJavaScript('animation_' + pageIndex, animationScript);
                console.log('JavaScript 애니메이션 스크립트 추가됨');
            } catch (jsError) {
                console.log('JavaScript 추가 실패, 대안 방법 사용:', jsError.message);
                
                // 대안: 모든 프레임을 겹쳐서 배치하고 투명도로 제어
                for (let i = 1; i < embeddedFrames.length; i++) {
                    page.drawImage(embeddedFrames[i].image, {
                        x: pdfX + (i * 2), // 약간씩 위치 이동
                        y: pdfY + (i * 2),
                        width: pdfWidth - (i * 4),
                        height: pdfHeight - (i * 4),
                        opacity: 0.3 // 반투명으로 표시
                    });
                }
            }
            
            // 애니메이션 시작 버튼 추가 (자동재생이 아닌 경우)
            if (!autoPlay) {
                const startButton = form.createButton('startBtn_' + pageIndex);
                startButton.addToPage('▶ 재생', page, {
                    x: pdfX,
                    y: pdfY - 30,
                    width: 60,
                    height: 25,
                    fontSize: 10,
                    backgroundColor: PDFLib.rgb(0.31, 0.27, 0.9),
                    borderColor: PDFLib.rgb(0, 0, 0),
                    borderWidth: 1
                });
                
                // 버튼 클릭 액션
                try {
                    startButton.setAction(
                        PDFLib.PDFAction.createJavaScript(`startAnimation_${pageIndex}()`)
                    );
                } catch (actionError) {
                    console.log('버튼 액션 설정 실패:', actionError.message);
                }
            }
        }
        
        console.log('애니메이션 GIF 삽입 완료');
        return true;
        
    } catch (error) {
        console.error('애니메이션 GIF 삽입 실패:', error);
        
        // 실패 시 첫 번째 프레임만 정적으로 삽입
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
            
            console.log('정적 이미지로 대체 삽입 완료');
        } catch (fallbackError) {
            console.error('대체 삽입도 실패:', fallbackError);
        }
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
        
        // 대안: 새 창에서 PDF 열기
        try {
            window.open(generatedPdfUrl, '_blank');
        } catch (error2) {
            alert('다운로드에 실패했습니다. 브라우저 설정을 확인해주세요.');
        }
    }
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

// 처리 중 숨기기
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

// 새로 시작
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
    e.preventDefault();
    
    if (elements.processingOverlay.style.display !== 'none') {
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

// 디버깅을 위한 정보 출력
function debugInfo() {
    console.log('=== PDF GIF 디버그 정보 ===');
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
    console.log('==========================');
}

// 전역 함수로 노출 (디버깅용)
window.debugPdfGif = debugInfo; 전역 변수
let currentPdfFile = null;
let originalPdfDoc = null; // 원본 PDF (PDF-lib)
let renderPdfDoc = null;   // 렌더링용 PDF (PDF.js)
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

// DOM 요소들 (함수로 래핑하여 안전하게 접근)
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

// elements 변수를 전역에서 초기화하지 말고 필요할 때마다 가져오기
let elements = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('PDF GIF 애플리케이션 초기화 - 실제 PDF 생성 버전');
    
    // DOM 요소 초기화
    elements = getElements();
    
    // 요소 존재 확인
    if (!elements.pdfInput || !elements.pdfUploadBox) {
        console.error('필수 DOM 요소를 찾을 수 없습니다');
        alert('페이지 로딩에 문제가 있습니다. 새로고침해주세요.');
        return;
    }
    
    console.log('DOM 요소 확인 완료');
    
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

    console.log('브라우저 지원 상태:', features);
    
    if (!features.fileReader || !features.canvas || !features.pdfjs || !features.pdflib) {
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
    console.log('이벤트 리스너 초기화 시작');
    
    // 파일 업로드
    elements.pdfInput.addEventListener('change', handlePdfUpload);
    elements.gifInput.addEventListener('change', handleGifUpload);
    
    console.log('파일 업로드 이벤트 리스너 등록 완료');
    
    // 업로드 박스 클릭 시 파일 선택
    elements.pdfUploadBox.addEventListener('click', () => {
        console.log('업로드 박스 클릭됨');
        elements.pdfInput.click();
    });

    // PDF 드래그 앤 드롭
    elements.pdfUploadBox.addEventListener('dragover', handleDragOver);
    elements.pdfUploadBox.addEventListener('dragleave', handleDragLeave);
    elements.pdfUploadBox.addEventListener('drop', handleDrop);

    // GIF 업로드 영역 클릭
    elements.gifUploadArea.addEventListener('click', () => {
        elements.gifInput.click();
    });

    // GIF 오버레이 드래그 이벤트
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

// 속도 표시 업데이트
function updateSpeedDisplay() {
    if (elements.speedDisplay) {
        elements.speedDisplay.textContent = elements.speedControl.value + 'ms';
    }
}

// PDF 업로드 처리
async function handlePdfUpload(e) {
    console.log('PDF 파일 업로드 핸들러 실행');
    
    if (!elements) {
        elements = getElements();
    }
    
    const file = e.target.files[0];
    console.log('선택된 파일:', file);
    
    if (file && file.type === 'application/pdf') {
        console.log('PDF 파일 확인됨, 로드 시작');
        await loadPdf(file);
    } else {
        console.log('PDF가 아닌 파일:', file ? file.type : 'no file');
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
    console.log('PDF 로드 함수 시작:', file.name);
    
    if (!elements) {
        elements = getElements();
    }
    
    showProcessing('PDF analyzing...', 'Reading PDF information');
    updateProgress(10);
    
    try {
        currentPdfFile = file;
        const arrayBuffer = await file.arrayBuffer();
        
        // PDF-lib으로 로드 (편집용)
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
        document.getElementById('pdfPageCount').textContent = 'Total pages: ' + pdfPages.length;
        
        // 페이지 썸네일 생성
        await generatePageThumbnails();
        updateProgress(100);
        
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
        updateProgress(10);
        
        try {
            gifFile = file;
            gifFrames = await extractGifFrames(file);
            updateProgress(60);
            
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
                const maxFrames = Math.min(frames.length, 30); // 최대 30프레임
                
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
                    
                    // 배경 처리 (투명도 지원)
                    if (i === 0 || frame.disposalType === 2) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = frame.dims.width;
                    tempCanvas.height = frame.dims.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
                    
                    // 프레임을 PNG ArrayBuffer로 변환 (PDF-lib 호환)
                    const blob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png', 1.0);
                    });
                    
                    if (blob) {
                        const frameArrayBuffer = await blob.arrayBuffer();
                        frameData.push({
                            data: frameArrayBuffer,
                            dataUrl: canvas.toDataURL('image/png'),
                            delay: frame.delay || 100
                        });
                    }
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
                
                // 단일 프레임 (정적 이미지)
                const frames = [{
                    data: arrayBuffer,
                    dataUrl: dataUrl,
                    delay: 1000
                }];
                
                resolve(frames);
            } else {
                reject(new Error('Canvas to Blob 변환 실패'));
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
    elements.btnGeneratePdf.disabled = false;
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

//
