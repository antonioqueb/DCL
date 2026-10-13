# Resultados de los casos

Ejecutados contra el servidor real de la aplicación (sin sustitutos), cada uno en una carpeta temporal propia. Entorno: v24.7.0, macOS, zona America/Monterrey. Datos: escenario de la sección 26 creado por la API (obras A y B, contratistas K1 y K2, cliente C1, supervisores S1 y S2, dirección D1, tesorería T1).

**78 casos · 57 pasan · 21 con al menos una comprobación no cumplida · 0 bloqueados por error · 631 de 655 comprobaciones cumplidas.**

Un caso "con comprobación no cumplida" indica un comportamiento del sistema distinto al esperado, descrito en el registro de hallazgos; no es un error de la prueba.

| Caso | Título | Reglas | Resultado | Comprobaciones | Ejecutado | Archivo |
|---|---|---|---|---:|---|---|
| CAS-01 | Separación de obras | ACC-02, ACC-11, AVA-10 | Pasa | 13/13 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-02 | Separación de terceros | ACC-03, ACC-05, ACC-06, DOC-03 | Pasa | 25/25 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-03 | Medición en dos ubicaciones | AVA-18, EST-02 | Pasa | 7/7 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-04 | Acumulado correcto | AVA-02, AVA-03, SEM-12 | Pasa | 8/8 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-05 | Acumulado menor | AVA-04, AVA-09, AVA-20 | Pasa | 12/12 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-06 | Generador | AVA-05, AVA-06, SEM-07 | Pasa | 8/8 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-07 | Exceso de alcance | PRE-07, PRE-08, ADI-02 | Pasa | 8/8 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-08 | Partida sin ejecución | PRE-06, PRE-12 | Pasa | 6/6 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-09 | Tarifas distintas | TAR-02, TAR-12, SEM-03 | Pasa | 8/8 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-10 | Vigencia de precios | TAR-03, TAR-04, EST-10 | Pasa | 6/6 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-11 | Precio ausente | TAR-09, AVA-13 | Pasa | 7/7 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-12 | Cambio después de aceptación | EST-07, EST-08 | Pasa | 5/5 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-13 | Aprobación parcial | EST-05, EST-06, CIE-06 | **Falla** | 10/11 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-14 | Observación del contratista | EST-03, EST-04 | Pasa | 12/12 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-15 | Adicional absorbido | ADI-03, ADI-05, ADI-06 | Pasa | 12/12 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-16 | Aditiva propuesta | PRE-04, ADI-08 | Pasa | 9/9 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-17 | Jornada repartida | JOR-03, GAS-03 | Pasa | 8/8 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-18 | Evidencia pendiente | EVI-03, EVI-04 | **Falla** | 10/11 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-19 | Cambio de plano | EVI-08, EVI-09, DOC-02 | Pasa | 7/7 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-20 | Retrabajo | AVA-08, ADI-11 | **Falla** | 2/4 | 2026-10-13 01:51 UTC | casos-01-20.mjs |
| CAS-21 | Cierre documentado | CIE-02, CIE-03, CIE-04, CIE-14 | Pasa | 10/10 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-22 | Una estimación, su pago y su salida de dinero: un solo costo | GAS-15, IMP-08 | Pasa | 6/6 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-23 | Reintento de cierre | CIE-08, CIE-09, PER-05 | Pasa | 6/6 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-24 | Pago parcial | PAG-04, PAG-05 | Pasa | 6/6 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-25 | Un pago para dos obligaciones | PAG-03, PAG-05 | Pasa | 6/6 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-26 | Medio de pago mixto | PAG-07, TES-04 | Pasa | 8/8 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-27 | Pago preparado o rechazado | PAG-02, PAG-11 | Pasa | 10/10 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-28 | Reverso | PAG-12, AUD-03 | Pasa | 9/9 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-29 | Corregir tras pagar | EST-12, EST-13 | Pasa | 7/7 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-30 | Anticipo al contratista | JOR-08, PAG-15 | Pasa | 11/11 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-31 | Estimación comercial distinta | CLI-01, CLI-03, CLI-04 | Pasa | 8/8 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-32 | Aprobación parcial del cliente | CLI-07, CLI-09 | Pasa | 6/6 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-33 | Factura vinculada | CLI-11, COB-10 | Pasa | 8/8 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-34 | Anticipo del cliente | COB-03, COB-04 | Pasa | 10/10 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-35 | Fórmula contractual explícita (solo prueba) | COB-07, COB-08 | Pasa | 6/6 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-36 | Liberación de garantía | COB-05, COB-06 | Pasa | 9/9 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-37 | Cobro superior al saldo | COB-10, COB-11 | **Falla** | 5/6 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-38 | Fecha de vencimiento | COB-12, SEM-06 | **Falla** | 3/5 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-39 | Bruto, comisión y neto | COB-15, RES-07 | Pasa | 8/8 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-40 | Diferencia que requiere revisión | COB-16, IMP-09 | Pasa | 2/2 | 2026-10-13 01:58 UTC | casos-21-40.mjs |
| CAS-41 | Costo distribuido | GAS-03, GAS-14 | Pasa | 6/6 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-42 | Gasto y pago separados | GAS-02, GAS-05, PAG-15 | **Falla** | 7/8 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-43 | Caja chica | CAJ-02, CAJ-04 | **Falla** | 8/9 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-44 | Prorrateo idempotente | GAS-11, GAS-12, GAS-13 | Pasa | 11/11 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-45 | Insumos | INS-01, INS-02, INS-03, INS-04, INS-05, INS-06 | **Falla** | 12/13 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-46 | Traspaso interno | TES-02, SEM-01 | **Falla** | 5/6 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-47 | Margen consolidado | REP-03, RES-01 | Pasa | 6/6 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-48 | Total paginado | REP-01, REP-02 | Pasa | 7/7 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-49 | Redondeo declarado | SEM-07 | **Falla** | 7/8 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-50 | Fechas y cantidades conflictivas | IMP-09 | **Falla** | 4/5 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-51 | Subtotales y errores de fórmula | IMP-04, IMP-07 | Pasa | 6/6 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-52 | Lote repetido y simulación | IMP-10, IMP-12 | Pasa | 12/12 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-53 | Apertura coherente | IMP-14, TES-01 | **Falla** | 4/5 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-54 | Fallo intermedio | PER-03, PER-04, CIE-08 | Pasa | 7/7 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-55 | Edición concurrente | PER-06, AVA-17 | **Falla** | 5/6 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-56 | Identidad y desactivación | OBR-08, SEM-11 | **Falla** | 7/9 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-57 | Decimal local y reintento de captura | MOV-02, MOV-05, MOV-07 | Pasa | 10/10 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-58 | Sesión y permisos cambiados | ACC-09, PAG-16, MOV-08 | Pasa | 10/10 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-59 | Respaldo y exportación completa | PER-08, PER-12, PER-13, PER-14, PER-15 | Pasa | 16/16 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| CAS-60 | Recorrido completo | A, B, C | Pasa | 19/19 | 2026-10-13 02:07 UTC | casos-41-60.mjs |
| ADV-01 | El administrador técnico no obtiene facultad económica asignándose un rol | ACC-08, ACC-13 | **Falla** | 2/3 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-02 | Varios roles: el alcance limitado no se vuelve global | ACC-10, ACC-04 | Pasa | 4/4 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-03 | Reabrir una estimación con obligación pendiente: ¿se puede pagar el resto mientras está en revisión? | EST-12, PAG-16 | **Falla** | 1/2 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-04 | Semana cerrada, captura tardía y complemento | AVA-16, CIE-07, CIE-11, CIE-12, SEM-06 | Pasa | 8/8 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-05 | Semana y año: cruce de diciembre a enero y fecha local de Monterrey | SEM-13, SEM-14 | Pasa | 9/9 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-06 | Exportaciones: fórmulas en texto, números negativos, nombres de archivo y rutas | PER-11, EVI-07, DOC-01 | Pasa | 15/15 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-07 | Monedas, comprobante repetido y pago a tercero | SEM-10, PAG-06, PAG-08 | **Falla** | 5/6 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-08 | Obra suspendida o cerrada, ubicación en uso y evidencia de un avance aprobado | OBR-04, OBR-10, OBR-11, EVI-11 | Pasa | 9/9 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-09 | Cliente: rechazo, versión corregida, aprobación externa y enlaces | CLI-04, CLI-08, CLI-12, CLI-13, CLI-14, DOC-07, ACC-06 | **Falla** | 14/15 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-10 | Auditoría: no editable, notificaciones sin repetición y periodo económico cerrado | AUD-01, AUD-02, AUD-06, DOC-06, RES-09 | **Falla** | 11/12 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| ADV-11 | Sesiones, contraseñas, límites y validación propia | ACC-07, ACC-09, ACC-12, PER-15 | Pasa | 7/7 | 2026-10-13 02:13 UTC | casos-adversos.mjs |
| REG-01 | Maestros: obras, ubicaciones y asignaciones con vigencia | OBR-01, OBR-02, OBR-03, OBR-05, OBR-06, OBR-07, OBR-09, OBR-12, OBR-13 | Pasa | 8/8 | 2026-10-13 02:17 UTC | casos-reglas.mjs |
| REG-02 | Tarifas y catálogo: sobreprecio, niveles de detalle, unidades e inactivos | TAR-01, TAR-05, TAR-06, TAR-08, TAR-10, TAR-11, SEM-08 | **Falla** | 6/7 | 2026-10-13 02:17 UTC | casos-reglas.mjs |
| REG-03 | Reservas de cantidad: cancelar o rechazar libera sin borrar la ejecución | AVA-14, AVA-15, EST-14, EST-15, PAG-01, CIE-01 | Pasa | 8/8 | 2026-10-13 02:17 UTC | casos-reglas.mjs |
| REG-04 | Adicionales: aprobación comercial sin ejecución, bandeja e incidencias | ADI-01, ADI-04, ADI-07, ADI-12, ADI-13, ADI-14, REP-06 | **Falla** | 5/6 | 2026-10-13 02:17 UTC | casos-reglas.mjs |
| REG-05 | Cierre: instantánea frente a cambios de catálogo; recibo y medios de pago | CIE-10, CIE-13, PAG-09, PAG-10, DOC-04, DOC-05, AUD-08 | Pasa | 8/8 | 2026-10-13 02:17 UTC | casos-reglas.mjs |
| REG-06 | Cobranza y gastos: disputa, reverso de cobro, activos y gasto sin distribuir | COB-09, COB-13, COB-14, GAS-01, GAS-04, GAS-06, GAS-07, GAS-10, GAS-16, TES-03, TES-08 | Pasa | 10/10 | 2026-10-13 02:17 UTC | casos-reglas.mjs |
| REG-07 | Auditoría de cambios y parámetros | AUD-01, AUD-04, AUD-05, AUD-10, AUD-11, REP-05 | Pasa | 5/5 | 2026-10-13 02:17 UTC | casos-reglas.mjs |

## Detalle

### CAS-01 · Separación de obras

Reglas: ACC-02, ACC-11, AVA-10 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| S1 lee la obra B por ID | `404` | `404` | Cumple |
| S1 lee un avance de B por ID | `404` | `404` | Cumple |
| S1 crea avance en B por API | `403` | `403` | Cumple |
| S1 crea avance en A con ubicación de B | `true` | `true` | Cumple |
| No se creó ningún registro en B | `1` | `1` | Cumple |
| El listado de S1 no trae avances de B | `0` | `0` | Cumple |
| El listado de obras de S1 solo trae A | `["AUD-A"]` | `["AUD-A"]` | Cumple |
| La búsqueda de S1 no devuelve la obra B | `false` | `false` | Cumple |
| La exportación de S1 no trae B | `false` | `false` | Cumple |
| S1 descarga un adjunto de B | `404` | `404` | Cumple |
| S1 guarda un borrador válido en A | `200` | `200` | Cumple |
| Queda como borrador | `borrador` | `borrador` | Cumple |
| S2 no ve el borrador de S1 en A | `404` | `404` | Cumple |

Observaciones registradas:

- Exportación PDF de avances como S1 (estado): `200`

### CAS-02 · Separación de terceros

Reglas: ACC-03, ACC-05, ACC-06, DOC-03 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| K1 lee la estimación de K2 | `404` | `404` | Cumple |
| K1 lee la obligación de K2 | `404` | `404` | Cumple |
| K1 lee el pago de K2 | `404` | `404` | Cumple |
| K1 pide el recibo PDF de K2 | `404` | `404` | Cumple |
| K1 pide la estimación PDF de K2 | `404` | `404` | Cumple |
| K1 observa una partida de K2 | `true` | `true` | Cumple |
| El listado de K1 no contiene documentos de K2 | `[]` | `[]` | Cumple |
| El estado de cuenta de K1 no incluye a K2 | `false` | `false` | Cumple |
| K1 sí ve su propia estimación (compartida al autorizar) | `200` | `200` | Cumple |
| C1 no obtiene datos internos en /api/reports/costos | `true` | `404 {"error":"no_encontrado","message":"El reporte no existe o no está disponible para usted."}` | Cumple |
| C1 no obtiene datos internos en /api/works/0ee0a899-e5ec-495b-9977-c52f6e9030f9/summary | `true` | `404 {"error":"no_encontrado","message":"La obra no existe o no está disponible para usted."}` | Cumple |
| C1 no obtiene datos internos en /api/results | `true` | `404 {"error":"no_encontrado","message":"El registro no existe o no está disponible para usted."}` | Cumple |
| C1 no obtiene datos internos en /api/expenses | `true` | `404 {"error":"no_encontrado","message":"El registro no existe o no está disponible para usted."}` | Cumple |
| C1 no obtiene datos internos en /api/rates | `true` | `404 {"error":"no_encontrado","message":"El registro no existe o no está disponible para usted."}` | Cumple |
| C1 no obtiene datos internos en /api/c-estimates | `true` | `200 {"items":[],"total":0,"page":1,"pageSize":50,"totals":{"grossTotal":{"value":"0.00","missing":0},"authorizedTotal":{"val` | Cumple |
| C1 no obtiene datos internos en /api/obligations | `true` | `200 {"items":[],"total":0,"page":1,"pageSize":50,"totals":{"gross":{"value":"0.00","missing":0},"discounts":{"value":"0.00",` | Cumple |
| C1 no obtiene datos internos en /api/documents/preview | `true` | `422 {"error":"validacion","message":"Ese documento no existe para esa audiencia.","field":"audience"}` | Cumple |
| C1 no obtiene datos internos en /api/documents/preview (pdf) | `true` | `422 {"error":"validacion","message":"Ese documento no existe para esa audiencia.","field":"audience"}` | Cumple |
| C1 no obtiene datos internos en /api/analytics/datasets | `true` | `404 {"error":"no_encontrado","message":"El registro no existe o no está disponible para usted."}` | Cumple |
| C1 no obtiene datos internos en /api/home/charts | `true` | `404 {"error":"no_encontrado","message":"El registro no existe o no está disponible para usted."}` | Cumple |
| C1 no obtiene datos internos en /api/audit | `true` | `403 {"error":"sin_permiso","message":"No tiene permiso para esta acción.","permission":"audit.view"}` | Cumple |
| C1 no consulta el explorador de reportes | `true` | `404` | Cumple |
| C1 no exporta reportes a PDF | `true` | `404` | Cumple |
| S1 (supervisor) no consulta importes de mano de obra en el explorador | `true` | `404 {"error":"no_encontrado","message":"El conjunto de datos no existe o no está disponible para usted."}` | Cumple |
| El supervisor no recibe precios en el listado de avances | `false` | `false` | Cumple |

### CAS-03 · Medición en dos ubicaciones

Reglas: AVA-18, EST-02 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Importes por ubicación | `["5526.50","8834.00"]` | `["5526.50","8834.00"]` | Cumple |
| Total | `14360.50` | `14360.50` | Cumple |
| Otra semana no vuelve a incluir la misma ejecución | `0` | `0` | Cumple |
| Cantidad total 41.03 m² | `41.03` | `41.03` | Cumple |
| Se conservan los dos orígenes | `["Planta baja","Sótano 1"]` | `["Planta baja","Sótano 1"]` | Cumple |
| No se creó una tercera ejecución | `2` | `2` | Cumple |
| Cada partida conserva unidad, precio y cálculo | `true` | `true` | Cumple |

