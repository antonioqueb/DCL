// Configuración inicial de OPERACIÓN: crea la organización, los catálogos base y el primer usuario
// (dirección + administración técnica). La contraseña se pide en la terminal o se toma de
// DCL_ADMIN_PASSWORD; nunca se guarda en texto plano ni en el repositorio.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { loadConfig } from '../server/config.js';
import { Store } from '../server/core/store.js';
import { AuthStore } from '../server/core/auth.js';
import { seedBase } from '../server/seed/base.js';
import { createUser } from '../server/seed/client.js';

const config = loadConfig([]);
if (fs.existsSync(path.join(config.dataDir, 'manifest.json'))) { console.error(`Ya existen datos en ${config.dataDir}. No se modifica nada.`); process.exit(1); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q, def) => (process.stdin.isTTY ? (await rl.question(`${q}${def ? ` [${def}]` : ''}: `)).trim() || def : def);
const org = process.env.DCL_ORG_NAME || (await ask('Nombre de la organización', 'DCL Instalaciones'));
const username = (process.env.DCL_ADMIN_USER || (await ask('Usuario inicial', 'direccion'))).toLowerCase();
const name = process.env.DCL_ADMIN_NAME || (await ask('Nombre de la persona', 'Dirección'));
const password = process.env.DCL_ADMIN_PASSWORD || (await ask('Contraseña inicial (mínimo 10 caracteres; deberá cambiarla al entrar)', ''));
rl.close();
if (!password || password.length < 10) { console.error('La contraseña debe tener al menos 10 caracteres. No se creó nada.'); process.exit(1); }
fs.mkdirSync(config.dataDir, { recursive: true });
const store = Store.open(config.dataDir, { create: { dataset: 'operacion', organizationName: org } });
const auth = new AuthStore(config.dataDir);
store.tx({ action: 'configuracion_inicial' }, (tx) => seedBase(tx));
const id = createUser(store, auth, { username, name, role: ['direccion', 'admin_tecnico'], password });
store.tx({ action: 'configuracion_inicial' }, (tx) => tx.update('users', id, { mustChangePassword: true }));
store.close();
console.log(`Listo. Datos de operación en ${config.dataDir}\nInicie con: npm start   y entre como "${username}".`);
