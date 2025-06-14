export const dashboardTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>분산 크롤링 시스템 대시보드</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            width: 100%;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.8;
        }
        
        .search-section {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .search-form {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .search-input {
            flex: 1;
            padding: 12px 20px;
            font-size: 1rem;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: white;
            min-width: 300px;
        }
        
        .search-input::placeholder {
            color: rgba(255,255,255,0.6);
        }
        
        .search-button {
            padding: 12px 30px;
            font-size: 1rem;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            background: white;
            color: #667eea;
            cursor: pointer;
            transition: all 0.3s ease;
            min-height: 48px;
        }
        
        .search-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        
        .search-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 8px;
            color: #81C784;
        }

        .stat-label {
            font-size: 1rem;
            opacity: 0.8;
        }

        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            flex: 1;
            min-height: 0;
        }

        .panel {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 400px;
        }

        .panel-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            font-size: 1.2rem;
            font-weight: 600;
            flex-shrink: 0;
        }

        .panel-content {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .agent-item, .job-item {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .job-item:hover {
            background: rgba(255,255,255,0.08);
            transform: translateY(-2px);
            cursor: pointer;
        }

        .agent-online { border-left-color: #4CAF50; }
        .agent-offline { border-left-color: #f44336; }

        .job-completed { border-left-color: #4CAF50; }
        .job-failed { border-left-color: #f44336; }
        .job-pending { border-left-color: #FF9800; }
        .job-assigned { border-left-color: #2196F3; }

        .agent-status, .job-status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            white-space: nowrap;
        }

        .status-online { background: #4CAF50; }
        .status-offline { background: #f44336; }
        .status-completed { background: #4CAF50; }
        .status-failed { background: #f44336; }
        .status-pending { background: #FF9800; }
        .status-assigned { background: #2196F3; }

        .agent-details, .job-details {
            font-size: 0.9rem;
            margin-top: 8px;
            opacity: 0.8;
        }

        .search-result {
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid rgba(76, 175, 80, 0.5);
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }

        .search-error {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid rgba(244, 67, 54, 0.5);
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }

        .loading {
            text-align: center;
            padding: 20px;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .connection-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: bold;
        }

        .connected { background: #4CAF50; }
        .disconnected { background: #f44336; }

        /* 모달 스타일 */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
            overflow-y: auto;
        }
        
        .modal-content {
            position: relative;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 5% auto;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.2);
            width: 80%;
            max-width: 800px;
            border-radius: 12px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .close {
            color: #fff;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover,
        .close:focus {
            color: #ccc;
        }
        
        .job-detail-content {
            margin-top: 20px;
        }
        
        .job-detail-section {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .job-detail-section h3 {
            margin: 0 0 10px 0;
            color: #fff;
        }
        
        .job-result-data {
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 300px;
            overflow-y: auto;
        }

        /* 태블릿 디바이스 */
        @media (max-width: 1024px) {
            .container {
                max-width: 100%;
                padding: 15px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .panel {
                min-height: 350px;
            }
        }
        
        /* 모바일 디바이스 */
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .header p {
                font-size: 1rem;
            }
            
            .content-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .search-form {
                flex-direction: column;
            }
            
            .search-input {
                min-width: 100%;
                width: 100%;
            }
            
            .search-button {
                width: 100%;
                padding: 14px;
            }
            
            .modal-content {
                width: 95%;
                margin: 2% auto;
                padding: 15px;
            }
            
            .panel-header {
                padding: 15px;
                font-size: 1.1rem;
            }
            
            .panel {
                height: auto;
                min-height: 300px;
            }
            
            /* 버튼 그룹 반응형 */
            .search-section > div:last-child {
                flex-direction: column;
                gap: 10px;
            }
            
            .search-section button {
                width: 100%;
                margin: 0 !important;
            }
            
            /* 에이전트/작업 카드 스타일 */
            .agent-item, .job-item {
                background: rgba(255,255,255,0.08);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .agent-item > div:first-child,
            .job-item > div:first-child {
                flex-direction: column;
                gap: 10px;
                align-items: flex-start !important;
            }
            
            .agent-details,
            .job-details {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
        }
        
        /* 소형 모바일 디바이스 */
        @media (max-width: 480px) {
            .header {
                margin-bottom: 20px;
            }
            
            .header h1 {
                font-size: 1.5rem;
            }
            
            .header p {
                font-size: 0.9rem;
            }
            
            .search-section {
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .stat-card {
                padding: 15px;
            }
            
            .stat-number {
                font-size: 2rem;
            }
            
            .connection-status {
                top: 10px;
                right: 10px;
                font-size: 0.8rem;
                padding: 8px 12px;
            }
            
            /* 모달 버튼 모바일 최적화 */
            #modalButtons {
                flex-direction: column;
                width: 100%;
            }
            
            #modalButtons button {
                width: 100%;
            }
        }
        
        /* Toast 메시지 스타일 */
        .toast-container {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            pointer-events: none;
        }
        
        .toast {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 10px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            pointer-events: all;
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            max-width: 500px;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        .toast.success {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
        }
        
        .toast.error {
            background: linear-gradient(135deg, #f44336 0%, #da190b 100%);
            color: white;
        }
        
        .toast.info {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
        }
        
        .toast-icon {
            font-size: 1.2rem;
        }
        
        .toast-message {
            flex: 1;
        }
        
        @media (max-width: 480px) {
            .toast-container {
                top: 10px;
                left: 10px;
                right: 10px;
                transform: none;
            }
            
            .toast {
                min-width: auto;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="connection-status connected" id="connectionStatus">
        🟢 시스템 정상
    </div>
    
    <!-- Toast 메시지 컨테이너 -->
    <div class="toast-container" id="toastContainer"></div>

    <div class="container">
        <header class="header">
            <h1>🌐 분산 크롤링 시스템</h1>
            <p>실시간 크롤링 모니터링 대시보드</p>
        </header>

        <section class="search-section">
            <form id="searchForm" class="search-form">
                <input type="text" id="searchQuery" class="search-input" placeholder="검색어를 입력하세요..." required>
                <button type="submit" id="searchButton" class="search-button">
                    검색 시작
                </button>
            </form>
            
            <div style="margin-top: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <button onclick="showAllJobs()" style="
                    padding: 8px 20px;
                    font-size: 0.9rem;
                    border: none;
                    border-radius: 6px;
                    background: #2196F3;
                    color: white;
                    cursor: pointer;
                    min-height: 40px;
                ">📋 전체 작업 내역 보기</button>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="clearAllJobs()" style="
                        padding: 8px 20px;
                        font-size: 0.9rem;
                        border: none;
                        border-radius: 6px;
                        background: #f44336;
                        color: white;
                        cursor: pointer;
                        min-height: 40px;
                    ">🗑️ 모든 작업 삭제</button>
                    
                    <button onclick="clearAllAgents()" style="
                        padding: 8px 20px;
                        font-size: 0.9rem;
                        border: none;
                        border-radius: 6px;
                        background: #ff9800;
                        color: white;
                        cursor: pointer;
                        min-height: 40px;
                    ">🧹 모든 에이전트 클리어</button>
                </div>
            </div>
        </section>

        <section class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="activeAgents">0</div>
                <div class="stat-label">활성 에이전트</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalJobs">0</div>
                <div class="stat-label">전체 작업</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="completedJobs">0</div>
                <div class="stat-label">완료된 작업</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="avgResponseTime">0ms</div>
                <div class="stat-label">평균 응답시간</div>
            </div>
        </section>

        <section class="content-grid">
            <div class="panel">
                <div class="panel-header">
                    🖥️ 연결된 에이전트
                </div>
                <div class="panel-content" id="agentsPanel">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>에이전트 목록을 불러오는 중...</p>
                    </div>
                </div>
            </div>
            
            <div class="panel">
                <div class="panel-header">
                    📊 최근 작업 내역
                </div>
                <div class="panel-content" id="jobsPanel">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>작업 내역을 불러오는 중...</p>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- 작업 상세 모달 -->
    <div id="jobModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h2>작업 상세 정보</h2>
            <div id="jobDetailContent" class="job-detail-content">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>작업 정보를 불러오는 중...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- 전체 작업 내역 모달 -->
    <div id="allJobsModal" class="modal">
        <div class="modal-content" style="width: 90%; max-width: 1200px;">
            <span class="close" onclick="closeAllJobsModal()">&times;</span>
            <h2>전체 작업 내역</h2>
            
            <div style="margin: 20px 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <select id="jobStatusFilter" onchange="filterJobs()" style="
                        padding: 8px 15px;
                        border-radius: 6px;
                        border: 1px solid rgba(255,255,255,0.3);
                        background: rgba(255,255,255,0.1);
                        color: white;
                        font-size: 0.9rem;
                    ">
                        <option value="">모든 상태</option>
                        <option value="pending">대기</option>
                        <option value="assigned">진행중</option>
                        <option value="completed">완료</option>
                        <option value="failed">실패</option>
                    </select>
                </div>
                <div id="jobsPagination" style="color: white; font-size: 0.9rem;">
                    총 <span id="totalJobsCount">0</span>개 작업
                </div>
            </div>
            
            <div id="allJobsContent" style="max-height: 500px; overflow-y: auto;">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>작업 목록을 불러오는 중...</p>
                </div>
            </div>
            
            <div id="paginationControls" style="margin-top: 20px; text-align: center;">
                <!-- 페이지네이션 버튼이 여기에 추가됩니다 -->
            </div>
        </div>
    </div>

    <script>
        // HTML 이스케이프 함수
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Toast 메시지 함수
        function showToast(message, type = 'info', duration = 3000) {
            const toastContainer = document.getElementById('toastContainer');
            
            // Toast 엘리먼트 생성
            const toast = document.createElement('div');
            toast.className = \`toast \${type}\`;
            
            // 아이콘 선택
            const icons = {
                success: '✅',
                error: '❌',
                info: 'ℹ️',
                warning: '⚠️'
            };
            
            toast.innerHTML = \`
                <span class="toast-icon">\${icons[type] || icons.info}</span>
                <span class="toast-message">\${escapeHtml(message)}</span>
            \`;
            
            toastContainer.appendChild(toast);
            
            // 애니메이션 트리거
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            // 자동 제거
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, duration);
        }
        
        // 대시보드 업데이트
        async function updateDashboard() {
            try {
                // 시스템 상태 가져오기
                const statusResponse = await fetch('/api/status');
                const status = await statusResponse.json();
                
                // 통계 업데이트
                document.getElementById('activeAgents').textContent = status.agents.online;
                document.getElementById('totalJobs').textContent = status.jobs.total;
                document.getElementById('completedJobs').textContent = status.stats.totalJobsSucceeded || 0;
                document.getElementById('avgResponseTime').textContent = 
                    Math.round(status.stats.averageResponseTime || 0) + 'ms';
                
                // 에이전트 목록 업데이트
                const agentsResponse = await fetch('/api/agents');
                const agents = await agentsResponse.json();
                updateAgentsList(agents);
                
                // 최근 작업 목록 업데이트
                updateJobsList(status.jobs.recent || []);
                
            } catch (error) {
                console.error('대시보드 업데이트 실패:', error);
                document.getElementById('connectionStatus').textContent = '🔴 연결 오류';
                document.getElementById('connectionStatus').className = 'connection-status disconnected';
            }
        }
        
        // 에이전트 목록 업데이트
        function updateAgentsList(agents) {
            const agentsPanel = document.getElementById('agentsPanel');
            
            if (!agents || agents.length === 0) {
                agentsPanel.innerHTML = \`
                    <div style="text-align: center; opacity: 0.6; padding: 20px;">
                        연결된 에이전트가 없습니다
                    </div>
                \`;
                return;
            }
            
            agentsPanel.innerHTML = agents.map(agent => \`
                <div class="agent-item agent-\${agent.status}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>\${agent.id.substring(0, 20)}...</strong>
                            <span class="agent-status status-\${agent.status}">
                                \${agent.status === 'online' ? '온라인' : '오프라인'}
                            </span>
                        </div>
                        <div style="text-align: right;">
                            <div>\${agent.currentJobs.length}개 작업 중</div>
                        </div>
                    </div>
                    <div class="agent-details">
                        완료: \${agent.stats.jobsCompleted} | 실패: \${agent.stats.jobsFailed}
                    </div>
                </div>
            \`).join('');
        }
        
        // 작업 목록 업데이트
        function updateJobsList(jobs) {
            const jobsPanel = document.getElementById('jobsPanel');
            
            if (!jobs || jobs.length === 0) {
                jobsPanel.innerHTML = \`
                    <div style="text-align: center; opacity: 0.6; padding: 20px;">
                        최근 작업이 없습니다
                    </div>
                \`;
                return;
            }
            
            jobsPanel.innerHTML = jobs.map(job => \`
                <div class="job-item job-\${job.status}" onclick="showJobDetail('\${job.jobId}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>\${job.assignedAgent ? \`에이전트: \${job.assignedAgent}\` : '미할당'}</strong>
                            <span class="job-status status-\${job.status}">
                                \${job.status === 'completed' ? '완료' : 
                                  job.status === 'failed' ? '실패' : 
                                  job.status === 'pending' ? '대기' : '진행중'}
                            </span>
                        </div>
                        <div style="text-align: right;">
                            \${job.processingTime ? \`<div>\${job.processingTime}ms</div>\` : ''}
                        </div>
                    </div>
                    <div class="job-details">
                        검색어: \${escapeHtml(job.query)}<br>
                        생성: \${new Date(job.createdAt).toLocaleString()}
                        \${job.jobId ? \`<br><span style="opacity: 0.7; font-size: 0.85em;">ID: \${job.jobId}</span>\` : ''}
                    </div>
                </div>
            \`).join('');
        }
        
        // 작업 상세 정보 표시
        async function showJobDetail(jobId) {
            const modal = document.getElementById('jobModal');
            const content = document.getElementById('jobDetailContent');
            
            modal.style.display = 'block';
            
            try {
                const response = await fetch(\`/api/job/\${jobId}\`);
                const job = await response.json();
                
                // HTML 콘텐츠를 안전하게 처리 (전역 함수 사용)
                
                content.innerHTML = \`
                    <div class="job-detail-section">
                        <h3>기본 정보</h3>
                        <p><strong>작업 ID:</strong> \${job.id}</p>
                        <p><strong>검색어:</strong> \${job.query}</p>
                        <p><strong>상태:</strong> <span class="job-status status-\${job.status}">\${
                            job.status === 'completed' ? '완료' : 
                            job.status === 'failed' ? '실패' : 
                            job.status === 'pending' ? '대기' : '진행중'
                        }</span></p>
                        <p><strong>생성 시간:</strong> \${new Date(job.createdAt).toLocaleString()}</p>
                        \${job.completedAt ? \`<p><strong>완료 시간:</strong> \${new Date(job.completedAt).toLocaleString()}</p>\` : ''}
                        \${job.responseTime ? \`<p><strong>처리 시간:</strong> \${job.responseTime}ms</p>\` : ''}
                        
                        <div style="margin-top: 15px;">
                            <button onclick="deleteJob('\${job.id}')" style="
                                padding: 8px 16px;
                                font-size: 0.9rem;
                                border: none;
                                border-radius: 6px;
                                background: #f44336;
                                color: white;
                                cursor: pointer;
                            ">🗑️ 이 작업 삭제</button>
                        </div>
                    </div>
                    
                    \${job.assignedAgents && job.assignedAgents.length > 0 ? \`
                        <div class="job-detail-section">
                            <h3>할당된 에이전트</h3>
                            <p>\${job.assignedAgents.join(', ')}</p>
                        </div>
                    \` : ''}
                    
                    \${job.result ? \`
                        <div class="job-detail-section">
                            <h3>크롤링 결과</h3>
                            <div class="job-result-data">\${
                                typeof job.result === 'object' && job.result.html 
                                    ? \`<strong>HTML 크롤링 완료</strong><br>
                                       URL: \${escapeHtml(job.result.url || 'N/A')}<br>
                                       제목: \${escapeHtml(job.result.title || 'N/A')}<br>
                                       HTML 크기: \${job.result.htmlSize || (job.result.html ? job.result.html.length : 0)} bytes<br>
                                       크롤링 시간: \${new Date().toLocaleString()}<br>
                                       <br>
                                       <button onclick="openHtmlInNewWindow('\${job.id}')" style="
                                           padding: 8px 16px;
                                           font-size: 0.9rem;
                                           border: none;
                                           border-radius: 6px;
                                           background: #2196F3;
                                           color: white;
                                           cursor: pointer;
                                           margin-top: 10px;
                                       ">🌐 HTML 새 창에서 보기</button>
                                       <br><br>
                                       <em>* 주의: 크롤링된 원본 HTML이 새 창에서 열립니다</em>\`
                                    : \`<pre>\${escapeHtml(JSON.stringify(job.result, null, 2))}</pre>\`
                            }</div>
                        </div>
                    \` : ''}
                    
                    \${job.error ? \`
                        <div class="job-detail-section">
                            <h3>오류 정보</h3>
                            <div class="job-result-data" style="color: #ff6b6b;">\${escapeHtml(job.error)}</div>
                        </div>
                    \` : ''}
                \`;
            } catch (error) {
                content.innerHTML = \`
                    <div class="search-error">
                        작업 정보를 불러오는데 실패했습니다: \${error.message}
                    </div>
                \`;
            }
        }
        
        // 모달 닫기
        function closeModal() {
            document.getElementById('jobModal').style.display = 'none';
        }
        
        // 모달 외부 클릭 시 닫기
        window.onclick = function(event) {
            const jobModal = document.getElementById('jobModal');
            const allJobsModal = document.getElementById('allJobsModal');
            
            if (event.target == jobModal) {
                jobModal.style.display = 'none';
            } else if (event.target == allJobsModal) {
                allJobsModal.style.display = 'none';
            }
        }
        
        // 검색 기능
        document.getElementById('searchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const query = document.getElementById('searchQuery').value;
            const button = document.getElementById('searchButton');
            
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> 작업 생성 중...';
            
            try {
                const response = await fetch('/api/crawl', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Toast 메시지로 성공 알림
                    showToast(
                        \`작업이 생성되었습니다! (\${data.status === 'assigned' ? '에이전트에 할당됨' : '대기 중'})\`,
                        'success',
                        4000
                    );
                    
                    // 입력 필드 초기화
                    document.getElementById('searchQuery').value = '';
                    
                    // 대시보드 즉시 업데이트
                    updateDashboard();
                } else {
                    throw new Error(data.error || '작업 생성 실패');
                }
            } catch (error) {
                // Toast 메시지로 오류 알림
                showToast(\`오류 발생: \${error.message}\`, 'error', 5000);
            } finally {
                button.disabled = false;
                button.textContent = '검색 시작';
            }
        });
        
        // 모든 작업 삭제
        async function clearAllJobs() {
            if (!confirm('정말로 모든 작업을 삭제하시겠습니까?')) {
                return;
            }
            
            try {
                const response = await fetch('/api/admin/clear-jobs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('✅ 모든 작업이 삭제되었습니다.');
                    updateDashboard();
                } else {
                    throw new Error(data.error || '작업 삭제 실패');
                }
            } catch (error) {
                alert('❌ 오류 발생: ' + error.message);
            }
        }
        
        // 모든 에이전트 클리어
        async function clearAllAgents() {
            if (!confirm('정말로 모든 에이전트를 클리어하시겠습니까?')) {
                return;
            }
            
            try {
                const response = await fetch('/api/admin/clear-agents', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('✅ 모든 에이전트가 클리어되었습니다.');
                    updateDashboard();
                } else {
                    throw new Error(data.error || '에이전트 클리어 실패');
                }
            } catch (error) {
                alert('❌ 오류 발생: ' + error.message);
            }
        }
        
        // 개별 작업 삭제 (작업 상세 모달에서 사용)
        async function deleteJob(jobId) {
            if (!confirm('이 작업을 삭제하시겠습니까?')) {
                return;
            }
            
            try {
                const response = await fetch(\`/api/job/\${jobId}/delete\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('✅ 작업이 삭제되었습니다.');
                    closeModal();
                    updateDashboard();
                } else {
                    throw new Error(data.error || '작업 삭제 실패');
                }
            } catch (error) {
                alert('❌ 오류 발생: ' + error.message);
            }
        }
        
        // HTML을 새 창에서 열기 (에디터 스타일)
        window.openHtmlInNewWindow = function(jobId) {
            // 새 창에서 HTML 뷰어 페이지 열기
            const viewerUrl = \`/html-viewer.html?jobId=\${jobId}\`;
            const newWindow = window.open(viewerUrl, '_blank');
            
            if (!newWindow) {
                alert('팝업 차단으로 인해 새 창을 열 수 없습니다. 팝업 차단을 해제해주세요.');
            }
        }
        
        // 전체 작업 내역 보기
        let currentJobsPage = 1;
        let currentStatusFilter = '';
        
        async function showAllJobs() {
            const modal = document.getElementById('allJobsModal');
            modal.style.display = 'block';
            currentJobsPage = 1;
            currentStatusFilter = '';
            document.getElementById('jobStatusFilter').value = '';
            await loadAllJobs();
        }
        
        function closeAllJobsModal() {
            document.getElementById('allJobsModal').style.display = 'none';
        }
        
        async function filterJobs() {
            currentStatusFilter = document.getElementById('jobStatusFilter').value;
            currentJobsPage = 1;
            await loadAllJobs();
        }
        
        async function loadAllJobs(page = currentJobsPage) {
            const content = document.getElementById('allJobsContent');
            const pagination = document.getElementById('paginationControls');
            const totalCount = document.getElementById('totalJobsCount');
            
            try {
                const params = new URLSearchParams({
                    page: page,
                    limit: 20
                });
                
                if (currentStatusFilter) {
                    params.append('status', currentStatusFilter);
                }
                
                const response = await fetch(\`/api/jobs?\${params}\`);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load jobs');
                }
                
                // 작업 목록 표시
                totalCount.textContent = data.pagination.totalJobs;
                
                if (data.jobs.length === 0) {
                    content.innerHTML = \`
                        <div style="text-align: center; opacity: 0.6; padding: 40px;">
                            작업 내역이 없습니다
                        </div>
                    \`;
                } else {
                    content.innerHTML = data.jobs.map(job => \`
                        <div class="job-item job-\${job.status}" style="margin-bottom: 10px;" onclick="showJobDetail('\${job.jobId}')">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>작업 ID: \${job.jobId}</strong>
                                    <span class="job-status status-\${job.status}">
                                        \${job.status === 'completed' ? '완료' : 
                                          job.status === 'failed' ? '실패' : 
                                          job.status === 'pending' ? '대기' : '진행중'}
                                    </span>
                                </div>
                                <div style="text-align: right;">
                                    \${job.processingTime ? \`<div>\${job.processingTime}ms</div>\` : ''}
                                    \${job.hasResult ? '<span style="color: #4CAF50;">✅</span>' : ''}
                                    \${job.error ? '<span style="color: #f44336;">❌</span>' : ''}
                                </div>
                            </div>
                            <div class="job-details">
                                검색어: \${escapeHtml(job.query)}<br>
                                생성: \${new Date(job.createdAt).toLocaleString()}
                                \${job.completedAt ? \`<br>완료: \${new Date(job.completedAt).toLocaleString()}\` : ''}
                            </div>
                        </div>
                    \`).join('');
                }
                
                // 페이지네이션 컨트롤
                let paginationHtml = '';
                
                if (data.pagination.totalPages > 1) {
                    paginationHtml += '<div style="display: flex; justify-content: center; gap: 10px; align-items: center;">';
                    
                    // 이전 페이지
                    if (data.pagination.hasPrev) {
                        paginationHtml += \`
                            <button onclick="loadAllJobs(\${page - 1})" style="
                                padding: 6px 12px;
                                border: none;
                                border-radius: 4px;
                                background: rgba(255,255,255,0.1);
                                color: white;
                                cursor: pointer;
                            ">◀ 이전</button>
                        \`;
                    }
                    
                    // 페이지 번호
                    paginationHtml += \`
                        <span style="color: white;">
                            \${page} / \${data.pagination.totalPages}
                        </span>
                    \`;
                    
                    // 다음 페이지
                    if (data.pagination.hasNext) {
                        paginationHtml += \`
                            <button onclick="loadAllJobs(\${page + 1})" style="
                                padding: 6px 12px;
                                border: none;
                                border-radius: 4px;
                                background: rgba(255,255,255,0.1);
                                color: white;
                                cursor: pointer;
                            ">다음 ▶</button>
                        \`;
                    }
                    
                    paginationHtml += '</div>';
                }
                
                pagination.innerHTML = paginationHtml;
                currentJobsPage = page;
                
            } catch (error) {
                content.innerHTML = \`
                    <div class="search-error">
                        작업 목록을 불러오는데 실패했습니다: \${error.message}
                    </div>
                \`;
            }
        }
        
        // 패널 높이 동적 조정
        function adjustPanelHeight() {
            const panels = document.querySelectorAll('.panel');
            const windowHeight = window.innerHeight;
            const header = document.querySelector('.header');
            const searchSection = document.querySelector('.search-section');
            const statsGrid = document.querySelector('.stats-grid');
            const connectionStatus = document.querySelector('.connection-status');
            
            // 다른 요소들의 높이 계산
            const headerHeight = header ? header.offsetHeight : 0;
            const searchHeight = searchSection ? searchSection.offsetHeight : 0;
            const statsHeight = statsGrid ? statsGrid.offsetHeight : 0;
            const statusHeight = connectionStatus ? connectionStatus.offsetHeight : 0;
            
            // 여백 계산 (container padding, section margins 등)
            const margins = 180; // 대략적인 여백 합계
            
            // 사용 가능한 높이 계산
            const availableHeight = windowHeight - headerHeight - searchHeight - statsHeight - margins;
            
            // 최소 높이 설정
            const minHeight = 400;
            const panelHeight = Math.max(availableHeight, minHeight);
            
            // 패널에 높이 적용
            panels.forEach(panel => {
                if (window.innerWidth > 768) {
                    panel.style.height = \`\${panelHeight}px\`;
                } else {
                    panel.style.height = 'auto';
                    panel.style.minHeight = '300px';
                }
            });
        }
        
        // 창 크기 변경 시 높이 재조정
        window.addEventListener('resize', adjustPanelHeight);
        
        // 초기 로드 시 높이 조정
        window.addEventListener('load', () => {
            adjustPanelHeight();
        });
        
        // 초기 로드 및 주기적 업데이트
        updateDashboard().then(() => {
            setTimeout(adjustPanelHeight, 100);
        });
        
        setInterval(() => {
            updateDashboard().then(() => {
                setTimeout(adjustPanelHeight, 100);
            });
        }, 3000); // 3초마다 업데이트
    </script>
</body>
</html>
`;