Observaciones registradas:

- Reagrupar un documento ya generado: `200 {"added":0,"lateEntries":0,"pendingValuation":0}`

### CAS-04 · Acumulado correcto

Reglas: AVA-02, AVA-03, SEM-12 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Rechazo del acumulado de 60 | `200` | `200` | Cumple |
| Incremento | `15.0000` | `15.0000` | Cumple |
| Base usada = última validada | `40.0000` | `40.0000` | Cumple |
| Acumulado medido | `55.0000` | `55.0000` | Cumple |
| Cantidad en la estimación = 40 + 15 (no 95 ni 115) | `55.00` | `55.00` | Cumple |
| Existe la asignación de 15 m² | `true` | `true` | Cumple |
| Importe total 55 × 350 | `19250.00` | `19250.00` | Cumple |
| Otra ubicación no hereda la base | `9.0000` | `9.0000` | Cumple |

### CAS-05 · Acumulado menor

Reglas: AVA-04, AVA-09, AVA-20 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Acumulado menor rechazado | `422` | `422` | Cumple |
| El mensaje orienta a la corrección | `true` | `La medición acumulada (50.00) es menor al acumulado validado comparable (55.00).` | Cumple |
| No se creó trabajo negativo | `1` | `1` | Cumple |
| La base validada se conserva | `55.0000` | `55.0000` | Cumple |
| Cantidad negativa directa rechazada | `422` | `422` | Cumple |
| Editar la cantidad de un avance validado | `true` | `true` | Cumple |
| El ajuste sin motivo se rechaza | `422` | `422` | Cumple |
| Antes de autorizar, la cantidad vigente no cambia | `55.0000` | `55.0000` | Cumple |
| La medición original se conserva | `55.0000` | `55.0000` | Cumple |
| La estimación autorizada no cambió por cascada | `19250.00` | `19250.00` | Cumple |
| El ajuste queda vinculado al avance | `true` | `[{"id":"b2d02159-c6a8-4311-b342-06969cc2a62d","organizationId":"2fc2d0ac-6f65-42bd-8817-ad693e552091","recordVersion":1,"schemaVersion":1,"createdAt":"2026-10-13T01:50:31.275Z","createdBy":"95fbcee3-3` | Cumple |
| La obligación no se redujo en silencio | `19250.00` | `19250.00` | Cumple |

Observaciones registradas:

- Mensaje al usuario: `La medición acumulada (50.00) es menor al acumulado validado comparable (55.00). \| `
- Autorizar ajuste −5 con el avance ya en una estimación autorizada: `409 {"error":"bloqueado","message":"El ajuste dejaría la ejecución (50.00) por debajo de lo ya incluido en documentos de pago al contratista (55.00).","reasons":[],"fix":"Reabra o corrija primero el documento que incluye esa cantidad."}`
- Cantidad vigente tras decidir: `55.0000`
- Documentos afectados informados al decidir: `{"error":"bloqueado","message":"El ajuste dejaría la ejecución (50.00) por debajo de lo ya incluido en documentos de pago al contratista (55.00).","reasons":[],"fix":"Reabra o corrija primero el documento que incluye esa cantidad."}`

### CAS-06 · Generador

Reglas: AVA-05, AVA-06, SEM-07 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Cantidad del generador | `22.5000` | `22.5000` | Cumple |
| Conserva dimensiones | `["4.0000","3.0000","2.0000","1.5000"]` | `["4.0000","3.0000","2.0000","1.5000"]` | Cumple |
| Conserva fórmula | `true` | `largo × ancho × piezas − deducciones` | Cumple |
| Editar una dimensión (aún reportado) | `200` | `200` | Cumple |
| El total cambia a 28.5 | `28.5000` | `28.5000` | Cumple |
| Importe 22.5 × 350 | `7875.00` | `7875.00` | Cumple |
| Deducción mayor al área bruta | `422` | `422` | Cumple |
| Dimensión no numérica | `422` | `422` | Cumple |

Observaciones registradas:

- Mensaje: `Las deducciones superan la medición del renglón.`

### CAS-07 · Exceso de alcance

Reglas: PRE-07, PRE-08, ADI-02 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La captura que excede el presupuesto se puede registrar | `200` | `200` | Cumple |
| Se advierte el exceso al capturar | `true` | `[{"type":"sobre_presupuesto","message":"El acumulado resultante (105.00) supera la cantidad presupuestada (100.00). El trabajo se conserva; su validación requiere aprobación y no modifica el contrato.` | Cumple |
| Validar el exceso sin motivo se bloquea | `409` | `409` | Cumple |
| S1 no valida su propio exceso | `403` | `403` | Cumple |
| Ejecutado 105 | `105.0000` | `105.0000` | Cumple |
| Presupuesto vigente sigue en 100 | `100.0000` | `100.0000` | Cumple |
| El excedente de 5 es visible (no truncado a cero) | `true` | `{"pendingQty":"-5.0000","state":"excedida"}` | Cumple |
| Importe vigente del contrato sin cambio | `128000.00` | `128000.00` | Cumple |

Observaciones registradas:

- Avisos al capturar: `[{"type":"sobre_presupuesto","message":"El acumulado resultante (105.00) supera la cantidad presupuestada (100.00). El trabajo se conserva; su validación requiere aprobación y no modifica el contrato."}]`
- Renglón de seguimiento: `{"id":"…","chapter":"PISOS","location":"Planta baja","description":"Piso planta baja","unit":"m2","budgetQty":"100.0000","price":"1280.0000","budgetAmount":"128000.00","changeQty":"0.0000","currentQty":"100.0000","currentAmount":"128000.00","executedQty":"105.0000","executedAmount":"134400.00","comparable":true,"pendingQty":"-5.`
- Cantidad propuesta al cliente con exceso: `[["105.0000","100.0000",null]]`
- Avisos de la estimación al cliente: `null`

### CAS-08 · Partida sin ejecución

Reglas: PRE-06, PRE-12 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Importe presupuestado | `21141.00` | `21141.00` | Cumple |
| Ejecutado cero | `0.0000` | `0.0000` | Cumple |
| Pendiente íntegro | `21141.00` | `21141.00` | Cumple |
| Estado | `pendiente` | `pendiente` | Cumple |
| No se rotula como pérdida | `false` | `false` | Cumple |
| La partida sin ejecución aparece en la exportación | `true` | `﻿Capítulo,Ubicación,Partida,Unidad,Presupuestado,Modificaciones,Vigente,Ejecutado validado,Pendiente,Importe vigente,Ejecución valorizada,Importe pendiente,Seguimiento BAÑOS,Planta baja,Limpieza y se` | Cumple |

Observaciones registradas:

- Exportación CSV del seguimiento (estado y tipo): `200 archivo`
- Reporte fijo de presupuesto contra ejecución: `200 2 renglones`
- Tarjetas de la obra: `[["avances","1"],["pendientes","0"],["sinEjecucion","1"],["presupuesto","33941.00"],["ejecutado","5120.00"],["propuesto","0.00"],["aprobado","0.00"],["facturado","0.00"],["cobrado","0.00"],["porCobrar","0.00"],["anticipo","0.00"],["manoObra","0.00"],["pagado","0.00"],["porPagar","0.00"],["costos","0.00"],["comprometido","0.00"]]`

### CAS-09 · Tarifas distintas

Reglas: TAR-02, TAR-12, SEM-03 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Costo de contratación | `3500.00` | `3500.00` | Cumple |
| Propuesta comercial | `12800.00` | `12800.00` | Cumple |
| Mismo avance de origen en los dos circuitos | `a1c63017-47b8-47a2-9bc6-44a55f36833b` | `a1c63017-47b8-47a2-9bc6-44a55f36833b` | Cumple |
| Sigue existiendo una sola ejecución | `1` | `1` | Cumple |
| Cambiar el precio comercial no altera el de contratación | `3500.00` | `3500.00` | Cumple |
| La tarifa de contratación sigue en 350 | `["350.0000"]` | `["350.0000"]` | Cumple |
| El margen se marca como parcial | `true` | `true` | Cumple |
| No se usa la etiqueta "utilidad neta" | `false` | `false` | Cumple |

Observaciones registradas:

- Margen de la obra: `{"revenue":"0.00","costs":"3500.00","amount":"-3500.00","pct":null,"partial":true,"policy":"no_definida","formula":"Trabajo aprobado por el cliente (antes de impuestos) − costos registrados de la obra (mano de obra autorizada + gastos autorizados asignados).","caveat":"La política de reconocimiento de ingresos no está validada: `

### CAS-10 · Vigencia de precios

Reglas: TAR-03, TAR-04, EST-10 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Documento anterior permanece | `3500.00` | `3500.00` | Cumple |
| Nueva partida usa 400 | `4000.00` | `4000.00` | Cumple |
| Reemitir el histórico conserva 3,500 | `3500.00` | `3500.00` | Cumple |
| La vista previa no es borrador | `false` | `false` | Cumple |
| La versión congelada guarda el origen del precio | `350.0000` | `350.0000` | Cumple |
| La tarifa no se edita en sitio | `true` | `404` | Cumple |

Observaciones registradas:

- Avance con fecha anterior a la vigencia, estimado después (precio aplicado): `4000.00`
- Segunda tarifa con la misma vigencia y alcance (precedencia determinista): `200 {"id":"…"}`

### CAS-11 · Precio ausente

Reglas: TAR-09, AVA-13 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Importe indeterminado (no cero) | `null` | `null` | Cumple |
| Marcada por valorar | `true` | `true` | Cumple |
| Total bruto no la suma como cero silencioso | `0.00` | `0.00` | Cumple |
| Autorización bloqueada | `409` | `409` | Cumple |
| Precio cero sin motivo se rechaza | `true` | `422` | Cumple |
| S1 no fija precio | `true` | `true` | Cumple |
| Enviar sin cantidad se rechaza | `422` | `422` | Cumple |

Observaciones registradas:

- Explicación: `No hay partidas que puedan autorizarse. ""`
- Autorización parcial con solo partidas sin precio: `409 {"error":"bloqueado","message":"No hay partidas que puedan autorizarse.","reasons":["Detalle sin tarifa (auditoría): sin tarifa definida"]}`
- Precio cero explícito con motivo: `422 {"error":"validacion","message":"El precio debe ser mayor que cero.","field":"unitPrice"}`
- Partida tras el precio cero explícito: `{"amount":null,"pendingValuation":true}`
- Borrador incompleto (sin concepto ni cantidad): `422 Falta el dato obligatorio: concepto.`

### CAS-12 · Cambio después de aceptación

Reglas: EST-07, EST-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| K1 acepta la versión 1 | `lista_autorizar` | `lista_autorizar` | Cumple |
| Importe aceptado | `7000.00` | `7000.00` | Cumple |
| La conformidad identifica versión, persona y fecha | `[1,"K1 usuario (auditoría)",true]` | `[1,"K1 usuario (auditoría)",true]` | Cumple |
| No se autorizan $7,700 bajo la aceptación de $7,000 | `true` | `{"status":200,"authorizedTotal":"7000.00"}` | Cumple |
| Si se autorizó, fue por el importe aceptado | `true` | `7000.00` | Cumple |

Observaciones registradas:

- Dirección propone +2 m²: `200 {"id":"…"}`
- Decidir el ajuste: `200 {"id":"…"}`
- Estado tras el cambio: `{"status":"lista_autorizar","version":1,"gross":"7000.00","conformity":{"version":1,"valid":true}}`
- Autorizar tras el cambio sin nueva aceptación: `200 {"id":"…","status":"autorizada","authorizedTotal":"7000.00","obligationId":"…","excluded":0,"version":1}`

### CAS-13 · Aprobación parcial

Reglas: EST-05, EST-06, CIE-06 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Con la política de parciales desactivada, la autorización se bloquea | `409` | `409` | Cumple |
| Autorizado | `5000.00` | `5000.00` | Cumple |
| Excluidas | `1` | `1` | Cumple |
| Estados por partida | `["autorizada","diferida"]` | `["autorizada","diferida"]` | Cumple |
| Bruto por cerrar | `5000.00` | `5000.00` | Cumple |
| El tablero muestra la partida excluida y su motivo | `true` | `sin mención de partidas excluidas en el tablero` | **No cumple** |
| El cierre liquida solo lo autorizado | `5000.00` | `5000.00` | Cumple |
| La ejecución diferida no quedó pagada | `0.0000` | `0.0000` | Cumple |
| La autorizada sí quedó asignada | `62.5000` | `62.5000` | Cumple |
| Los $2,000 diferidos quedan disponibles para la semana siguiente | `1` | `1` | Cumple |
| Importe recuperado | `2000.00` | `2000.00` | Cumple |

Observaciones registradas:

- Parámetro policy.partialAuthorization de fábrica: `{"value":true,"requiresDecision":true}`
- Explicación del bloqueo: `{"error":"bloqueado","message":"La estimación no puede autorizarse todavía.","reasons":["\"Canto pulido (auditoría)\" tiene una observación sin resolver."],"fix":"Resuelva los pendientes o registre una excepción con motivo."}`
- Tablero de cierre: pendientes informados: `{"code":"pendientes","title":"Pendientes informados","ok":true,"blocking":false,"problems":[]}`

### CAS-14 · Observación del contratista

Reglas: EST-03, EST-04 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La captura original no cambia | `10.0000` | `10.0000` | Cumple |
| Se conservan reportado y propuesto | `["10.0000","12.0000"]` | `["10.0000","12.0000"]` | Cumple |
| K1 edita la captura por API | `true` | `true` | Cumple |
| K1 cambia el precio por API | `true` | `true` | Cumple |
| K1 resuelve su propia observación | `true` | `true` | Cumple |
| S1 resuelve la observación | `true` | `true` | Cumple |
| Resolver sin motivo | `422` | `422` | Cumple |
| Quedan visibles reportado, propuesto y acordado | `["10.0000","12.0000","11.0000"]` | `["10.0000","12.0000","11.0000"]` | Cumple |
| Con persona y motivo | `true` | `{"id":"0220cf40-d28c-4c71-9dfe-2e1f685ef426","text":"Medí 12 m² (auditoría)","proposedQty":"12.0000","proposedAmount":null,"status":"resuelta","resolution":"parcial","resolutionNote":"Se verificó 11 m` | Cumple |
| La medición del supervisor sigue en 10 y la vigente es 11 | `["10.0000","11.0000"]` | `["10.0000","11.0000"]` | Cumple |
| La resolución creó versión nueva | `2` | `2` | Cumple |
| La aceptación de la versión 1 ya no sirve | `409` | `409` | Cumple |

Observaciones registradas:

- Resolución parcial a 11: `{"id":"…","before":{"qty":"10.0000","unitPrice":"350.0000","amount":"3500.00","rev":1,"version":1},"after":{"qty":"11.0000","unitPrice":"350.0000","amount":"3850.00","rev":2,"version":2}}`
- Reportado / propuesto / acordado: `{"reportado":"10.0000","propuesto":"12.0000","acordado":"11.0000","por":"D1 Dirección (auditoría)","nota":"Se verificó 11 m² en sitio (auditoría)"}`

### CAS-15 · Adicional absorbido

Reglas: ADI-03, ADI-05, ADI-06 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Tres decisiones separadas | `["validado","autorizado","pendiente"]` | `["validado","autorizado","pendiente"]` | Cumple |
| Exposición | `1000.00` | `1000.00` | Cumple |
| Obligación con el contratista | `1000.00` | `1000.00` | Cumple |
| La cuenta por cobrar no aumenta | `0.00` | `0.00` | Cumple |
| No se puede cobrar al cliente sin aprobación comercial | `409` | `409` | Cumple |
| La obligación con el contratista permanece | `1000.00` | `1000.00` | Cumple |
| Absorber sin motivo | `true` | `true` | Cumple |
| Absorber con motivo | `200` | `200` | Cumple |
| El costo permanece con motivo y responsable | `["absorbido","1000.00",true,true]` | `["absorbido","1000.00",true,true]` | Cumple |
| La cantidad no se puso en cero | `1.0000` | `1.0000` | Cumple |
| Sigue sin cuenta por cobrar | `0.00` | `0.00` | Cumple |
| S1 no ve importes del adicional | `[null,null]` | `[null,null]` | Cumple |

