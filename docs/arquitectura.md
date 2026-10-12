# Arquitectura y límites del modo de archivos

## Capas

| Capa | Dónde | Responsabilidad |
|---|---|---|
| Interfaz | `web/` (Astro) | Pantallas adaptables. Previsualiza; no es autoridad de cálculos ni permisos. |
| API | `server/core/http.js` y rutas en `server/usecases/*.js` | Sesión, contexto de permisos, validación de entradas, idempotencia. |
| Casos de uso | `server/usecases/` | Flujos y reglas: captura, estimaciones, cierre, pagos, cobranza, gastos, importación. |
| Dominio | `server/domain/` | Esquema, decimales exactos, fechas, catálogo de permisos. |
| Repositorio | interfaz `View`/`Tx` de `server/core/store.js` | Consultar, filtrar, guardar con versión, operación atómica, historial. |
| Adaptador de archivos | `server/core/store.js` | Colecciones JSON por generación, manifiesto, candado, adjuntos. |

Los casos de uso solo usan `db.get/all/where/by` y `tx.insert/update/archive/remove/event`. No conocen nombres de archivo. Sustituir el adaptador por una base relacional exige implementar esa misma interfaz (ver [migración](migracion.md)).

## Interfaz

- **Astro** compila un sitio estático de una sola página: empaqueta, minimiza y pone huella a cada recurso. El servidor los entrega comprimidos (Brotli o gzip) y con caché de un año; el HTML siempre se revalida.
- **Tailwind CSS** con los **tokens de shadcn/ui** (estilo "new-york", base neutral, tema claro y oscuro) en `web/src/styles/globals.css`. Tipografía Geist servida localmente.
- Componentes propios con el aspecto y comportamiento de shadcn/ui, sin marco de trabajo: barra lateral colapsable (Ctrl+B), selector con búsqueda, calendario, menús, diálogos, avisos, insignias y tabla de datos (`web/src/app/ui.js`, `table.js`). Los controles nativos permanecen ocultos como fuente de verdad, de modo que los formularios y su validación no dependen del componente visual.
- **Apache ECharts** para las gráficas; se descarga solo al abrir una pantalla que la usa.
- Tablas sin texto doblado: cada listado muestra sus columnas prioritarias y el resto se elige en "Columnas"; lo recortado se lee completo al pasar el cursor o en el detalle.
- **Facilidad de uso:** el inicio es una bandeja "Mi trabajo" (`GET /api/home/tasks`) ordenada por urgencia; el cierre semanal es un asistente de cuatro pasos; los listados abren el detalle en un panel lateral sin perder la lista (Ctrl + clic lo abre en página completa); los avisos se consultan en un panel desplegable; cada pantalla tiene ayuda en contexto con glosario; los importes se escriben con separador de miles y símbolo de moneda; la tarifa faltante se define desde la propia partida (`POST /api/c-estimates/:id/items/:itemId/rate`); la captura recuerda las ubicaciones recientes y mantiene visibles sus botones en teléfono.
- No se usan avisos nativos del navegador: las confirmaciones (incluida la de cambios sin guardar) se muestran dentro de la aplicación.
- No son componentes React de shadcn/ui: se replicó su sistema visual. Si más adelante se requiere la biblioteca original, Astro admite islas de React sin rehacer el resto.

## Reportería

`server/usecases/analytics.js` define 16 conjuntos de datos (avances, mano de obra, obligaciones, desembolsos, gastos, costos, estimaciones al cliente, cobranza, cobros, caja, adicionales, presupuesto, jornadas, insumos, actividad y tiempos del proceso), cada uno con su permiso, sus dimensiones y sus medidas. Una consulta elige dimensión, serie opcional, medidas, periodicidad (día, semana, mes, trimestre, año), rango de fechas, filtros y límite; el servidor aplica el alcance por obra antes de agregar, suma con decimales exactos y reporta cuántos registros no tenían la medida en lugar de contarlos como cero. La biblioteca de reportes predefinidos (`web/src/app/pages/reportes.js`) es una lista de configuraciones sobre ese motor; agregar un reporte es agregar una línea. Los reportes guardados almacenan solo la configuración y se recalculan al abrirse.

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
