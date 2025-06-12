#!/usr/bin/env node

// group-mk 프로젝트와 동일한 방식으로 routes.json 생성
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Creating routes.json...');

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

const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

fs.writeFileSync(path.join(distPath, '_routes.json'), JSON.stringify(routes, null, 2));
console.log('routes.json created successfully');

// 기존 generate-routes.js와 동일한 기능 수행
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  const publicRoutesPath = path.join(publicDir, '_routes.json');
  fs.writeFileSync(publicRoutesPath, JSON.stringify(routes, null, 2));
}