// Genera la documentación derivada del código: diccionario de datos, modelo relacional equivalente,
// matriz de permisos y contratos de API. Ejecutar tras cambiar el esquema, los permisos o las rutas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../server/config.js';
import { buildApp } from '../server/app.js';
import { dictionary, dictionaryMarkdown } from '../server/core/package.js';
import { PERMISSIONS, ROLES } from '../server/domain/permissions.js';

const root = loadConfig([]).root; const out = (f, s) => { fs.writeFileSync(path.join(root, 'docs', f), s); console.log('docs/' + f); };
out('diccionario-de-datos.md', dictionaryMarkdown());

// Modelo relacional equivalente (PostgreSQL de referencia). No se instala en esta entrega.
const snake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const SQL = { uuid: 'uuid', ref: 'uuid', str: 'text', text: 'text', secret: 'text', int: 'integer', bool: 'boolean', date: 'date', month: 'char(7)', instant: 'timestamptz', money: 'numeric(18,2)', qty: 'numeric(18,4)', price: 'numeric(18,4)', pct: 'numeric(9,4)', enum: 'text', json: 'jsonb' };
let ddl = '-- Modelo relacional equivalente al esquema de archivos (generado; no editar a mano).\n-- Claves primarias UUID, foráneas explícitas, estados como CHECK, decimales exactos.\n\n'; const fks = [];
for (const e of dictionary()) { const t = snake(e.collection); const cols = e.fields.map((f) => { let c = `  ${snake(f.name)} ${SQL[f.type]}`; if (f.name === 'id') c += ' PRIMARY KEY'; else if (f.required) c += ' NOT NULL'; if (f.values) c += ` CHECK (${snake(f.name)} IN (${f.values.map((v) => `'${v}'`).join(', ')}))`; if (f.ref) fks.push(`ALTER TABLE ${t} ADD FOREIGN KEY (${snake(f.name)}) REFERENCES ${snake(f.ref)}(id);`); return c; });
  ddl += `-- ${e.label}${e.immutable ? ' (histórico inmutable: sin UPDATE ni DELETE)' : ''}\nCREATE TABLE ${t} (\n${cols.join(',\n')}\n);\n`;
  for (const u of e.unique) ddl += `CREATE UNIQUE INDEX ${t}_${u.map(snake).join('_')}_uk ON ${t} (${u.map(snake).join(', ')}) WHERE archived_at IS NULL;\n`;
  for (const f of e.fields) if (f.ref && f.name !== 'organizationId') ddl += `CREATE INDEX ${t}_${snake(f.name)}_ix ON ${t} (${snake(f.name)});\n`; ddl += '\n'; }
out('modelo-relacional.sql', ddl + '-- Claves foráneas (se crean al final para permitir la carga de maestros y relaciones en orden)\n' + fks.join('\n') + '\n');

const roles = Object.entries(ROLES); let pm = '# Matriz inicial de permisos\n\nPropuesta de arranque: dirección debe validarla (decisión D01). Los permisos se verifican en el servidor por acción y por obra; cada rol puede ajustarse en Configuración → Roles y permisos, con motivo e historial.\n\n';
pm += `| Permiso | ${roles.map(([, r]) => r.name).join(' | ')} |\n|---|${roles.map(() => ':-:').join('|')}|\n`;
for (const [p, label] of Object.entries(PERMISSIONS)) pm += `| ${label} (\`${p}\`) | ${roles.map(([, r]) => (r.permissions.includes(p) ? '●' : '')).join(' | ')} |\n`;
pm += '\n## Alcance\n\n- **Dirección, tesorería, auxiliar, administración técnica y auditoría**: alcance global, salvo que se asigne por obra.\n- **Supervisor y coordinación**: solo las obras que tienen asignadas (o una obra específica).\n- **Contratista**: únicamente estimaciones, pagos, evidencias y documentos de su propia empresa, y solo cuando se le compartieron.\n- **Cliente**: únicamente sus obras y los documentos expresamente publicados.\n- **Delegaciones**: una facultad propia puede delegarse con vigencia; lo aprobado queda a nombre de quien actuó y "por delegación de".\n- **Límites de monto**: configurables por rol o persona y tipo de autorización. No hay ninguno definido de origen.\n';
out('matriz-de-permisos.md', pm);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dcl-docs-')); const app = await buildApp({ ...loadConfig(['--demo']), dataDir: dir }, { create: { dataset: 'demo' } });
const groups = {}; for (const r of app.routes) { const g = r.pattern.split('/')[2]; (groups[g] = groups[g] || []).push(r); }
let api = '# Contratos de API\n\nAPI HTTP con JSON, reutilizable por futuras aplicaciones móviles o de escritorio.\n\n- **Sesión**: cookie `dcl_sesion` (HttpOnly, SameSite=Lax) obtenida con `POST /api/login`.\n- **Escrituras**: encabezado `x-dcl-solicitud: 1` obligatorio e `idempotency-key` (un valor por operación, reutilizado en reintentos).\n- **Control de versión**: al editar se envía `recordVersion`; si otra persona guardó antes, la respuesta es `409 conflicto` con `current` y `attempted`.\n- **Listados**: `q`, `f.<campo>=a,b`, `from`, `to`, `sort=campo|-campo`, `page`, `pageSize`, `format=csv`. Responden `{ items, total, totals, columns }`; los totales cubren todo el conjunto filtrado.\n- **Errores**: `{ error, message, field?, reasons?, fix? }` con estados 401, 403, 404, 409 (`bloqueado`, `conflicto`, `duplicado`), 422 (`validacion`).\n- **Importes y cantidades**: texto decimal con punto (`"322879.30"`); fechas `AAAA-MM-DD`; instantes ISO-8601 UTC.\n\n';
for (const [g, list] of Object.entries(groups).sort()) { api += `## ${g}\n\n| Método | Ruta | Acceso |\n|---|---|---|\n`; for (const r of list) api += `| ${r.method} | \`${r.pattern}\` | ${r.opts.public ? 'Público' : r.opts.perm ? `Permiso \`${r.opts.perm}\`` : 'Sesión; permiso y alcance verificados en el caso de uso'}${r.opts.raw ? ' · cuerpo binario' : ''} |\n`; api += '\n'; }
out('contratos-de-api.md', api); app.store.close(); fs.rmSync(dir, { recursive: true, force: true });
