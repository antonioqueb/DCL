// Exportación del paquete portable y reinicio seguro del conjunto de demostración.
import fs from 'node:fs';
import path from 'node:path';
import { exportPackage, dictionary } from '../core/package.js';
import { forbidden, notFound } from '../core/errors.js';
import { requireReason } from './common.js';

export function register(app) {
  const { store, auth, config } = app;
  app.post('/api/admin/export', async (c) => {
    requireReason(c.body, 'la exportación del paquete');
    const { buffer, manifest } = await exportPackage(store, { by: c.user.name });
    c.tx('exportacion_paquete', (tx) => tx.event('exportacion_paquete', { reason: c.body.reason, detail: { dataset: manifest.dataset, generation: manifest.generation, files: Object.keys(manifest.files).length } }));
    return { __file: { buffer, mime: 'application/zip', name: `dcl-paquete-${manifest.dataset}-${manifest.exportedAt.slice(0, 10)}.zip` } };
  }, { perm: 'export.package' });
  app.get('/api/admin/dictionary', (c) => { if (c.acc.audience !== 'interno' || !(c.acc.can('config.manage') || c.acc.can('export.package'))) throw notFound(); return { items: dictionary() }; });
  // El reinicio solo existe para datos de demostración: se verifica el conjunto, no un botón.
  app.post('/api/demo/reset', async (c) => {
    if (store.dataset !== 'demo' || !config.demo) throw forbidden('El reinicio solo está disponible en el conjunto de demostración.');
    if (!c.acc.can('config.manage') && !c.acc.can('cestimates.authorize')) throw forbidden();
    const { seedDemo } = await import('../seed/demo.js'); const tmp = path.join(config.dataDir, `reinicio-${Date.now()}`);
    try {
      const built = await seedDemo({ ...config, dataDir: tmp }, { keepOpen: true });
      for (const a of built.store.dump().get('attachments') || []) for (const h of [a.sha256, a.thumbSha256]) if (h && built.store.hasBlob(h)) store.putBlob(built.store.readBlob(h));
      // Conserva la identidad de la organización del conjunto vigente.
      const cols = built.store.dump(); const from = built.store.organizationId, to = store.organizationId; const swap = (r) => JSON.parse(JSON.stringify(r).split(from).join(to));
      const next = new Map(); for (const [k, list] of cols) next.set(k, k === 'auditEvents' ? [] : list.map(swap));
      store.replaceAll(next, { auditHead: { seq: 0, hash: 'GENESIS' } });
      auth.data = { credentials: built.auth.exportCredentials().credentials, sessions: {} }; auth._save(); built.store.close();
      store.tx({ actor: { id: null, name: c.user.name }, action: 'reinicio_demostracion' }, (tx) => tx.event('reinicio_demostracion', { reason: 'Reinicio del conjunto de demostración' }));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    return { ok: true, message: 'Demostración reiniciada. Vuelva a iniciar sesión.' };
  });
}
