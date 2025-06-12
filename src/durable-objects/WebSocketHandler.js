export class WebSocketHandler {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    
    this.handleSession(server, request);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  handleSession(webSocket, request) {
    const sessionId = crypto.randomUUID();
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');

    const session = {
      id: sessionId,
      agentId: agentId,
      webSocket: webSocket,
      quit: false,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now()
    };

    this.sessions.set(sessionId, session);

    webSocket.addEventListener('message', async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        await this.handleMessage(session, data);
      } catch (error) {
        console.error('Message handling error:', error);
        webSocket.send(JSON.stringify({
          type: 'ERROR',
          error: error.message
        }));
      }
    });

    webSocket.addEventListener('close', async () => {
      this.sessions.delete(sessionId);
      session.quit = true;
      
      // Notify coordinator about agent disconnection
      const coordinatorId = this.env.COORDINATOR.idFromName('main');
      const coordinator = this.env.COORDINATOR.get(coordinatorId);
      
      await coordinator.fetch(new Request('http://internal/agent-disconnected', {
        method: 'POST',
        body: JSON.stringify({ agentId: session.agentId })
      }));
    });

    webSocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.sessions.delete(sessionId);
      session.quit = true;
    });

    // Send initial connection confirmation
    webSocket.send(JSON.stringify({
      type: 'CONNECTED',
      sessionId: sessionId
    }));
  }

  async handleMessage(session, data) {
    const { type, payload } = data;
    
    // Forward message to coordinator
    const coordinatorId = this.env.COORDINATOR.idFromName('main');
    const coordinator = this.env.COORDINATOR.get(coordinatorId);
    
    const response = await coordinator.fetch(new Request('http://internal/agent-message', {
      method: 'POST',
      body: JSON.stringify({
        agentId: session.agentId,
        sessionId: session.id,
        type: type,
        payload: payload
      })
    }));

    const result = await response.json();
    
    // Send response back to agent
    if (result.response) {
      session.webSocket.send(JSON.stringify(result.response));
    }

    // Update last activity
    session.lastHeartbeat = Date.now();
  }

  // Broadcast message to specific agent
  async broadcast(agentId, message) {
    for (const [_, session] of this.sessions) {
      if (session.agentId === agentId && !session.quit) {
        try {
          session.webSocket.send(JSON.stringify(message));
        } catch (error) {
          console.error('Broadcast error:', error);
        }
      }
    }
  }

  // Clean up stale sessions
  async alarm() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastHeartbeat > timeout) {
        try {
          session.webSocket.close(1000, 'Timeout');
        } catch (e) {
          // Socket might already be closed
        }
        this.sessions.delete(sessionId);
      }
    }

    // Schedule next cleanup
    await this.state.storage.setAlarm(now + 60000); // Check every minute
  }
}