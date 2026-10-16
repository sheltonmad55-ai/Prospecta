import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',timeout:60000,fullyParallel:false,workers:1,
 use:{baseURL:process.env.PROSPECTA_TEST_URL||'http://127.0.0.1:4317',trace:'retain-on-failure',screenshot:'only-on-failure',viewport:{width:1440,height:1000},launchOptions:{args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']}},
 reporter:[['list'],['html',{open:'never'}]]
});
