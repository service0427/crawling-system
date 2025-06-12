export class CrawlingCoordinator {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    
    // Initialize in-memory state
    this.agents = new Map();
    this.jobs = new Map();
    this.stats = {
      totalJobsProcessed: 0,
      totalJobsSucceeded: 0,
      totalJobsFailed: 0,
      averageResponseTime: 0
    };

    // Load state from storage
    this.state.blockConcurrencyWhile(async () => {
      const storedAgents = await this.state.storage.get('agents');
      const storedJobs = await this.state.storage.get('jobs');
      const storedStats = await this.state.storage.get('stats');
      
      if (storedAgents) this.agents = new Map(storedAgents);
      if (storedJobs) this.jobs = new Map(storedJobs);
      if (storedStats) this.stats = storedStats;
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    switch (path) {
      case '/agent-message':
        return this.handleAgentMessage(request);
      case '/agent-disconnected':
        return this.handleAgentDisconnected(request);
      case '/create-job':
        return this.handleCreateJob(request);
      case '/get-job':
        return this.handleGetJob(request);
      case '/get-status':
        return this.handleGetStatus(request);
      case '/get-agents':
        return this.handleGetAgents(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async handleAgentMessage(request) {
    const data = await request.json();
    const { agentId, type, payload } = data;

    switch (type) {
      case 'AGENT_REGISTER':
        return this.registerAgent(agentId, payload);
      case 'JOB_RESULT':
        return this.handleJobResult(agentId, payload);
      case 'AGENT_STATUS':
        return this.updateAgentStatus(agentId, payload);
      case 'HEARTBEAT':
        return this.handleHeartbeat(agentId);
      default:
        return new Response(JSON.stringify({ error: 'Unknown message type' }), { status: 400 });
    }
  }

  async registerAgent(agentId, payload) {
    const agent = {
      id: agentId,
      name: payload.name || `Agent-${agentId}`,
      capabilities: payload.capabilities || ['naver-shopping'],
      status: 'online',
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      currentJobs: [],
      stats: {
        jobsCompleted: 0,
        jobsFailed: 0,
        totalResponseTime: 0
      }
    };

    this.agents.set(agentId, agent);
    await this.saveState();

    return new Response(JSON.stringify({
      response: {
        type: 'AGENT_REGISTERED',
        payload: {
          agentId: agentId,
          message: 'Agent successfully registered'
        }
      }
    }));
  }

  async handleJobResult(agentId, payload) {
    const { jobId, status, data, error } = payload;
    const job = this.jobs.get(jobId);
    const agent = this.agents.get(agentId);

    if (!job || !agent) {
      return new Response(JSON.stringify({ error: 'Job or agent not found' }), { status: 404 });
    }

    const responseTime = Date.now() - job.assignedAt;

    // Update job status
    job.status = status;
    job.completedAt = Date.now();
    job.responseTime = responseTime;
    
    if (status === 'completed') {
      job.result = data;
      agent.stats.jobsCompleted++;
      this.stats.totalJobsSucceeded++;
    } else {
      job.error = error;
      agent.stats.jobsFailed++;
      this.stats.totalJobsFailed++;
    }

    // Update agent stats
    agent.stats.totalResponseTime += responseTime;
    agent.currentJobs = agent.currentJobs.filter(id => id !== jobId);

    // Update global stats
    this.stats.totalJobsProcessed++;
    this.updateAverageResponseTime(responseTime);

    // Cancel other agents working on the same job (competitive crawling)
    if (job.assignedAgents && job.assignedAgents.length > 1) {
      for (const otherAgentId of job.assignedAgents) {
        if (otherAgentId !== agentId) {
          await this.cancelJobForAgent(otherAgentId, jobId);
        }
      }
    }

    await this.saveState();

    return new Response(JSON.stringify({
      response: {
        type: 'JOB_RESULT_RECEIVED',
        payload: { jobId, status: 'received' }
      }
    }));
  }

  async handleCreateJob(request) {
    const { query, options = {} } = await request.json();
    const jobId = crypto.randomUUID();

    const job = {
      id: jobId,
      query: query,
      options: options,
      status: 'pending',
      createdAt: Date.now(),
      assignedAt: null,
      completedAt: null,
      assignedAgents: [],
      result: null,
      error: null,
      responseTime: null
    };

    this.jobs.set(jobId, job);

    // Assign job to available agents
    const assigned = await this.assignJobToAgents(job);

    await this.saveState();

    return new Response(JSON.stringify({
      jobId: jobId,
      status: assigned ? 'assigned' : 'queued',
      assignedAgents: job.assignedAgents
    }));
  }

  async assignJobToAgents(job) {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        agent.status === 'online' && 
        agent.currentJobs.length < 3 &&
        agent.capabilities.includes('naver-shopping')
      )
      .sort((a, b) => a.currentJobs.length - b.currentJobs.length);

    if (availableAgents.length === 0) {
      return false;
    }

    // Assign to up to 3 agents for competitive crawling
    const agentsToAssign = availableAgents.slice(0, Math.min(3, availableAgents.length));
    
    for (const agent of agentsToAssign) {
      agent.currentJobs.push(job.id);
      job.assignedAgents.push(agent.id);

      // Send job to agent via WebSocket
      const wsHandlerId = this.env.WEBSOCKET_HANDLER.idFromName('main');
      const wsHandler = this.env.WEBSOCKET_HANDLER.get(wsHandlerId);
      
      await wsHandler.fetch(new Request('http://internal/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          agentId: agent.id,
          message: {
            type: 'JOB_ASSIGNED',
            payload: {
              jobId: job.id,
              query: job.query,
              options: job.options
            }
          }
        })
      }));
    }

    job.status = 'assigned';
    job.assignedAt = Date.now();

    return true;
  }

  async cancelJobForAgent(agentId, jobId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.currentJobs = agent.currentJobs.filter(id => id !== jobId);

    // Send cancellation to agent
    const wsHandlerId = this.env.WEBSOCKET_HANDLER.idFromName('main');
    const wsHandler = this.env.WEBSOCKET_HANDLER.get(wsHandlerId);
    
    await wsHandler.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        agentId: agentId,
        message: {
          type: 'JOB_CANCELLED',
          payload: { jobId: jobId }
        }
      })
    }));
  }

  async handleAgentDisconnected(request) {
    const { agentId } = await request.json();
    const agent = this.agents.get(agentId);

    if (agent) {
      agent.status = 'offline';
      agent.lastSeen = Date.now();

      // Reassign agent's current jobs
      for (const jobId of agent.currentJobs) {
        const job = this.jobs.get(jobId);
        if (job && job.status === 'assigned') {
          job.assignedAgents = job.assignedAgents.filter(id => id !== agentId);
          
          // If no agents left, reassign
          if (job.assignedAgents.length === 0) {
            await this.assignJobToAgents(job);
          }
        }
      }

      agent.currentJobs = [];
      await this.saveState();
    }

    return new Response('OK');
  }

  async handleGetJob(request) {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const job = this.jobs.get(jobId);

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(job));
  }

  async handleGetStatus(request) {
    const jobs = Array.from(this.jobs.values());
    const recentJobs = jobs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(job => ({
        jobId: job.id,
        query: job.query,
        status: job.status,
        createdAt: job.createdAt,
        processingTime: job.completedAt ? job.completedAt - job.createdAt : null
      }));

    const status = {
      agents: {
        total: this.agents.size,
        online: Array.from(this.agents.values()).filter(a => a.status === 'online').length,
        offline: Array.from(this.agents.values()).filter(a => a.status === 'offline').length
      },
      jobs: {
        total: this.jobs.size,
        pending: Array.from(this.jobs.values()).filter(j => j.status === 'pending').length,
        assigned: Array.from(this.jobs.values()).filter(j => j.status === 'assigned').length,
        completed: Array.from(this.jobs.values()).filter(j => j.status === 'completed').length,
        failed: Array.from(this.jobs.values()).filter(j => j.status === 'failed').length,
        recent: recentJobs
      },
      stats: this.stats
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleGetAgents(request) {
    const agents = Array.from(this.agents.values());
    return new Response(JSON.stringify(agents));
  }

  async handleHeartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastSeen = Date.now();
      await this.saveState();
    }

    return new Response(JSON.stringify({
      response: {
        type: 'HEARTBEAT_RESPONSE',
        payload: { timestamp: Date.now() }
      }
    }));
  }

  updateAverageResponseTime(newResponseTime) {
    const totalTime = this.stats.averageResponseTime * (this.stats.totalJobsProcessed - 1) + newResponseTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalJobsProcessed;
  }

  async saveState() {
    await this.state.storage.put('agents', Array.from(this.agents.entries()));
    await this.state.storage.put('jobs', Array.from(this.jobs.entries()));
    await this.state.storage.put('stats', this.stats);
  }

  // Periodic cleanup of old jobs
  async alarm() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Clean up old completed/failed jobs
    for (const [jobId, job] of this.jobs) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          (now - job.completedAt > oneHour)) {
        this.jobs.delete(jobId);
      }
    }

    // Clean up offline agents
    for (const [agentId, agent] of this.agents) {
      if (agent.status === 'offline' && (now - agent.lastSeen > oneHour)) {
        this.agents.delete(agentId);
      }
    }

    await this.saveState();

    // Schedule next cleanup
    await this.state.storage.setAlarm(now + 30 * 60 * 1000); // 30 minutes
  }
}