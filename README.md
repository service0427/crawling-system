# Distributed Crawling System - CloudFlare Workers Edition

This is a CloudFlare Workers implementation of the distributed web crawling system, leveraging Durable Objects for WebSocket handling and state management.

## Architecture Changes

### From Node.js to CloudFlare Workers:
- **Express → itty-router**: Lightweight routing for Workers
- **WebSocket (ws) → Durable Objects**: Native WebSocket support with persistent state
- **In-memory storage → Durable Objects Storage**: Distributed state management
- **EJS templates → JavaScript template strings**: Static HTML generation
- **Socket.IO → Polling/SSE**: Simplified real-time updates

## Key Components

### 1. Durable Objects
- **CrawlingCoordinator**: Central coordination and job management
- **WebSocketHandler**: WebSocket connections and agent communication

### 2. KV Namespaces
- **JOBS_KV**: Job data storage (optional, currently using DO storage)
- **AGENTS_KV**: Agent information (optional, currently using DO storage)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure wrangler.toml with your KV namespace IDs

3. Run locally:
```bash
npm run dev
```

4. Deploy to CloudFlare:
```bash
npm run deploy
```

## API Endpoints

- `GET /` - Dashboard UI
- `GET /search?q={query}` - Search endpoint
- `GET /api/status` - System status
- `GET /api/agents` - List connected agents
- `GET /api/job/:jobId` - Get job details
- `POST /api/search` - Create new search job
- `GET /ws` - WebSocket endpoint for agents

## Limitations & Considerations

1. **No Socket.IO**: Dashboard uses polling instead of real-time WebSocket
2. **Request Duration**: Workers have a 30-second limit for HTTP requests
3. **WebSocket Duration**: Durable Objects support long-lived WebSocket connections
4. **Storage**: Using Durable Objects storage instead of Redis/MongoDB
5. **Concurrent Connections**: Subject to CloudFlare's limits

## Chrome Extension Compatibility

The Chrome extension agents need minor updates:
- WebSocket URL: `wss://your-worker.workers.dev/ws?agentId=YOUR_AGENT_ID`
- Same message protocol is maintained

## Future Enhancements

1. **Server-Sent Events**: For real-time dashboard updates
2. **Queue Integration**: CloudFlare Queues for job distribution
3. **Analytics Engine**: For metrics and monitoring
4. **R2 Storage**: For crawled data storage
5. **Workers KV**: For caching frequently accessed data

## Development

```bash
# Local development
npm run dev

# View logs
npm run tail

# Deploy to production
npm run deploy
```

## Cost Considerations

- **Workers**: 100,000 requests/day free tier
- **Durable Objects**: $0.15/million requests + storage costs
- **KV**: 100,000 reads/day, 1,000 writes/day free tier
- **WebSocket**: Charged per message after free tier

## Migration Notes

- Static files are now embedded in the Worker code
- Environment variables are configured in wrangler.toml
- No file system access - all data must be in KV/DO/R2
- Async/await is required (no callbacks)
- ESM modules only (no CommonJS)