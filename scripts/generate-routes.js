#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CloudFlare Pages 라우팅 설정 생성
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/assets/*",
    "/*.css",
    "/*.js",
    "/*.ico",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.svg",
    "/*.woff",
    "/*.woff2",
    "/*.ttf",
    "/*.eot"
  ]
};

// public 디렉토리가 없으면 생성
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// _routes.json 파일 생성
const routesPath = path.join(publicDir, '_routes.json');
fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));

console.log('✅ Generated _routes.json');

// dist 디렉토리가 있으면 거기에도 복사
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  const distRoutesPath = path.join(distDir, '_routes.json');
  fs.copyFileSync(routesPath, distRoutesPath);
  console.log('✅ Copied _routes.json to dist/');
}