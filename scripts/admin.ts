import { db, id, now } from '../src/server/db.ts';
const email=process.argv[2];
if(!email){console.error('Uso: node --experimental-strip-types scripts/admin.ts email@dominio.com');process.exit(1);}
const row=db().prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase()) as {id:string}|undefined;
if(!row){console.error('Conta não encontrada. Crie a conta primeiro.');process.exit(1);}
db().prepare("UPDATE users SET role='admin' WHERE id=?").run(row.id);
db().prepare('INSERT INTO audit_events VALUES(?,?,?,?,?,?)').run(id(),'local-operator',null,'admin.provisioned',row.id,now());
console.log('Permissão administrativa atribuída pelo operador local.');
