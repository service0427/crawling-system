// GET /api/agents
export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    const coordinatorId = env.COORDINATOR.idFromName('main');
    const coordinator = env.COORDINATOR.get(coordinatorId);
    
    const response = await coordinator.fetch(new Request('http://internal/get-agents'));
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Agents API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get agents' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}