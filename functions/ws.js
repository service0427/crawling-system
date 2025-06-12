// WebSocket 연결 처리
// GET /ws
export async function onRequestGet(context) {
  const { env, request } = context;
  
  // WebSocket 업그레이드 확인
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  try {
    // WebSocket 핸들러로 연결
    const wsHandlerId = env.WEBSOCKET_HANDLER.idFromName('main');
    const wsHandler = env.WEBSOCKET_HANDLER.get(wsHandlerId);
    
    return wsHandler.fetch(request);
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return new Response('WebSocket connection failed', { status: 500 });
  }
}