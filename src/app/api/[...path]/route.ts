import { z, ZodError } from 'zod';
import { randomBytes } from 'node:crypto';
import { PROVINCES, STAGES } from '../../../lib/contracts.ts';
import { db, id, now, transaction } from '../../../server/db.ts';
import { AppError, audit, checkPassword, cookie, createSession, createUser, credits, encodeSignedSession, ensureUserAndWorkspace, getUser, getUserAsync, hash, passwordHash, rateLimit, requireUser, saveUserProfile, sessionToken, supabase, supabaseConfigured, userById } from '../../../server/auth.ts';
import { activity, cancelJob, dashboard, getAnalysis, getBusiness, grant, listLeads, listSearches, readJob, readSearch, requestAnalysis, saveLead, startSearch, startSearchAsync, syncLeadsFromSupabase } from '../../../server/service.ts';
import { mode, validPhone } from '../../../server/providers.ts';
import { parseCsv } from '../../../server/import.ts';
import { beginGoogleOAuth, completeGoogleOAuth, consumeGoogleFlow, flowCookie, googleConfigured, publicOrigin, recordConsent } from '../../../server/google-oauth.ts';
import { getAllVaultScripts, getVaultScriptsByCategory, searchVaultScripts, VAULT_CATEGORIES } from '../../../server/vault-scripts.ts';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
const reply=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
function isAuthorizedOrigin(origin: string, requestUrl: string): boolean {
  try {
    const o = new URL(origin);
    const r = new URL(requestUrl);
    if (o.origin === r.origin) return true;
    const isLocal = (h: string) => ['localhost', '127.0.0.1', '[::1]'].includes(h);
    if (isLocal(o.hostname) && isLocal(r.hostname) && (o.port || '80') === (r.port || '80')) return true;
    if (process.env.APP_URL && o.origin === new URL(process.env.APP_URL).origin) return true;
    return false;
  } catch {
    return false;
  }
}
async function handler(request:Request,context:Context):Promise<Response> {
 try {
  const {path}=await context.params;const route=path.join('/');const method=request.method;
  if(!['GET','HEAD'].includes(method)) {
   const origin=request.headers.get('origin');
   if(origin && !isAuthorizedOrigin(origin, request.url))throw new AppError('Origem do pedido não autorizada.',403);
   if(request.headers.get('sec-fetch-site')==='cross-site')throw new AppError('Pedido externo não autorizado.',403);
   if(Number(request.headers.get('content-length')||0)>500000)throw new AppError('Pedido demasiado grande.',413);
  }
  let input:unknown={};
  if(!['GET','HEAD'].includes(method)){const text=await request.text();if(text.length>500000)throw new AppError('Pedido demasiado grande.',413);try{input=text?JSON.parse(text):{};}catch{throw new AppError('Conteúdo do pedido inválido.');}}
  const current=await getUserAsync(request);
  if(route==='health' && method==='GET')return reply({status:'ok',mode:mode(),database:true});
  if(route==='vault' && method==='GET') {
   const query=new URL(request.url).searchParams;
   const q=query.get('q')||'';
   const category=query.get('category')||'';
   const scripts=searchVaultScripts(q, category);
   return reply({scripts,categories:VAULT_CATEGORIES,total:scripts.length});
  }
  if(route==='me' && method==='GET') {
    const user=current ? ensureUserAndWorkspace(current) : null;
    const token = user ? ((sessionToken(request).startsWith('ps_') ? sessionToken(request) : null) || encodeSignedSession(user.id)) : null;
    const headers: Record<string, string> = token ? { 'Set-Cookie': cookie(token, request) } : {};
    return reply({user,token,mode:mode(),capabilities:{demo:false,google:googleConfigured(),ai:!!process.env.GEMINI_API_KEY,data:process.env.APIFY_TOKEN?'authorized-dataset':'authorized-csv',payments:false,email:supabaseConfigured()?'supabase':'local-outbox'}}, 200, headers);
  }
  if(route.startsWith('auth/')) {
   const action=path[1];
   const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'local';
   rateLimit('auth:'+ip,35,60000);
   if(action==='google' && method==='POST') {
    const data=z.object({intent:z.enum(['login','register']),acceptedTerms:z.boolean().default(false),marketing:z.boolean().default(false),redirectTo:z.string().optional()}).parse(input);
    const result=await beginGoogleOAuth(request,data);
    const response=reply({redirectUrl:result.redirectUrl},200,{'Set-Cookie':result.cookie});
    if(result.pkceCookie) response.headers.append('Set-Cookie',result.pkceCookie);
    return response;
   }
   if(action==='callback' && method==='GET') {
    const query=new URL(request.url).searchParams;
    let destination='/?view=search';let session:string|undefined;
    try {
     if(query.has('error')){try{consumeGoogleFlow(request);}catch{}destination='/login?auth_error=google_cancelled';}
     else {const result=await completeGoogleOAuth(request,query.get('code')||'');session=result.token;}
    }catch(error){destination=error instanceof AppError&&error.status===409&&error.message.includes('termos')?'/cadastro?auth_error=google_terms':'/login?auth_error=google_failed';}
    const response=new Response(null,{status:303,headers:{Location:new URL(destination,publicOrigin(request)).href}});
    response.headers.append('Set-Cookie',flowCookie('',request));
    response.headers.set('Cache-Control','no-store');
    if(session)response.headers.append('Set-Cookie',cookie(session,request));
    return response;
   }
   if(action==='register' && method==='POST') {
    const data=z.object({name:z.string().trim().min(2).max(100),email:z.email().max(180).transform(s=>s.toLowerCase()),phone:z.string().trim().max(30).optional(),password:z.string().min(10).max(128),consent:z.boolean().optional(),acceptedTerms:z.literal(true)}).parse(input);
    if(data.phone&&!validPhone(data.phone))throw new AppError('Indique um número moçambicano válido, com +258.');
    if(mode()==='live' || supabaseConfigured()) {
     const client=supabase();
     const {data:auth,error}=await client.auth.signUp({
       email:data.email,
       password:data.password,
       options:{
         data:{
           name:data.name,
           phone:data.phone?validPhone(data.phone):'',
           marketing:!!data.consent,
           terms_version:'pilot-2026-10-16'
         },
         emailRedirectTo:process.env.APP_URL
       }
     });
     if(error)throw new AppError(error.message || 'Não foi possível criar a conta. Verifique os dados ou tente entrar.');
     if(!auth.user)throw new AppError('Não foi possível criar a conta.');
     if(!auth.session)return reply({confirmationRequired:true,message:'Confirme o seu e-mail e entre na sua conta.'});
     const user: import('@/lib/contracts').User = {
       id: auth.user.id,
       name: data.name,
       email: data.email,
       workspaceId: auth.user.id,
       role: 'owner',
       profile: { service: 'Criação de websites', pitch: '', province: '', phone: data.phone ? validPhone(data.phone) || '' : '', nationwide: true, onboarded: false },
       credits: { available: 20, reserved: 0, spent: 0 }
     };
     try {
       const local = userById(auth.user.id) || createUser(data.name, data.email, randomBytes(32).toString('hex'), !!data.consent, 'owner', auth.user.id);
       if (data.phone) db().prepare('UPDATE workspaces SET profile=? WHERE id=?').run(JSON.stringify({ ...local.profile, phone: validPhone(data.phone) }), local.workspaceId);
       recordConsent(local.id, !!data.consent, 'email');
     } catch {}
     const session = createSession(user.id, auth.session.access_token);
     return reply({user, token: session},200,{'Set-Cookie':cookie(session,request)});
    }
    if(db().prepare('SELECT id FROM users WHERE email=?').get(data.email))throw new AppError('Este e-mail já tem uma conta. Experimente entrar.');
    const user=createUser(data.name,data.email,data.password,!!data.consent);
    if(data.phone)db().prepare('UPDATE workspaces SET profile=? WHERE id=?').run(JSON.stringify({...user.profile,phone:validPhone(data.phone)}),user.workspaceId);
    recordConsent(user.id,!!data.consent,'email');
    const token=randomBytes(32).toString('hex');db().prepare('INSERT INTO auth_tokens VALUES(?,?,?,?,0)').run(hash(token),user.id,'confirm',new Date(Date.now()+86400000).toISOString());
    db().prepare('INSERT INTO outbox VALUES(?,?,?,?,?)').run(id(),user.id,'confirm',`/?confirm=${token}`,now());
    const session = createSession(user.id);
    return reply({user:userById(user.id),token:session,localConfirmation:true},200,{'Set-Cookie':cookie(session,request)});
   }
   if(action==='login' && method==='POST') {
    const data=z.object({email:z.email().transform(s=>s.toLowerCase()),password:z.string().min(1).max(128)}).parse(input);
    if(mode()==='live' || supabaseConfigured()) {
     const {data:auth,error}=await supabase().auth.signInWithPassword({email:data.email,password:data.password});
     if(error||!auth.user||!auth.session) {
       const msg = error?.message || '';
       if (msg.toLowerCase().includes('email not confirmed')) throw new AppError('Confirme o seu e-mail no Supabase antes de entrar.', 401);
       throw new AppError('E-mail ou palavra-passe incorrectos. Confirme também o seu e-mail.', 401);
     }
     const user: import('@/lib/contracts').User = {
       id: auth.user.id,
       name: auth.user.user_metadata?.name || auth.user.user_metadata?.full_name || data.email.split('@')[0],
       email: auth.user.email || data.email,
       workspaceId: auth.user.user_metadata?.workspaceId || auth.user.id,
       role: (auth.user.app_metadata?.role || auth.user.user_metadata?.role || 'owner') as import('@/lib/contracts').User['role'],
       profile: { service: 'Criação de websites', pitch: '', province: '', phone: '', nationwide: true, onboarded: false, ...(auth.user.user_metadata?.profile || {}) },
       credits: auth.user.user_metadata?.credits || { available: 20, reserved: 0, spent: 0 }
     };
     try {
       const local = userById(auth.user.id) || createUser(user.name, data.email, randomBytes(32).toString('hex'), false, user.role, auth.user.id);
       if (local) {
         user.workspaceId = local.workspaceId;
         user.profile = local.profile;
         user.credits = local.credits;
       }
     } catch {}
     const session = createSession(user.id, auth.session.access_token);
     return reply({user, token: session},200,{'Set-Cookie':cookie(session,request)});
    }
    const row=db().prepare('SELECT id,password_hash FROM users WHERE email=?').get(data.email) as {id:string,password_hash:string}|undefined;
    if(!row||!checkPassword(data.password,row.password_hash))throw new AppError('E-mail ou palavra-passe incorrectos.',401);
    const session = createSession(row.id);
    return reply({user:userById(row.id),token:session},200,{'Set-Cookie':cookie(session,request)});
   }
   if(action==='logout' && method==='POST') {
    try {
      db().prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(sessionToken(request)));
    } catch {}
    return reply({ok:true},200,{'Set-Cookie':cookie('',request)});
   }
   if(action==='recover' && method==='POST') {
    const data=z.object({email:z.email().transform(s=>s.toLowerCase())}).parse(input);
    if(mode()==='live'){await supabase().auth.resetPasswordForEmail(data.email,{redirectTo:process.env.APP_URL});}
    else {
     const row=db().prepare('SELECT id FROM users WHERE email=?').get(data.email) as {id:string}|undefined;
     // Recovery tokens remain in the local development outbox, never in a public response.
     if(row){const token=randomBytes(32).toString('hex');db().prepare('INSERT INTO auth_tokens VALUES(?,?,?,?,0)').run(hash(token),row.id,'reset',new Date(Date.now()+1800000).toISOString());db().prepare('INSERT INTO outbox VALUES(?,?,?,?,?)').run(id(),row.id,'reset',`/?reset=${token}`,now());}
    }
    return reply({message:'Se existir uma conta, será preparada uma ligação de recuperação. No modo local, consulte a caixa de mensagens na Conta.'});
   }
   if(action==='reset' && method==='POST') {
    if(mode()==='live') {
     const data=z.object({accessToken:z.string().min(20).max(6000),refreshToken:z.string().min(10).max(6000),password:z.string().min(10).max(128)}).parse(input);
     const client=supabase();const {data:session,error}=await client.auth.setSession({access_token:data.accessToken,refresh_token:data.refreshToken});
     if(error||!session.user)throw new AppError('Ligação de recuperação inválida ou expirada.');
     const {error:updateError}=await client.auth.updateUser({password:data.password});if(updateError)throw new AppError('Não foi possível actualizar a palavra-passe.');
     db().prepare('DELETE FROM sessions WHERE user_id=?').run(session.user.id);return reply({ok:true});
    }
    const data=z.object({token:z.string().length(64),password:z.string().min(10).max(128)}).parse(input);
    transaction(()=>{const token=db().prepare("SELECT user_id FROM auth_tokens WHERE token_hash=? AND kind='reset' AND used=0 AND expires_at>?").get(hash(data.token),now()) as {user_id:string}|undefined;if(!token)throw new AppError('Ligação inválida ou expirada.');db().prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(data.password),token.user_id);db().prepare('UPDATE auth_tokens SET used=1 WHERE token_hash=?').run(hash(data.token));db().prepare('DELETE FROM sessions WHERE user_id=?').run(token.user_id);});
    return reply({ok:true});
   }
   if(action==='confirm' && method==='POST') {
    const data=z.object({token:z.string().length(64)}).parse(input);const changed=db().prepare("UPDATE auth_tokens SET used=1 WHERE token_hash=? AND kind='confirm' AND used=0 AND expires_at>?").run(hash(data.token),now());if(!changed.changes)throw new AppError('Ligação inválida ou expirada.');return reply({ok:true});
   }
   throw new AppError('Operação não encontrada.',404);
  }
  const user=await requireUser(request);
  rateLimit(`user:${user.id}`,240,60000);
  if(route==='profile' && (method==='PUT' || method==='POST')) {
   const data=z.object({name:z.string().trim().min(2).max(100).optional(),service:z.string().min(2).max(120).default('Criação de websites'),pitch:z.string().max(1000).default(''),province:z.string().refine(s=>!s||PROVINCES.includes(s as typeof PROVINCES[number])).default(''),phone:z.string().max(30).default(''),nationwide:z.boolean().default(true),onboarded:z.boolean().default(true)}).parse(input);
   if(data.phone && !validPhone(data.phone))throw new AppError('Indique um número moçambicano válido, com +258.');
   const updatedUser = await saveUserProfile(user.id, {
     name: data.name,
     service: data.service,
     pitch: data.pitch,
     province: data.province,
     phone: data.phone ? validPhone(data.phone) || '' : '',
     nationwide: data.nationwide,
     onboarded: data.onboarded
   });
   const token = sessionToken(request);
   const headers: Record<string, string> = token ? { 'Set-Cookie': cookie(token, request) } : {};
   return reply({ success: true, user: updatedUser }, 200, headers);
  }
  if(route==='profile')return reply({ success: true, user, profile: user.profile });
  if(route==='dashboard' && method==='GET')return reply(dashboard(user));
  if(route==='locations' && method==='GET')return reply({locations:db().prepare('SELECT * FROM locations').all(),catalogue:'Unidades de primeiro nível; localidades pesquisáveis por texto. Não é um catálogo completo de distritos.'});
  if(route==='searches' && method==='GET')return reply({searches:listSearches(user)});
  if(route==='searches' && method==='POST') {
   rateLimit('search:'+user.id,20,60000);
   const filters=z.object({
     province:z.string().refine(s=>!s||PROVINCES.includes(s as typeof PROVINCES[number])).optional().default(''),
     locality:z.string().trim().max(120).optional().default(''),
     category:z.string().max(120).optional().default(''),
     service:z.string().max(120).default('Criação de websites'),
     budget:z.number().int().min(1).max(11).optional(),
     niche:z.string().trim().max(200).optional().default(''),
     cities:z.string().trim().max(200).optional().default(''),
     phone:z.string().optional().default('all'),
     website:z.string().optional().default('all'),
     instagram:z.string().optional().default('all')
   }).parse(input);
   const result = await startSearchAsync(user, filters);
   return reply(result, 200);
  }
  if(path[0]==='searches' && path[1] && method==='GET') {
   try {
    return reply(readSearch(user,path[1],Number(new URL(request.url).searchParams.get('page'))||1));
   } catch (err) {
    if (err instanceof AppError && err.status === 404) {
      return reply({ id: path[1], status: 'failed', filters: { service: user.profile?.service || 'Criação de websites' }, tasks: [], results: [], total: 0, page: 1, pages: 1, createdAt: now(), mode: mode() });
    }
    throw err;
   }
  }
  if(path[0]==='businesses' && path[1] && method==='GET') {
   const bId = path[1];
   let biz: import('@/lib/contracts').Business;
   try {
    biz = getBusiness(bId, user);
   } catch (err) {
    const bParam = new URL(request.url).searchParams.get('b');
    if (bParam) {
      try {
        const parsed = JSON.parse(Buffer.from(decodeURIComponent(bParam), 'base64').toString('utf-8')) as import('@/lib/contracts').Business;
        if (parsed && parsed.id === bId) {
          db().prepare('INSERT OR REPLACE INTO businesses VALUES(?,?,?,?)').run(bId, JSON.stringify(parsed), 'live', now());
          biz = parsed;
        } else {
          throw err;
        }
      } catch {
        throw err;
      }
    } else {
      throw err;
    }
   }
   return reply({business:biz,analysis:getAnalysis(user,bId),lead:listLeads(user).find(l=>l.businessId===bId)||null});
  }
  if(route==='analyses' && method==='POST') {
   const data=z.object({businessId:z.string().max(100),tone:z.enum(['Profissional','Amigável','Consultivo']).default('Profissional'),service:z.string().max(120).default(''),fresh:z.boolean().optional()}).parse(input);
   const key=request.headers.get('idempotency-key');if(!key||key.length>100)throw new AppError('É necessária uma chave de operação válida.');
   return reply(requestAnalysis(user,data.businessId,data.tone,data.service,key,!!data.fresh),202);
  }
  if(path[0]==='jobs' && path[1]) {if(path[2]==='cancel' && method==='POST')return reply(cancelJob(user,path[1]));if(method==='GET')return reply(readJob(user,path[1]));}
  if(path[0]==='drafts' && path[1] && method==='PATCH') {
   const {body}=z.object({body:z.string().min(1).max(6000)}).parse(input);
   const row=db().prepare('SELECT business_id FROM analyses WHERE id=? AND workspace_id=?').get(path[1],user.workspaceId) as {business_id:string}|undefined;if(!row)throw new AppError('Mensagem não encontrada.',404);
   if(getBusiness(row.business_id,user).suppressed)throw new AppError('Este contacto está marcado para não contactar.',409);
   db().prepare('UPDATE analyses SET draft=? WHERE id=? AND workspace_id=?').run(body,path[1],user.workspaceId);return reply({analysis:getAnalysis(user,row.business_id)});
  }
  if(route==='leads' && method==='GET') { await syncLeadsFromSupabase(user); return reply({leads:listLeads(user)}); }
  if(route==='leads' && method==='POST'){const {businessId}=z.object({businessId:z.string()}).parse(input);return reply({lead:saveLead(user,businessId)});}
  if(path[0]==='leads' && path[1]) {
   const lead=listLeads(user).find(l=>l.id===path[1]);if(!lead)throw new AppError('Oportunidade não encontrada.',404);
   if(path[2]==='activities' && method==='POST'){const data=z.object({type:z.enum(['note','contact_confirmed','response_reported','copied','whatsapp_opened']),note:z.string().min(1).max(2000)}).parse(input);activity(user,lead.id,data.type,data.note);return reply({ok:true});}
   if(method==='PATCH') {
    const data=z.object({stage:z.enum(STAGES).optional(),note:z.string().max(4000).optional(),nextAction:z.string().max(300).optional(),nextActionAt:z.string().datetime().nullable().optional(),amountMinor:z.number().int().nonnegative().max(100000000000).nullable().optional()}).parse(input);
    const next={...lead,...data};transaction(()=>{db().prepare('UPDATE leads SET stage=?,note=?,next_action=?,next_action_at=?,amount_minor=? WHERE workspace_id=? AND id=?').run(next.stage,next.note,next.nextAction,next.nextActionAt,next.amountMinor,user.workspaceId,lead.id);activity(user,lead.id,'updated',data.stage&&data.stage!==lead.stage?`Etapa alterada para ${data.stage}.`:'Detalhes e seguimento actualizados.');});return reply({lead:listLeads(user).find(l=>l.id===lead.id)});
   }
  }
  if(route==='usage')return reply({credits:credits(user.workspaceId),entries:db().prepare('SELECT id,kind,units,created_at as createdAt,description FROM credit_entries WHERE workspace_id=? ORDER BY created_at DESC').all(user.workspaceId)});
  if(route==='suppressions' && method==='POST') {const data=z.object({businessId:z.string(),reason:z.string().min(3).max(500)}).parse(input);getBusiness(data.businessId,user);db().prepare('INSERT INTO suppressions VALUES(?,?,?,?) ON CONFLICT(workspace_id,business_id) DO UPDATE SET reason=excluded.reason').run(user.workspaceId,data.businessId,data.reason,now());audit(user,'contact.suppressed',data.businessId);return reply({ok:true});}
  if(route==='corrections' && method==='POST') {const data=z.object({businessId:z.string(),note:z.string().min(3).max(1000)}).parse(input);getBusiness(data.businessId,user);db().prepare('INSERT INTO corrections VALUES(?,?,?,?,?,?)').run(id(),user.workspaceId,data.businessId,data.note,'pending',now());return reply({ok:true});}
  if(route==='outbox' && method==='GET')return reply({messages:[]});
  if(route==='privacy' && method==='GET')return reply({requests:db().prepare('SELECT * FROM privacy_requests WHERE workspace_id=? ORDER BY created_at DESC').all(user.workspaceId)});
  if(route==='privacy' && method==='POST') {const {type}=z.object({type:z.enum(['export','delete'])}).parse(input);const requestId=id();db().prepare('INSERT INTO privacy_requests VALUES(?,?,?,?,?,?)').run(requestId,user.workspaceId,type,type==='export'?'ready':'pending',now(),type==='export'?now():null);return reply({request:{id:requestId,type,status:type==='export'?'ready':'pending'}});}
  if(path[0]==='privacy' && path[2]==='export' && method==='GET') {
   const row=db().prepare("SELECT id FROM privacy_requests WHERE id=? AND workspace_id=? AND type='export'").get(path[1],user.workspaceId);if(!row)throw new AppError('Exportação não encontrada.',404);
   return reply({profile:{name:user.name,email:user.email,...user.profile},opportunities:listLeads(user),usage:db().prepare('SELECT kind,units,description,created_at FROM credit_entries WHERE workspace_id=?').all(user.workspaceId),analyses:db().prepare('SELECT data,draft,created_at FROM analyses WHERE workspace_id=?').all(user.workspaceId),suppressions:db().prepare('SELECT business_id,reason,created_at FROM suppressions WHERE workspace_id=?').all(user.workspaceId),exportedAt:now()},200,{'Content-Disposition':'attachment; filename="prospecta-exportacao.json"'});
  }
  if(path[0]==='admin') {
   if(user.role!=='admin')throw new AppError('Acesso reservado à administração.',403);
   if(route==='admin' && method==='GET')return reply({workspaces:db().prepare('SELECT w.id,u.name,u.email FROM workspaces w JOIN users u ON w.user_id=u.id').all(),jobs:db().prepare('SELECT id,kind,status,attempts,error,created_at as createdAt FROM jobs ORDER BY created_at DESC LIMIT 30').all(),requests:db().prepare('SELECT * FROM privacy_requests ORDER BY created_at DESC LIMIT 50').all(),corrections:db().prepare('SELECT * FROM corrections ORDER BY created_at DESC LIMIT 50').all(),mode:mode()});
   if(route==='admin/import' && method==='POST') {
    const data=z.object({csv:z.string().min(1).max(400000),source:z.string().min(3).max(150),authorized:z.literal(true)}).parse(input);const rows=parseCsv(data.csv,data.source);
    transaction(()=>{for(const b of rows)db().prepare('INSERT INTO businesses VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(b.id,JSON.stringify(b),'authorized-csv',now());audit(user,'businesses.import',String(rows.length));});return reply({imported:rows.length});
   }
   if(route==='admin/grant' && method==='POST') {const data=z.object({workspaceId:z.string(),units:z.number().int().min(1).max(10000),reason:z.string().min(3).max(300)}).parse(input);grant(user,data.workspaceId,data.units,data.reason);return reply({ok:true});}
   if(path[1]==='jobs' && path[3]==='retry' && method==='POST')throw new AppError('A análise falhada libertou o crédito. Inicie uma nova análise na ficha da empresa.');
   if(path[1]==='corrections' && path[3]==='complete' && method==='POST'){db().prepare("UPDATE corrections SET status='reviewed' WHERE id=?").run(path[2]);audit(user,'correction.reviewed',path[2]);return reply({ok:true});}
   if(path[1]==='privacy' && path[3]==='complete' && method==='POST') {
    const row=db().prepare('SELECT * FROM privacy_requests WHERE id=?').get(path[2]) as {workspace_id:string,type:string}|undefined;if(!row)throw new AppError('Pedido não encontrado.',404);
    if(row.type==='delete')transaction(()=>{const owner=db().prepare('SELECT user_id FROM workspaces WHERE id=?').get(row.workspace_id) as {user_id:string};db().prepare('DELETE FROM users WHERE id=?').run(owner.user_id);audit(user,'privacy.deleted',path[2]);});
    else db().prepare("UPDATE privacy_requests SET status='completed',completed_at=? WHERE id=?").run(now(),path[2]);return reply({ok:true});
   }
  }
  throw new AppError('Página ou operação não encontrada.',404);
 } catch(error) {
  if(error instanceof ZodError)return reply({error:'Verifique os campos: '+error.issues.map(i=>i.path.join('.')||i.message).join(', ')},422);
  if(error instanceof AppError)return reply({error:error.message},error.status);
  console.error('[prospecta] request failed:', error instanceof Error ? `${error.name}: ${error.message}` : error);
  return reply({error:'Não foi possível concluir o pedido. Tente novamente.'},500);
 }
}
export {handler as GET,handler as POST,handler as PUT,handler as PATCH,handler as DELETE};
