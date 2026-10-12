// Respaldo desde la línea de comandos. Con el servidor detenido (una sola instancia escribe).
import { loadConfig } from '../server/config.js';
import { Store } from '../server/core/store.js';
import { AuthStore } from '../server/core/auth.js';
import { createBackup, listBackups, readBackup } from '../server/core/backup.js';
import path from 'node:path';
const args = process.argv.slice(2); const config = loadConfig(args);
if (args.includes('--list')) { console.table(listBackups(config.dataDir)); process.exit(0); }
const v = args.indexOf('--verify');
if (v >= 0) { const b = readBackup(path.join(config.dataDir, 'backups', args[v + 1])); console.log(b.problems.length ? b.problems : 'El respaldo supera la verificación de sumas, esquema, referencias y adjuntos.'); process.exit(b.problems.length ? 1 : 0); }
const store = Store.open(config.dataDir);
try { const r = createBackup(store, new AuthStore(config.dataDir), { by: 'línea de comandos' }); console.log(`Respaldo ${r.stamp}: ${r.files} archivos, ${r.blobs} adjuntos, ${r.bytes} bytes.`); } finally { store.close(); }
