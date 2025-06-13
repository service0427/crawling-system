import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage (replace with Redis for production)
const jobs = new Map();
const agents = new Map();
const stats = {
  totalJobsProcessed: 0,
  totalJobsSucceeded: 0,
  totalJobsFailed: 0,
  averageResponseTime: 0
};

// WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const agentId = req.url.slice(1) || `agent_${Date.now()}`;
  console.log(`Agent connected: ${agentId}`);

  // Register agent
  agents.set(agentId, {
    id: agentId,
    ws: ws,
    status: 'online',
    currentJobs: [],
    lastSeen: Date.now()
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleAgentMessage(agentId, data);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Agent disconnected: ${agentId}`);
    const agent = agents.get(agentId);
    if (agent) {
      agent.status = 'offline';
      // Reassign jobs from disconnected agent
      reassignJobs(agentId);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for agent ${agentId}:`, error);
  });

  // Send registration confirmation
  ws.send(JSON.stringify({
    type: 'REGISTERED',
    agentId: agentId
  }));
});

// Handle agent messages
function handleAgentMessage(agentId, data) {
  const { type, payload } = data;

  switch (type) {
    case 'JOB_RESULT':
      handleJobResult(agentId, payload);
      break;
    case 'HEARTBEAT':
      handleHeartbeat(agentId);
      break;
    case 'STATUS_UPDATE':
      updateAgentStatus(agentId, payload);
      break;
  }
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Create job
app.post('/api/crawl', (req, res) => {
  const { query, options = {} } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const job = {
    id: jobId,
    query: query,
    options: options,
    status: 'pending',
    createdAt: Date.now(),
    assignedAt: null,
    completedAt: null,
    result: null,
    error: null,
    assignedAgents: []
  };

  jobs.set(jobId, job);
  
  // Try to assign job immediately
  const assigned = assignJobToAgents(job);
  
  res.json({
    jobId: jobId,
    status: assigned ? 'assigned' : 'queued'
  });
});

// Get job status
app.get('/api/job/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(job);
});

// Get system status
app.get('/api/status', (req, res) => {
  const onlineAgents = Array.from(agents.values()).filter(a => a.status === 'online');
  const pendingJobs = Array.from(jobs.values()).filter(j => j.status === 'pending');
  const completedJobs = Array.from(jobs.values()).filter(j => j.status === 'completed');
  
  // Get recent jobs
  const recentJobs = Array.from(jobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
    .map(job => ({
      jobId: job.id,
      query: job.query,
      status: job.status,
      createdAt: job.createdAt,
      processingTime: job.completedAt ? job.completedAt - job.createdAt : null
    }));
  
  res.json({
    agents: {
      total: agents.size,
      online: onlineAgents.length,
      offline: agents.size - onlineAgents.length
    },
    jobs: {
      total: jobs.size,
      pending: pendingJobs.length,
      completed: completedJobs.length,
      failed: Array.from(jobs.values()).filter(j => j.status === 'failed').length,
      recent: recentJobs
    },
    stats: stats
  });
});

// Get all agents
app.get('/api/agents', (req, res) => {
  const agentList = Array.from(agents.values()).map(agent => ({
    id: agent.id,
    status: agent.status,
    currentJobs: agent.currentJobs,
    lastSeen: agent.lastSeen
  }));
  
  res.json(agentList);
});

// Clear all jobs
app.post('/api/clear-jobs', (req, res) => {
  jobs.clear();
  stats.totalJobsProcessed = 0;
  stats.totalJobsSucceeded = 0;
  stats.totalJobsFailed = 0;
  stats.averageResponseTime = 0;
  
  res.json({ success: true, message: 'All jobs cleared' });
});

// Clear all agents
app.post('/api/clear-agents', (req, res) => {
  agents.forEach(agent => {
    if (agent.ws && agent.ws.readyState === 1) { // WebSocket.OPEN
      agent.ws.close();
    }
  });
  agents.clear();
  
  res.json({ success: true, message: 'All agents cleared' });
});

// Delete individual job
app.delete('/api/job/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Remove job from agent's current jobs
  if (job.assignedAgents && job.assignedAgents.length > 0) {
    job.assignedAgents.forEach(agentId => {
      const agent = agents.get(agentId);
      if (agent) {
        agent.currentJobs = agent.currentJobs.filter(id => id !== jobId);
      }
    });
  }
  
  // Delete the job
  jobs.delete(jobId);
  
  res.json({ success: true, message: 'Job deleted successfully' });
});

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Static files
app.use(express.static('public'));

