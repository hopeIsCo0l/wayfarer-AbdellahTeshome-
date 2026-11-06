import { resolve } from 'node:path';
import express from 'express';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
const db=openDatabase();
try { db.prepare('SELECT id FROM places LIMIT 1').get(); } catch { console.error('Run npm run seed first.'); db.close(); process.exit(1); }
const app=createApp(db);
if(process.argv.includes('--production')) {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/index.html')));
} else {
  const {createServer}=await import('vite');
  const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
}
const server=app.listen(3000,'127.0.0.1',()=>console.log('Wayfarer: http://localhost:3000'));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
