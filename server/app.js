// Composición de la aplicación: almacenamiento, autenticación y módulos de la API.
import fs from 'node:fs';
import path from 'node:path';
import { Store } from './core/store.js';
import { AuthStore } from './core/auth.js';
import { createApp } from './core/http.js';

const MODULES = ['admin', 'catalogs', 'works', 'progress', 'attachments', 'additionals', 'cestimates', 'closes', 'payments', 'budgets', 'kestimates', 'receivables', 'expenses', 'cash', 'supplies', 'reports', 'analytics', 'documents', 'imports', 'exports'];

export async function buildApp(config, { create = null } = {}) {
  const store = Store.open(config.dataDir, { create, keepGenerations: config.keepGenerations });
  if (config.demo !== (store.dataset === 'demo')) { store.close(); throw new Error(`La carpeta ${config.dataDir} contiene datos de "${store.dataset}" y el servidor se inició en modo ${config.demo ? 'demostración' : 'operación'}. No se mezclan.`); }
  const auth = new AuthStore(config.dataDir);
  const app = createApp({ store, auth, config, webDir: config.webDir });
  for (const m of MODULES) {
    const file = path.join(config.root, 'server', 'usecases', `${m}.js`);
    if (!fs.existsSync(file)) continue;
    (await import(file)).register(app);
  }
  return app;
}
