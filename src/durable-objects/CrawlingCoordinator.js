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
      case '/get-pending-jobs':
        return this.handleGetPendingJobs(request);
      case '/clear-jobs':
        return this.handleClearJobs(request);
      case '/clear-agents':
        return this.handleClearAgents(request);
      case '/delete-job':
        return this.handleDeleteJob(request);
      case '/get-all-jobs':
        return this.handleGetAllJobs(request);
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
        return new Response(JSON.stringify({ error: 'Unknown message type' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
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
        agentId: agentId,
        serverId: 'main',
        payload: {
          agentId: agentId,
          message: 'Agent successfully registered'
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleJobResult(agentId, payload) {
    const { jobId, status, data, error } = payload;
    const job = this.jobs.get(jobId);
    const agent = this.agents.get(agentId);

    if (!job || !agent) {
      return new Response(JSON.stringify({ error: 'Job or agent not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
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
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleCreateJob(request) {
    const { query, options = {} } = await request.json();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async assignJobToAgents(job) {
    // HTTP 폴링 방식에서는 에이전트가 직접 작업을 가져가므로
    // 여기서는 작업을 생성만 하고 'pending' 상태로 둡니다
    // 에이전트가 /get-pending-jobs를 호출할 때 할당됩니다
    
    // 온라인 에이전트가 있는지만 확인
    const onlineAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'online');
    
    return onlineAgents.length > 0;
  }

  async cancelJobForAgent(agentId, jobId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.currentJobs = agent.currentJobs.filter(id => id !== jobId);
    
    // HTTP 폴링 방식에서는 별도의 취소 메시지를 보내지 않습니다
    // 에이전트가 다음 폴링 시 작업이 없음을 확인합니다
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
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(job), {
      headers: { 'Content-Type': 'application/json' }
    });
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
        processingTime: job.completedAt ? job.completedAt - job.createdAt : null,
        assignedAgent: job.assignedAgents && job.assignedAgents.length > 0 ? job.assignedAgents[0] : null
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
    return new Response(JSON.stringify(agents), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleGetPendingJobs(request) {
    const { agentId } = await request.json();
    const agent = this.agents.get(agentId);
    
    if (!agent || agent.status !== 'online') {
      return new Response(JSON.stringify({ jobs: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 대기 중인 작업 찾기
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .slice(0, 3 - agent.currentJobs.length); // 에이전트의 여유 슬롯만큼

    const jobsToAssign = [];
    
    for (const job of pendingJobs) {
      // 작업을 에이전트에 할당
      agent.currentJobs.push(job.id);
      job.assignedAgents = [agentId];
      job.status = 'assigned';
      job.assignedAt = Date.now();
      
      jobsToAssign.push({
        jobId: job.id,
        query: job.query,
        options: job.options
      });
    }

    if (jobsToAssign.length > 0) {
      await this.saveState();
    }

    return new Response(JSON.stringify({ jobs: jobsToAssign }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleHeartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastSeen = Date.now();
      await this.saveState();
    }

    return new Response(JSON.stringify({
      response: {
        type: 'HEARTBEAT_ACK',
        payload: { timestamp: Date.now() }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
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

  async handleClearJobs(request) {
    // 모든 작업 삭제
    this.jobs.clear();
    
    // 에이전트의 현재 작업 목록도 초기화
    for (const agent of this.agents.values()) {
      agent.currentJobs = [];
    }
    
    // 통계 초기화
    this.stats = {
      totalJobsProcessed: 0,
      totalJobsSucceeded: 0,
      totalJobsFailed: 0,
      averageResponseTime: 0
    };
    
    await this.saveState();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'All jobs cleared' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async handleClearAgents(request) {
    // 모든 에이전트 삭제
    this.agents.clear();
    
    // 모든 작업의 할당 정보도 초기화
    for (const job of this.jobs.values()) {
      job.assignedAgents = [];
      if (job.status === 'assigned') {
        job.status = 'pending';
      }
    }
    
    await this.saveState();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'All agents cleared' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  async handleDeleteJob(request) {
    const { jobId } = await request.json();
    
    const job = this.jobs.get(jobId);
    if (!job) {
      return new Response(JSON.stringify({ 
        error: 'Job not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 작업을 처리 중인 에이전트에서 제거
    if (job.assignedAgents && job.assignedAgents.length > 0) {
      for (const agentId of job.assignedAgents) {
        const agent = this.agents.get(agentId);
        if (agent) {
          agent.currentJobs = agent.currentJobs.filter(id => id !== jobId);
        }
      }
    }
    
    // 작업 삭제
    this.jobs.delete(jobId);
    
    // 통계 업데이트
    if (job.status === 'completed') {
      this.stats.totalJobsSucceeded = Math.max(0, this.stats.totalJobsSucceeded - 1);
    } else if (job.status === 'failed') {
      this.stats.totalJobsFailed = Math.max(0, this.stats.totalJobsFailed - 1);
    }
    
    await this.saveState();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Job ${jobId} deleted` 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleGetAllJobs(request) {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status'); // optional filter
    
    let jobs = Array.from(this.jobs.values());
    
    // 상태 필터링
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }
    
    // 최신순 정렬
    jobs.sort((a, b) => b.createdAt - a.createdAt);
    
    // 페이지네이션
    const totalJobs = jobs.length;
    const totalPages = Math.ceil(totalJobs / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedJobs = jobs.slice(startIndex, endIndex);
    
    // 작업 데이터 포맷팅
    const formattedJobs = paginatedJobs.map(job => ({
      jobId: job.id,
      query: job.query,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      processingTime: job.completedAt ? job.completedAt - job.createdAt : null,
      hasResult: !!job.result,
      error: job.error
    }));
    
    return new Response(JSON.stringify({
      jobs: formattedJobs,
      pagination: {
        page,
        limit,
        totalJobs,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
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