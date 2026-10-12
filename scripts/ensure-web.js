// Compila la interfaz si todavía no existe (primera ejecución tras clonar o actualizar).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadConfig } from '../server/config.js';
const { root, webDir } = loadConfig([]);
if (!fs.existsSync(path.join(webDir, 'index.html'))) { console.log('Compilando la interfaz (solo la primera vez)…'); execSync('npx astro build --root web', { cwd: root, stdio: 'inherit' }); }