// Helper functions
function assignJobToAgents(job) {
  const availableAgents = Array.from(agents.values())
    .filter(agent => 
      agent.status === 'online' && 
      agent.currentJobs.length < 3 &&
      agent.ws && 
      agent.ws.readyState === 1 // WebSocket.OPEN
    )
    .sort((a, b) => a.currentJobs.length - b.currentJobs.length);

  if (availableAgents.length === 0) {
    return false;
  }

  // Assign to up to 3 agents
  const agentsToAssign = availableAgents.slice(0, Math.min(3, availableAgents.length));
  
  agentsToAssign.forEach(agent => {
    agent.currentJobs.push(job.id);
    job.assignedAgents.push(agent.id);
    
    // Send job to agent
    agent.ws.send(JSON.stringify({
      type: 'JOB_ASSIGNED',
      payload: {
        jobId: job.id,
        query: job.query,
        options: job.options
      }
    }));
  });

  job.status = 'assigned';
  job.assignedAt = Date.now();

  return true;
}

function handleJobResult(agentId, payload) {
  const { jobId, status, data, error } = payload;
  const job = jobs.get(jobId);
  const agent = agents.get(agentId);

  if (!job || !agent) {
    return;
  }

  // Update job
  job.status = status;
  job.completedAt = Date.now();
  job.result = data;
  job.error = error;

  // Update agent
  agent.currentJobs = agent.currentJobs.filter(id => id !== jobId);

  // Update stats
  stats.totalJobsProcessed++;
  if (status === 'completed') {
    stats.totalJobsSucceeded++;
  } else {
    stats.totalJobsFailed++;
  }

  // Update average response time
  const responseTime = job.completedAt - job.createdAt;
  stats.averageResponseTime = 
    (stats.averageResponseTime * (stats.totalJobsProcessed - 1) + responseTime) / 
    stats.totalJobsProcessed;
}

function handleHeartbeat(agentId) {
  const agent = agents.get(agentId);
  if (agent) {
    agent.lastSeen = Date.now();
  }
}

function updateAgentStatus(agentId, payload) {
  const agent = agents.get(agentId);
  if (agent) {
    Object.assign(agent, payload);
  }
}

function reassignJobs(agentId) {
  const agent = agents.get(agentId);
  if (!agent) return;

  agent.currentJobs.forEach(jobId => {
    const job = jobs.get(jobId);
    if (job && job.status === 'assigned') {
      job.status = 'pending';
      job.assignedAgents = job.assignedAgents.filter(id => id !== agentId);
      
      // Try to reassign
      setTimeout(() => assignJobToAgents(job), 1000);
    }
  });
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  // Clean old jobs
  for (const [jobId, job] of jobs) {
    if ((job.status === 'completed' || job.status === 'failed') && 
        now - job.completedAt > oneHour) {
      jobs.delete(jobId);
    }
  }
  
  // Check agent health
  for (const [agentId, agent] of agents) {
    if (agent.status === 'online' && now - agent.lastSeen > 60000) {
      agent.status = 'offline';
      reassignJobs(agentId);
    }
  }
}, 30000);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`API Server running on http://${HOST}:${PORT}`);
  console.log(`WebSocket Server running on ws://${HOST}:${WS_PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});