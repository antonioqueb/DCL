// Restauración controlada. Uso:
//   node scripts/restore.js <respaldo> --into <carpeta-vacía>    prueba aislada (recomendado primero)
//   node scripts/restore.js <respaldo> --confirmar               sobre los datos vigentes (crea respaldo previo)
// Agregue --demo para trabajar con el conjunto de demostración. Requiere el servidor detenido.
import path from 'node:path';
import { loadConfig } from '../server/config.js';
import { Store, validateAll } from '../server/core/store.js';
import { AuthStore } from '../server/core/auth.js';
import { restoreBackup, restoreInto, readBackup } from '../server/core/backup.js';
const args = process.argv.slice(2); const config = loadConfig(args); const stamp = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--into');
if (!stamp) { console.error('Indique el respaldo. Liste los disponibles con: npm run backup -- --list'); process.exit(1); }
const dir = path.join(config.dataDir, 'backups', stamp); const check = readBackup(dir);
if (check.problems.length) { console.error('El respaldo NO supera la validación. No se restauró nada.', check.problems.slice(0, 20)); process.exit(1); }
const into = args.indexOf('--into');
if (into >= 0) { const { store } = restoreInto(dir, path.resolve(args[into + 1]), AuthStore); const p = validateAll(store.view()); console.log(`Restaurado en ${args[into + 1]} (entorno de prueba). Problemas de integridad: ${p.length}. Auditoría: ${JSON.stringify(store.verifyAudit())}`); store.close(); process.exit(0); }
if (!args.includes('--confirmar')) { console.error('Para restaurar sobre los datos vigentes agregue --confirmar. Sugerencia: pruebe antes con --into <carpeta>.'); process.exit(1); }
const store = Store.open(config.dataDir);
try { const r = restoreBackup(store, new AuthStore(config.dataDir), stamp, { by: 'línea de comandos' }); console.log(`Restaurado ${r.restored}. Respaldo previo conservado: ${r.previousBackup}.`); } finally { store.close(); }
