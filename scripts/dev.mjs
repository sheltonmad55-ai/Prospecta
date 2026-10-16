import next from 'next';
import { createServer } from 'node:http';
const port=Number(process.env.PORT||4317);
const app=next({dev:process.env.NODE_ENV!=='production',hostname:'127.0.0.1',port,turbopack:false});
await app.prepare();
const handler=app.getRequestHandler();
createServer((req,res)=>handler(req,res)).listen(port,'127.0.0.1',()=>console.log(`Prospecta disponível em http://127.0.0.1:${port}`));
