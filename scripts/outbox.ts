import { db } from '../src/server/db.ts';
const email=process.argv[2];if(!email){console.error('Indique o e-mail da conta local.');process.exit(1);}
if(process.env.PROSPECTA_MODE==='live'){console.error('Caixa local indisponível no modo real.');process.exit(1);}
console.log(db().prepare('SELECT o.kind,o.link,o.created_at FROM outbox o JOIN users u ON u.id=o.user_id WHERE u.email=? ORDER BY o.created_at DESC').all(email.toLowerCase()));
