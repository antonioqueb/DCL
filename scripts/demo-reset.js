// Reconstruye el conjunto de demostración (solo esa carpeta; nunca toca datos de operación).
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../server/config.js';
const config = loadConfig(['--demo']);
const mf = path.join(config.dataDir, 'manifest.json');
if (fs.existsSync(mf)) {
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (m.dataset !== 'demo') { console.error(`La carpeta ${config.dataDir} NO es de demostración (contiene "${m.dataset}"). No se borra nada.`); process.exit(1); }
  const lf = path.join(config.dataDir, 'instance.lock'); let busy = false;
  if (fs.existsSync(lf)) { try { const l = JSON.parse(fs.readFileSync(lf, 'utf8')); process.kill(l.pid, 0); busy = true; } catch (e) { busy = e.code === 'EPERM'; } }
  if (busy) { console.error('Hay un servidor usando la demostración. Deténgalo o use el reinicio desde Configuración.'); process.exit(1); }
  fs.rmSync(config.dataDir, { recursive: true, force: true });
}
const { seedDemo } = await import('../server/seed/demo.js');
await seedDemo(config);
console.log(`Demostración lista en ${config.dataDir}. Inicie con: npm run demo`);
