import { createHash } from 'node:crypto';
import { PROVINCES } from '../lib/contracts.ts';
import type { Business } from '../lib/contracts.ts';
import { AppError } from './auth.ts';
import { now } from './db.ts';
import { validPhone } from './providers.ts';

export function parseCsv(csv:string,source:string):Business[] {
 const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false;
 for(let i=0;i<csv.length;i++){const ch=csv[i];if(ch==='"'){if(quoted&&csv[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(field);field='';}else if(ch==='\n'&&!quoted){row.push(field.replace(/\r$/,''));if(row.some(s=>s.trim()))rows.push(row);row=[];field='';}else field+=ch;}
 if(quoted)throw new AppError('CSV com aspas não fechadas.');if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
 const header=rows.shift()?.map(s=>s.trim().replace(/^\uFEFF/,''));if(!header)throw new AppError('CSV vazio.');
 for(const key of ['name','category','province','locality','sourceId'])if(!header.includes(key))throw new AppError('Falta a coluna '+key+'.');
 if(rows.length>500)throw new AppError('Importe até 500 linhas por operação.');
 const stamp=now();
 return rows.map((values,index)=>{
  const data=Object.fromEntries(header.map((key,i)=>[key,values[i]?.trim()||'']));
  if(values.length!==header.length)throw new AppError(`Linha ${index+2}: número de colunas incorrecto.`);
  if(!data.name||data.name.length>160||!data.category||data.category.length>120||!data.sourceId||!PROVINCES.includes(data.province as typeof PROVINCES[number]))throw new AppError(`Linha ${index+2}: nome, categoria, origem ou província inválidos.`);
  if(data.countryCode && data.countryCode!=='MZ')throw new AppError(`Linha ${index+2}: país deve ser MZ.`);
  if(data.phone&&!validPhone(data.phone))throw new AppError(`Linha ${index+2}: telefone inválido.`);
  if(data.website){try{const u=new URL(data.website);if(!['http:','https:'].includes(u.protocol))throw new Error();}catch{throw new AppError(`Linha ${index+2}: endereço de site inválido.`);}}
  const businessId='import-'+createHash('sha256').update(source+'|'+data.sourceId).digest('hex').slice(0,24);
  return {id:businessId,name:data.name,category:data.category,province:data.province,locality:data.locality,description:data.description||'',phone:data.phone?validPhone(data.phone):null,website:data.website||null,source,observedAt:stamp,isDemo:false,evidence:[{id:businessId+'-name',field:'name',value:data.name,source,observedAt:stamp},{id:businessId+'-location',field:'location',value:data.locality+', '+data.province,source,observedAt:stamp},{id:businessId+'-category',field:'category',value:data.category,source,observedAt:stamp}]};
 });
}
