import { workerTick } from '../src/server/service.ts';
let stopping=false;
process.on('SIGINT',()=>{stopping=true;});
process.on('SIGTERM',()=>{stopping=true;});
console.log('Prospecta: processador de tarefas iniciado.');
while(!stopping){try{await workerTick();}catch(error){console.error('Falha do processador:',error instanceof Error?error.message:'erro desconhecido');}await new Promise(resolve=>setTimeout(resolve,600));}
