import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { db, id, now, transaction } from './db.ts';
import { mode } from './providers.ts';
import type { Credits, Profile, User } from '../lib/contracts.ts';

export class AppError extends Error { status:number;constructor(message:string,status=400){super(message);this.status=status;} }
export const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export function passwordHash(password:string) { const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
export function checkPassword(password:string,stored:string) {const [salt,encoded]=stored.split(':');if(!salt || !encoded) return false;const buffer=Buffer.from(encoded,'hex');return buffer.length===64 && timingSafeEqual(buffer,scryptSync(password,salt,64));}
export const defaultProfile:Profile={service:'Criação de websites',pitch:'',province:'',phone:'',nationwide:true,onboarded:false};
export function credits(workspaceId:string):Credits {
 const rows=db().prepare('SELECT kind,COALESCE(SUM(units),0) as total FROM credit_entries WHERE workspace_id=? GROUP BY kind').all(workspaceId) as {kind:string,total:number}[];
 const sums=Object.fromEntries(rows.map(r=>[r.kind,r.total]));const spent=sums.consume||0;const reserved=(sums.reserve||0)-(sums.release||0)-spent;
 return {available:(sums.grant||0)-spent-reserved,reserved,spent};
}
export function userById(userId:string):User|null {
 const row=db().prepare('SELECT u.*,w.id as workspace_id,w.profile FROM users u JOIN workspaces w ON w.user_id=u.id WHERE u.id=?').get(userId) as Record<string,string>|undefined;
 if(!row) return null;
 return {id:row.id,name:row.name,email:row.email,workspaceId:row.workspace_id,role:row.role as User['role'],profile:{...defaultProfile,...JSON.parse(row.profile)},credits:credits(row.workspace_id)};
}
export function createUser(name:string,email:string,password:string,marketing=false,role:'owner'|'admin'='owner',userId:string=id()) {
 return transaction(()=>{
  const workspaceId=id();const timestamp=now();
  db().prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(userId,name,email.toLowerCase(),passwordHash(password),role,marketing?1:0,timestamp);
  db().prepare('INSERT INTO workspaces VALUES(?,?,?,?)').run(workspaceId,userId,JSON.stringify(defaultProfile),timestamp);
  db().prepare('INSERT INTO credit_entries VALUES(?,?,?,?,?,?,?)').run(id(),workspaceId,null,'grant',20,'Créditos de boas-vindas do piloto',timestamp);
  return userById(userId)!;
 });
}
export function createSession(userId:string,providerToken?:string) {
 const token=randomBytes(32).toString('hex');const expires=new Date(Date.now()+(mode()==='live'?3600:7*86400)*1000).toISOString();
 // The provider access token is kept only in the opaque server-side session and never returned in API data.
 db().exec('CREATE TABLE IF NOT EXISTS provider_sessions(token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,access_token TEXT NOT NULL)');
 db().prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),userId,expires);
 if(providerToken) db().prepare('INSERT INTO provider_sessions VALUES(?,?)').run(hash(token),providerToken);
 return token;
}
export function sessionToken(request:Request) {return request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('prospecta_session='))?.split('=')[1]||'';}
export function getUser(request:Request):User|null {
 const token=sessionToken(request);if(!token) return null;
 const session=db().prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token),now()) as {user_id:string}|undefined;
 return session?userById(session.user_id):null;
}
export async function requireUser(request:Request) {
 const user=getUser(request);if(!user) throw new AppError('Entre na sua conta para continuar.',401);
 if(mode()==='live') {
  const provider=db().prepare('SELECT access_token FROM provider_sessions WHERE token_hash=?').get(hash(sessionToken(request))) as {access_token:string}|undefined;
  if(!provider) throw new AppError('A sessão de produção expirou. Entre novamente.',401);
  const {data,error}=await supabase().auth.getUser(provider.access_token);
  if(error || data.user?.id!==user.id) throw new AppError('A sessão expirou. Entre novamente.',401);
 }
 return user;
}
export function supabase() {
 const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_ANON_KEY;
 if(!url || !key) throw new AppError('Autenticação real não configurada. Defina as credenciais do Supabase.',503);
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function cookie(token:string,request:Request) {return `prospecta_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token?mode()==='live'?3600:604800:0}${new URL(process.env.APP_URL||request.url).protocol==='https:'?'; Secure':''}`;}
export function rateLimit(key:string,limit=30,windowMs=60000) {
 transaction(()=>{
  const time=Date.now();const row=db().prepare('SELECT count,reset_at FROM rate_limits WHERE key=?').get(key) as {count:number,reset_at:number}|undefined;
  if(!row || row.reset_at<time) db().prepare('INSERT INTO rate_limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,reset_at=excluded.reset_at').run(key,1,time+windowMs);
  else {if(row.count>=limit) throw new AppError('Muitos pedidos. Aguarde um momento antes de tentar novamente.',429);db().prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key);}
 });
}
export function audit(user:User,action:string,targetId:string) {db().prepare('INSERT INTO audit_events VALUES(?,?,?,?,?,?)').run(id(),user.id,user.workspaceId,action,targetId,now());}
