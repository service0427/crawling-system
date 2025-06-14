// 수정된 API 엔드포인트 부분
// api-worker.js의 기존 엔드포인트 다음에 추가

      // HTTP를 통한 작업 폴링 (기존 클라이언트 호환)
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