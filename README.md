# DCL Instalaciones · Plataforma operativa

Registra el trabajo en obra una sola vez y lo sigue hasta la autorización, el pago al contratista y el cobro al cliente. Esta versión funciona **sin base de datos**: guarda archivos JSON persistentes en el servidor (con adjuntos binarios aparte) y usa CSV para intercambio. La persistencia puede sustituirse después por una base relacional sin cambiar reglas de negocio ni pantallas.

## Inicio rápido

Requiere Node.js 22 o posterior.

```bash
npm install

# Demostración con datos ficticios (http://127.0.0.1:4310)
npm run demo

# Operación real (http://127.0.0.1:4300)
npm run setup     # crea la organización y el primer usuario; pide la contraseña en la terminal
npm start
```

En la demostración, la pantalla de acceso muestra un perfil por rol. Los datos son ficticios y viven en `var/demo`; los de operación, en `var/operacion`. Un servidor iniciado en un modo se niega a abrir la carpeta del otro.

| Comando | Qué hace |
|---|---|
| `npm run demo` / `npm start` | Servidor de demostración / de operación |
| `npm run demo:reset` | Reconstruye la demostración (solo esa carpeta) |
| `npm run setup` | Configuración inicial de operación |
| `npm run backup` (`-- --list`, `-- --verify <respaldo>`) | Respaldo consistente de datos y adjuntos |
| `npm run restore -- <respaldo> --into <carpeta>` | Restauración de prueba en una carpeta aislada |
| `npm run export` | Paquete portable (JSON, CSV, diccionario, adjuntos, manifiesto) |
| `npm run docs:data` | Regenera diccionario, modelo relacional, permisos y contratos de API |
| `npm test` | Pruebas automatizadas |

Las variables de entorno están en `.env.example`. Para atender teléfonos y tabletas, publique el servidor detrás de un proxy con HTTPS y active `DCL_SECURE_COOKIES=1`.

## Estructura

```
server/
  domain/      esquema único, decimales exactos, fechas, permisos
  core/        almacenamiento por generaciones, autenticación, HTTP, CSV, respaldo, paquete
  usecases/    reglas de negocio y rutas por módulo
  importers/   lectura de Excel y perfiles de los archivos conocidos
  pdf/         documentos operativos
  seed/        datos base y demostración
web/           interfaz (sin paso de compilación), instalable
scripts/       configuración inicial, respaldo, restauración, exportación, documentación
tests/         recorridos de negocio y criterios de aceptación
docs/          documentación
```

## Documentación

- [Arquitectura y límites del modo de archivos](docs/arquitectura.md)
- [Diccionario de datos](docs/diccionario-de-datos.md) · [Modelo relacional equivalente](docs/modelo-relacional.sql)
- [Contratos de API](docs/contratos-de-api.md) · [Matriz de permisos](docs/matriz-de-permisos.md)
- [Estados y transiciones](docs/estados-y-transiciones.md) · [Reglas de cálculo](docs/reglas-de-calculo.md)
- [Estrategia de importación](docs/importacion.md)
- [Bitácora de decisiones](docs/decisiones.md)
- [Respaldo y restauración](docs/respaldo-y-restauracion.md) · [Plan de migración](docs/migracion.md)
- [Manual breve por rol](docs/manual-por-rol.md)
- [Pruebas y limitaciones](docs/pruebas-y-limitaciones.md) · [Matriz de cobertura](docs/matriz-de-cobertura.md)
