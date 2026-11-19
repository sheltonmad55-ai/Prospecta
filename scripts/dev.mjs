import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import next from 'next';
import { createServer } from 'node:http';
const port=Number(process.env.PORT||4317);
const app=next({dev:process.env.NODE_ENV!=='production',hostname:'127.0.0.1',port,turbopack:false});
await app.prepare();
const handler=app.getRequestHandler();
createServer((req,res)=>handler(req,res)).listen(port,'127.0.0.1',()=>console.log(`Prospecta disponível em http://127.0.0.1:${port}`));
