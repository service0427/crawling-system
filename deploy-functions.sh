#!/bin/bash

# CloudFlare Pages Functions 배포 스크립트 (group-mk 스타일)

echo "📦 Building for CloudFlare Pages..."

# dist 디렉토리 정리 및 생성
rm -rf dist
mkdir -p dist

# public 디렉토리의 정적 파일 복사 (index.html 제외)
if [ -d "public" ]; then
  echo "📄 Copying static files from public..."
  # index.html을 제외하고 복사
  find public -maxdepth 1 -type f ! -name "index.html" -exec cp {} dist/ \; 2>/dev/null || true
  # 하위 디렉토리는 그대로 복사
  find public -mindepth 1 -type d -exec cp -r {} dist/ \; 2>/dev/null || true
fi

# Functions 디렉토리 복사
if [ -d "functions" ]; then
  echo "⚡ Copying CloudFlare Functions..."
  cp -r functions dist/
fi

# Routes 파일 생성
echo "🛣️ Creating routes configuration..."
node scripts/create-routes-json.js

echo "✅ Build complete! Use 'wrangler pages deploy' to deploy."

# 참고: package.json의 deploy:pages:prod 스크립트는 --project-name crawling-system을 사용합니다