Observaciones registradas:

- Exposición tras absorber: `null`

### CAS-16 · Aditiva propuesta

Reglas: PRE-04, ADI-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Aprobar la deductiva | `200` | `200` | Cumple |
| Vigente aprobado | `95000.00` | `95000.00` | Cumple |
| Original | `100000.00` | `100000.00` | Cumple |
| La aditiva pendiente se muestra separada | `true` | `{"original":"100000.00","additivesApproved":"0.00","deductivesApproved":"5000.00","current":"95000.00","executedValued":"0.00","pending":"100000.00","notComparable":0,"proposedNotApproved":"10000.00",` | Cumple |
| Aprobar la aditiva | `200` | `200` | Cumple |
| Vigente tras aceptar | `105000.00` | `105000.00` | Cumple |
| S1 no aprueba modificaciones | `true` | `true` | Cumple |
| S1 no propone modificaciones | `true` | `true` | Cumple |
| Una modificación aprobada no se vuelve a decidir | `409` | `409` | Cumple |

Observaciones registradas:

- Resumen: `{"original":"100000.00","additivesApproved":"0.00","deductivesApproved":"5000.00","current":"95000.00","executedValued":"0.00","pending":"100000.00","notComparable":0,"proposedNotApproved":"10000.00","withoutExecution":1}`
- Aprobar sin indicar quién aprobó por el cliente: `422 Indique quién aprobó por parte del cliente; una propuesta no aceptada no modifica el contrato.`

### CAS-17 · Jornada repartida

Reglas: JOR-03, GAS-03 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Jornada 60/40 | `200` | `200` | Cumple |
| Importe total | `600.00` | `600.00` | Cumple |
| Distribución | `["240.00","360.00"]` | `["240.00","360.00"]` | Cumple |
| Una sola jornada | `1` | `1` | Cumple |
| Distribuir 120 % | `422` | `422` | Cumple |
| Segunda jornada completa el mismo día sin justificar | `409` | `409` | Cumple |
| S1 no captura jornada en B | `403` | `403` | Cumple |
| La obra A recibe $360 de la jornada | `360.00` | `360.00` | Cumple |

Observaciones registradas:

- Respuesta: `{"id":"…","warnings":[]}`
- Renglón: `{"id":"…","recordVersion":1,"date":"2026-08-26","timeUnit":"jornada","qty":"1.0000","rate":"600.0000","amount":"600.00","status":"capturada","note":null,"overlapJustification":null,"workerId":"…","crewId":null,"contractorId":"…","who":"Trabajador (auditoría)","contractor":"K1 Contratista (auditoría)","period":"2026-S35","works":`
- Aprobar la jornada: `200 {"id":"…"}`
- Estimación de A con la jornada: `{"added":1,"items":[["Jornadas · Trabajador (auditoría) · 2026-08-26","jornada","360.00"]]}`

### CAS-18 · Evidencia pendiente

Reglas: EVI-03, EVI-04 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Validar el adicional sin foto | `409` | `409` | Cumple |
| El adicional se conserva reportado | `reportado` | `reportado` | Cumple |
| Vincular un adjunto que no existe (carga fallida) se rechaza | `true` | `404` | Cumple |
| Sigue sin evidencia | `0` | `0` | Cumple |
| Reintento de la carga con la misma clave de operación devuelve el mismo adjunto | `3daece29-9b03-4382-8a82-d983020ec8d4` | `3daece29-9b03-4382-8a82-d983020ec8d4` | Cumple |
| La misma fotografía (mismo contenido) no cuenta dos veces como evidencia | `1` | `2` | **No cumple** |
| Con evidencia confirmada sí se valida | `200` | `200` | Cumple |
| Trabajo oculto sin foto no se valida | `409` | `409` | Cumple |
| Excepción sin motivo | `422` | `422` | Cumple |
| S1 no concede la excepción | `403` | `403` | Cumple |
| La excepción queda visible con motivo y responsable | `true` | `{"reason":"Teléfono extraviado; verificado en sitio (auditoría)","authorizedBy":"5e74807b-cc45-4ea8-b3f6-a44bc3e548f3","authorizedByName":"D1 Dirección (auditoría)","at":"2026-10-13T01:51:01.088Z"}` | Cumple |

Observaciones registradas:

- Carga de un archivo vacío: `422 {"error":"validacion","message":"El archivo está vacío.","field":"file"}`
- Segunda carga del mismo archivo sin clave (p. ej. el usuario lo vuelve a elegir): `{"mismoId":false,"mismoHash":true}`
- Vínculos de evidencia tras elegir dos veces la misma foto: `2 (segundo vínculo: 200)`
- Excepción de evidencia para un adicional: `200 `

### CAS-19 · Cambio de plano

Reglas: EVI-08, EVI-09, DOC-02 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Versiones del plano | `[["sustituida",1],["vigente",2]]` | `[["sustituida",1],["vigente",2]]` | Cumple |
| La marca permanece en la versión 1 y no se mueve sola a la 2 | `[1,0]` | `[1,0]` | Cumple |
| La anotación conserva versión, página y coordenadas | `["70625678-051d-4471-ac54-512b65125cbc",1,[[0.25,0.4]]]` | `["70625678-051d-4471-ac54-512b65125cbc",1,[[0.25,0.4]]]` | Cumple |
| El documento publicado no cambió por subir el plano nuevo | `[{"plan":"Planta baja (auditoría)","version":1,"attachmentId":"1287260e-c79c-4905-93c9-f5a74152546f","page":1,` | `[{"plan":"Planta baja (auditoría)","version":1,"attachmentId":"1287260e-c79c-4905-93c9-f5a74152546f","page":1,"shape":"punto","points":[[0.25,0.4]],"label":"Zona ejecutada (auditoría)"}]` | Cumple |
| El documento publicado incluye el plano y referencia la versión 1 | `true` | `[{"plan":"Planta baja (auditoría)","version":1,"attachmentId":"1287260e-c79c-4905-93c9-f5a74152546f","page":1,"shape":"punto","points":[[0.25,0.4]],"label":"Zona ejecutada (auditoría)"}]` | Cumple |
| C1 no anota planos | `true` | `true` | Cumple |
| Coordenadas fuera de rango | `422` | `422` | Cumple |

Observaciones registradas:

- Anotación creada: `{"id":"…"}`
- Vincular la marca a la partida comercial: `200 {"id":"…"}`
- Planos en el documento publicado: `[{"plan":"Planta baja (auditoría)","version":1,"attachmentId":"…","page":1,"shape":"punto","points":[[0.25,0.4]],"label":"Zona ejecutada (auditoría)"}]`

### CAS-20 · Retrabajo

Reglas: AVA-08, ADI-11 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Capturar el retrabajo | `200` | `200` | Cumple |
| Ejecución entregada sigue en 20 (no 25) | `20.0000` | `25.0000` | **No cumple** |
| Lo cobrable al cliente son 20 m² | `20.00` | `25.00` | **No cumple** |
| El costo de la reparación queda identificado como retrabajo | `true` | `["Instalación de piso (auditoría)","Instalación de piso (auditoría)"]` | Cumple |

Observaciones registradas:

- Retrabajo sin clasificar la causa: `422 Indique si el retrabajo corrige un error de instalación, un cambio solicitado o es trabajo adicional.`
- Estimación del contratista: `[["Instalación de piso (auditoría)","20.0000","7000.00","ordinario"],["Instalación de piso (auditoría)","5.0000","1750.00","retrabajo"]]`
- Cobrable tras un retrabajo sin partida de presupuesto: `[["20.0000","ordinario","con partida"],["5.0000","retrabajo","con partida"],["3.0000","retrabajo","sin partida"]]`
- Reporte de retrabajos: `404 `

### CAS-21 · Cierre documentado

Reglas: CIE-02, CIE-03, CIE-04, CIE-14 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Tablero: bruto, banco, descuentos, efectivo | `["322879.30","41110.00","3770.00","277999.30"]` | `["322879.30","41110.00","3770.00","277999.30"]` | Cumple |
| Efectivo del cierre | `277999.30` | `277999.30` | Cumple |
| Conciliación al bruto | `0.00` | `0.00` | Cumple |
| Componentes suman el bruto | `322879.30` | `322879.30` | Cumple |
| Asignar a banco no marca pagado | `["0.00","sin_pago"]` | `["0.00","sin_pago"]` | Cumple |
| Instrucciones pendientes, no pagos | `[["banco","41110.00","pendiente"],["efectivo","277999.30","pendiente"]]` | `[["banco","41110.00","pendiente"],["efectivo","277999.30","pendiente"]]` | Cumple |
| No existe ningún desembolso creado por el cierre | `0` | `0` | Cumple |
| Los saldos de caja y banco no cambiaron | `["1000000.00","500000.00"]` | `["1000000.00","500000.00"]` | Cumple |
| Un descuento mayor al saldo liquidable | `true` | `true` | Cumple |
| No se genera efectivo negativo | `true` | `409` | Cumple |

Observaciones registradas:

- Descuento de $150 sobre obligación de $100: `409 El componente ($150.00) excede lo disponible de la obligación ($100.00).`

### CAS-22 · Una estimación, su pago y su salida de dinero: un solo costo

Reglas: GAS-15, IMP-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Costo registrado una sola vez | `28183.00` | `28183.00` | Cumple |
| Mano de obra, pagado y costos de la obra | `["28183.00","28183.00","28183.00"]` | `["28183.00","28183.00","28183.00"]` | Cumple |
| Una salida de caja | `471817.00` | `471817.00` | Cumple |
| Un solo movimiento de dinero | `1` | `1` | Cumple |
| No aparece 84,549 (tres veces el importe) | `false` | `false` | Cumple |
| La estimación quedó cerrada y enlazada a su obligación | `["cerrada","0e595721-ccab-4a07-aa0f-bde45405cbe7"]` | `["cerrada","0e595721-ccab-4a07-aa0f-bde45405cbe7"]` | Cumple |

Observaciones registradas:

- Costo en resultados: `[["ingresos","0.00"],["costo","0.00"],["bruta","0.00"],["opex","0.00"],["operativo","0.00"],["final",null]]`
- Cruce entre libros importados (estimaciones ↔ flujos): `Cubierto por la prueba automatizada existente tests/c_plataforma.test.js (propuesta "un solo hecho"); el tercer origen (detalle de Pagos Semanales) no se ejecutó en esta auditoría.`

### CAS-23 · Reintento de cierre

Reglas: CIE-08, CIE-09, PER-05 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Misma clave: mismo cierre y folio | `["5b812894-63ec-45f5-82d7-e205f2a40be0","CS-2026-S35-01"]` | `["5b812894-63ec-45f5-82d7-e205f2a40be0","CS-2026-S35-01"]` | Cumple |
| Un cierre, una obligación, una instrucción | `[1,1,1]` | `[1,1,1]` | Cumple |
| No se crea un segundo cierre ordinario | `1` | `1` | Cumple |
| La obligación no se duplicó | `5000.00` | `5000.00` | Cumple |
| La obligación tardía entra en un solo cierre | `1` | `1` | Cumple |
| Bruto total cerrado = 5,700 sin duplicar | `5700.00` | `5700.00` | Cumple |

Observaciones registradas:

- Doble clic sin clave (otra solicitud idéntica): `409 No hay estimaciones autorizadas pendientes de cierre en esta semana.`
- Dos confirmaciones simultáneas del complemento: `200/409`

### CAS-24 · Pago parcial

Reglas: PAG-04, PAG-05 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Pagado y saldo | `["4000.00","6000.00","parcial"]` | `["4000.00","6000.00","parcial"]` | Cumple |
| Aplicar $7,000 sobre saldo de $6,000 | `409` | `409` | Cumple |
| El excedente no queda sin clasificar | `true` | `422` | Cumple |
| El saldo no cambió por los intentos | `6000.00` | `6000.00` | Cumple |
| Liquidada | `["10000.00","0.00","pagado"]` | `["10000.00","0.00","pagado"]` | Cumple |
| Nada más que aplicar | `409` | `409` | Cumple |

Observaciones registradas:

- Mensaje: `La aplicación a OB-0001 ($7,000.00) excede su saldo disponible ($6,000.00). \| Reduzca el importe o registre la diferencia como anticipo identificado.`
- Pago de $7,000 aplicando $6,000 (excedente sin clasificar): `422 El pago ($7,000.00) no está aplicado por completo ($6,000.00).`

### CAS-25 · Un pago para dos obligaciones

Reglas: PAG-03, PAG-05 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Aplicar $7,000 con un pago de $6,000 | `422` | `422` | Cumple |
| Saldos | `["0.00","2000.00"]` | `["0.00","2000.00"]` | Cumple |
| Aplicación total | `6000.00` | `6000.00` | Cumple |
| Un solo movimiento de caja por $6,000 | `494000.00` | `494000.00` | Cumple |
| Un pago no mezcla obligaciones de beneficiarios distintos | `true` | `422 Un pago solo se aplica a obligaciones del mismo beneficiario.` | Cumple |
| No se paga a K1 una obligación de K2 | `true` | `422 Un pago solo se aplica a obligaciones del mismo beneficiario.` | Cumple |

### CAS-26 · Medio de pago mixto

Reglas: PAG-07, TES-04 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Una obligación liquidada | `["10000.00","10000.00","0.00"]` | `["10000.00","10000.00","0.00"]` | Cumple |
| Costo una sola vez | `10000.00` | `10000.00` | Cumple |
| Dos movimientos de dinero | `["996000.00","494000.00"]` | `["996000.00","494000.00"]` | Cumple |
| Una obligación, dos desembolsos | `[1,2]` | `[1,2]` | Cumple |
| La sugerencia no confirma | `["sugerido","sin_conciliar"]` | `["sugerido","sin_conciliar"]` | Cumple |
| El estado bancario no creó un tercer pago | `[2,"996000.00"]` | `[2,"996000.00"]` | Cumple |
| La obligación sigue en saldo cero, no negativo | `0.00` | `0.00` | Cumple |
| Reimportar el mismo estado no duplica | `true` | `true` | Cumple |

### CAS-27 · Pago preparado o rechazado

Reglas: PAG-02, PAG-11 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Preparado: reservado, no pagado | `["0.00","10000.00","sin_pago"]` | `["0.00","10000.00","sin_pago"]` | Cumple |
| Confirmar sin autorización (aun con comprobante) | `409` | `409` | Cumple |
| Sigue sin pago | `0.00` | `0.00` | Cumple |
| Caja sin movimiento | `500000.00` | `500000.00` | Cumple |
| Rechazar sin motivo | `422` | `422` | Cumple |
| Rechazado: obligación pendiente y reserva liberada | `["0.00","0.00","10000.00"]` | `["0.00","0.00","10000.00"]` | Cumple |
| Queda historial con motivo | `["rechazado",true]` | `["rechazado",true]` | Cumple |
| Un pago rechazado no se confirma | `409` | `409` | Cumple |
| Reintento con un pago nuevo liquida | `0.00` | `0.00` | Cumple |
| El rechazado se conserva | `rechazado` | `rechazado` | Cumple |

### CAS-28 · Reverso

Reglas: PAG-12, AUD-03 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Reversar sin motivo | `422` | `422` | Cumple |
| Tesorería no reversa | `403` | `403` | Cumple |
| Pagado neto y saldo | `["4000.00","6000.00"]` | `["4000.00","6000.00"]` | Cumple |
| Original, reverso y primer pago conservados | `["revertido","confirmado","confirmado"]` | `["revertido","confirmado","confirmado"]` | Cumple |
| La caja recupera los $6,000 | `496000.00` | `496000.00` | Cumple |
| No se reversa dos veces | `409` | `409` | Cumple |
| No se reversa el reverso | `true` | `true` | Cumple |
| Un pago no se elimina | `true` | `404` | Cumple |
| Auditoría íntegra | `true` | `true` | Cumple |

