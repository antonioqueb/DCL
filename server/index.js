import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
if (!fs.existsSync(path.join(config.dataDir, 'manifest.json'))) {
  if (config.demo) { const { seedDemo } = await import('./seed/demo.js'); await seedDemo(config); }
  else { console.error(`No hay datos en ${config.dataDir}.\nEjecute primero:  npm run setup   (crea la organización y el primer administrador)\nPara explorar con datos ficticios:  npm run demo`); process.exit(1); }
}
let app;
try { app = await buildApp(config); } catch (e) { console.error(`No fue posible abrir los datos: ${e.message}`); if (e.extra) console.error(JSON.stringify(e.extra, null, 1)); process.exit(1); }
const server = await app.listen(config.port, config.host);
console.log(`DCL Instalaciones · ${config.demo ? 'DEMOSTRACIÓN (datos ficticios)' : 'operación'} · http://${config.host}:${config.port} · datos en ${config.dataDir}`);
const stop = () => { server.close(); app.store.close(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
process.on('exit', () => app.store.close());
