export const htmlViewerTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML 뷰어</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            height: 100vh;
            overflow: hidden;
        }
        
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 50px;
            background: #2c3e50;
            color: white;
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 100;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        .header h1 {
            font-size: 1.2rem;
            font-weight: normal;
        }
        
        .container {
            display: flex;
            width: 100%;
            height: 100%;
            margin-top: 50px;
        }
        
        .editor-pane {
            width: 50%;
            height: calc(100vh - 50px);
            background: #1e1e1e;
            color: #d4d4d4;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .editor-header {
            background: #2d2d30;
            padding: 10px 15px;
            font-size: 0.9rem;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .code-area {
            flex: 1;
            padding: 15px;
            overflow: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre;
        }
        
        .code-area::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }
        
        .code-area::-webkit-scrollbar-track {
            background: #1e1e1e;
        }
        
        .code-area::-webkit-scrollbar-thumb {
            background: #424242;
            border-radius: 5px;
        }
        
        .code-area::-webkit-scrollbar-thumb:hover {
            background: #4e4e4e;
        }
        
        .preview-pane {
            width: 50%;
            height: calc(100vh - 50px);
            background: white;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border-left: 1px solid #e0e0e0;
        }
        
        .preview-header {
            background: #f5f5f5;
            padding: 10px 15px;
            font-size: 0.9rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .preview-frame {
            flex: 1;
            width: 100%;
            border: none;
            background: white;
        }
        
        .copy-button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.85rem;
        }
        
        .copy-button:hover {
            background: #1177bb;
        }
        
        .copy-button:active {
            background: #0d5689;
        }
        
        .info {
            font-size: 0.85rem;
            color: #666;
        }
        
        /* 구문 강조 */
        .tag { color: #569cd6; }
        .attr-name { color: #9cdcfe; }
        .attr-value { color: #ce9178; }
        .text { color: #d4d4d4; }
        .comment { color: #6a9955; }
        
        @media (max-width: 768px) {
            .container {
                flex-direction: column;
            }
            
            .editor-pane, .preview-pane {
                width: 100%;
                height: 50%;
            }
            
            .preview-pane {
                border-left: none;
                border-top: 1px solid #e0e0e0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 id="pageTitle">🌐 HTML 뷰어</h1>
    </div>
    
    <div class="container">
        <div class="editor-pane">
            <div class="editor-header">
                <span>📄 HTML 소스 코드</span>
                <button class="copy-button" onclick="copyHtml()">📋 복사</button>
            </div>
            <div class="code-area" id="codeArea"></div>
        </div>
        
        <div class="preview-pane">
            <div class="preview-header">
                <span>👁️ 미리보기</span>
                <span class="info" id="sizeInfo">크기: 0 KB</span>
            </div>
            <iframe class="preview-frame" id="previewFrame"></iframe>
        </div>
    </div>
    
    <script>
        // URL 파라미터에서 작업 ID 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const jobId = urlParams.get('jobId');

        // HTML 콘텐츠를 저장할 변수
        let htmlContent = '';

        // HTML 이스케이프 함수
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // HTML 포맷팅 함수
        function formatHtml(html) {
            let formatted = '';
            let indent = 0;
            
            html.split(/(<[^>]+>)/g).forEach(part => {
                if (!part.trim()) return;
                
                const isClosingTag = part.startsWith('</');
                const isSelfClosing = part.endsWith('/>') || ['<br>', '<hr>', '<img', '<input', '<meta', '<link'].some(tag => part.toLowerCase().startsWith(tag));
                
                if (isClosingTag) indent--;
                
                if (part.startsWith('<')) {
                    formatted += '  '.repeat(Math.max(0, indent)) + part + '\\n';
                    
                    if (!isClosingTag && !isSelfClosing && !part.startsWith('<!')) {
                        indent++;
                    }
                } else if (part.trim()) {
                    formatted += '  '.repeat(Math.max(0, indent)) + part.trim() + '\\n';
                }
            });
            
            return formatted;
        }

        // 구문 강조 적용
        function highlightHtml(html) {
            return html
                .replace(/<!--[\\s\\S]*?-->/g, match => '<span class="comment">' + escapeHtml(match) + '</span>')
                .replace(/<([^\\/][^>]*)>/g, (match, p1) => {
                    const tagMatch = p1.match(/^(\\w+)(.*)/);
                    if (!tagMatch) return escapeHtml(match);
                    
                    const tagName = tagMatch[1];
                    const attrs = tagMatch[2];
                    
                    const highlightedAttrs = attrs.replace(/(\\w+)=(["'])(.*?)\\2/g, 
                        (attrMatch, name, quote, value) => 
                            ' <span class="attr-name">' + name + '</span>=<span class="attr-value">' + quote + value + quote + '</span>'
                    );
                    
                    return '<span class="tag">&lt;' + tagName + highlightedAttrs + '&gt;</span>';
                })
                .replace(/<\\/(\\w+)>/g, (match, tagName) => 
                    '<span class="tag">&lt;/' + tagName + '&gt;</span>'
                );
        }

        // HTML 복사 기능
        function copyHtml() {
            navigator.clipboard.writeText(htmlContent).then(() => {
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = '✅ 복사됨!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            }).catch(err => {
                alert('복사 실패: ' + err.message);
            });
        }

        // 작업 데이터 로드 및 표시
        async function loadJobData() {
            if (!jobId) {
                document.getElementById('codeArea').innerHTML = '<span style="color: #ff6b6b;">오류: 작업 ID가 없습니다.</span>';
                return;
            }
            
            try {
                const response = await fetch(\`/api/job/\${jobId}\`);
                const job = await response.json();
                
                if (job.result && job.result.html) {
                    htmlContent = job.result.html;
                    
                    // 제목 업데이트
                    document.getElementById('pageTitle').textContent = \`🌐 HTML 뷰어 - \${job.query} | 작업 ID: \${jobId}\`;
                    document.title = \`HTML 뷰어 - \${job.query} (\${jobId})\`;
                    
                    // 크기 정보 업데이트
                    document.getElementById('sizeInfo').textContent = \`크기: \${(htmlContent.length / 1024).toFixed(2)} KB\`;
                    
                    // 코드 영역에 포맷된 HTML 표시
                    const formattedHtml = formatHtml(htmlContent);
                    document.getElementById('codeArea').innerHTML = highlightHtml(formattedHtml);
                    
                    // 미리보기 프레임에 HTML 렌더링
                    const iframe = document.getElementById('previewFrame');
                    iframe.srcdoc = htmlContent;
                } else {
                    document.getElementById('codeArea').innerHTML = '<span style="color: #ff6b6b;">HTML 결과를 찾을 수 없습니다.</span>';
                }
            } catch (error) {
                document.getElementById('codeArea').innerHTML = \`<span style="color: #ff6b6b;">오류: \${error.message}</span>\`;
            }
        }

        // 페이지 로드 시 작업 데이터 로드
        window.addEventListener('DOMContentLoaded', loadJobData);
    </script>
</body>
</html>
`;