### CAS-29 · Corregir tras pagar

Reglas: EST-12, EST-13 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Obligación autorizada | `10000.00` | `10000.00` | Cumple |
| Reabrir sin motivo | `422` | `422` | Cumple |
| La obligación no queda por debajo de lo pagado sin tratamiento explícito del sobrepago | `true` | `{"gross":"10000.00","paid":"8000.00","balance":"2000.00"}` | Cumple |
| No hay saldo negativo sin explicación | `true` | `2000.00` | Cumple |
| Tras la ruta alterna la obligación no queda por debajo de lo pagado sin tratamiento del sobrepago | `true` | `{"gross":"10000.00","paid":"8000.00","balance":"2000.00"}` | Cumple |
| Las aplicaciones de pago se conservan | `1` | `1` | Cumple |
| No coexisten dos obligaciones vigentes por la misma estimación | `true` | `1 obligaciones, bruto vigente total 10000` | Cumple |

Observaciones registradas:

- Reabrir una estimación con $8,000 pagados: `200 {"id":"…","version":2}`
- Obligación tras reabrir: `{"gross":"10000.00","paid":"8000.00","balance":"2000.00","status":"autorizada","payStatus":"parcial"}`
- Ajuste −37.5 ml (deja el importe en $7,000): `200 / decidir 409 {"error":"bloqueado","message":"El ajuste dejaría la ejecución (87.50) por debajo de lo ya incluido en documentos de pago al contratista (125.00).","reasons":[],"fix":"Reabra o corrija primero el documento que incluye esa cantidad."}`
- Estimación tras el ajuste: `{"status":"revision_interna","version":2,"gross":"10000.00","items":[["125.0000","10000.00","pendiente"]]}`
- Reautorizar por el importe corregido: `200 {"id":"…","status":"autorizada","authorizedTotal":"10000.00","obligationId":"…","excluded":0,"version":2}`
- Obligaciones existentes al final: `[["OB-0001","10000.00","autorizada"]]`
- Obligación original al final: `{"gross":"10000.00","paid":"8000.00","balance":"2000.00","payStatus":"parcial"}`
- Ruta alterna: reabrir → rechazar partida → partida fija de $7,000 → autorizar: `reabrir 200 / rechazar 200  / partida 200 / autorizar 409 {"error":"bloqueado","message":"El nuevo total autorizado ($7,000.00) queda por debajo de lo ya pagado o aplicado ($8,000.00).","reasons":[],"fix":"Registre primero un ajuste compensatorio explícito: revierta el pago excedente o conviértalo en anticipo a favor`
- Obligación tras la ruta alterna: `{"gross":"10000.00","paid":"8000.00","balance":"2000.00","payStatus":"parcial","status":"autorizada"}`
- Avance de origen tras rechazar la partida: `{"qty":"125.0000","paidQty":"0.0000","effectiveQty":"125.0000"}`

### CAS-30 · Anticipo al contratista

Reglas: JOR-08, PAG-15 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Anticipo sin motivo | `422` | `422` | Cumple |
| Anticipo con saldo | `["2000.00","2000.00"]` | `["2000.00","2000.00"]` | Cumple |
| Entregar el anticipo no es costo | `0.00` | `0.00` | Cumple |
| Aplicar más que el saldo del anticipo | `409` | `409` | Cumple |
| Aplicar el anticipo de K1 a una obligación de K2 | `422` | `422` | Cumple |
| Pagar $10,000 completos después de aplicar el anticipo | `409` | `409` | Cumple |
| Obligación liquidada | `["0.00","pagado"]` | `["0.00","pagado"]` | Cumple |
| Anticipo disponible cero | `0.00` | `0.00` | Cumple |
| Desembolsos acumulados = $10,000 | `490000.00` | `490000.00` | Cumple |
| Costo = $10,000 de K1 + $500 de la obligación de K2 del propio caso (no $12,500: el anticipo no se suma) | `10500.00` | `10500.00` | Cumple |
| El anticipo agotado no se aplica otra vez | `409` | `409` | Cumple |

Observaciones registradas:

- Obligación tras aplicar el anticipo: `{"gross":"10000.00","paid":"0.00","balance":"8000.00","advances":"2000.00","available":"8000.00"}`

### CAS-31 · Estimación comercial distinta

Reglas: CLI-01, CLI-03, CLI-04 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El contratista cobra los 60 m² en su semana | `21000.00` | `21000.00` | Cumple |
| Proponer 15 m² del segundo avance | `200` | `200` | Cumple |
| Contratado, acumulado anterior y periodo | `["100.0000","40.0000","15.0000"]` | `["100.0000","40.0000","15.0000"]` | Cumple |
| Acumulado resultante 55 | `55.0000` | `55.0000` | Cumple |
| Quedan 5 m² elegibles | `5.00` | `5.00` | Cumple |
| No se puede proponer de nuevo lo ya aprobado | `409` | `409` | Cumple |
| Ni más de lo disponible del avance | `409` | `409` | Cumple |
| La ejecución de origen no cambió | `2` | `2` | Cumple |

Observaciones registradas:

- Acumulado resultante y pendiente: `{}`
- Ejecución pendiente de estimar al cliente (ya pagada al contratista): `[["5.0000","20.0000"]]`
- Disponible tras cancelar la segunda estimación: `20.00`

### CAS-32 · Aprobación parcial del cliente

Reglas: CLI-07, CLI-09 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Aprobado $1,500 (no $2,000) | `["1500.00","1500.00"]` | `["1500.00","1500.00"]` | Cumple |
| Propuesto y aceptado por partida | `["20.0000","15.0000"]` | `["20.0000","15.0000"]` | Cumple |
| 5 m² pendientes de resolver | `5.00` | `5.00` | Cumple |
| No se creó ejecución nueva | `1` | `1` | Cumple |
| La cuenta por cobrar es lo aprobado | `1500.00` | `1500.00` | Cumple |
| El cliente no acepta más de lo propuesto | `true` | `true` | Cumple |

### CAS-33 · Factura vinculada

Reglas: CLI-11, COB-10 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Estimación aprobada | `10000.00` | `10000.00` | Cumple |
| Una sola cuenta por cobrar de $10,000 | `["10000.00","10000.00","0.00"]` | `["10000.00","10000.00","0.00"]` | Cumple |
| Facturar de más contra la misma estimación | `true` | `true` | Cumple |
| Folio de factura repetido | `true` | `true` | Cumple |
| Cobrado $4,000, saldo $6,000 | `["4000.00","6000.00","6000.00"]` | `["4000.00","6000.00","6000.00"]` | Cumple |
| Banco +$4,000 | `1004000.00` | `1004000.00` | Cumple |
| Mismo cobro repetido (referencia e importe) | `409` | `409` | Cumple |
| Generar el PDF operativo no la marca como facturada o timbrada | `false` | `false` | Cumple |

### CAS-34 · Anticipo del cliente

Reglas: COB-03, COB-04 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El anticipo entra a banco | `1003000.00` | `1003000.00` | Cumple |
| Saldo del anticipo | `3000.00` | `3000.00` | Cumple |
| Recibir el anticipo no aumenta ejecución ni aprobado | `0.00` | `0.00` | Cumple |
| Amortización $2,000 y exigible $8,000 | `["2000.00","8000.00"]` | `["2000.00","8000.00"]` | Cumple |
| Anticipo pendiente $1,000 | `1000.00` | `1000.00` | Cumple |
| Amortizar no mueve la caja | `1003000.00` | `1003000.00` | Cumple |
| Saldo exigible de la estimación | `8000.00` | `8000.00` | Cumple |
| La segunda amortización no supera el saldo del anticipo ($1,000 aunque el 20 % sean $2,000) | `1000.00` | `1000.00` | Cumple |
| Anticipo agotado | `0.00` | `0.00` | Cumple |
| Total cobrado en caja sigue siendo solo el anticipo | `1003000.00` | `1003000.00` | Cumple |

### CAS-35 · Fórmula contractual explícita (solo prueba)

Reglas: COB-07, COB-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Subtotal, impuesto, amortización, garantía, líquido | `["1000.00","80.00","75.60","50.00","954.40"]` | `["1000.00","80.00","75.60","50.00","954.40"]` | Cumple |
| Total aprobado | `954.40` | `954.40` | Cumple |
| Consumo de anticipo | `424.40` | `424.40` | Cumple |
| Cada porcentaje declara su base | `true` | `[["tax","8.0000","subtotal más ajustes"],["amortization","7.0000","total con impuestos"],["retention","5.0000","subtotal más ajustes (antes de impuestos)"]]` | Cumple |
| Sin contrato no se aplica ninguna tasa por omisión | `true` | `{"subtotal":"1000.00","taxAmount":"0.00","amortization":"0.00","retention":"0.00","total":"1000.00","enviar":"200/200 "}` | Cumple |
| Sin contrato el total queda indeterminado o sin impuesto, no con una tasa inventada | `true` | `{"subtotal":"1000.00","taxAmount":"0.00","amortization":"0.00","retention":"0.00","total":"1000.00","enviar":"200/200 "}` | Cumple |

Observaciones registradas:

- Líneas del resumen (orden visible): `[["tax","8.0000","subtotal más ajustes",null],["amortization","7.0000","total con impuestos",null],["retention","5.0000","subtotal más ajustes (antes de impuestos)",null]]`
- Estimación sin condiciones de contrato registradas: `{"subtotal":"1000.00","taxAmount":"0.00","amortization":"0.00","retention":"0.00","total":"1000.00","enviar":"200/200 "}`

### CAS-36 · Liberación de garantía

Reglas: COB-05, COB-06 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Líquido con retención | `1030.00` | `1030.00` | Cumple |
| Garantía retenida visible | `["50.00","50.00","retenida"]` | `["50.00","50.00","retenida"]` | Cumple |
| Liberar más de lo retenido | `422` | `422` | Cumple |
| S1 no libera garantías | `true` | `true` | Cumple |
| Saldo de garantía cero | `["0.00","liberada"]` | `["0.00","liberada"]` | Cumple |
| Exigible aumenta $50 | `1080.00` | `1080.00` | Cumple |
| El trabajo aprobado (ingreso) no aumenta | `1000.00` | `1000.00` | Cumple |
| Liberar no es cobrar: banco sin cambio | `1000000.00` | `1000000.00` | Cumple |
| No se libera dos veces | `422` | `422` | Cumple |

Observaciones registradas:

- Estimación tras liberar: `{"retention":"50.00","total":"1030.00","subtotal":"1000.00"}`

### CAS-37 · Cobro superior al saldo

Reglas: COB-10, COB-11 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Aplicar $9,000 a un saldo de $8,000 | `409` | `409` | Cumple |
| Recibir $9,000 aplicando $8,000 | `200` | `200` | Cumple |
| Excedente sin aplicar identificado en el cobro | `1000.00` | `null` | **No cumple** |
| Saldo de la estimación cero, no negativo | `0.00` | `0.00` | Cumple |
| Un cobro de C1 no se registra en una obra de C2 | `422` | `422` | Cumple |
| El excedente no se aplica a una estimación ya saldada | `true` | `409 La aplicación a EK-AUD-A-01 ($1,000.00) supera su saldo ($0.00).` | Cumple |

Observaciones registradas:

- Cobro registrado (campos): `{"folio":"CB-0001","kind":"cobro","date":"2026-09-10","reference":"T-37b","grossAmount":"9000.00","commission":null,"netAmount":"9000.00","commissionNature":null,"commissionValidated":null,"status":"confirmado","note":null,"workId":"…","clientId":"…","client":"C1 Cliente (auditoría)","work":"Obra A (auditoría)","account":"Banco `
- Resumen de cuentas por cobrar: `{"approvedBalance":"0.00","pendingInvoice":"8000.00","advancesAvailable":"0.00","retained":"0.00","overdue":"0.00","overdueCount":0,"buckets":{"por_vencer":"0.00","vencido_1_30":"0.00","vencido_31_60":"0.00","vencido_61_90":"0.00","vencido_90_mas":"0.00","sin_vencimiento":"0.00"},"basis":"Saldo = total aprobado − cobros aplicado`
- Listado de cobros (¿muestra lo no aplicado?): `[{"grossAmount":"9000.00","applied":"8000.00"}]`

### CAS-38 · Fecha de vencimiento

Reglas: COB-12, SEM-06 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El vencimiento registrado se conserva | `2026-10-01` | `2026-10-01` | Cumple |
| Días vencidos contados desde el vencimiento (hoy 2026-10-12) | `11` | `11` | Cumple |
| Clasificación por antigüedad | `vencido_1_30` | `vencido_1_30` | Cumple |
| La antigüedad admite una fecha de corte elegida (asOf=2026-11-12 → 42 días) | `42` | `11` | **No cumple** |
| El vencimiento capturado no se sustituye sin aviso | `true` | `{"vistoPorElCliente":"2026-10-01","dueDate":"2026-10-28","avisa":false}` | **No cumple** |

Observaciones registradas:

- Fijar vencimiento 01/10/2026: `200`
- Renglón por cobrar: `{"dueDate":"2026-10-01","daysOverdue":11,"aging":"vencido_1_30","hoy":"2026-10-12"}`
- Vencimiento capturado 01/10/2026 con contrato de 15 días: `{"vistoPorElCliente":"2026-10-01","dueDate":"2026-10-28","avisa":false}`
- Reporte de antigüedad con asOf=2026-11-12: `404 {"error":"no_encontrado","message":"El reporte no existe o no está disponible para usted."}`

### CAS-39 · Bruto, comisión y neto

Reglas: COB-15, RES-07 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Bruto, comisión y neto por separado | `["350283.56","35028.36","315255.20"]` | `["350283.56","35028.36","315255.20"]` | Cumple |
| Neto + comisión = bruto | `350283.56` | `350283.56` | Cumple |
| A banco entra el neto | `1315255.20` | `1315255.20` | Cumple |
| El anticipo del cliente vale el bruto (la comisión no es cobro faltante) | `350283.56` | `350283.56` | Cumple |
| La naturaleza de la comisión queda pendiente de validar | `[false,"pendiente de validar"]` | `[false,"pendiente de validar"]` | Cumple |
| No aparece saldo por cobrar por la comisión | `0.00` | `0.00` | Cumple |
| La comisión no se resta dos veces del flujo | `1` | `1` | Cumple |
| aux no valida la naturaleza de la comisión | `true` | `true` | Cumple |

Observaciones registradas:

- Comisión en resultados: `[]`

### CAS-40 · Diferencia que requiere revisión

Reglas: COB-16, IMP-09 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La diferencia de $124.33 no se acepta en silencio | `true` | `422` | Cumple |
| Una diferencia de 50 centavos en un pago queda como saldo visible, no se redondea sola | `["0.50","parcial"]` | `["0.50","parcial"]` | Cumple |

Observaciones registradas:

- Cobro cuyo neto implica comisión de 49,569.37 pero declara 49,693.70 (diferencia 124.33): `422 {"error":"validacion","message":"Bruto menos comisión ($447,243.30) no coincide con el neto capturado ($447,367.63).","field":"netAmount","fix":"Verifique los tres importes contra el documento de origen."}`
- Diferencia de un centavo entre bruto − comisión y neto: `422 Bruto menos comisión ($900.00) no coincide con el neto capturado ($899.99).`
- Tolerancia de centavos configurada: `{"value":"1.00","requiresDecision":true}`
- Conflicto entre fuentes importadas (IMP-09): `La prueba automatizada tests/c_plataforma.test.js verifica fecha_conflicto en simulación; la resolución registrada de un conflicto de importe entre dos libros no se ejecutó aquí.`

### CAS-41 · Costo distribuido

