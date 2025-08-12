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
let isUploadInProgress = false;
let elements = {};

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

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ GIF 오버레이 표시 완료');
}

// GIF 오버레이 위치 업데이트
function updateGifOverlayPosition() {
    if (!elements.pdfPreviewCanvas || !elements.gifOverlay) return;
    
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
    
    // 컨트롤 패널 업데이트
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const gifWidth = document.getElementById('gifWidth');
    const gifHeight = document.getElementById('gifHeight');
    
    if (posX) posX.value = Math.round(gifPosition.x);
    if (posY) posY.value = Math.round(gifPosition.y);
    if (gifWidth) gifWidth.value = Math.round(gifPosition.width);
    if (gifHeight) gifHeight.value = Math.round(gifPosition.height);
}

// 컨트롤에서 GIF 위치 업데이트
function updateGifPosition() {
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const gifWidth = document.getElementById('gifWidth');
    const gifHeight = document.getElementById('gifHeight');
    
    const x = parseFloat(posX?.value) || 0;
    const y = parseFloat(posY?.value) || 0;
    const width = parseFloat(gifWidth?.value) || 100;
    const height = parseFloat(gifHeight?.value) || 100;
    
    gifPosition = { x, y, width, height };
    updateGifOverlayPosition();
}

// 마우스 이벤트 처리
function handleMouseDown(e) {
    e.preventDefault();
    console.log('🖱️ 마우스 다운 이벤트');
    
    if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        resizeHandle = e.target.classList[1];
        console.log('📏 리사이즈 시작:', resizeHandle);
    } else {
        isDragging = true;
        console.log('🚚 드래그 시작');
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
    if (isDragging || isResizing) {
        console.log('🖱️ 마우스 업 - 드래그/리사이즈 종료');
    }
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
}

