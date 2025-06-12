// GET /api/job/:id
export async function onRequestGet(context) {
  const { env, params } = context;
  const jobId = params.id;
  
  try {
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const coordinatorId = env.COORDINATOR.idFromName('main');
    const coordinator = env.COORDINATOR.get(coordinatorId);
    
    const response = await coordinator.fetch(new Request(`http://internal/get-job?jobId=${jobId}`));
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Job API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get job' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}