Reglas: GAS-03, GAS-14 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Distribuir $700 + $400 sobre $1,000 | `422` | `422` | Cumple |
| 70 % / 30 % | `["700.00","300.00"]` | `["700.00","300.00"]` | Cumple |
| Costo por obra y total | `["700.00","300.00","1000.00"]` | `["700.00","300.00","1000.00"]` | Cumple |
| Reclasificación entre obras admitida con historial | `200` | `200` | Cumple |
| El total de empresa no cambia al reclasificar | `["600.00","400.00","1000.00"]` | `["600.00","400.00","1000.00"]` | Cumple |
| Reclasificar sin facultad (auxiliar) sobre gasto autorizado | `true` | `true` | Cumple |

Observaciones registradas:

- Reclasificar a $600/$400 con el gasto ya autorizado: `200  `
- Eventos de auditoría del gasto: `["estado gasto","captura gasto"]`

### CAS-42 · Gasto y pago separados

Reglas: GAS-02, GAS-05, PAG-15 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Un gasto sin autorizar no es costo | `0.00` | `0.00` | Cumple |
| Autorizado: costo $1,000 y desembolso cero | `["1000.00","500000.00"]` | `["1000.00","500000.00"]` | Cumple |
| Estado de pago | `sin_pago` | `sin_pago` | Cumple |
| Pagado | `pagado` | `pagado` | Cumple |
| El pago no agrega otro costo | `1000.00` | `1000.00` | Cumple |
| Fechas separadas: documento, autorización y pago | `[true,true,true]` | `[true,false,true]` | **No cumple** |
| Una obligación y un desembolso para un comprobante | `[1,1,1]` | `[1,1,1]` | Cumple |
| Nota sin desglose: no se inventa el impuesto | `[null,null,"580.00"]` | `[null,null,"580.00"]` | Cumple |

Observaciones registradas:

- Indicadores de pendientes en el listado: `[["GA-0001","autorizado",false],["GA-0002","borrador",false]]`

### CAS-43 · Caja chica

Reglas: CAJ-02, CAJ-04 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La entrega no es gasto | `0` | `0` | Cumple |
| Efectivo restante $800 y por reponer $1,200 | `["800.00","1200.00"]` | `["800.00","1200.00"]` | Cumple |
| El mismo recibo no se comprueba dos veces | `409` | `409` | Cumple |
| Ni en otro fondo | `true` | `true` | Cumple |
| Fondo de vuelta en $2,000 | `["2000.00","0.00"]` | `["2000.00","0.00"]` | Cumple |
| Gasto comprobado sigue en $1,200 | `["1200.00","1200.00"]` | `["1200.00","1200.00"]` | Cumple |
| Caja general: salieron $3,200 en total | `496800.00` | `496800.00` | Cumple |
| Conciliación del fondo: entregas + reposiciones = disponible + comprobado | `3200.00` | `3200.00` | Cumple |
| Reponer más de lo comprobado | `true` | `false` | **No cumple** |

Observaciones registradas:

- Fondo tras comprobar: `{"id":"…","code":"CC-01","name":"Fondo de obra A (auditoría)","authorizedAmount":"2000.00","status":"activo","accountId":"…","responsible":"S1 Supervisor (auditoría)","balance":"800.00","delivered":"2000.00","verified":"1200.00","rejected":"0.00","returned":"0.00","replenished":"0.00","toReplenish":"1200.00","movements":[{"id":"`

### CAS-44 · Prorrateo idempotente

Reglas: GAS-11, GAS-12, GAS-13 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Regla sin aprobar no se aplica | `409` | `409` | Cumple |
| Aprobar la regla sin motivo | `422` | `422` | Cumple |
| Asignaciones $3,000 / $7,000 | `["3000.00","7000.00"]` | `["3000.00","7000.00"]` | Cumple |
| Asignado total | `10000.00` | `10000.00` | Cumple |
| Reejecutar sin motivo | `422` | `422` | Cumple |
| Reejecutar no duplica: sigue en $10,000 | `["10000.00",2]` | `["10000.00",2]` | Cumple |
| Cada ejecución conserva periodo, base, resultado y redondeo | `[2,true]` | `[2,true]` | Cumple |
| Costo total $10,000 más mano de obra $100,000 | `110000.00` | `110000.00` | Cumple |
| Un gasto ya autorizado no se vuelve a prorratear | `409` | `409` | Cumple |
| Sin base en el periodo no se reparte por partes iguales | `409` | `409` | Cumple |
| Auxiliar no crea ni aplica reglas | `true` | `true` | Cumple |

Observaciones registradas:

- Resultado del prorrateo: `{"id":"…","roundingDiff":"0.00","rows":[{"work":"Obra A (auditoría)","workId":"…","amount":"3000.00"},{"work":"Obra B (auditoría)","workId":"…","amount":"7000.00"}]}`

### CAS-45 · Insumos

Reglas: INS-01, INS-02, INS-03, INS-04, INS-05, INS-06 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Recepción de 50 | `200` | `200` | Cumple |
| La compra no es consumo | `["50.0000","0.0000","0.0000"]` | `["50.0000","0.0000","0.0000"]` | Cumple |
| Entregar 30 a A | `200` | `200` | Cumple |
| Consumir 25 en A | `200` | `200` | Cumple |
| Devolver 5 al almacén | `200` | `200` | Cumple |
| Almacén 25, en obra 0, consumido 25 | `["25.0000","0.0000","25.0000"]` | `["25.0000","0.0000","25.0000"]` | Cumple |
| Sin existencias negativas en la secuencia correcta | `false` | `false` | Cumple |
| Entregar más de la existencia se bloquea o exige una política/justificación | `true` | `200 → almacén -15.0000` | Cumple |
| Consumir más de lo entregado a la obra se bloquea o exige justificación | `true` | `200 → en obra -15.0000` | Cumple |
| La existencia negativa queda marcada (no se oculta) | `true` | `true` | Cumple |
| El consumo de A se valora en $2,500 | `true` | `no aparece un costo de consumo de $2,500 en existencias ni en el reporte` | **No cumple** |
| La compra de $5,000 no se imputa íntegra como costo de A | `true` | `[]` | Cumple |
| Sin superficie ejecutada el consumo por m² no es calculable (ni cero) | `[null,false]` | `[null,false]` | Cumple |

Observaciones registradas:

- Existencia por obra: `[{"workId":"…","work":"Obra A (auditoría)","onSite":"0.0000","consumed":"25.0000"}]`
- Entregar 25 con 10 en almacén y consumir 40 con 25 en obra: `{"entrega":200,"consumo":200,"inStore":"-15.0000","atWorks":"-15.0000","negative":true,"mensaje":[{"type":"existencia_insuficiente","message":"El almacén registra 10.00; la entrega deja la existencia en negativo. Revise si falta capturar una recepción o el inventario inicial."}]}`
- Reporte de consumos (¿valora el costo?): `[{"supply":"Adhesivo en saco (auditoría)","unit":"bulto","work":"Almacén (stock)","onSite":"25.0000","consumed":null},{"supply":"Adhesivo en saco (auditoría)","unit":"bulto","work":"Obra A (auditoría)","onSite":"0.0000","consumed":"25.0000"},{"supply":"Boquilla (auditoría)","unit":"bulto","work":"Almacén (stock)","onSite":"-15.0`
- Costos tras la compra para stock: `[]`
- Movimiento en otra unidad sin conversión registrada: `409 No hay una conversión aprobada de pza a bulto para este insumo.`

### CAS-46 · Traspaso interno

Reglas: TES-02, SEM-01 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Saldos | `["7000.00","8000.00"]` | `["7000.00","8000.00"]` | Cumple |
| Resultado sin cambio | `["0.00","0.00","0.00","0.00","0.00",null]` | `["0.00","0.00","0.00","0.00","0.00",null]` | Cumple |
| Flujo de operación sin cambio y transferencia neta cero | `["0.00","0.00"]` | `["0.00","0.00"]` | Cumple |
| Salida y entrada vinculadas | `[2,true]` | `[2,true]` | Cumple |
| Transferir más del saldo | `true` | `false` | **No cumple** |
| Transferir a la misma cuenta | `422` | `422` | Cumple |

Observaciones registradas:

- Transferencia: `{"id":"…"}`

### CAS-47 · Margen consolidado

Reglas: REP-03, RES-01 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Obra A: ingreso 100, costo 90 | `["100.00","90.00","10.00"]` | `["100.00","90.00","10.00"]` | Cumple |
| Obra B: ingreso 900, costo 450 | `["900.00","450.00","450.00"]` | `["900.00","450.00","450.00"]` | Cumple |
| Consolidado: ingreso 1,000, costo 540, margen 460 | `["1000.00","540.00","460.00"]` | `["1000.00","540.00","460.00"]` | Cumple |
| No aparece un margen promedio de 30 % | `false` | `false` | Cumple |
| El margen consolidado disponible es 46 % (460 / 1,000) | `true` | `no se encontró un porcentaje consolidado de 46 % en resultados ni en el explorador` | Cumple |
| Sin ingreso el porcentaje es "no calculable", no 0 % ni infinito | `null` | `null` | Cumple |

Observaciones registradas:

- Resultado con obras sin clasificar: `{"lines":[["ingresos","0.00"],["costo","0.00"],["bruta","0.00"],["opex","0.00"],["operativo","0.00"],["final",null]],"pendientes":["Política de reconocimiento de ingresos sin validar.","2 obra(s) pendiente(s) de clasificar; no se incluyen ni se excluyen en silencio: Obra A (auditoría), Obra B (auditoría)."]}`
- Porcentajes por obra: `["10.00","50.00"]`
- Resultado de empresa (obras incluidas): `{"lines":[["ingresos","1000.00",null],["costo","540.00",null],["bruta","460.00","46.00"],["opex","0.00",null],["operativo","460.00","46.00"],["final",null,null]],"partial":true,"pendientes":["Política de reconocimiento de ingresos sin validar."]}`
- Explorador: resultado por obra: `"404 El conjunto de datos no existe o no está disponible para usted."`
- Conjuntos y medidas del explorador: `[["avances",["n:count","qty:qty","paidQty:qty","billedQty:qty","unbilledQty:qty"]],["mano_obra",["amount:money","authorized:money","qty:qty","n:count"]],["obligaciones",["gross:money","discounts:money","advances:money","netPayable:money","bankPlanned:money","cashPlanned:money","paid:money","balance:money","n:count"]],["desembols`

### CAS-48 · Total paginado

Reglas: REP-01, REP-02 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Página de 10, total general de 25 = $2,500 | `[10,25,"2500.00"]` | `[10,25,"2500.00"]` | Cumple |
| La última página trae 5 y el mismo total | `[5,"2500.00"]` | `[5,"2500.00"]` | Cumple |
| Filtro de 12: total $1,200 | `[12,"1200.00"]` | `[12,"1200.00"]` | Cumple |
| El CSV contiene las 12 filas (más encabezado) | `13` | `13` | Cumple |
| El PDF del listado se genera | `["%PDF",200]` | `["%PDF",200]` | Cumple |
| El reporte declara fecha de corte | `true` | `2026-10-12` | Cumple |
| El tamaño de página está acotado | `true` | `true` | Cumple |

Observaciones registradas:

- Reporte fijo: declara corte y nota: `{"asOf":"2026-10-12","note":"Base: estimaciones de contratista autorizadas y gastos autorizados según su distribución. Los pagos no se suman otra vez.","title":"Costos por categoría y obra"}`

### CAS-49 · Redondeo declarado

Reglas: SEM-07 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Tarifa de $0.005 | `200` | `200` | Cumple |
| Cantidad desmesurada rechazada | `true` | `200` | **No cumple** |
| Cada renglón $0.01 (mitad hacia arriba) | `["0.01","0.01"]` | `["0.01","0.01"]` | Cumple |
| Total $0.02 en pantalla | `["0.02","0.02"]` | `["0.02","0.02"]` | Cumple |
| Cierre $0.02 | `0.02` | `0.02` | Cumple |
| Documento: renglones y total | `[["$0.01","$0.01"],true]` | `[["$0.01","$0.01"],true]` | Cumple |
| CSV con 0.01 por renglón | `2` | `2` | Cumple |
| La obligación vale $0.02 | `0.02` | `0.02` | Cumple |

Observaciones registradas:

- Cantidad desmesurada: `200 `
- Cantidad con 9 decimales: `200  → 1.1235`
- Unidad del concepto: pza; capturar 1.37: `200 `
- Precio con más decimales que la precisión: `200 {"id":"…"}`
- Precios guardados para el concepto: `["0.0050","0.0001"]`

### CAS-50 · Fechas y cantidades conflictivas

Reglas: IMP-09 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La diferencia de cantidad se reporta como cambio o conflicto, no como alta nueva silenciosa | `true` | `{"altas":0,"coincidencias":4,"cambios":1,"rechazos":0,"excluidos":1,"yaImportados":0}` | Cumple |
| El registro en conflicto muestra el valor anterior (72.08) junto al nuevo | `true` | `el registro nuevo no referencia el valor anterior` | **No cumple** |
| Año incongruente entre semanas contiguas: conflicto de fecha explícito | `true` | `true` | Cumple |
| La importación como evidencia no crea avances, obligaciones ni movimientos | `0` | `0` | Cumple |
| Las incidencias tienen estado y pueden resolverse con registro | `true` | `1` | Cumple |

Observaciones registradas:

- Simulación del segundo libro (72.78 frente a 72.08): `{"counts":{"altas":0,"coincidencias":4,"cambios":1,"rechazos":0,"excluidos":1,"yaImportados":0},"issues":{},"byKind":{"partida_contratacion":{"altas":0,"coincidencias":2,"cambios":0},"avance_semanal":{"altas":0,"coincidencias":2,"cambios":1}}}`
- Registro en conflicto: `{"kind":"avance_semanal","sheet":"Balcones","cell":"J11","status":"simulado","summary":"work: Balcones · section: PISOS INTERIORES · concept: Partida dos · unit: m2 · year: 2026 · week: 35 · weekRange: 24 - 29 Agosto · qty: 72.7800 · unitPrice: 100.0000 · amount: 7278.00"}`
- Incidencias del libro con año 2025 en la semana 35: `{"fecha_conflicto":1}`
- Confirmar el libro con la cantidad distinta sin resolver el conflicto: `200 {"id":"…","written":1,"matched":4,"changed":1,"created":{"works":0,"parties":0},"cross":{"proposals":0,"differences":0}}`
- Confirmar el libro con conflicto de fecha: `200 {"id":"…","written":5,"matched":0,"changed":0,"created":{"works":0,"parties":0},"cross":{"proposals":0,"differences":0}}`
- Incidencias de calidad registradas: `[["fecha_conflicto","abierta",null]]`

### CAS-51 · Subtotales y errores de fórmula

Reglas: IMP-04, IMP-07 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El subtotal no se carga como transacción | `true` | `true` | Cumple |
| Total transaccional $300, nunca $600 | `300.00` | `300.00` | Cumple |
| El error #NAME? se registra como incidencia | `true` | `true` | Cumple |
| Los importes válidos no se anulan por el error de otra celda | `2` | `2` | Cumple |
| Ningún importe quedó en cero por el error | `true` | `[100,200]` | Cumple |
| La simulación no escribió registros | `0` | `0` | Cumple |

Observaciones registradas:

- Simulación: `{"counts":{"altas":4,"coincidencias":0,"cambios":0,"rechazos":0,"excluidos":1,"yaImportados":0},"issues":{"error_formula":1},"totals":{"checked":1,"withDifference":0,"differences":[]},"byKind":{"partida_contratacion":{"altas":2,"coincidencias":0,"cambios":0},"avance_semanal":{"altas":2,"coincidencias":0,"cambios":0}}}`
- Importes de avances leídos: `[100,200]`

### CAS-52 · Lote repetido y simulación

