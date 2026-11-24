import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',workers:1,use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4337',viewport:{width:1280,height:900},reducedMotion:'reduce'},reporter:'list',webServer:{command:'npm run preview',url:'http://127.0.0.1:4337',reuseExistingServer:!process.env.CI}});