// 크롬 호환 PDF 생성
async function generateCompatiblePdf() {
    console.log('🚀 크롬 호환 PDF 생성 시작');
    
    if (!gifFrames.length || selectedPageIndex === -1 || !originalPdfDoc) {
        console.error('❌ 필요한 데이터가 누락됨');
        alert('필요한 데이터가 누락되었습니다.');
        return;
    }
    
    // PDF-lib 라이브러리 확인
    if (typeof PDFLib === 'undefined') {
        console.error('❌ PDF-lib 라이브러리 없음');
        alert('PDF 생성 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    showProcessing('크롬 호환 PDF 생성 중...', '텍스트 필드 프레임버퍼 애니메이션 생성');
    updateProgress(5);
    updateStep(4);
    
    try {
        console.log('📊 생성 옵션 확인');
        const animationMode = document.querySelector('input[name="animationMode"]:checked')?.value || 'ascii';
        console.log('애니메이션 모드:', animationMode);
        
        if (animationMode === 'ascii') {
            console.log('🔤 텍스트 애니메이션 모드 (크롬 최적화)');
            await generateAsciiAnimationPdf();
        } else {
            console.log('🔘 버튼 애니메이션 모드 (Acrobat 전용)');
            await generateButtonAnimationPdf();
        }
        
    } catch (error) {
        console.error('❌ PDF 생성 실패:', error);
        alert('PDF 생성 중 오류가 발생했습니다: ' + error.message);
        hideProcessing();
    }
}

// ASCII 애니메이션 PDF 생성
async function generateAsciiAnimationPdf() {
    try {
        console.log('🔤 ASCII 애니메이션 PDF 생성 시작');
        
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        console.log(`📄 총 ${originalPages.length}페이지 처리 중`);
        updateProgress(10);
        
        // 모든 페이지 복사
        for (let i = 0; i < originalPages.length; i++) {
            console.log(`📋 페이지 ${i + 1} 복사 중...`);
            
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            // 선택된 페이지에 애니메이션 추가
            if (i === selectedPageIndex) {
                console.log(`🎬 페이지 ${i + 1}에 애니메이션 추가`);
                if (gifFrames.length > 1) {
                    await addAsciiAnimation(newPdfDoc, addedPage, i);
                } else {
                    // 단일 프레임은 정적 이미지로
                    await addStaticImage(newPdfDoc, addedPage, i);
                }
            }
            
            updateProgress(10 + (i + 1) / originalPages.length * 70);
        }
        
        // 전역 JavaScript 추가
        console.log('⚙️ 전역 JavaScript 추가');
        const globalJS = `
console.println("크롬 호환 PDF 로드됨");
function debugAnimation() {
    console.println("애니메이션 디버그 정보");
}
`;
        
        newPdfDoc.addJavaScript('GlobalSystem', globalJS);
        updateProgress(85);
        
        // PDF 저장
        console.log('💾 PDF 저장 중...');
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        if (generatedPdfUrl) {
            URL.revokeObjectURL(generatedPdfUrl);
        }
        generatedPdfUrl = URL.createObjectURL(blob);
        
        console.log('✅ PDF 생성 완료');
        updateProgress(100);
        
        setTimeout(() => {
            hideProcessing();
            showCompletionScreen();
        }, 500);
        
    } catch (error) {
        console.error('❌ ASCII 애니메이션 PDF 생성 실패:', error);
        throw error;
    }
}

// 정적 이미지 추가
async function addStaticImage(pdfDoc, page, pageIndex) {
    try {
        console.log('🖼️ 정적 이미지 추가 시작');
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        console.log('📐 이미지 위치 및 크기:', {
            x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight
        });
        
        const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
        page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        console.log('✅ 정적 이미지 추가 완료');
        return true;
        
    } catch (error) {
        console.error('❌ 정적 이미지 추가 실패:', error);
        return false;
    }
}

// ASCII 애니메이션 추가
async function addAsciiAnimation(pdfDoc, page, pageIndex) {
    try {
        console.log('🔤 ASCII 애니메이션 추가 시작');
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        // 해상도 설정
        const resolution = elements.asciiResolution?.value?.split('x') || ['40', '20'];
        const asciiCols = parseInt(resolution[0]);
        const asciiRows = parseInt(resolution[1]);
        
        console.log(`📊 ASCII 설정: ${asciiCols}x${asciiRows}`);
        
        // ASCII 변환
        console.log('🔄 프레임을 ASCII로 변환 중...');
        const asciiFrames = await convertFramesToAsciiSimple(gifFrames, asciiCols, asciiRows);
        updateProgress(50);
        
        const form = pdfDoc.getForm();
        
        if (asciiFrames.length === 1) {
            console.log('📝 단일 텍스트 필드 생성');
            
            const textField = form.createTextField(`ascii_${pageIndex}`);
            textField.addToPage(page, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                backgroundColor: PDFLib.rgb(1, 1, 1),
                borderWidth: 1,
                multiline: true,
                fontSize: Math.max(4, Math.min(pdfWidth / asciiCols, pdfHeight / asciiRows))
            });
            textField.setText(asciiFrames[0]);
            
        } else {
            console.log('🎬 멀티 프레임 애니메이션 생성');
            
            const fontSize = Math.max(4, Math.min(pdfWidth / asciiCols, pdfHeight / asciiRows));
            
            // 메인 텍스트 필드
            const mainField = form.createTextField(`ascii_main_${pageIndex}`);
            mainField.addToPage(page, {
                x: pdfX,
                y: pdfY,
                width: pdfWidth,
                height: pdfHeight,
                backgroundColor: PDFLib.rgb(1, 1, 1),
                borderWidth: 1,
                multiline: true,
                fontSize: fontSize
            });
            
            // 첫 번째 프레임으로 초기화
            mainField.setText(asciiFrames[0]);
            
            // 애니메이션 스크립트
            const speed = parseInt(elements.speedControl?.value) || 500;
            const autoPlay = elements.autoPlay?.checked || false;
            
            console.log('⚙️ 애니메이션 스크립트 생성:', { speed, autoPlay });
            
            const animationScript = `
console.println("ASCII 애니메이션 로드됨");

var SimpleAnim = {
    frames: [${asciiFrames.map(frame => `"${frame.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`).join(', ')}],
    current: 0,
    field: "ascii_main_${pageIndex}",
    
    next: function() {
        this.current = (this.current + 1) % this.frames.length;
        var f = this.getField(this.field);
        if (f) f.value = this.frames[this.current];
    },
    
    start: function() {
        app.setInterval("SimpleAnim.next()", ${speed});
    }
};

if (${autoPlay}) {
    app.setTimeOut("SimpleAnim.start()", 1000);
}
`;
            
            pdfDoc.addJavaScript(`SimpleAnim_${pageIndex}`, animationScript);
            
            // 컨트롤 버튼 (자동재생이 아닌 경우)
            if (!autoPlay) {
                console.log('🔘 컨트롤 버튼 추가');
                
                const btn = form.createButton(`play_${pageIndex}`);
                btn.addToPage(page, {
                    x: pdfX,
                    y: pdfY - 35,
                    width: 80,
                    height: 25,
                    backgroundColor: PDFLib.rgb(0.2, 0.4, 0.8)
                });
                
                try {
                    btn.setAction(PDFLib.PDFAction.createJavaScript(`SimpleAnim.start();`));
                } catch (e) {
                    console.log('⚠️ 버튼 액션 설정 실패:', e.message);
                }
            }
        }
        
        console.log('✅ ASCII 애니메이션 설정 완료');
        return true;
        
    } catch (error) {
        console.error('❌ ASCII 애니메이션 추가 실패:', error);
        // 대체: 첫 번째 프레임을 정적 이미지로
        console.log('🔄 정적 이미지로 대체');
        return await addStaticImage(pdfDoc, page, pageIndex);
    }
}

// 간단한 ASCII 변환
async function convertFramesToAsciiSimple(frames, cols, rows) {
    console.log(`🔄 ${frames.length} 프레임을 ${cols}x${rows} ASCII로 변환`);
    
    const chars = ' .:-=+*#%@';
    const asciiFrames = [];
    
    for (let i = 0; i < Math.min(frames.length, 10); i++) {
        try {
            console.log(`🖼️ 프레임 ${i + 1} 변환 중...`);
            
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
            
            ctx.drawImage(img, 0, 0, cols, rows);
            const imageData = ctx.getImageData(0, 0, cols, rows);
            const pixels = imageData.data;
            
            let ascii = '';
            for (let y = 0; y < rows; y++) {
                let line = '';
                for (let x = 0; x < cols; x++) {
                    const offset = (y * cols + x) * 4;
                    const r = pixels[offset];
                    const g = pixels[offset + 1];
                    const b = pixels[offset + 2];
                    
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                    const charIndex = Math.floor(brightness * (chars.length - 1));
                    line += chars[charIndex];
                }
                ascii += line + (y < rows - 1 ? '\n' : '');
            }
            
            asciiFrames.push(ascii);
            console.log(`✅ 프레임 ${i + 1} 변환 완료`);
            
        } catch (error) {
            console.error(`❌ 프레임 ${i + 1} 변환 실패:`, error);
            asciiFrames.push(' '.repeat(cols * rows));
        }
    }
    
    console.log(`✅ ASCII 변환 완료: ${asciiFrames.length} 프레임`);
    return asciiFrames;
}

// 버튼 애니메이션 PDF 생성
async function generateButtonAnimationPdf() {
    try {
        console.log('🔘 버튼 애니메이션 PDF 생성 시작');
        
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const originalPages = originalPdfDoc.getPages();
        
        updateProgress(10);
        
        // 모든 페이지 복사
        for (let i = 0; i < originalPages.length; i++) {
            const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [i]);
            const addedPage = newPdfDoc.addPage(copiedPage);
            
            if (i === selectedPageIndex) {
                await addButtonAnimationSimple(newPdfDoc, addedPage, i);
            }
            
            updateProgress(10 + (i + 1) / originalPages.length * 80);
        }
        
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
        console.error('❌ 버튼 애니메이션 생성 실패:', error);
        throw error;
    }
}

// 간소화된 버튼 애니메이션
async function addButtonAnimationSimple(pdfDoc, page, pageIndex) {
    try {
        console.log('🔘 버튼 애니메이션 추가');
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / elements.pdfPreviewCanvas.width;
        const scaleY = pageHeight / elements.pdfPreviewCanvas.height;
        
        const pdfX = gifPosition.x * scaleX;
        const pdfY = pageHeight - (gifPosition.y + gifPosition.height) * scaleY;
        const pdfWidth = gifPosition.width * scaleX;
        const pdfHeight = gifPosition.height * scaleY;
        
        // 첫 번째 프레임을 페이지에 직접 그리기
        const embeddedImage = await pdfDoc.embedPng(gifFrames[0].data);
        page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });
        
        if (gifFrames.length > 1) {
            // 간단한 클릭 버튼 추가
            const form = pdfDoc.getForm();
            const nextBtn = form.createButton(`next_${pageIndex}`);
            
            nextBtn.addToPage(page, {
                x: pdfX,
                y: pdfY - 35,
                width: 100,
                height: 25,
                backgroundColor: PDFLib.rgb(0.8, 0.4, 0.2)
            });
            
            // 간단한 JavaScript (Acrobat 전용)
            const script = `
console.println("버튼 애니메이션 로드됨");
var frameIndex = 0;
function nextFrame() {
    frameIndex = (frameIndex + 1) % ${gifFrames.length};
    console.println("Frame: " + frameIndex);
}
`;
            pdfDoc.addJavaScript(`ButtonAnim_${pageIndex}`, script);
        }
        
        console.log('✅ 버튼 애니메이션 추가 완료');
        return true;
        
    } catch (error) {
        console.error('❌ 버튼 애니메이션 실패:', error);
        return false;
    }
}

// 완료 화면 표시
function showCompletionScreen() {
    console.log('🎉 완료 화면 표시');
    
    if (elements.workspace) {
        elements.workspace.style.display = 'none';
    }
    if (elements.completionScreen) {
        elements.completionScreen.style.display = 'block';
    }
    window.scrollTo(0, 0);
}

// PDF 다운로드
function downloadGeneratedPdf() {
    console.log('💾 PDF 다운로드 시작');
    
    if (!generatedPdfUrl) {
        console.error('❌ 생성된 PDF가 없음');
        alert('생성된 PDF가 없습니다.');
        return;
    }
    
    try {
        const fileName = `chrome-compatible-pdf-${Date.now()}.pdf`;
        const a = document.createElement('a');
        a.href = generatedPdfUrl;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('✅ PDF 다운로드 시작:', fileName);
    } catch (error) {
        console.error('❌ 다운로드 실패:', error);
        
        try {
            window.open(generatedPdfUrl, '_blank');
        } catch (error2) {
            console.error('❌ 새 창 열기도 실패:', error2);
            alert('다운로드에 실패했습니다. 브라우저 설정을 확인해주세요.');
        }
    }
}

// 페이지 선택으로 돌아가기
function backToPageSelection() {
    console.log('⬅️ 페이지 선택으로 돌아가기');
    
    if (elements.gifPositionEditor) {
        elements.gifPositionEditor.style.display = 'none';
    }
    if (elements.pageSelector) {
        elements.pageSelector.style.display = 'block';
    }
    updateStep(1);
    
    // 상태 초기화
    gifFile = null;
    gifFrames = [];
    if (elements.gifOverlay) {
        elements.gifOverlay.style.display = 'none';
    }
    if (elements.gifUploadArea) {
        elements.gifUploadArea.innerHTML = '<p>GIF 파일을 선택하세요</p>';
        elements.gifUploadArea.classList.remove('has-gif');
    }
    if (elements.btnGeneratePdf) {
        elements.btnGeneratePdf.disabled = true;
    }
    
    console.log('✅ 상태 초기화 완료');
}

// 처리 중 표시
function showProcessing(title, message) {
    console.log('⏳ 처리 중 표시:', title);
    
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
    console.log('✅ 처리 중 숨김');
    
    if (elements.processingOverlay) {
        elements.processingOverlay.style.display = 'none';
    }
}

// 진행률 업데이트
function updateProgress(percent) {
    if (elements.progressFill) {
        elements.progressFill.style.width = percent + '%';
    }
    if (elements.progressText) {
        elements.progressText.textContent = Math.round(percent) + '%';
    }
}

// 처음부터 시작
function startOver() {
    console.log('🔄 처음부터 시작');
    
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
    console.log('📊 단계 업데이트:', step);
    
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.step) <= step) {
            el.classList.add('active');
        }
    });
}

// 전역 오류 처리
window.addEventListener('error', function(e) {
    console.error('🚨 전역 오류:', e.error);
    
    if (e.error && e.error.message && e.error.message.includes('gifuct')) {
        console.log('⚠️ gifuct 관련 오류는 무시 (대체 방법 사용)');
        return;
    }
    
    if (elements.processingOverlay && elements.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    console.log('🧹 페이지 언로드 - 리소스 정리');
    if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
    }
});

// 디버그 정보 함수
function debugInfo() {
    console.log('=== 🔍 크롬 호환 PDF GIF 디버그 정보 ===');
    console.log('📊 상태 정보:');
    console.log('- PDF 로드됨:', !!originalPdfDoc);
    console.log('- 선택된 페이지:', selectedPageIndex);
    console.log('- GIF 프레임 수:', gifFrames.length);
    console.log('- GIF 위치:', gifPosition);
    console.log('- 생성된 PDF URL:', !!generatedPdfUrl);
    console.log('- 업로드 진행 중:', isUploadInProgress);
    
    console.log('🔧 라이브러리 상태:');
    console.log('- FileReader:', typeof FileReader !== 'undefined');
    console.log('- Canvas:', typeof HTMLCanvasElement !== 'undefined');
    console.log('- PDF.js:', typeof pdfjsLib !== 'undefined');
    console.log('- PDF-lib:', typeof PDFLib !== 'undefined');
    console.log('- gifuct-js:', typeof gifuct !== 'undefined');
    
    if (window.PDFGIF) {
        console.log('- 전역 상태:', window.PDFGIF.status);
    }
    
    console.log('🏗️ DOM 요소:');
    if (elements) {
        console.log('- pdfInput:', !!elements.pdfInput);
        console.log('- selectFileBtn:', !!elements.selectFileBtn);
        console.log('- pdfUploadBox:', !!elements.pdfUploadBox);
        console.log('- workspace:', !!elements.workspace);
        console.log('- pagesGrid:', !!elements.pagesGrid);
    }
    
    console.log('📱 브라우저 정보:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- 화면 크기:', window.innerWidth + 'x' + window.innerHeight);
    
    console.log('=====================================');
}

// 라이브러리 로딩 상태 확인
function checkLibraryLoadingStatus() {
    console.log('📚 라이브러리 로딩 상태 확인');
    
    const status = {
        'PDF.js': typeof pdfjsLib !== 'undefined',
        'PDF-lib': typeof PDFLib !== 'undefined',
        'gifuct-js': typeof gifuct !== 'undefined'
    };
    
    console.log('현재 상태:', status);
    
    const allCriticalLoaded = status['PDF.js'] && status['PDF-lib'];
    
    if (allCriticalLoaded) {
        console.log('✅ 모든 필수 라이브러리 로딩 완료');
        return true;
    } else {
        console.log('❌ 일부 필수 라이브러리 미로딩');
        return false;
    }
}

// 파일 선택 버튼 강제 클릭 테스트
function testFileButtonClick() {
    console.log('🧪 파일 버튼 클릭 테스트');
    
    if (elements.selectFileBtn) {
        console.log('버튼 요소 존재 확인됨');
        elements.selectFileBtn.click();
        console.log('클릭 이벤트 발생됨');
    } else {
        console.error('❌ 파일 선택 버튼을 찾을 수 없습니다');
    }
}

// 전역 디버그 함수 노출
window.debugChromeCompatiblePdfGif = debugInfo;
window.checkLibraryStatus = checkLibraryLoadingStatus;
window.testFileButton = testFileButtonClick;

// 초기화 완료 후 디버그 정보 출력
setTimeout(() => {
    console.log('🔍 === 초기화 완료 후 최종 상태 확인 ===');
    debugInfo();
    
    // 추가 검증
    if (elements.selectFileBtn) {
        console.log('✅ 파일 선택 버튼 접근 가능');
        console.log('버튼 속성:', {
            disabled: elements.selectFileBtn.disabled,
            textContent: elements.selectFileBtn.textContent,
            style: elements.selectFileBtn.style.display
        });
    } else {
        console.error('❌ 파일 선택 버튼에 접근할 수 없습니다');
    }
    
    // 이벤트 리스너 테스트
    console.log('🔗 이벤트 리스너 테스트 준비 완료');
    console.log('콘솔에서 testFileButton() 을 실행하여 버튼 클릭을 테스트할 수 있습니다');
    
}, 3000);

// 개발 모드에서 유용한 유틸리티 함수들
window.pdfGifUtils = {
    // 상태 리셋
    resetApp: function() {
        console.log('🔄 앱 상태 리셋');
        startOver();
    },
    
    // 강제 초기화
    forceInit: function() {
        console.log('🔧 강제 초기화');
        elements = getElements();
        initializeEventListeners();
    },
    
    // 라이브러리 재로딩
    reloadLibraries: function() {
        console.log('📚 라이브러리 재로딩');
        location.reload();
    },
    
    // 상태 출력
    showState: function() {
        return {
            currentPdfFile: !!currentPdfFile,
            selectedPageIndex,
            gifFrames: gifFrames.length,
            generatedPdfUrl: !!generatedPdfUrl,
            isUploadInProgress,
            elements: Object.keys(elements).reduce((acc, key) => {
                acc[key] = !!elements[key];
                return acc;
            }, {})
        };
    }
};

console.log('✅ === script.js 로딩 완료 ===');
console.log('🛠️ 개발자 도구에서 사용 가능한 유틸리티:');
console.log('- debugChromeCompatiblePdfGif() : 디버그 정보 출력');
console.log('- checkLibraryStatus() : 라이브러리 상태 확인');
console.log('- testFileButton() : 파일 버튼 클릭 테스트');
console.log('- window.pdfGifUtils : 개발 유틸리티 모음');.processingOverlay.style.display !== 'none') {
        hideProcessing();
        alert('예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 처리되지 않은 Promise 오류:', e.reason);
    
    // gifuct 관련 오류는 무시
    if (e.reason && e.reason.toString().includes('gifuct')) {
        console.log('⚠️ gifuct 관련 Promise 오류는 무시');
        e.preventDefault();
        return;
    }
    
    e.preventDefault();
    
    if (elements.processingOverlay && elements=== DOM 로드 완료, 초기화 시작 ===');
    
    // DOM 요소 초기화
    elements = getElements();
    
    // 필수 요소 존재 확인
    console.log('DOM 요소 확인:');
    console.log('- pdfInput:', !!elements.pdfInput);
    console.log('- selectFileBtn:', !!elements.selectFileBtn);
    console.log('- pdfUploadBox:', !!elements.pdfUploadBox);
    
    if (!elements.pdfInput || !elements.selectFileBtn || !elements.pdfUploadBox) {
        console.error('❌ 필수 DOM 요소가 없습니다');
        alert('페이지 로딩 문제가 발생했습니다. 새로고침해주세요.');
        return;
    }
    
    console.log('✅ DOM 요소 확인 완료');
    
    // 라이브러리 로딩 상태 확인 후 초기화
    waitForLibrariesAndInitialize();
});

// 라이브러리 로딩 대기 및 초기화
function waitForLibrariesAndInitialize() {
    let attempts = 0;
    const maxAttempts = 15; // 더 긴 대기 시간
    
    function checkAndInit() {
        attempts++;
        console.log(`라이브러리 확인 시도 ${attempts}/${maxAttempts}`);
        
        const pdfjs = typeof pdfjsLib !== 'undefined';
        const pdflib = typeof PDFLib !== 'undefined';
        const gifuct = typeof gifuct !== 'undefined';
        
        console.log(`상태: PDF.js=${pdfjs}, PDF-lib=${pdflib}, gifuct=${gifuct}`);
        
        if (pdfjs && pdflib) {
            console.log('✅ 필수 라이브러리 준비 완료, 초기화 진행');
            initializeEventListeners();
            return;
        }
        
        if (attempts < maxAttempts) {
            console.log('⏳ 라이브러리 로딩 대기 중...');
            setTimeout(checkAndInit, 500);
        } else {
            console.error('❌ 라이브러리 로딩 타임아웃');
            if (!pdfjs) console.error('PDF.js 로딩 실패');
            if (!pdflib) console.error('PDF-lib 로딩 실패');
            alert('필수 라이브러리 로딩에 실패했습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해주세요.');
        }
    }
    
    checkAndInit();
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    console.log('🔗 이벤트 리스너 초기화 시작');
    
    // 필수 요소 재확인
    if (!elements.selectFileBtn || !elements.pdfInput || !elements.pdfUploadBox) {
        console.error('❌ 이벤트 리스너 등록 실패: 필수 요소가 없습니다');
        return;
    }
    
    // 파일 선택 버튼 - 가장 중요한 이벤트
    elements.selectFileBtn.addEventListener('click', function(e) {
        console.log('🖱️ 파일 선택 버튼 클릭됨');
        e.preventDefault();
        e.stopPropagation();
        
        if (isUploadInProgress) {
            console.log('⚠️ 업로드 진행 중이므로 무시');
            return;
        }
        
        console.log('📁 파일 입력 다이얼로그 열기 시도');
        try {
            elements.pdfInput.click();
            console.log('✅ 파일 다이얼로그 열기 성공');
        } catch (error) {
            console.error('❌ 파일 다이얼로그 열기 실패:', error);
        }
    });
    
    // PDF 파일 입력 변경 이벤트
    elements.pdfInput.addEventListener('change', function(e) {
        console.log('📄 PDF 파일 입력 변경 이벤트 발생');
        handlePdfUpload(e);
    });
    
    // GIF 파일 입력 변경 이벤트
    if (elements.gifInput) {
        elements.gifInput.addEventListener('change', function(e) {
            console.log('🎬 GIF 파일 입력 변경 이벤트 발생');
            handleGifUpload(e);
        });
    }
    
    // 업로드 박스 클릭 (버튼 영역 제외)
    elements.pdfUploadBox.addEventListener('click', function(e) {
        // 버튼이나 그 자식 요소를 클릭한 경우 무시
        if (e.target.closest('#selectFileBtn')) {
            console.log('버튼 영역 클릭으로 무시');
            return;
        }
        
        console.log('📦 업로드 박스 클릭');
        e.preventDefault();
        e.stopPropagation();
        
        if (isUploadInProgress) {
            console.log('⚠️ 업로드 진행 중이므로 무시');
            return;
        }
        
        console.log('📁 업로드 박스 클릭으로 파일 선택');
        elements.pdfInput.click();
    });

    // 드래그 앤 드롭 이벤트
    elements.pdfUploadBox.addEventListener('dragover', handleDragOver);
    elements.pdfUploadBox.addEventListener('dragleave', handleDragLeave);
    elements.pdfUploadBox.addEventListener('drop', handleDrop);

    // GIF 업로드 영역 클릭
    if (elements.gifUploadArea) {
        elements.gifUploadArea.addEventListener('click', function() {
            console.log('🎭 GIF 업로드 영역 클릭');
            if (elements.gifInput) {
                elements.gifInput.click();
            }
        });
    }

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
        updateSpeedDisplay(); // 초기값 설정
    }
    
    console.log('✅ 모든 이벤트 리스너 등록 완료');
    
    // 초기화 완료 표시
    console.log('🎉 앱 초기화 완전 완료');
}

// 속도 표시 업데이트
function updateSpeedDisplay() {
    if (elements.speedDisplay && elements.speedControl) {
        elements.speedDisplay.textContent = elements.speedControl.value + 'ms';
    }
}

// PDF 업로드 처리
async function handlePdfUpload(e) {
    console.log('📤 PDF 파일 업로드 처리 시작');
    
    e.preventDefault();
    e.stopPropagation();
    
    // 중복 호출 방지
    if (isUploadInProgress) {
        console.log('⚠️ 이미 업로드 진행 중');
        return;
    }
    
    const file = e.target.files[0];
    console.log('📋 선택된 파일 정보:', {
        name: file?.name,
        type: file?.type,
        size: file?.size
    });
    
    if (!file) {
        console.log('❌ 파일이 선택되지 않음');
        return;
    }
    
    if (file.type !== 'application/pdf') {
        console.log('❌ PDF 파일이 아님:', file.type);
        alert('PDF 파일만 업로드 가능합니다.');
        resetFileInput();
        return;
    }
    
    console.log('✅ PDF 파일 유효성 검사 통과');
    
    isUploadInProgress = true;
    updateUploadButtonState(true);
    
    try {
        console.log('🚀 PDF 로딩 시작');
        await loadPdf(file);
        console.log('✅ PDF 로딩 완료');
    } catch (error) {
        console.error('❌ PDF 로드 실패:', error);
        alert('PDF 파일을 읽을 수 없습니다: ' + error.message);
        hideProcessing();
    } finally {
        isUploadInProgress = false;
        updateUploadButtonState(false);
    }
}

// 업로드 버튼 상태 업데이트
function updateUploadButtonState(isLoading) {
    if (elements.selectFileBtn) {
        elements.selectFileBtn.disabled = isLoading;
        elements.selectFileBtn.textContent = isLoading ? '처리 중...' : '파일 선택하기';
    }
}

// 파일 입력 초기화
function resetFileInput() {
    if (elements.pdfInput) {
        elements.pdfInput.value = '';
        console.log('🔄 파일 입력 초기화');
    }
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
    
    console.log('📁 파일 드롭 이벤트');
    
    if (isUploadInProgress) {
        console.log('⚠️ 업로드 진행 중이므로 드롭 무시');
        return;
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        console.log('✅ 유효한 PDF 파일 드롭됨');
        
        // 파일 입력에 설정하여 change 이벤트 트리거
        try {
            const dt = new DataTransfer();
            dt.items.add(files[0]);
            elements.pdfInput.files = dt.files;
            
            // change 이벤트 수동 트리거
            const event = new Event('change', { bubbles: true });
            elements.pdfInput.dispatchEvent(event);
        } catch (error) {
            console.log('⚠️ 파일 설정 방법 변경:', error);
            // 직접 로드 시도
            handlePdfUpload({ target: { files: [files[0]] }, preventDefault: () => {}, stopPropagation: () => {} });
        }
    } else {
        console.log('❌ 유효하지 않은 파일');
        alert('PDF 파일만 업로드 가능합니다.');
    }
}

// PDF 로드 및 썸네일 생성
async function loadPdf(file) {
    console.log('📚 PDF 로드 시작:', file.name);
    
    // 라이브러리 확인
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    }
    
    if (typeof PDFLib === 'undefined') {
        throw new Error('PDF-lib 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    }
    
    showProcessing('PDF 분석 중...', 'PDF 정보를 읽고 있습니다');
    updateProgress(10);
    
    try {
        currentPdfFile = file;
        console.log('📖 파일을 ArrayBuffer로 변환 중...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('✅ ArrayBuffer 변환 완료:', arrayBuffer.byteLength, 'bytes');
        
        // PDF-lib로 로드 (편집용)
        console.log('🔧 PDF-lib로 문서 로드 중...');
        originalPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        console.log('✅ PDF-lib 로드 성공');
        updateProgress(30);
        
        // PDF.js로 로드 (렌더링용)
        console.log('🎨 PDF.js로 렌더링 준비 중...');
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            verbosity: 0
        });
        
        renderPdfDoc = await loadingTask.promise;
        console.log('✅ PDF.js 로드 성공');
        
        // 모든 페이지 로드
        console.log('📄 페이지 로드 중...');
        pdfPages = [];
        for (let i = 1; i <= renderPdfDoc.numPages; i++) {
            pdfPages.push(await renderPdfDoc.getPage(i));
        }
        
        console.log('✅ 모든 페이지 로드 완료:', pdfPages.length, '페이지');
        updateProgress(60);
        
        // UI 업데이트
        const fileNameEl = document.getElementById('pdfFileName');
        const pageCountEl = document.getElementById('pdfPageCount');
        
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (pageCountEl) pageCountEl.textContent = '총 페이지 수: ' + pdfPages.length;
        
        // 페이지 썸네일 생성
        console.log('🖼️ 페이지 썸네일 생성 시작');
        await generatePageThumbnails();
        updateProgress(100);
        
        // UI 전환
        console.log('🔄 UI 전환 중...');
        if (elements.uploadSection) elements.uploadSection.style.display = 'none';
        if (elements.workspace) elements.workspace.style.display = 'block';
        
        console.log('✅ PDF 로딩 및 UI 전환 완료');
        hideProcessing();
        
    } catch (error) {
        console.error('❌ PDF 로드 중 오류:', error);
        throw error;
    }
}

// 페이지 썸네일 생성
async function generatePageThumbnails() {
    if (!elements.pagesGrid) {
        console.error('❌ pagesGrid 요소가 없습니다');
        return;
    }
    
    elements.pagesGrid.innerHTML = '';
    console.log('🖼️ 썸네일 생성 시작, 총 페이지:', pdfPages.length);
    
    for (let i = 0; i < pdfPages.length; i++) {
        try {
            console.log(`🎨 페이지 ${i + 1} 썸네일 생성 중...`);
            
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
                <img src="${imgSrc}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 8px;" alt="페이지 ${i + 1}">
                <div class="page-number">페이지 ${i + 1}</div>
            `;
            
            thumbnail.addEventListener('click', () => {
                console.log(`📄 페이지 ${i + 1} 선택됨`);
                selectPage(i);
            });
            
            elements.pagesGrid.appendChild(thumbnail);
            console.log(`✅ 페이지 ${i + 1} 썸네일 생성 완료`);
            
        } catch (error) {
            console.error(`❌ 페이지 ${i + 1} 썸네일 생성 실패:`, error);
            
            // 대체 썸네일
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
    
    console.log('✅ 모든 썸네일 생성 완료');
}

// 페이지 선택
function selectPage(pageIndex) {
    console.log(`📄 페이지 ${pageIndex + 1} 선택 중...`);
    
    document.querySelectorAll('.page-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });
    
    const selectedThumbnail = document.querySelector(`[data-page-index="${pageIndex}"]`);
    if (selectedThumbnail) {
        selectedThumbnail.classList.add('selected');
        selectedPageIndex = pageIndex;
        
        if (elements.btnSelectPage) {
            elements.btnSelectPage.disabled = false;
        }
        
        console.log(`✅ 페이지 ${pageIndex + 1} 선택 완료`);
    }
}

// GIF 업로드 단계로 진행
function proceedToGifUpload() {
    if (selectedPageIndex === -1) {
        alert('페이지를 선택해주세요.');
        return;
    }
    
    console.log(`🎬 GIF 업로드 단계로 진행 (선택된 페이지: ${selectedPageIndex + 1})`);
    
    updateStep(2);
    if (elements.pageSelector) elements.pageSelector.style.display = 'none';
    if (elements.gifPositionEditor) elements.gifPositionEditor.style.display = 'block';
    
    renderPagePreview();
}

// 페이지 미리보기 렌더링
async function renderPagePreview() {
    console.log('🖼️ 페이지 미리보기 렌더링 시작');
    
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
        console.log('✅ 페이지 미리보기 렌더링 완료');
        
    } catch (error) {
        console.error('❌ 페이지 미리보기 렌더링 실패:', error);
        showErrorCanvas('페이지 렌더링 실패');
    }
}

// 에러 캔버스 표시
function showErrorCanvas(message) {
    console.log('❌ 에러 캔버스 표시:', message);
    
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
    console.log('🎭 GIF 업로드 처리 시작');
    
    const file = e.target.files[0];
    if (!file) {
        console.log('❌ GIF 파일이 선택되지 않음');
        return;
    }
    
    if (file.type !== 'image/gif') {
        console.log('❌ GIF 파일이 아님:', file.type);
        alert('GIF 파일만 업로드 가능합니다.');
        return;
    }
    
    console.log('✅ GIF 파일 유효성 검사 통과:', file.name);
    
    showProcessing('GIF 처리 중...', 'GIF 프레임을 추출하고 있습니다');
    updateProgress(10);
    
    try {
        gifFile = file;
        
        // gifuct-js 사용 가능 여부에 따라 처리 방법 결정
        if (typeof gifuct !== 'undefined') {
            console.log('🔧 gifuct-js 사용하여 GIF 처리');
            gifFrames = await extractGifFramesWithGifuct(file);
        } else {
            console.log('⚠️ gifuct-js 없음, 대체 방법 사용');
            gifFrames = await extractGifFramesFallback(file);
        }
        
        console.log(`✅ GIF 처리 완료: ${gifFrames.length} 프레임`);
        updateProgress(60);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (elements.gifUploadArea) {
                elements.gifUploadArea.innerHTML = `
                    <img src="${e.target.result}" class="gif-preview" alt="GIF Preview">
                    <p>GIF 업로드 완료 (${gifFrames.length} 프레임)</p>
                `;
                elements.gifUploadArea.classList.add('has-gif');
            }
            
            showGifOverlay();
            updateStep(3);
            updateProgress(100);
            hideProcessing();
            
            console.log('✅ GIF 업로드 및 UI 업데이트 완료');
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('❌ GIF 처리 실패:', error);
        alert('GIF 파일을 처리할 수 없습니다: ' + error.message);
        hideProcessing();
    }
}

// gifuct-js를 사용한 GIF 프레임 추출
async function extractGifFramesWithGifuct(gifFile) {
    console.log('🎞️ gifuct-js를 사용한 GIF 프레임 추출 시작');
    
    try {
        const arrayBuffer = await gifFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('📊 GIF 파일 정보:', {
            size: uint8Array.length + ' bytes',
            name: gifFile.name
        });
        
        const gif = gifuct.parseGIF(uint8Array);
        const frames = gifuct.decompressFrames(gif, true);
        
        console.log(`📊 GIF 분석 결과: ${frames.length} 프레임, ${gif.lsd.width}x${gif.lsd.height}`);
        
        if (frames.length > 1) {
            console.log('🎬 멀티 프레임 GIF 감지, 프레임 추출 중...');
            
            const maxFrames = 15;
            const take = Math.min(frames.length, maxFrames);
            const W = gif.lsd.width;
            const H = gif.lsd.height;
            
            const extractedFrames = [];
            
            for (let i = 0; i < take; i++) {
                console.log(`🖼️ 프레임 ${i + 1}/${take} 처리 중...`);
                
                const canvas = document.createElement('canvas');
                canvas.width = W;
                canvas.height = H;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                // 흰 배경으로 합성
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
                        delay: Math.max((frames[i].delay || 10) * 10, 100)
                    });
                    
                    console.log(`✅ 프레임 ${i + 1} 추출 성공`);
                }
            }
            
            if (extractedFrames.length > 1) {
                console.log(`🎉 ${extractedFrames.length} 프레임 추출 완료`);
                return extractedFrames;
            } else {
                console.log('⚠️ 프레임 추출 실패, 정적 이미지로 대체');
            }
        } else {
            console.log('📷 단일 프레임 GIF 감지');
        }
        
        // 단일 프레임 처리
        return await createStaticFrame(gifFile);
        
    } catch (error) {
        console.error('❌ gifuct-js 처리 실패:', error);
        console.log('🔄 대체 방법으로 시도');
        return await createStaticFrame(gifFile);
    }
}

