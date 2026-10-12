// Configuración por variables de entorno. No contiene secretos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function loadConfig(argv = process.argv.slice(2), env = process.env) {
  const demo = argv.includes('--demo') || env.DCL_MODE === 'demo';
  return {
    root, demo,
    // Los datos reales y los de demostración viven en carpetas distintas y no se mezclan.
    dataDir: path.resolve(root, demo ? env.DCL_DEMO_DIR || 'var/demo' : env.DCL_DATA_DIR || 'var/operacion'),
    port: Number(env.PORT || (demo ? 4310 : 4300)),
    host: env.HOST || '127.0.0.1',
    secureCookies: env.DCL_SECURE_COOKIES === '1',
    maxUploadBytes: Number(env.DCL_MAX_UPLOAD_MB || 25) * 1048576,
    keepGenerations: Number(env.DCL_KEEP_GENERATIONS || 10),
    webDir: path.join(root, 'web', 'dist'),
  };
}
