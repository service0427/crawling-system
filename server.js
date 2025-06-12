// 📁 server/server.js - 분산 크롤링 중앙 조정 서버
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;
const WSPORT = process.env.WSPORT || 4001;

// Redis 클라이언트 설정
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Express 미들웨어 설정
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 분산 크롤링 시스템 클래스
class DistributedCrawlingCoordinator {
  constructor() {
    this.agents = new Map(); // 연결된 에이전트들
    this.jobs = new Map();   // 진행 중인 작업들
    this.statistics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeAgents: 0,
      averageResponseTime: 0
    };
    
    this.setupWebSocketServer();
    this.setupRedisConnection();
    this.startStatisticsUpdater();
  }

  async setupRedisConnection() {
    try {
      await redisClient.connect();
      console.log('✅ Redis 연결 성공');
    } catch (error) {
      console.error('❌ Redis 연결 실패:', error);
      console.log('⚠️ Redis 없이 메모리 모드로 실행');
    }
  }

  setupWebSocketServer() {
    this.wss = new WebSocket.Server({ port: WSPORT });
    
    this.wss.on('connection', (ws, req) => {
      console.log('🤝 새 WebSocket 연결');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleAgentMessage(ws, message);
        } catch (error) {
          console.error('❌ 메시지 처리 오류:', error);
        }
      });

      ws.on('close', () => {
        this.handleAgentDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket 오류:', error);
      });
    });

    console.log(`🔌 WebSocket 서버 실행: ws://localhost:${WSPORT}`);
  }

  async handleAgentMessage(ws, message) {
    switch (message.type) {
      case 'AGENT_REGISTER':
        await this.registerAgent(ws, message);
        break;
      
      case 'JOB_RESULT':
        await this.handleJobResult(ws, message);
        break;
      
      case 'AGENT_STATUS':
        await this.updateAgentStatus(ws, message);
        break;
      
      case 'HEARTBEAT':
        await this.handleHeartbeat(ws, message);
        break;
      
      default:
        console.log('❓ 알 수 없는 메시지 타입:', message.type);
    }
  }

  async registerAgent(ws, message) {
    const agentId = message.agentId || uuidv4();
    const serverId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const agentInfo = {
      id: agentId,
      serverId: serverId,
      ws: ws,
      status: 'online',
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      currentJobs: [],
      completedJobs: 0,
      failedJobs: 0,
      capabilities: message.capabilities || {}
    };

    this.agents.set(agentId, agentInfo);
    ws.agentId = agentId;

    // 등록 응답
    ws.send(JSON.stringify({
      type: 'AGENT_REGISTERED',
      agentId: agentId,
      serverId: serverId,
      timestamp: Date.now()
    }));

    console.log(`✅ 에이전트 등록: ${agentId}`);
    this.updateStatistics();
    this.broadcastToMonitors('agent_registered', agentInfo);
  }

  async handleJobResult(ws, message) {
    const { jobId, status, data, processingTime } = message;
    const job = this.jobs.get(jobId);
    
    if (!job) {
      console.warn(`⚠️ 알 수 없는 작업 ID: ${jobId}`);
      return;
    }

    // 이미 완료된 작업인지 확인 (경쟁적 크롤링)
    if (job.status === 'completed') {
      console.log(`⏭️ 작업 ${jobId} 이미 완료됨 - 무시`);
      
      // 늦게 도착한 에이전트에게 취소 알림
      ws.send(JSON.stringify({
        type: 'JOB_CANCELLED',
        jobId: jobId,
        reason: 'already_completed'
      }));
      
      return;
    }

    // 첫 번째 완료 결과 처리
    if (status === 'completed' && data) {
      job.status = 'completed';
      job.result = data;
      job.completedAt = Date.now();
      job.processingTime = processingTime;
      job.completedBy = ws.agentId;

      console.log(`✅ 작업 완료: ${jobId} by ${ws.agentId} (${processingTime}ms)`);
      
      // 통계 업데이트
      this.statistics.completedJobs++;
      this.updateAverageResponseTime(processingTime);
      
      // 다른 에이전트들에게 작업 취소 알림
      this.cancelJobForOtherAgents(jobId, ws.agentId);
      
      // 모니터링 대시보드에 알림
      this.broadcastToMonitors('job_completed', {
        jobId,
        agentId: ws.agentId,
        processingTime,
        result: {
          url: data.metadata?.url,
          htmlSize: data.html?.length || 0
        }
      });

      // 웹 클라이언트에 결과 반환
      if (job.callback) {
        job.callback(null, job.result);
      }

    } else if (status === 'failed') {
      console.log(`❌ 작업 실패: ${jobId} by ${ws.agentId} - ${message.error}`);
      
      // 에이전트에서 작업 제거
      const agent = this.agents.get(ws.agentId);
      if (agent) {
        agent.currentJobs = agent.currentJobs.filter(j => j !== jobId);
        agent.failedJobs++;
      }

      // 다른 에이전트가 아직 작업 중인지 확인
      const stillRunning = Array.from(this.agents.values()).some(agent => 
        agent.currentJobs.includes(jobId)
      );

      if (!stillRunning) {
        job.status = 'failed';
        job.error = message.error;
        this.statistics.failedJobs++;
        
        if (job.callback) {
          job.callback(new Error(message.error), null);
        }
      }
    }

    this.updateStatistics();
  }

  cancelJobForOtherAgents(completedJobId, completingAgentId) {
    for (const [agentId, agent] of this.agents) {
      if (agentId !== completingAgentId && agent.currentJobs.includes(completedJobId)) {
        // 작업 취소 메시지 전송
        agent.ws.send(JSON.stringify({
          type: 'JOB_CANCELLED',
          jobId: completedJobId,
          reason: 'completed_by_other'
        }));

        // 에이전트의 현재 작업 목록에서 제거
        agent.currentJobs = agent.currentJobs.filter(j => j !== completedJobId);
        
        console.log(`📤 작업 취소 알림: ${completedJobId} → ${agentId}`);
      }
    }
  }

  async assignJobToAgents(job, maxAgents = 3) {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        agent.status === 'online' && 
        agent.currentJobs.length < 3 && // 최대 동시 작업 수 제한
        agent.ws.readyState === WebSocket.OPEN
      )
      .sort((a, b) => a.currentJobs.length - b.currentJobs.length); // 작업 부하가 적은 순

    const selectedAgents = availableAgents.slice(0, maxAgents);
    
    if (selectedAgents.length === 0) {
      throw new Error('사용 가능한 에이전트가 없습니다');
    }

    // 선택된 에이전트들에게 작업 할당
    for (const agent of selectedAgents) {
      agent.currentJobs.push(job.id);
      
      agent.ws.send(JSON.stringify({
        type: 'JOB_ASSIGNED',
        jobId: job.id,
        url: job.url,
        timeout: job.timeout || 10000,
        timestamp: Date.now()
      }));

      console.log(`📋 작업 할당: ${job.id} → ${agent.id}`);
    }

    job.assignedTo = selectedAgents.map(a => a.id);
    job.status = 'assigned';
    
    return selectedAgents.length;
  }

  handleAgentDisconnect(ws) {
    if (ws.agentId) {
      const agent = this.agents.get(ws.agentId);
      if (agent) {
        agent.status = 'offline';
        console.log(`🔴 에이전트 연결 해제: ${ws.agentId}`);
        
        // 진행 중이던 작업들을 다른 에이전트에게 재할당
        this.reassignJobsFromAgent(ws.agentId);
        
        this.agents.delete(ws.agentId);
        this.updateStatistics();
        this.broadcastToMonitors('agent_disconnected', { agentId: ws.agentId });
      }
    }
  }

  async reassignJobsFromAgent(disconnectedAgentId) {
    // 연결 해제된 에이전트의 작업들을 찾아서 재할당
    for (const [jobId, job] of this.jobs) {
      if (job.status === 'assigned' && job.assignedTo?.includes(disconnectedAgentId)) {
        console.log(`🔄 작업 재할당: ${jobId}`);
        
        // 아직 다른 에이전트가 작업 중인지 확인
        const stillAssigned = job.assignedTo.filter(agentId => 
          agentId !== disconnectedAgentId && this.agents.has(agentId)
        );

        if (stillAssigned.length === 0) {
          // 모든 에이전트가 연결 해제된 경우 새로 할당
          try {
            await this.assignJobToAgents(job, 2);
          } catch (error) {
            console.error(`❌ 작업 재할당 실패: ${jobId} - ${error.message}`);
            job.status = 'failed';
            job.error = '에이전트 연결 해제로 인한 실패';
          }
        }
      }
    }
  }

  async handleHeartbeat(ws, message) {
    const agent = this.agents.get(ws.agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      
      // 하트비트 응답
      ws.send(JSON.stringify({
        type: 'HEARTBEAT_RESPONSE',
        timestamp: Date.now()
      }));
    }
  }

  updateStatistics() {
    this.statistics.activeAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'online').length;
    
    this.statistics.totalJobs = this.jobs.size;
    
    // 실시간 통계를 모니터링 대시보드에 전송
    this.broadcastToMonitors('statistics_updated', this.statistics);
  }

  updateAverageResponseTime(newTime) {
    const currentAvg = this.statistics.averageResponseTime;
    const completedCount = this.statistics.completedJobs;
    
    this.statistics.averageResponseTime = Math.round(
      ((currentAvg * (completedCount - 1)) + newTime) / completedCount
    );
  }

  broadcastToMonitors(event, data) {
    io.emit(event, data);
  }

  startStatisticsUpdater() {
    // 30초마다 통계 업데이트
    setInterval(() => {
      this.updateStatistics();
      
      // 오래된 작업 정리 (1시간 이상)
      this.cleanupOldJobs();
      
      // 비활성 에이전트 정리 (5분 이상 하트비트 없음)
      this.cleanupInactiveAgents();
      
    }, 30000);
  }

  cleanupOldJobs() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs) {
      if (job.createdAt < oneHourAgo && 
          (job.status === 'completed' || job.status === 'failed')) {
        this.jobs.delete(jobId);
      }
    }
  }

  cleanupInactiveAgents() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (const [agentId, agent] of this.agents) {
      if (agent.lastHeartbeat < fiveMinutesAgo) {
        console.log(`🧹 비활성 에이전트 정리: ${agentId}`);
        this.handleAgentDisconnect(agent.ws);
      }
    }
  }

  // 공개 메소드: 새 검색 작업 생성
  async createSearchJob(url, options = {}) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      url: url,
      status: 'pending',
      createdAt: Date.now(),
      timeout: options.timeout || 10000,
      priority: options.priority || 1,
      result: null,
      error: null,
      assignedTo: [],
      callback: options.callback
    };

    this.jobs.set(jobId, job);
    console.log(`📝 새 작업 생성: ${jobId} - ${url}`);

    try {
      const assignedCount = await this.assignJobToAgents(job, options.maxAgents || 3);
      console.log(`✅ 작업 할당 완료: ${assignedCount}개 에이전트`);
      
      return jobId;
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      throw error;
    }
  }

  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      id: job.id,
      url: job.url,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      processingTime: job.processingTime,
      assignedTo: job.assignedTo,
      result: job.result ? {
        url: job.result.metadata?.url,
        title: job.result.metadata?.title,
        htmlSize: job.result.html?.length || 0
      } : null,
      error: job.error
    };
  }

  getSystemStatus() {
    return {
      statistics: this.statistics,
      agents: Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        serverId: agent.serverId,
        status: agent.status,
        registeredAt: agent.registeredAt,
        lastHeartbeat: agent.lastHeartbeat,
        currentJobs: agent.currentJobs.length,
        completedJobs: agent.completedJobs,
        failedJobs: agent.failedJobs
      })),
      recentJobs: Array.from(this.jobs.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(job => ({
          id: job.id,
          url: job.url,
          status: job.status,
          createdAt: job.createdAt,
          processingTime: job.processingTime
        }))
    };
  }
}

