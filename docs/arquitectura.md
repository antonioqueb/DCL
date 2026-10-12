# Arquitectura y límites del modo de archivos

## Capas

| Capa | Dónde | Responsabilidad |
|---|---|---|
| Interfaz | `web/` | Pantallas adaptables. Previsualiza; no es autoridad de cálculos ni permisos. |
| API | `server/core/http.js` y rutas en `server/usecases/*.js` | Sesión, contexto de permisos, validación de entradas, idempotencia. |
| Casos de uso | `server/usecases/` | Flujos y reglas: captura, estimaciones, cierre, pagos, cobranza, gastos, importación. |
| Dominio | `server/domain/` | Esquema, decimales exactos, fechas, catálogo de permisos. |
| Repositorio | interfaz `View`/`Tx` de `server/core/store.js` | Consultar, filtrar, guardar con versión, operación atómica, historial. |
| Adaptador de archivos | `server/core/store.js` | Colecciones JSON por generación, manifiesto, candado, adjuntos. |

Los casos de uso solo usan `db.get/all/where/by` y `tx.insert/update/archive/remove/event`. No conocen nombres de archivo. Sustituir el adaptador por una base relacional exige implementar esa misma interfaz (ver [migración](migracion.md)).

## Almacenamiento

```
<carpeta de datos>/
  manifest.json            apuntador a la generación vigente (cambio atómico)
  manifests/               manifiestos de las últimas generaciones (recuperables)
  generations/<n>/         archivos de colección escritos en esa generación
  blobs/<aa>/<sha256>      adjuntos, nombrados por su huella
  secure/auth.json         credenciales (scrypt) y sesiones; fuera de las exportaciones
  backups/<marca>/         respaldos
  instance.lock            candado de instancia única
```

- **Una operación, un compromiso.** Cada caso de uso corre dentro de `store.tx(...)`. Se valida esquema, referencias y unicidad; se escriben las particiones afectadas en una generación nueva (archivo temporal, `fsync`, renombrado) y al final se sustituye `manifest.json`. Si algo falla antes, la generación se descarta y nada queda visible. Los eventos de auditoría y la clave de idempotencia viajan en el mismo compromiso.
- **Lectores coherentes.** Cada solicitud lee una vista inmutable de la generación vigente.
- **Concurrencia.** Control optimista por `recordVersion`: quien guarda sobre una versión vieja recibe un conflicto con ambas versiones.
- **Idempotencia.** Cada escritura lleva `idempotency-key`; repetirla devuelve el mismo resultado sin volver a crear movimientos.
- **Instancia única.** `instance.lock` impide abrir una segunda instancia escritora sobre los mismos datos; un candado huérfano de un proceso muerto en el mismo equipo se libera solo.
- **Corrupción.** Al abrir se verifica la huella de cada archivo. Si no coincide, el servidor no arranca e indica qué restaurar; no borra ni "repara" registros.
- **Auditoría.** Altas, cambios (con antes y después), bajas de borradores y eventos de negocio, encadenados por huella. La cadena detecta alteraciones; no protege frente a quien administra el servidor.

## Seguridad

- Contraseñas con `scrypt` de la biblioteca estándar de Node; sesiones por cookie `HttpOnly`, con vencimiento por inactividad (12 h) y absoluto (7 días); bloqueo temporal tras 5 intentos fallidos.
- Permisos por acción y obra calculados en el servidor en cada solicitud; el alcance se aplica antes de calcular listados y reportes.
- Las escrituras exigen un encabezado propio de la aplicación (protección contra solicitudes desde otros sitios).
- Solo se sirve `web/` como contenido estático. Colecciones y adjuntos no tienen ruta pública; cada descarga y vista previa verifica permisos.
- Archivos: se valida extensión y contenido (JPG, PNG, WEBP, PDF; XLSX y CSV solo en importación), tamaño máximo, nombres internos por huella y cabeceras que impiden ejecutar contenido.
- Enlaces restringidos: un documento, con vencimiento y revocación; se guarda solo la huella del enlace.

## Conectividad

- Funcionamiento conectado con guardado verificable. Si se pierde la conexión, la pantalla lo indica y nunca muestra "guardado".
- La captura de avance conserva un **borrador de texto** en el dispositivo, por usuario y obra, y reintenta con la misma clave para no duplicar.
- Las **fotografías no se conservan sin conexión**: cada una cuenta como evidencia solo cuando el servidor confirma su carga.
- Aprobar, cerrar, confirmar pagos y publicar siempre se validan contra el servidor (permisos, versión y periodo abierto).
- La aplicación es instalable; guarda en el dispositivo únicamente la interfaz, nunca datos de la empresa.

## Límites conocidos del modo de archivos

| Límite | Consecuencia | Cuándo migrar |
|---|---|---|
| Una sola instancia escritora | No hay alta disponibilidad ni varios servidores | Si se requiere redundancia |
| Todas las colecciones en memoria | Arranque y memoria crecen con el histórico (decenas de miles de registros funcionan; cientos de miles ya no conviene) | Antes de cargar el histórico completo de varios años como operación |
| Cada compromiso reescribe las colecciones tocadas | Escrituras de decenas de milisegundos; adecuadas para decenas de usuarios | Si el volumen de captura simultánea crece |
| Lectura de libros de Excel grandes | La importación de los libros reales usa de 500 MB a 1 GB de memoria durante el análisis | — |
| Sin búsqueda de texto indexada ni consultas ad hoc | Los reportes se calculan en memoria | Al requerir analítica libre |
| Almacenamiento local durable requerido | No funciona en hospedaje estático ni en discos efímeros | — |

## Integraciones futuras (no incluidas)

Ejecución bancaria de transferencias, timbrado fiscal, nómina legal, mensajería externa automática, OCR, interpretación automática de planos, aplicaciones nativas y trabajo completo sin conexión con fotografías. La aplicación registra pagos y facturas existentes y genera documentos operativos; no simula una transferencia, un CFDI ni una firma certificada.