Reglas: IMP-10, IMP-12 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Simulación sin escritura | `0` | `0` | Cumple |
| Informa leídos, válidos, excluidos y repetidos | `true` | `["altas","coincidencias","cambios","rechazos","excluidos","yaImportados"]` | Cumple |
| Confirmar sin estrategia de arranque | `409` | `409` | Cumple |
| Primera confirmación escribe lo previsto | `5` | `5` | Cumple |
| Segunda confirmación: sin duplicados | `[true,0]` | `[true,0]` | Cumple |
| Subir el mismo archivo abre el lote existente | `[true,"638e3cfa-a2ae-4ccb-8a6c-b305044e4102"]` | `[true,"638e3cfa-a2ae-4ccb-8a6c-b305044e4102"]` | Cumple |
| El archivo modificado es otro lote | `true` | `true` | Cumple |
| La simulación del segundo no altera el primero | `5` | `5` | Cumple |
| S1 no importa | `true` | `true` | Cumple |
| Revertir un lote sin dependencias lo retira | `0` | `0` | Cumple |
| Revertir sin motivo | `422` | `422` | Cumple |
| Archivo inválido rechazado | `true` | `422` | Cumple |

Observaciones registradas:

- Informe de simulación: `{"altas":5,"coincidencias":0,"cambios":0,"rechazos":0,"excluidos":1,"yaImportados":0}`
- Contenido modificado: comparación: `{"altas":0,"coincidencias":4,"cambios":1,"rechazos":0,"excluidos":1,"yaImportados":0}`
- Confirmar la versión modificada: `{"id":"…","written":5,"matched":0,"changed":0,"created":{"works":0,"parties":0},"cross":{"proposals":0,"differences":0}}`
- Archivo que no es un libro y nombre con ruta: `422 El archivo no pudo leerse como libro de Excel (.xlsx).`

### CAS-53 · Apertura coherente

Reglas: IMP-14, TES-01 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Saldo $1,080 | `1080.00` | `1080.00` | Cumple |
| Un movimiento anterior al corte de apertura se bloquea o no altera el saldo | `true` | `200, saldo 1030.00` | **No cumple** |
| El saldo inicial no se reescribe sin control cuando ya hay movimientos | `true` | `422, saldo 1030.00` | Cumple |
| Ajuste de saldo sin motivo ni categoría | `422` | `422` | Cumple |
| Tesorería no autoriza ajustes de saldo | `403` | `403` | Cumple |

Observaciones registradas:

- Movimiento con fecha anterior al saldo inicial: `200 `
- Editar el saldo inicial con movimientos posteriores: `422 La cuenta ya tiene movimientos: su saldo inicial no se edita. Registre un ajuste de saldo visible y autorizado.`
- Parámetros de estrategia de apertura: `[{"id":"…","recordVersion":1,"key":"startup.openingDate","description":"Fecha de apertura de saldos, cuando la estrategia sea saldos iniciales.","requiresDecision":true,"value":null}]`

### CAS-54 · Fallo intermedio

Reglas: PER-03, PER-04, CIE-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Tras el fallo "after-first-collection" el estado anterior queda íntegro | `[[0,0,0,1,"autorizada"],52]` | `[[0,0,0,1,"autorizada"],52]` | Cumple |
| Tras el fallo "before-manifest" el estado anterior queda íntegro | `[[0,0,0,1,"autorizada"],52]` | `[[0,0,0,1,"autorizada"],52]` | Cumple |
| El reintento confirma una sola operación | `["ebad237a-6daf-4ea3-8d28-70a2b97e1b45",1,1]` | `["ebad237a-6daf-4ea3-8d28-70a2b97e1b45",1,1]` | Cumple |
| Validación estructural de todo el almacén | `[]` | `[]` | Cumple |
| Auditoría encadenada íntegra | `true` | `true` | Cumple |
| La obligación sigue siendo una | `5000.00` | `5000.00` | Cumple |
| Fallo al preparar un pago: no queda desembolso ni aplicación a medias | `[500,0,0]` | `[500,0,0]` | Cumple |

Observaciones registradas:

- Fallo simulado "after-first-collection": `500`
- Fallo simulado "before-manifest": `500`
- Fallo simulado "after-audit": `200`

### CAS-55 · Edición concurrente

Reglas: PER-06, AVA-17 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| A guarda la versión 2 | `200` | `200` | Cumple |
| B sobre la versión 1 recibe conflicto | `[409,"conflicto","11.0000","12.0000"]` | `[409,"conflicto","11.0000","12.0000"]` | Cumple |
| No hubo sobrescritura silenciosa | `11.0000` | `11.0000` | Cumple |
| Una edición sin versión no pisa el cambio de otro | `true` | `200` | **No cumple** |
| No se validan ambos contra la base obsoleta (ejecución validada total ≤ 58, no 40+15+18=73) | `true` | `validado total en la ubicación: 58` | Cumple |
| Dos pagos simultáneos por el saldo completo: solo uno se prepara | `[200,409]` | `[200,409]` | Cumple |

Observaciones registradas:

- Editar sin enviar la versión leída: `200 → cantidad 13.0000`
- Dos acumulados simultáneos (55 y 58) sobre la base 40: `[{"id":"…","warnings":[]},{"id":"…","warnings":[]}]`
- Validar ambos: `200 / 200  ""`

### CAS-56 · Identidad y desactivación

Reglas: OBR-08, SEM-11 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Renombrar al contratista | `200` | `200` | Cumple |
| El pago conserva al mismo beneficiario (por identificador) | `b46a3b38-6940-4da2-8aea-c0ea93be1c2a` | `b46a3b38-6940-4da2-8aea-c0ea93be1c2a` | Cumple |
| El documento emitido conserva el nombre con el que se emitió | `true` | `true` | Cumple |
| El registro no se borra: queda inactivo o archivado | `true` | `{"status":"inactivo","archivedAt":null}` | Cumple |
| Históricos consultables | `[200,200,200]` | `[200,200,200]` | Cumple |
| Saldo del histórico intacto | `0.00` | `0.00` | Cumple |
| No se aceptan usos nuevos del contratista desactivado | `true` | `200` | **No cumple** |
| Ni capturas nuevas a su nombre | `true` | `200 ` | **No cumple** |
| No se creó otra deuda bajo otro nombre | `1` | `1` | Cumple |

Observaciones registradas:

- Nombre mostrado en el pago tras renombrar: `K1 Renombrado SA (auditoría)`
- Desactivar: `DELETE 403 Los registros usados se desactivan; no se eliminan. / PATCH 200`
- Nueva estimación para el contratista desactivado: `200 `
- Eliminar una ubicación: `404 El catálogo no existe o no está disponible para usted.`

### CAS-57 · Decimal local y reintento de captura

Reglas: MOV-02, MOV-05, MOV-07 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La API interpreta 1.29 o rechaza con explicación; nunca guarda 129 | `true` | `422 → null` | Cumple |
| Reintento con la misma clave: una sola captura | `["be709ac7-dfda-43e2-8f3c-fbcea633584b",1]` | `["be709ac7-dfda-43e2-8f3c-fbcea633584b",1]` | Cumple |
| El posible duplicado se advierte, no se borra | `true` | `200` | Cumple |
| Reenviar una copia obsoleta tras reconectar recibe conflicto | `409` | `409` | Cumple |
| Cantidad no válida "" se rechaza al enviar | `true` | `422 Capture la cantidad o al menos un renglón de generador.` | Cumple |
| Cantidad no válida "abc" se rechaza al enviar | `true` | `422 Valor decimal inválido: "abc"` | Cumple |
| Cantidad no válida "1.2.3" se rechaza al enviar | `true` | `422 Valor decimal inválido: "1.2.3"` | Cumple |
| Cantidad no válida "1e3" se rechaza al enviar | `true` | `422 Valor decimal inválido: "1e3"` | Cumple |
| Cantidad no válida " 5 " se rechaza al enviar | `true` | `200 ` | Cumple |
| Cantidad no válida "٣" se rechaza al enviar | `true` | `422 Valor decimal inválido: "٣"` | Cumple |

Observaciones registradas:

- API: cantidad "1,29": `422 Valor decimal inválido: "1,29"`
- Misma captura sin clave (posible duplicado): `[{"type":"posible_duplicado","message":"Existe un avance igual (misma ubicación, concepto, contratista, fecha y cantidad). Revise antes de continuar; no se eliminó nada.","entryIds":["…"]}]`
- Interfaz en teléfono: `El comportamiento del campo de cantidad en pantalla (coma decimal) se prueba aparte con navegador; ver ADV-UI-01.`

### CAS-58 · Sesión y permisos cambiados

Reglas: ACC-09, PAG-16, MOV-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Usuario dado de baja: la sesión abierta deja de servir | `401` | `401` | Cumple |
| El pago sigue sin confirmar | `["autorizado","0.00"]` | `["autorizado","0.00"]` | Cumple |
| No puede iniciar sesión de nuevo | `401` | `401` | Cumple |
| Retirar el rol de tesorería | `200` | `200` | Cumple |
| Con el rol retirado, la sesión abierta ya no confirma | `true` | `403` | Cumple |
| Pago aún sin confirmar | `autorizado` | `autorizado` | Cumple |
| Con delegación explícita y vigente, la auxiliar prepara un pago | `200` | `200` | Cumple |
| Delegación revocada: deja de tener efecto de inmediato | `true` | `true` | Cumple |
| Restablecer la contraseña cierra las sesiones abiertas | `true` | `401` | Cumple |
| El borrador local se guarda por usuario | `true` | `const draftKey = (workId) => `dcl.borrador.${state.session.user.id}.${workId \|\| 'sin-obra'}`;` | Cumple |

Observaciones registradas:

- Roles de T2: `[{"id":"…","roleId":"…","role":"Tesorería","scope":"global","workId":null,"work":null,"validFrom":null,"validTo":null}]`
- Restablecer contraseña: `200 ["temporaryPassword"]`
- Clave del borrador local (código de la interfaz): `const draftKey = (workId) => `dcl.borrador.${state.session.user.id}.${workId \|\| 'sin-obra'}`;`

### CAS-59 · Respaldo y exportación completa

Reglas: PER-08, PER-12, PER-13, PER-14, PER-15 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Respaldo sin problemas de integridad | `[]` | `[]` | Cumple |
| Restaurado: mismos registros, IDs, estados e importes (salvo el registro del propio respaldo, escrito después de la copia) | `true` | `true` | Cumple |
| Restaurado: estructura válida y auditoría íntegra | `[[],true]` | `[[],true]` | Cumple |
| Restaurado: binarios de adjuntos presentes con su hash | `[true,true]` | `[true,true]` | Cumple |
| Restaurado: las credenciales viajan en el respaldo (no en el paquete de datos) | `true` | `true` | Cumple |
| Restaurado y arrancado: mismos saldos | `["3543.19","1000.00","2543.19","parcial"]` | `["3543.19","1000.00","2543.19","parcial"]` | Cumple |
| Cantidad con 4 decimales intacta | `10.1234` | `10.1234` | Cumple |
| Paquete reimportado por json: idéntico | `true` | `true` | Cumple |
| Paquete por json: auditoría íntegra | `true` | `true` | Cumple |
| Paquete reimportado por csv: idéntico | `true` | `true` | Cumple |
| Paquete por csv: auditoría íntegra | `true` | `true` | Cumple |
| El paquete no contiene contraseñas ni sesiones | `[false,false]` | `[false,false]` | Cumple |
| El manifiesto trae sumas de verificación por archivo | `true` | `{"sha256":"d5676d747cbc8480bf681d4f89f865d164e14f7d0bdca6d57d96f7f93d2dc114","bytes":390}` | Cumple |
| Un respaldo alterado se detecta | `true` | `true` | Cumple |
| S1 no crea ni descarga respaldos | `[403,403]` | `[403,403]` | Cumple |
| Los archivos de datos no se sirven por la web | `[404,404]` | `[404,404]` | Cumple |

Observaciones registradas:

- Colecciones que difieren entre el respaldo restaurado y el origen: `["auditEvents: 325 en el respaldo / 326 en origen","backupManifests: 0 en el respaldo / 1 en origen"]`
- Manifiesto del paquete: `{"dataset":"demo","archivos":228,"conteos":true,"esquema":1}`

### CAS-60 · Recorrido completo

Reglas: A, B, C · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Partidas incorporadas: 2 avances, 1 adicional, 1 jornada | `4` | `4` | Cumple |
| Bruto propuesto: 7,000 + 3,500 + 1,000 + 600 | `12100.00` | `12100.00` | Cumple |
| Autorizado parcial (sin la partida observada) | `["8600.00",1]` | `["8600.00",1]` | Cumple |
| Cierre | `["8600.00","8600.00"]` | `["8600.00","8600.00"]` | Cumple |
| Obligación: pagado $5,000, saldo $3,600 | `["8600.00","5000.00","3600.00"]` | `["8600.00","5000.00","3600.00"]` | Cumple |
| La partida diferida conserva su observación abierta | `true` | `[{"id":"60143dfc-b1ca-4fe6-a9bb-7b07a6cd3a7e","text":"Son 12 m² (auditoría)","proposedQty":"12.0000","proposedAmount":null,"status":"abierta","resolution":null,"resolutionNote":null,"before":null,"aft` | Cumple |
| La ejecución diferida vuelve a estar disponible | `1` | `1` | Cumple |
| Cliente: 30 m² × $1,000 − 10 % de amortización | `27000.00` | `27000.00` | Cumple |
| Obra: aprobado, cobrado, por cobrar, anticipo | `["30000.00","10000.00","17000.00","2000.00"]` | `["30000.00","10000.00","17000.00","2000.00"]` | Cumple |
| Obra: mano de obra, pagado, por pagar | `["8600.00","5000.00","3600.00"]` | `["8600.00","5000.00","3600.00"]` | Cumple |
| Contratista: su estado de cuenta coincide | `["8600.00","3600.00"]` | `["8600.00","3600.00"]` | Cumple |
| Cliente: saldo de la estimación | `17000.00` | `17000.00` | Cumple |
| El cliente no ve tarifas del contratista, márgenes ni al supervisor | `[false,false,false,false]` | `[false,false,false,false]` | Cumple |
| El contratista no ve el precio al cliente ni el presupuesto | `[false,404]` | `[false,404]` | Cumple |
| El avance muestra en qué documento de pago y de cobro quedó | `true` | `el detalle del avance no referencia sus documentos` | Cumple |
| Lo pendiente (observación abierta, saldo por pagar, estimación en borrador) aparece en la bandeja | `true` | `4` | Cumple |
| Auditoría íntegra al final del recorrido | `true` | `true` | Cumple |
| Estructura válida | `[]` | `[]` | Cumple |
| Caja y banco reconstruibles | `["495000.00","1015000.00"]` | `["495000.00","1015000.00"]` | Cumple |

Observaciones registradas:

- Avance e1: vínculos: `{"paidQty":"20.0000","billedQty":"20.0000","circuits":[{"id":"…","circuit":"contratista","qty":"20.0000","state":"confirmada","docType":"cEstimate","docId":"…","folio":"EC-2026-S35-001"},{"id":"…","circuit":"cliente","qty":"20.0000","state":"confirmada","docType":"kEstimate","docId":"bff1ed4a-2`
- Pendientes con responsable (bandeja de dirección): `[["Por resolver","Observación del contratista en EC-2026-S35-001"],["Por decidir","Adicional AD-0001: ¿se cobra al cliente?"],["Por pagar","Efectivo a K1 Contratista (auditoría)"],["Por preparar","Estimación EC-2026-S36-001"]]`

### ADV-01 · El administrador técnico no obtiene facultad económica asignándose un rol

Reglas: ACC-08, ACC-13 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Sin rol de dirección no autoriza el pago | `403` | `403` | Cumple |
| Administrar usuarios no permite autoconcederse la facultad de autorizar pagos | `true` | `{"asignacion":200,"autorizacion":200}` | **No cumple** |
| La asignación de rol queda en la auditoría con su autor | `true` | `["inicio sesion","autorizacion pago","asignacion rol","preparacion pago","preparacion pago","autorizacion estimacion"]` | Cumple |

Observaciones registradas:

- El administrador se asigna a sí mismo el rol de dirección: `200 `
- Después intenta autorizar el pago: `200 `
- El administrador agrega payments.authorize a su propio rol: `422 Indique el motivo de el cambio de permisos (al menos 5 caracteres).`
- El administrador crea un usuario nuevo con rol de dirección: `200 `

