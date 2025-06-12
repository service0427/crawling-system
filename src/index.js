import { Router } from 'itty-router';
import { handleSearch } from './handlers/search';
import { handleDashboard } from './handlers/dashboard';
import { handleApi } from './handlers/api';
import { handleWebSocket } from './handlers/websocket';

// Export Durable Objects
export { CrawlingCoordinator } from './durable-objects/CrawlingCoordinator';
export { WebSocketHandler } from './durable-objects/WebSocketHandler';

// Create router
const router = Router();

// HTML pages
router.get('/', handleDashboard);
router.get('/search', handleSearch);

// API endpoints
router.get('/api/status', (request, env) => handleApi(request, env, 'status'));
router.get('/api/agents', (request, env) => handleApi(request, env, 'agents'));
router.get('/api/job/:jobId', (request, env) => handleApi(request, env, 'job'));
router.post('/api/search', (request, env) => handleApi(request, env, 'search'));

// WebSocket endpoint
router.get('/ws', handleWebSocket);

// Catch all
router.all('*', () => new Response('Not Found', { status: 404 }));

// Worker fetch handler
export default {
  async fetch(request, env, ctx) {
    try {
      // Handle CORS
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // Route request
      const response = await router.handle(request, env, ctx);
      
      // Add CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      // Return response with CORS headers
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  },
};