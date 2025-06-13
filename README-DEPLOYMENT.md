# Ubuntu 서버 배포 가이드

이 문서는 CloudFlare Worker 기반 크롤링 시스템을 Ubuntu 서버에 배포하는 방법을 설명합니다.

## 배포 옵션

### 옵션 1: Docker Compose 사용 (권장)

1. **서버 준비**
   ```bash
   # Docker 및 Docker Compose 설치
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **프로젝트 클론**
   ```bash
   git clone https://github.com/your-repo/crawling-system.git
   cd crawling-system
   ```

3. **환경 설정**
   ```bash
   cp .env.example .env
   # .env 파일 편집하여 설정 수정
   nano .env
   ```

4. **Docker Compose 실행**
   ```bash
   docker-compose up -d
   ```

5. **로그 확인**
   ```bash
   docker-compose logs -f
   ```

### 옵션 2: 시스템드 서비스로 직접 실행

1. **배포 스크립트 실행**
   ```bash
   cd crawling-system
   ./deploy.sh
   ```

2. **환경 설정**
   ```bash
   nano .env
   # 필요한 설정 수정
   ```

3. **서비스 시작**
   ```bash
   sudo systemctl start crawling-system
   sudo systemctl enable crawling-system
   ```

## 주요 설정 파일

### .env 설정
- `PORT`: API 서버 포트 (기본: 3000)
- `WS_PORT`: WebSocket 서버 포트 (기본: 3001)
- `USE_REDIS`: Redis 사용 여부 (분산 시스템용)
- `MAX_CONCURRENT_CRAWLERS`: 동시 크롤러 수 제한

### Nginx 설정
- 리버스 프록시로 API와 WebSocket 라우팅
- Rate limiting 적용
- SSL/TLS 지원

## 모니터링

1. **Crontab 설정**
   ```bash
   crontab -e
   # crontab.example 내용 추가
   ```

2. **로그 확인**
   ```bash
   # 시스템드 로그
   sudo journalctl -u crawling-system -f
   
   # 애플리케이션 로그
   tail -f logs/app.log
   ```

3. **상태 확인**
   ```bash
   # 서비스 상태
   sudo systemctl status crawling-system
   
   # 헬스체크
   curl http://localhost:3000/health
   ```

## 보안 권장사항

1. **방화벽 설정**
   - 필요한 포트만 오픈 (80, 443)
   - 내부 포트는 로컬호스트만 접근 가능하도록 설정

2. **SSL 인증서**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **API 키 설정**
   - .env 파일에서 API_KEY 설정
   - 모든 API 요청에 인증 적용

## 성능 최적화

1. **Redis 사용**
   - 분산 환경에서 상태 공유
   - 캐싱으로 성능 향상

2. **Worker 프로세스**
   - PM2 또는 cluster 모듈 사용
   - CPU 코어당 1개 프로세스 권장

3. **리소스 제한**
   - systemd 서비스 파일에서 메모리/CPU 제한 설정
   - Docker compose에서 리소스 제한 설정

## 문제 해결

### 서비스가 시작되지 않을 때
```bash
sudo journalctl -u crawling-system -n 100
```

### 포트가 이미 사용 중일 때
```bash
sudo lsof -i :3000
# 프로세스 종료 후 재시작
```

### 메모리 부족
- .env에서 MAX_CONCURRENT_CRAWLERS 줄이기
- swap 메모리 추가

## 백업 및 복구

1. **자동 백업** (crontab에 추가됨)
   - 매일 로그 정리
   - 주간 데이터베이스 백업

2. **수동 백업**
   ```bash
   tar -czf backup-$(date +%Y%m%d).tar.gz \
     --exclude=node_modules \
     --exclude=logs \
     .
   ```

## 업데이트

1. **코드 업데이트**
   ```bash
   git pull origin main
   npm ci --production
   sudo systemctl restart crawling-system
   ```

2. **무중단 배포** (Docker 사용 시)
   ```bash
   docker-compose pull
   docker-compose up -d --no-deps --build app
   ```