// 대체 GIF 프레임 추출 방법
async function extractGifFramesFallback(gifFile) {
    console.log('🔄 대체 GIF 처리 방법 사용');
    return await createStaticFrame(gifFile);
}

// 정적 프레임 생성
async function createStaticFrame(gifFile) {
    console.log('📷 정적 프레임 생성 시작');
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = async function() {
            try {
                console.log('🖼️ 이미지 로드 성공:', {
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                });
                
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
                    
                    console.log('✅ 정적 프레임 생성 완료');
                    resolve([{
                        data: arrayBuffer,
                        dataUrl: canvas.toDataURL('image/png'),
                        delay: 1000
                    }]);
                } else {
                    reject(new Error('이미지 blob 생성 실패'));
                }
                
            } catch (error) {
                console.error('❌ 정적 프레임 생성 실패:', error);
                reject(error);
            }
        };
        
        img.onerror = () => {
            console.error('❌ GIF를 이미지로 로드 실패');
            reject(new Error('GIF를 이미지로 로드 실패'));
        };
        
        const reader = new FileReader();
        reader.onload = e => {
            console.log('📖 GIF 파일 읽기 완료');
            img.src = e.target.result;
        };
        reader.onerror = () => {
            console.error('❌ GIF 파일 읽기 실패');
            reject(new Error('GIF 파일 읽기 실패'));
        };
        reader.readAsDataURL(gifFile);
    });
}

// GIF 오버레이 표시
function showGifOverlay() {
    console.log('🎭 GIF 오버레이 표시');
    
    gifPosition = {
        x: (elements.pdfPreviewCanvas.width - 100) / 2,
        y: (elements.pdfPreviewCanvas.height - 100) / 2,
        width: 100,
        height: 100
    };
    
    if (gifFrames.length > 0 && elements.gifPreviewElement) {
        elements.gifPreviewElement.innerHTML = `<img src="${gifFrames[0].dataUrl}" alt="GIF Preview">`;
    }
    
    updateGifOverlayPosition();
    
    if (elements.gifOverlay) {
        elements.gifOverlay.style.display = 'block';
    }
    
    if (elements.btnGeneratePdf) {
        elements.btnGeneratePdf.disabled = false;
    }
    
    console.log('
