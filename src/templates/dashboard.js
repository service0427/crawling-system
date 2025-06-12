export const dashboardTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🕷️ 분산 크롤링 시스템 - 모니터링 대시보드</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .search-section {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }

        .search-form {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }

        .search-input {
            flex: 1;
            min-width: 300px;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            background: rgba(255,255,255,0.9);
            color: #333;
        }

        .search-btn {
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .search-btn:hover {
            background: #45a049;
        }

        .search-btn:disabled {
            background: #666;
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
        }

        .panel {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }

        .panel-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            font-size: 1.2rem;
            font-weight: 600;
        }

        .panel-content {
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
        }

        .agent-item, .job-item {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid;
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

        @media (max-width: 768px) {
            .content-grid {
                grid-template-columns: 1fr;
            }
            
            .search-form {
                flex-direction: column;
            }
            
            .search-input {
                min-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="connection-status connected" id="connectionStatus">
        🟢 시스템 정상
    </div>

    <div class="container">
        <div class="header">
            <h1>🕷️ 분산 크롤링 시스템</h1>
            <p>실시간 모니터링 대시보드</p>
        </div>

        <!-- 검색 섹션 -->
        <div class="search-section">
            <form class="search-form" id="searchForm">
                <input type="text" class="search-input" id="searchInput" 
                       placeholder="검색어를 입력하세요 (예: 아이폰)" required>
                <button type="submit" class="search-btn" id="searchBtn">
                    🔍 검색 시작
                </button>
            </form>
            <div id="searchResult" style="display: none;"></div>
        </div>

        <!-- 통계 카드 -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="activeAgents">0</div>
                <div class="stat-label">활성 에이전트</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalJobs">0</div>
                <div class="stat-label">총 작업 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="completedJobs">0</div>
                <div class="stat-label">완료된 작업</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="avgResponseTime">0ms</div>
                <div class="stat-label">평균 응답 시간</div>
            </div>
        </div>

        <!-- 메인 컨텐츠 -->
        <div class="content-grid">
            <!-- 연결된 에이전트 -->
            <div class="panel">
                <div class="panel-header">
                    🤖 연결된 에이전트
                </div>
                <div class="panel-content" id="agentsPanel">
                    <div style="text-align: center; opacity: 0.6; padding: 20px;">
                        에이전트 로딩 중...
                    </div>
                </div>
            </div>

            <!-- 최근 작업 -->
            <div class="panel">
                <div class="panel-header">
                    📋 최근 작업
                </div>
                <div class="panel-content" id="jobsPanel">
                    <div style="text-align: center; opacity: 0.6; padding: 20px;">
                        작업 로딩 중...
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let updateInterval;
        
        // 시스템 상태 업데이트
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
                <div class="job-item job-\${job.status}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>\${job.jobId.substring(0, 8)}...</strong>
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
                        검색어: \${job.query}<br>
                        생성: \${new Date(job.createdAt).toLocaleString()}
                    </div>
                </div>
            \`).join('');
        }
        
        // 검색 기능
        document.getElementById('searchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const query = document.getElementById('searchInput').value;
            const searchBtn = document.getElementById('searchBtn');
            const resultDiv = document.getElementById('searchResult');
            
            if (!query.trim()) return;
            
            // UI 업데이트
            searchBtn.disabled = true;
            searchBtn.innerHTML = '🔄 검색 중...';
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = \`
                <div class="loading">
                    <div class="spinner"></div>
                    <div style="margin-top: 10px;">검색 중... 여러 에이전트가 동시에 작업합니다</div>
                </div>
            \`;
            
            try {
                const response = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    resultDiv.innerHTML = \`
                        <div class="search-result">
                            <strong>검색 작업 생성됨:</strong> \${data.jobId}<br>
                            <small>결과를 기다리는 중...</small>
                        </div>
                    \`;
                    
                    // 결과 폴링
                    pollJobResult(data.jobId);
                } else {
                    throw new Error(data.error || '검색 실패');
                }
                
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="search-error">
                        <strong>검색 실패:</strong> \${error.message}
                    </div>
                \`;
            } finally {
                searchBtn.disabled = false;
                searchBtn.innerHTML = '🔍 검색 시작';
            }
        });
        
        // 작업 결과 폴링
        async function pollJobResult(jobId) {
            const maxAttempts = 30;
            let attempts = 0;
            const resultDiv = document.getElementById('searchResult');
            
            const checkResult = async () => {
                try {
                    const response = await fetch(\`/api/job/\${jobId}\`);
                    const job = await response.json();
                    
                    if (job.status === 'completed') {
                        showSearchResult(job.result);
                    } else if (job.status === 'failed') {
                        throw new Error(job.error || '검색 실패');
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(checkResult, 1000);
                    } else {
                        throw new Error('검색 타임아웃');
                    }
                } catch (error) {
                    resultDiv.innerHTML = \`
                        <div class="search-error">
                            <strong>검색 실패:</strong> \${error.message}
                        </div>
                    \`;
                }
            };
            
            checkResult();
        }
        
        // 검색 결과 표시
        function showSearchResult(result) {
            const resultDiv = document.getElementById('searchResult');
            resultDiv.innerHTML = \`
                <div class="search-result">
                    <h3>✅ 검색 완료!</h3>
                    <p><strong>URL:</strong> \${result.url || '알 수 없음'}</p>
                    <p><strong>제목:</strong> \${result.title || '알 수 없음'}</p>
                    <p><strong>HTML 크기:</strong> \${result.htmlSize?.toLocaleString() || 0} bytes</p>
                    <p><strong>처리 시간:</strong> \${result.processingTime || 0}ms</p>
                    <p style="margin-top: 10px;">
                        <small>결과는 가장 빠르게 응답한 에이전트로부터 수신되었습니다.</small>
                    </p>
                </div>
            \`;
        }
        
        // 초기 로드 및 주기적 업데이트
        updateDashboard();
        updateInterval = setInterval(updateDashboard, 3000);
        
        // 페이지 언로드 시 인터벌 정리
        window.addEventListener('beforeunload', () => {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        });
    </script>
</body>
</html>
`;