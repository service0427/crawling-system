export async function handleSearch(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return new Response('Query parameter is required', { status: 400 });
  }

  // Create job through coordinator
  const coordinatorId = env.COORDINATOR.idFromName('main');
  const coordinator = env.COORDINATOR.get(coordinatorId);
  
  const jobResponse = await coordinator.fetch(new Request('http://internal/create-job', {
    method: 'POST',
    body: JSON.stringify({ 
      query: query,
      options: {
        maxResults: 20,
        timeout: 30000
      }
    })
  }));

  const job = await jobResponse.json();

  // Poll for results (in a real implementation, you'd use Server-Sent Events or WebSocket)
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout
  
  while (attempts < maxAttempts) {
    const statusResponse = await coordinator.fetch(
      new Request(`http://internal/get-job?jobId=${job.jobId}`)
    );
    
    const jobStatus = await statusResponse.json();
    
    if (jobStatus.status === 'completed') {
      return new Response(JSON.stringify({
        success: true,
        jobId: job.jobId,
        query: query,
        data: jobStatus.result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (jobStatus.status === 'failed') {
      return new Response(JSON.stringify({
        success: false,
        jobId: job.jobId,
        error: jobStatus.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Wait 1 second before next poll
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Timeout waiting for results'
  }), {
    status: 504,
    headers: { 'Content-Type': 'application/json' }
  });
}