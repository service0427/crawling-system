// CloudFlare Worker API
// 이 파일은 CloudFlare Worker로 API 엔드포인트를 처리합니다

// Durable Objects export
export { CrawlingCoordinator } from './src/durable-objects/CrawlingCoordinator.js';
export { WebSocketHandler } from './src/durable-objects/WebSocketHandler.js';

// Templates
import { dashboardTemplate } from './src/template/dashboard.js';
import { htmlViewerTemplate } from './src/template/html-viewer.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 헤더
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // OPTIONS 요청 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      // 대시보드 페이지
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(dashboardTemplate, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders
          }
        });
      }
      
      // HTML 뷰어 페이지
      if (url.pathname === '/html-viewer.html') {
        return new Response(htmlViewerTemplate, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders
          }
        });
      }
      
      // favicon.ico 처리
      if (url.pathname === '/favicon.ico') {
        // 빈 favicon 반환 (204 No Content)
        return new Response(null, {
          status: 204,
          headers: corsHeaders
        });
      }

      // API 라우팅
      if (url.pathname === '/api/status') {
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        const response = await coordinator.fetch(new Request('http://internal/get-status'));
        const data = await response.json();

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      if (url.pathname === '/api/agents') {
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        const response = await coordinator.fetch(new Request('http://internal/get-agents'));
        const data = await response.json();

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      if (url.pathname.startsWith('/api/job/')) {
        const jobId = url.pathname.split('/').pop();
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        const response = await coordinator.fetch(new Request(`http://internal/get-job?jobId=${jobId}`));
        const data = await response.json();

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      if (url.pathname === '/api/search' && request.method === 'POST') {
        const { query, options } = await request.json();

        if (!query) {
          return new Response(JSON.stringify({ error: 'Query is required' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        const response = await coordinator.fetch(new Request('http://internal/create-job', {
          method: 'POST',
          body: JSON.stringify({ query, options })
        }));
        const data = await response.json();

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // HTTP를 통한 에이전트 등록
      if (url.pathname === '/api/agent/register' && request.method === 'POST') {
        const data = await request.json();
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);

        const response = await coordinator.fetch(new Request('http://internal/agent-message', {
          method: 'POST',
          body: JSON.stringify({
            agentId: data.agentId,
            type: 'AGENT_REGISTER',
            payload: data.payload
          })
        }));

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // HTTP를 통한 작업 폴링
      if (url.pathname === '/api/agent/poll' && request.method === 'POST') {
        const data = await request.json();
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);

        const response = await coordinator.fetch(new Request('http://internal/get-pending-jobs', {
          method: 'POST',
          body: JSON.stringify({ agentId: data.agentId })
        }));

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // HTTP를 통한 작업 폴링 (클라이언트 호환성)
      if (url.pathname === '/api/agent/get-pending-jobs' && request.method === 'POST') {
        const data = await request.json();
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);

        const response = await coordinator.fetch(new Request('http://internal/get-pending-jobs', {
          method: 'POST',
          body: JSON.stringify({ agentId: data.agentId })
        }));

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // HTTP를 통한 에이전트 메시지 (하트비트 포함)
      if (url.pathname === '/api/agent/message' && request.method === 'POST') {
        const data = await request.json();
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);

        // 하트비트 처리
        if (data.type === 'HEARTBEAT' || data.type === 'heartbeat') {
          const response = await coordinator.fetch(new Request('http://internal/agent-message', {
            method: 'POST',
            body: JSON.stringify({
              agentId: data.agentId || data.data?.agentId,
              type: 'HEARTBEAT',
              payload: {
                timestamp: Date.now()
              }
            })
          }));

          const result = await response.json();
          return new Response(JSON.stringify(result), {
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // 기타 메시지 처리
        const response = await coordinator.fetch(new Request('http://internal/agent-message', {
          method: 'POST',
          body: JSON.stringify(data)
        }));

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // HTTP를 통한 작업 결과 보고
      if (url.pathname === '/api/agent/job-result' && request.method === 'POST') {
        const data = await request.json();
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);

        const response = await coordinator.fetch(new Request('http://internal/agent-message', {
          method: 'POST',
          body: JSON.stringify({
            agentId: data.agentId,
            type: 'JOB_RESULT',
            payload: {
              jobId: data.jobId,
              status: data.success ? 'completed' : 'failed',
              data: data.result,
              error: data.error,
              processingTime: data.processingTime
            }
          })
        }));

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 작업 삭제
      if (url.pathname === '/api/admin/clear-jobs' && request.method === 'POST') {
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        
        const response = await coordinator.fetch(new Request('http://internal/clear-jobs', {
          method: 'POST'
        }));
        
        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 에이전트 클리어
      if (url.pathname === '/api/admin/clear-agents' && request.method === 'POST') {
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        
        const response = await coordinator.fetch(new Request('http://internal/clear-agents', {
          method: 'POST'
        }));
        
        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 개별 작업 삭제
      if (url.pathname.startsWith('/api/job/') && url.pathname.endsWith('/delete') && request.method === 'POST') {
        const pathParts = url.pathname.split('/');
        const jobId = pathParts[pathParts.length - 2];
        
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        
        const response = await coordinator.fetch(new Request('http://internal/delete-job', {
          method: 'POST',
          body: JSON.stringify({ jobId })
        }));
        
        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 모든 작업 목록 조회 (페이지네이션 지원)
      if (url.pathname === '/api/jobs' && request.method === 'GET') {
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);
        
        const queryParams = url.searchParams.toString();
        const response = await coordinator.fetch(
          new Request(`http://internal/get-all-jobs${queryParams ? '?' + queryParams : ''}`)
        );
        
        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // HTTP를 통한 하트비트
      if (url.pathname === '/api/agent/heartbeat' && request.method === 'POST') {
        const data = await request.json();
        const coordinatorId = env.COORDINATOR.idFromName('main');
        const coordinator = env.COORDINATOR.get(coordinatorId);

        const response = await coordinator.fetch(new Request('http://internal/agent-message', {
          method: 'POST',
          body: JSON.stringify({
            agentId: data.agentId,
            type: 'HEARTBEAT',
            payload: data
          })
        }));

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      if (url.pathname === '/ws') {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
          return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        try {
          const wsHandlerId = env.WEBSOCKET_HANDLER.idFromName('main');
          const wsHandler = env.WEBSOCKET_HANDLER.get(wsHandlerId);
          return wsHandler.fetch(request);
        } catch (wsError) {
          console.error('WebSocket handler error:', wsError);
          return new Response('WebSocket handler error: ' + wsError.message, {
            status: 500,
            headers: corsHeaders
          });
        }
      }

      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message,
        stack: error.stack 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};