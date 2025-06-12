// POST /api/search
export async function onRequestPost(context) {
  const { env, request } = context;
  
  try {
    const { query, options } = await request.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Search API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create search job' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}