export async function handleWebSocket(request, env) {
  const upgradeHeader = request.headers.get('Upgrade');
  
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected websocket', { status: 426 });
  }

  // Get or create WebSocket handler Durable Object
  const wsHandlerId = env.WEBSOCKET_HANDLER.idFromName('main');
  const wsHandler = env.WEBSOCKET_HANDLER.get(wsHandlerId);
  
  // Forward the WebSocket request to the Durable Object
  return wsHandler.fetch(request);
}