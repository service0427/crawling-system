export async function handleApi(request, env, type) {
  const coordinatorId = env.COORDINATOR.idFromName('main');
  const coordinator = env.COORDINATOR.get(coordinatorId);

  switch (type) {
    case 'status':
      return coordinator.fetch(new Request('http://internal/get-status'));
    
    case 'agents':
      return coordinator.fetch(new Request('http://internal/get-agents'));
    
    case 'job': {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const jobId = pathParts[pathParts.length - 1];
      
      return coordinator.fetch(new Request(`http://internal/get-job?jobId=${jobId}`));
    }
    
    case 'search': {
      const { query, options } = await request.json();
      
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query is required' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const response = await coordinator.fetch(new Request('http://internal/create-job', {
        method: 'POST',
        body: JSON.stringify({ query, options })
      }));

      return response;
    }
    
    default:
      return new Response('Not Found', { status: 404 });
  }
}