### ADV-02 · Varios roles: el alcance limitado no se vuelve global

Reglas: ACC-10, ACC-04 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Con dos roles limitados a obras asignadas no lee un avance de B | `404` | `404` | Cumple |
| Ni captura en B | `403` | `403` | Cumple |
| La auxiliar captura gastos pero no ve resultados ni autoriza | `[200,404]` | `[200,404]` | Cumple |
| Auxiliar: sin márgenes ni mano de obra, sin datos bancarios, sin costos en el explorador | `[true,403,404]` | `[true,403,404]` | Cumple |

Observaciones registradas:

- Ficha de obra vista por la auxiliar (tarjetas): `{"cards":["avances","pendientes","sinEjecucion","facturado","cobrado","porCobrar","anticipo"],"margin":null}`
- Conjuntos del explorador visibles para la auxiliar: `["gastos","cobranza","cobros","insumos"]`

### ADV-03 · Reabrir una estimación con obligación pendiente: ¿se puede pagar el resto mientras está en revisión?

Reglas: EST-12, PAG-16 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La estimación volvió a revisión | `revision_interna` | `revision_interna` | Cumple |
| No se paga el saldo de una estimación que está reabierta y sin autorización vigente | `true` | `{"pagadoAhora":"10000.00","estadoEstimacion":"revision_interna"}` | **No cumple** |

Observaciones registradas:

- Preparar el pago del saldo con la estimación reabierta: `200 `
- Autorizar y confirmar ese pago: `200 / 200 `
- Obligación: `{"gross":"10000.00","paid":"10000.00","balance":"0.00","status":"autorizada"}`
- Tablero del cierre tras reabrir: `{"toClose":"0.00","estados":["revision_interna"]}`

### ADV-04 · Semana cerrada, captura tardía y complemento

Reglas: AVA-16, CIE-07, CIE-11, CIE-12, SEM-06 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Existe una ruta para registrar el trabajo tardío conservando su fecha real | `true` | `La semana 2026-S35 ya está cerrada.` | Cumple |
| La fecha real de ejecución se conserva | `2026-08-28` | `2026-08-28` | Cumple |
| La complementaria incorpora solo lo tardío | `1` | `1` | Cumple |
| Emitir el complemento sin motivo | `true` | `true` | Cumple |
| Complemento: solo el importe tardío | `["1400.00","complemento"]` | `["1400.00","complemento"]` | Cumple |
| El cierre original no cambió | `3500.00` | `3500.00` | Cumple |
| Un cierre emitido no admite edición ni borrado | `true` | `true` | Cumple |
| Fecha futura rechazada | `422` | `422` | Cumple |

Observaciones registradas:

- Capturar con fecha de una semana ya cerrada: `409 La semana 2026-S35 ya está cerrada. Capture en la semana abierta conservando la fecha real de ejecución; entrará como complemento o en el siguiente corte.`
- Semanas: `[["2026-S35","cerrada"]]`
- Captura tardía indicando la semana de liquidación y el motivo: `200 `
- Semana asignada al avance tardío: `{"period":"2026-S36","late":null}`
- Estimación complementaria de la semana cerrada: `200 `

### ADV-05 · Semana y año: cruce de diciembre a enero y fecha local de Monterrey

Reglas: SEM-13, SEM-14 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Semana 1 de 2027 es otro periodo | `true` | `true` | Cumple |
| Códigos con año | `true` | `true` | Cumple |
| 31/12/2026 y 02/01/2027 caen en la misma semana y conservan un año inequívoco | `true` | `[{"year":2026,"week":53,"start":"2026-12-28","end":"2027-01-02","code":"2026-S53"},{"year":2026,"week":53,"start":"2026-12-28","end":"2027-01-02","code":"2026-S53"}]` | Cumple |
| No hay dos periodos con el mismo año y semana | `1` | `1` | Cumple |
| Instante 28/08/2026 22:30 de Monterrey (04:30 UTC del 29) → fecha local 28 | `2026-08-28` | `2026-08-28` | Cumple |
| Instante 01/01/2027 05:59 UTC → 31/12/2026 local | `2026-12-31` | `2026-12-31` | Cumple |
| La fecha de ejecución se guarda y recupera sin desplazarse | `2026-08-29` | `2026-08-29` | Cumple |
| Fecha de captura independiente de la de ejecución | `true` | `true` | Cumple |
| Fecha inexistente | `422` | `422` | Cumple |

Observaciones registradas:

- Periodos: `[["2027-S01","2027-01-04","2027-01-09"],["2026-S35","2026-08-24","2026-08-29"],["2026-S01","2025-12-29","2026-01-03"]]`
- Semana de 31/12/2026, 02/01/2027 y 04/01/2027: `[["2026-S53",null,null],["2026-S53",null,null],["2027-S01",null,null]]`
- Crear dos veces la semana 2026-S35: `200 `

### ADV-06 · Exportaciones: fórmulas en texto, números negativos, nombres de archivo y rutas

Reglas: PER-11, EVI-07, DOC-01 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Texto que empieza por = + - @ se neutraliza en CSV | `[true,true,true,true]` | `[true,true,true,true]` | Cumple |
| Un importe numérico no se convierte en texto | `true` | `true` | Cumple |
| El nombre con ruta no determina dónde se guarda ni se envía sin codificar | `true` | `../../../etc/passwd.jpg` | Cumple |
| Tipo de archivo no permitido rechazado | `true` | `422` | Cumple |
| Ruta pública /manifest.json no expone datos ni código | `true` | `404 {"error":"no_encontrado","message":"Recurso no encontrado."}` | Cumple |
| Ruta pública /var/demo/manifest.json no expone datos ni código | `true` | `404 {"error":"no_encontrado","message":"Recurso no encontrado."}` | Cumple |
| Ruta pública /..%2f..%2fpackage.json no expone datos ni código | `true` | `404 {"error":"no_encontrado","message":"Recurso no encontrado."}` | Cumple |
| Ruta pública /%2e%2e/%2e%2e/package.json no expone datos ni código | `true` | `404 {"error":"no_encontrado","message":"Recurso no encontrado."}` | Cumple |
| Ruta pública /server/config.js no expone datos ni código | `true` | `404 {"error":"no_encontrado","message":"Recurso no encontrado."}` | Cumple |
| Ruta pública /.env no expone datos ni código | `true` | `200 <!DOCTYPE html><html lang="es-MX"> <head><meta charset="utf-` | Cumple |
| Ruta pública /backups/ no expone datos ni código | `true` | `200 <!DOCTYPE html><html lang="es-MX"> <head><meta charset="utf-` | Cumple |
| Ruta pública /../tests/helpers.js no expone datos ni código | `true` | `404 {"error":"no_encontrado","message":"Recurso no encontrado."}` | Cumple |
| Ruta pública /api/../package.json no expone datos ni código | `true` | `404 {"error":"no_encontrado","message":"Recurso no encontrado."}` | Cumple |
| Sin sesión no se descarga un adjunto ni un listado | `[401,401,401]` | `[401,401,401]` | Cumple |
| Una solicitud sin la cabecera propia de la aplicación se rechaza (protección contra envíos de otros sitios) | `true` | `true` | Cumple |

Observaciones registradas:

- Muestra: `GA-0001,2026-08-25,Proveedor (auditoría),"'=HYPERLINK(""http://x"",""clic"")",Adhesivo,,,,10.00,Borrador,Sin pago,Sin desglose fiscal \| GA-0002,2026-08-25,Proveedor (auditoría),'+52 81 0000,Adhesivo,,,,10.00,Borrador,Sin pago,Sin desglose fiscal`
- CSV de obligaciones: `﻿Obligación,Beneficiario,Obra,Origen,Vence,Bruto autorizado,Descuentos,Anticipos aplicados,Neto por pagar,Pagado confirmado,Saldo,Pago \| OB-0001,K1 Contratista (auditoría),Obra A (auditoría),EC-2026-S35-001,2026-08-29,100.00,10.00,0.00,90.00,0.00,90.00,Sin pago`
- Carga con nombre de ruta: `200 → nombre guardado "../../../etc/passwd.jpg"; el binario se guarda por su hash; cabecera de descarga: inline; filename*=UTF-8''..%2F..%2F..%2Fetc%2Fpasswd.jpg`
- Carga de un ejecutable como evidencia: `422 Tipo de archivo no permitido (.exe). Se aceptan JPG, PNG, WEBP y PDF.`
- Carga de HTML: `422 Tipo de archivo no permitido (.html). Se aceptan JPG, PNG, WEBP y PDF.`
- Cabeceras de seguridad: `{"csp":"default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src '","frame":"DENY","nosniff":"nosniff"}`

### ADV-07 · Monedas, comprobante repetido y pago a tercero

Reglas: SEM-10, PAG-06, PAG-08 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| No se mezclan monedas sin conversión aprobada | `true` | `409` | Cumple |
| Una transferencia entre monedas distintas exige tipo de cambio o se bloquea | `true` | `409` | Cumple |
| Queda marcado como posible duplicado | `posible` | `posible` | Cumple |
| No se autoriza sin descartar expresamente la alerta | `true` | `409` | Cumple |
| Descartar la alerta exige motivo | `422` | `422` | Cumple |
| El pago a tercero exige relación o autorización específica | `true` | `se acepta el nombre de quien recibe sin relación ni autorización específica` | **No cumple** |

Observaciones registradas:

- Alta de cuenta en USD: `200 `
- Pagar una obligación en MXN desde la cuenta en USD: `409 La obligación y la cuenta están en monedas distintas.`
- Transferir de MXN a USD: `409 Las cuentas están en monedas distintas.`
- Totales de caja y bancos: `[["CAJA","MXN","500000.00"],["BANCO","MXN","1000000.00"],["USD1","USD","1000.00"]]`
- Segundo pago con la misma referencia bancaria: `200  [{"type":"referencia_repetida","message":"La referencia ya se usó en PG-0001. Revise antes de continuar."},{"type":"posible_duplicado","message":"Existe otro pago del mismo importe, fecha y beneficiario (PG-0001)."}]`
- Autorizar el posible duplicado sin revisarlo: `409 Este pago tiene una alerta de posible duplicado.`
- Pago entregado a un tercero (payeeName distinto del beneficiario): `200  []`
- Cómo queda registrado: `{"beneficiary":"K1 Contratista (auditoría)","payeeName":"Un tercero (auditoría)","relation":null,"note":null}`

### ADV-08 · Obra suspendida o cerrada, ubicación en uso y evidencia de un avance aprobado

Reglas: OBR-04, OBR-10, OBR-11, EVI-11 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La evidencia usada en una aprobación no se retira sin procedimiento | `true` | `{"estado":409,"evidencias":1}` | Cumple |
| El binario original sigue descargable | `200` | `200` | Cumple |
| El documento autorizado conserva el nombre original de la ubicación | `true` | `true` | Cumple |
| El avance no queda huérfano | `true` | `true` | Cumple |
| Suspender la obra | `200` | `200` | Cumple |
| La obra suspendida limita nuevas capturas | `true` | `409` | Cumple |
| Un pago legítimo pendiente sí se registra con la obra suspendida | `200` | `200` | Cumple |
| Los documentos siguen consultables | `200` | `200` | Cumple |
| El cierre financiero con saldos pendientes se bloquea o exige excepción | `true` | `409` | Cumple |

Observaciones registradas:

- Retirar la evidencia de un avance validado y autorizado: `409 La evidencia de un avance validado no se retira.`
- Renombrar una ubicación con avances: `200 `
- Desactivar una ubicación en uso: `422 Valor no permitido en status: "inactiva". Opciones: activo, inactivo.`
- Capturar en obra suspendida: `409 La obra está en estado "suspendida" y no admite nuevas capturas.`
- Lista de verificación de cierre financiero: `[[null,false],[null,true],[null,true],[null,true],[null,true],[null,true]]`
- Cierre financiero con pago pendiente: `409 El cierre financiero requiere el cierre operativo previo.`
- Cierre operativo: `200 `

### ADV-09 · Cliente: rechazo, versión corregida, aprobación externa y enlaces

Reglas: CLI-04, CLI-08, CLI-12, CLI-13, CLI-14, DOC-07, ACC-06 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El cliente no ve un borrador | `404` | `404` | Cumple |
| La observación del cliente no altera el costo interno | `3500.00` | `3500.00` | Cumple |
| La corrección creó una versión nueva identificable | `true` | `[1,2,"9.0000"]` | Cumple |
| Aceptar la versión anterior ya no es válido | `409` | `409` | Cumple |
| La versión enviada antes se conserva | `200` | `200` | Cumple |
| Registrar una aprobación externa sin decir quién aprobó ni por qué medio | `422` | `422` | Cumple |
| La aprobación externa identifica al cliente y a quien la registró, sin simular firma | `true` | `""` | Cumple |
| Enlace restringido sin sesión | `200` | `200` | Cumple |
| El enlace no revela otras rutas ni identificadores útiles | `true` | `/api/shared/_HT4OyyfY0ijj_kuCFwxioHYXnUObXHr` | Cumple |
| La emisión anterior queda marcada como sustituida | `["sustituido","vigente"]` | `["sustituido","vigente"]` | Cumple |
| El enlace de una versión sustituida advierte o deja de servir | `true` | `el enlace sigue entregando el PDF anterior sin advertencia de sustitución` | **No cumple** |
| Enlace revocado | `404` | `404` | Cumple |
| Un documento interno no se publica ni se comparte | `[409,409]` | `[409,409]` | Cumple |
| El cliente no lo obtiene por ID | `404` | `404` | Cumple |
| Tras el rechazo la ejecución vuelve a estar disponible y la obligación con el contratista permanece | `["10.0000","3500.00"]` | `["10.0000","3500.00"]` | Cumple |

Observaciones registradas:

- Observación del cliente: `{"id":"…","status":"observada"}`
- Estado tras observar: `{"status":"observada","version":1,"published":1}`
- Corregir la cantidad a 9 (quitar y volver a agregar la partida): `200  / 200 `
- Estado tras corregir: `{"status":"corregida","version":2,"published":1,"qty":"9.0000"}`
- Lo que ve el cliente mientras se corrige: `200 versión 1 cantidad 10.0000`
- Publicar la versión corregida: `200 `
- Versión que ve el cliente: `{"version":2,"qty":"9.0000"}`
- Aprobación registrada: `[{"actorName":"Arq. Representante (auditoría) (registrado por D1 Dirección (auditoría))","at":"2026-10-13T02:13:47.824Z","objectVersion":2,"scope":"aprobación parcial del cliente","channel":"externo","valid":true,"note":"Aprobó por correo del 02/09 (auditoría)"}]`
- El enlace de la emisión sustituida, tras reemitir: `200 (application/pdf)`
- Rechazo total del cliente: `{"respuesta":"200 ","cancelar":null,"reservadoMientrasEstabaEnviada":"0.0000","disponible":"10.0000","obligacion":"3500.00","estado":"aprobada"}`

### ADV-10 · Auditoría: no editable, notificaciones sin repetición y periodo económico cerrado

Reglas: AUD-01, AUD-02, AUD-06, DOC-06, RES-09 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El evento registra actor, fecha, objeto, versión y operación | `true` | `["id","seq","at","actorName","action","kind","kindLabel","collection","entity","objectId","objectVersion","reason","diff","changes"]` | Cumple |
| El historial no se modifica por PATCH /api/audit/ad952578-59fc-4130-ae13-396347d80fe8 | `true` | `404` | Cumple |
| El historial no se modifica por DELETE /api/audit/ad952578-59fc-4130-ae13-396347d80fe8 | `true` | `404` | Cumple |
| El historial no se modifica por POST /api/audit | `true` | `404` | Cumple |
| El historial no se modifica por PATCH /api/catalog/auditEvents | `true` | `404` | Cumple |
| El historial no se modifica por DELETE /api/catalog/auditEvents | `true` | `404` | Cumple |
| Cadena de auditoría íntegra | `true` | `true` | Cumple |
| El auditor consulta pero no opera | `[200,403]` | `[200,403]` | Cumple |
| Reintentar el cierre no repite avisos | `6` | `6` | Cumple |
| No hay dos avisos iguales por evento, versión y destinatario | `6` | `6` | Cumple |
| Un periodo cerrado bloquea o versiona los cambios retroactivos | `true` | `{"captura":200,"autorizacion":200}` | **No cumple** |
| La auxiliar no cierra periodos | `true` | `true` | Cumple |

