// Exporta el paquete portable (o lo carga en una carpeta aislada con --import <zip> --into <carpeta> [--csv]).
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../server/config.js';
import { Store, validateAll } from '../server/core/store.js';
import { exportPackage, importPackageInto } from '../server/core/package.js';
const args = process.argv.slice(2); const config = loadConfig(args); const i = args.indexOf('--import');
if (i >= 0) { const target = path.resolve(args[args.indexOf('--into') + 1]); const { store, manifest } = await importPackageInto(fs.readFileSync(args[i + 1]), target, { source: args.includes('--csv') ? 'csv' : 'json' }); console.log(`Paquete (${manifest.dataset}) cargado en ${target}. Problemas: ${validateAll(store.view()).length}. Auditoría: ${JSON.stringify(store.verifyAudit())}`); store.close(); process.exit(0); }
const store = Store.open(config.dataDir, { readOnly: true });
const { buffer, manifest } = await exportPackage(store, { by: 'línea de comandos' });
const out = path.resolve(args.find((a) => a.endsWith('.zip')) || `dcl-paquete-${manifest.dataset}-${manifest.exportedAt.slice(0, 10)}.zip`);
fs.writeFileSync(out, buffer); console.log(`Paquete escrito en ${out} (${buffer.length} bytes, ${Object.keys(manifest.files).length} archivos).`);
