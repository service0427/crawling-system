// CloudFlare Worker API (group-mk 스타일 레거시 Worker)
// 이 파일은 CloudFlare Worker로 직접 배포할 때 사용됩니다

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

      if (url.pathname === '/ws') {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
          return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        const wsHandlerId = env.WEBSOCKET_HANDLER.idFromName('main');
        const wsHandler = env.WEBSOCKET_HANDLER.get(wsHandlerId);
        return wsHandler.fetch(request);
      }

      // 정적 파일 서빙 (assets에서)
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};