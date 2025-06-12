// GET /api/status
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    const coordinatorId = env.COORDINATOR.idFromName('main');
    const coordinator = env.COORDINATOR.get(coordinatorId);
    
    const response = await coordinator.fetch(new Request('http://internal/get-status'));
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Status API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}