// 분산 크롤링 코디네이터 인스턴스 생성
const coordinator = new DistributedCrawlingCoordinator();

// === HTTP API 라우트 ===

// 메인 페이지 - 모니터링 대시보드
app.get('/', (req, res) => {
  res.render('dashboard', {
    statistics: coordinator.statistics,
    agents: Array.from(coordinator.agents.values()),
    recentJobs: Array.from(coordinator.jobs.values()).slice(-10)
  });
});

// 검색 API
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: '검색어가 필요합니다' });
  }

  const url = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;
  
  try {
    // Promise를 사용한 비동기 처리
    const jobId = await new Promise(async (resolve, reject) => {
      const jobId = await coordinator.createSearchJob(url, {
        timeout: 10000,
        maxAgents: 3,
        callback: (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      });

      // 타임아웃 설정
      setTimeout(() => {
        const job = coordinator.jobs.get(jobId);
        if (job && job.status !== 'completed') {
          job.status = 'failed';
          job.error = '타임아웃';
          reject(new Error('검색 타임아웃'));
        }
      }, 12000);
    });

    // 결과가 있으면 바로 반환, 없으면 job ID 반환
    if (typeof jobId === 'object' && jobId.html) {
      res.json({
        success: true,
        result: jobId,
        jobId: null
      });
    } else {
      res.json({
        success: true,
        jobId: jobId,
        message: '검색 중... /api/job/:jobId 로 결과 확인'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 작업 상태 확인 API
app.get('/api/job/:jobId', (req, res) => {
  const jobStatus = coordinator.getJobStatus(req.params.jobId);
  
  if (!jobStatus) {
    return res.status(404).json({ error: '작업을 찾을 수 없습니다' });
  }

  res.json(jobStatus);
});

// 시스템 상태 API
app.get('/api/status', (req, res) => {
  res.json(coordinator.getSystemStatus());
});

// 에이전트 목록 API
app.get('/api/agents', (req, res) => {
  const agents = Array.from(coordinator.agents.values()).map(agent => ({
    id: agent.id,
    serverId: agent.serverId,
    status: agent.status,
    registeredAt: agent.registeredAt,
    lastHeartbeat: agent.lastHeartbeat,
    currentJobs: agent.currentJobs.length,
    completedJobs: agent.completedJobs,
    failedJobs: agent.failedJobs,
    isOnline: Date.now() - agent.lastHeartbeat < 60000 // 1분 이내 하트비트
  }));

  res.json(agents);
});

// HTML 수신 엔드포인트 (기존 호환성)
app.post('/receive-html', (req, res) => {
  console.log('📩 직접 HTML 수신 (기존 방식)');
  res.send('✅ 완료');
});

// Socket.IO 연결 (모니터링 대시보드용)
io.on('connection', (socket) => {
  console.log('📊 모니터링 클라이언트 연결');
  
  // 현재 상태 전송
  socket.emit('initial_status', coordinator.getSystemStatus());
  
  socket.on('disconnect', () => {
    console.log('📊 모니터링 클라이언트 연결 해제');
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`🚀 분산 크롤링 서버 실행: http://localhost:${PORT}`);
  console.log(`📊 실시간 모니터링: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket 서버: ws://localhost:${WSPORT}`);
  console.log(`📡 Socket.IO: http://localhost:${PORT}/socket.io/`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...');
  
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
  
  coordinator.wss.close();
  server.close();
  process.exit(0);
});