Observaciones registradas:

- Evento de autorización: `{"id":"…","seq":279,"at":"2026-10-13T02:13:52.971Z","actorName":"D1 Dirección (auditoría)","action":"autorizacion estimacion","kind":"alta","kindLabel":"Alta","collection":"approvals","entity":"Aprobación","objectId":"…","objectVersion":1,"reason":"Caso de auditoría: conformidad fuera del sistema","diff":null,"changes":null}`
- Avisos generados por el cierre: `2`
- Archivos en la carpeta de datos: `backups,blobs,generations,imports,instance.lock,manifest.json,manifests,secure`
- Cerrar el periodo económico 2026-08: `200 `
- Capturar un gasto con fecha del periodo cerrado: `200 `
- Autorizarlo: `200 `

### ADV-11 · Sesiones, contraseñas, límites y validación propia

Reglas: ACC-07, ACC-09, ACC-12, PER-15 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Quien captura no valida su propia captura, tampoco dirección | `true` | `403` | Cumple |
| Los intentos repetidos de acceso se frenan | `true` | `429` | Cumple |
| Cerrar sesión invalida la cookie | `401` | `401` | Cumple |
| La contraseña no está en claro en ningún archivo de datos | `false` | `false` | Cumple |
| La sesión no devuelve secretos | `false` | `false` | Cumple |
| El listado de usuarios no devuelve secretos | `false` | `false` | Cumple |
| S1 no cambia parámetros ni tolerancias | `403` | `403` | Cumple |

Observaciones registradas:

- Dirección valida un avance que ella misma capturó (policy.selfValidation=false): `403 Quien captura un avance no puede validarlo. Pida la revisión a coordinación o dirección.`
- Estado tras 12 intentos fallidos de acceso: `429`
- Límites de autorización de fábrica: `[]`
- Parámetros que requieren decisión de DCL: `[["policy.cashReceiptRequired",true],["policy.conformityRequired",true],["policy.partialAuthorization",true],["policy.selfValidation",false],["revenue.policy","no_definida"],["startup.openingDate",null],["startup.strategy","no_definida"],["tolerance.cents","1.00"],["workday.hoursPerDay","8"],["workday.maxPerDay","1"]]`
- Dirección cambia la tolerancia sin motivo: `422 Indique el motivo de el cambio de configuración (al menos 5 caracteres).`

### REG-01 · Maestros: obras, ubicaciones y asignaciones con vigencia

Reglas: OBR-01, OBR-02, OBR-03, OBR-05, OBR-06, OBR-07, OBR-09, OBR-12, OBR-13 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| La obra identifica cliente, estado, moneda y fechas | `true` | `["id","recordVersion","code","name","clientId","client","status","startDate","endDate","address","currency","supervisors","contractors","locations","paymentTerms","operationalCloseDate","financialClos` | Cumple |
| Dos obras con el mismo nombre siguen siendo distintas | `true` | `true` | Cumple |
| El código de obra no se repite | `true` | `true` | Cumple |
| Captura en una obra inexistente | `true` | `true` | Cumple |
| Jerarquía de cinco niveles conservada en el avance | `5` | `5` | Cumple |
| Tras sustituirlo, S1 ya no captura en A | `403` | `403` | Cumple |
| El avance anterior conserva a su autor | `S1 Supervisor (auditoría)` | `S1 Supervisor (auditoría)` | Cumple |
| Cada tarjeta de la ficha de obra abre su origen | `true` | `[]` | Cumple |

Observaciones registradas:

- Campos de la ficha de obra: `id,recordVersion,code,name,clientId,client,status,startDate,endDate,address,currency,supervisors,contractors,locations,paymentTerms,operationalCloseDate,financialCloseDate,consolidation,consolidationNote,representativeContactId,assignments,closures,can`
- Ruta de ubicación de un avance profundo: `Edificio 1 (auditoría) › Nivel 2 (auditoría) › Nivel 3 (auditoría) › Nivel 4 (auditoría) › Nivel 5 (auditoría)`
- Terminar la asignación de S1: `200 `
- Catálogo crews: `200`
- Catálogo workers: `200`
- Catálogo partyAliases: `404`
- Catálogo contacts: `200`
- Clasificación de consolidación al crear una obra: `pendiente_clasificar`

### REG-02 · Tarifas y catálogo: sobreprecio, niveles de detalle, unidades e inactivos

Reglas: TAR-01, TAR-05, TAR-06, TAR-08, TAR-10, TAR-11, SEM-08 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Un precio enviado en la captura se ignora: rige la tarifa | `["350.0000","3500.00"]` | `["350.0000","3500.00"]` | Cumple |
| La descripción particular no creó otro concepto | `5` | `5` | Cumple |
| Precio excepcional sin motivo | `422` | `422` | Cumple |
| El precio excepcional conserva origen y motivo | `true` | `{"price":"400.0000","currency":"MXN","unitId":"6457dd71-a597-4197-8aea-278c8223c77f","origin":"precio excepcional","exceptional":true,"reason":"Trabajo en altura acordado con dirección (auditoría)","a` | Cumple |
| La tarifa del catálogo no cambió | `350.0000` | `350.0000` | Cumple |
| No vienen cargados 500/1,000/1,500 como tarifas universales | `true` | `0` | Cumple |
| Un concepto desactivado no acepta registros nuevos | `true` | `200` | **No cumple** |

Observaciones registradas:

- Precio excepcional con motivo: `200 `
- Partida con precio excepcional: `{"unitPrice":"400.0000","origen":{"price":"400.0000","currency":"MXN","unitId":"…","origin":"precio excepcional","exceptional":true,"reason":"Trabajo en altura acordado con dirección (auditoría)","approvedByName":"D1 Dirección (auditoría)","previous":{"rateId":"88e`
- Niveles de detalle de fábrica: `[]`
- Capturar el concepto en otra unidad: `422 La unidad no coincide con la del concepto. No se convierten unidades automáticamente.`
- Desactivar un concepto: `200 `
- Capturar con el concepto desactivado: `200 `
- Tarifa de catálogo en cero: `200 `

### REG-03 · Reservas de cantidad: cancelar o rechazar libera sin borrar la ejecución

Reglas: AVA-14, AVA-15, EST-14, EST-15, PAG-01, CIE-01 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Validar un avance no crea obligación | `0` | `0` | Cumple |
| En borrador la cantidad queda reservada, no confirmada | `["reservada"]` | `["reservada"]` | Cumple |
| Un borrador no entra al bruto por cerrar | `0.00` | `0.00` | Cumple |
| Cerrar con solo borradores | `409` | `409` | Cumple |
| La ejecución física validada permanece | `["validado","10.0000"]` | `["validado","10.0000"]` | Cumple |
| La cantidad vuelve a estar disponible | `0.0000` | `0.0000` | Cumple |
| El documento cancelado se conserva consultable | `[200,"cancelada"]` | `[200,"cancelada"]` | Cumple |
| La ejecución liberada entra en otro documento | `1` | `1` | Cumple |

Observaciones registradas:

- Avance con la estimación en borrador: `{"paidQty":"10.0000","circuits":[]}`
- Campo paidQty del avance con la estimación aún en borrador: `10.0000`
- Rechazar la partida: `200 `
- Cancelar la estimación: `200 `
- Disponible para el cliente (circuito independiente): `["10.0000"]`

### REG-04 · Adicionales: aprobación comercial sin ejecución, bandeja e incidencias

Reglas: ADI-01, ADI-04, ADI-07, ADI-12, ADI-13, ADI-14, REP-06 · Resultado: **FALLA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Identifica causa, solicitante, ubicación, fecha, ejecutor, unidad y cantidad | `true` | `id,recordVersion,folio,workId,work,location,locationId,date,description,kind,urgency,executor,executorId,qty,unit,executed,opStatus,costStatus,saleStatus,costAmount,saleAmount,exposure,reportedBy,caus` | Cumple |
| No genera avance ni obligación | `[0,0]` | `[0,0]` | Cumple |
| Un adicional sin ejecutar no entra a la estimación del contratista | `0` | `0` | Cumple |
| La bandeja indica antigüedad de cada pendiente | `true` | `["group","title","sub","href","urgent"]` | **No cumple** |
| Cerrar sin evidencia ni nota | `true` | `true` | Cumple |
| Cerrar la incidencia no genera cobro ni pago | `[0,0]` | `[0,0]` | Cumple |

Observaciones registradas:

- Aprobación comercial antes de ejecutar: `200 `
- Autorizar el costo de un adicional no ejecutado ni validado: `409 Primero debe validarse que el trabajo existe.`
- Bandeja: `[["Por validar","Adicional AD-0001","Obra A (auditoría) · Nicho adicional solicitado por el cliente (auditoría)"],["Por preparar","Estimación EC-2026-S35-001","Obra A (auditoría) · K1 Contratista (auditoría) · borrador"]]`
- Columnas del listado de adicionales: `["folio","date","work","location","description","kind","opStatus","costStatus","costAmount","saleStatus","saleAmount","exposure"]`
- Alta de incidencia: `200 `
- Cerrar incidencia: `409 El cierre de una incidencia requiere evidencia.`
- Descuento automático por incidencia: `No existe ruta que descuente al contratista por una incidencia: los descuentos solo nacen como componentes con soporte y autorización (CAS-21).`

### REG-05 · Cierre: instantánea frente a cambios de catálogo; recibo y medios de pago

Reglas: CIE-10, CIE-13, PAG-09, PAG-10, DOC-04, DOC-05, AUD-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El cierre conserva los nombres con que se emitió | `true` | `el cierre muestra los nombres actuales` | Cumple |
| El cierre guarda versión, actor y fecha | `[true,true,true]` | `[true,true,true]` | Cumple |
| El documento del cierre lleva folio y versión | `[true,true]` | `[true,true]` | Cumple |
| El recibo trae líneas de firma en blanco, no una aceptación registrada | `true` | `true` | Cumple |
| Emitir no publica ni envía | `[false,0]` | `[false,0]` | Cumple |
| Emitir el recibo no cambia el pago | `confirmado` | `confirmado` | Cumple |
| Un documento sin autorizar se identifica como borrador | `true` | `true` | Cumple |
| La aprobación guarda el identificador de la persona (no solo su nombre) | `true` | `["id","organizationId","recordVersion","schemaVersion","createdAt","createdBy","updatedAt","updatedBy","archivedAt","archivedBy","sourceReference","objectType","objectId","objectVersion","itemId","ite` | Cumple |

Observaciones registradas:

- Cierre tras renombrar contratista y obra: `[["K1 Contratista (auditoría)","Obra A (auditoría)","EC-2026-S35-001"]]`
- Instrucción de pago: encabezado: `{"folio":"CS-2026-S35-01","version":"Versión 1","nota":"Esta instrucción no ejecuta transferencias. Cada pago se registra y confirma por separado con su comprobante."}`
- Medios de pago disponibles: `["efectivo","transferencia","cheque","otro"]`

### REG-06 · Cobranza y gastos: disputa, reverso de cobro, activos y gasto sin distribuir

Reglas: COB-09, COB-13, COB-14, GAS-01, GAS-04, GAS-06, GAS-07, GAS-10, GAS-16, TES-03, TES-08 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| Registrar la factura no la declara timbrada | `false` | `false` | Cumple |
| La auxiliar no reversa cobros | `true` | `true` | Cumple |
| El reverso reabre el saldo | `10000.00` | `10000.00` | Cumple |
| El cobro original se conserva | `revertido` | `revertido` | Cumple |
| La disputa no borra la deuda | `10000.00` | `10000.00` | Cumple |
| Un gasto sin distribuir no se autoriza ni se reparte solo | `true` | `409` | Cumple |
| El gasto pendiente sigue visible | `1` | `1` | Cumple |
| Un préstamo recibido no es ingreso ni cambia el resultado | `["0.00","0.00","0.00","0.00","0.00",null]` | `["0.00","0.00","0.00","0.00","0.00",null]` | Cumple |
| Se clasifica como financiamiento | `50000.00` | `50000.00` | Cumple |
| Separa saldo confirmado de cobros y pagos previstos | `true` | `["asOf","confirmedBalance","overdue","undated","rows","note","detail"]` | Cumple |

Observaciones registradas:

- Factura registrada (campos): `{"id":"…","recordVersion":1,"folio":"F-R6","date":"2026-09-02","subtotal":null,"tax":null,"total":"10000.00","status":"registrada","dueDate":null,"attachmentId":null,"workId":"…","clientId":"…","`
- Registrar una disputa: `200 `
- Seguimiento de cobranza: `{"receivable":{"total":"10000.00","collected":"0.00","adjustments":"0.00","invoiced":"10000.00","balance":"10000.00","toInvoice":"0.00","invoiceStatus":"facturada","collectStatus":"sin_cobro","uncollectible":false},"adjustments":[],"actions":[{"id":"…","kind":"disp`
- Autorizar un gasto sin distribuir: `409 El gasto no puede autorizarse todavía. ["Falta la distribución por obra, administración o stock."]`
- Marcar la compra como activo: `422 Valor no permitido en treatment: "activo". Opciones: gasto, activo_pendiente, no_resultado.`
- Tratamientos y estado del gasto: `{"treatment":"gasto","status":"borrador"}`
- Clases de categoría de costo: `["activo_inversion","costo_instalacion","gasto_administrativo","gasto_comercial","impuesto","prestamo","movimiento_socios","transferencia_interna"]`
- Capturar una devolución o nota de crédito (importe negativo vinculado): `422 Un importe negativo requiere identificar su naturaleza: devolución, reclasificación, reverso o traslado.`
- Flujo proyectado: `{"asOf":"2026-10-12","confirmedBalance":"1550000.00","overdue":{"receivable":"0.00","payable":"0.00"},"undated":{"receivable":"10000.00","payable":"0.00"},"rows":[{"from":"2026-10-12","to":"2026-10-18","expectedIn":"0.00","expectedOut":"0.00","projected":"1550000.00"},{"from":"2026-10-19","to":"2026-10-25","expectedIn":"0.00","e`

### REG-07 · Auditoría de cambios y parámetros

Reglas: AUD-01, AUD-04, AUD-05, AUD-10, AUD-11, REP-05 · Resultado: **PASA**

| Comprobación | Esperado | Obtenido | |
|---|---|---|---|
| El historial guarda el valor anterior y el nuevo | `true` | `qty` | Cumple |
| Cambiar un parámetro con motivo | `200` | `200` | Cumple |
| El cambio de parámetro queda en el historial con su motivo | `true` | `["configuracion","edicion avance","captura avance"]` | Cumple |
| Las decisiones pendientes se listan aparte de los saldos | `true` | `true` | Cumple |
| Cada tarjeta del inicio abre las partidas que la explican | `true` | `[]` | Cumple |

Observaciones registradas:

- Evento de modificación de cantidad: `{"id":"…","seq":272,"at":"2026-10-13T02:17:57.501Z","actorName":"S1 Supervisor (auditoría)","action":"edicion avance","kind":"cambio","kindLabel":"Cambio","collection":"progressEntries","entity":"Avance","objectId":"…","objectVersion":2,"reason":null,"diff":{"qty":["10.0000","12.0000"]},"changes":"qty"}`
- Historial visible para quien captura: `404 {"error":"no_encontrado","message":"El registro no existe o no está disponible para usted."}`
- Tarjetas del inicio: `[["Obras pendientes de completar captura","#/avances?f.status=borrador,reportado"],["Estimaciones listas y pendientes de revisión","#/estimaciones-contratistas?f.status=revision_interna,lista_autorizar,conciliacion"],["Partidas observadas sin resolver","#/estimaciones-contratistas?f.status=conciliacion"],["Autorizado pendiente d`
- Permisos con "forzar" u "omitir validación": `ninguno`

