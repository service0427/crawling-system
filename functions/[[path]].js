// 동적 라우팅 처리 (폴백)
// 정적 파일이나 다른 Functions에서 처리되지 않은 요청 처리
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // API 요청이 아닌 경우 404 반환
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/ws') {
    return new Response('Not Found', { status: 404 });
  }
  
  // 처리되지 않은 API 엔드포인트
  return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}