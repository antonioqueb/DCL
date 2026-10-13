# Auditoría funcional de la plataforma de DCL Instalaciones

Fecha de ejecución: 12 de octubre de 2026 (hora de Monterrey).
Documentos que acompañan a este informe: [matriz.md](matriz.md) (los 323 requisitos, uno por fila) y [casos.md](casos.md) (los 78 casos ejecutados con lo esperado y lo obtenido).

## Respuesta corta

**¿Puede Lucía operar DCL con este sistema, conservar el origen de cada cantidad e importe, cerrar la semana, pagar correctamente y conocer lo pendiente sin reconstruirlo entre archivos?**

Todavía no en la versión auditada, por dos defectos críticos de corrección acotada; con ellos resueltos, sí para el cierre semanal, con las limitaciones que se enumeran.

- El recorrido de campo a cobro funciona y concilia: dos ubicaciones, adicional, jornada, observación del contratista, autorización parcial, cierre, pago, reverso, estimación al cliente en otro periodo, amortización de anticipo y cobro parcial cerraron con las tres vistas (obra, contratista, cliente) iguales al centavo (caso CAS-60).
- Dos defectos impiden operar hoy:
  - **H-01**: el administrador técnico puede darse a sí mismo el rol de dirección y autorizar pagos.
  - **H-02**: una estimación reabierta para revisión sigue siendo pagable; se pagó su saldo completo mientras estaba sin autorización vigente.
- Un tercero afecta al cliente: **H-03**, los metros de retrabajo se suman como ejecución entregada y cobrable (20 m² entregados + 5 reparados aparecen como 25 cobrables).
- El arranque con la historia de DCL no está resuelto: los cinco libros se leen e interpretan, pero sus registros no se convierten en saldos ni documentos (H-30). El sistema puede empezar "desde hoy" con saldos de cuentas; los saldos por contratista, cliente y anticipo tendrían que capturarse a mano y hoy no hay dónde.

Dependencia de Excel que subsiste: los saldos de apertura por contratista y cliente, el costo del material consumido por obra y el cruce de jornada contra destajo siguen fuera del sistema.

## 1. Qué se auditó y cómo

| Dato | Valor |
|---|---|
| Repositorio | carpeta local `Clientes/DCL`, rama única |
| Revisión de la aplicación | `eec2cf4` (12/10/2026). El directorio `auditoria/` se agregó después (`3b5a0b6` y cambios sin confirmar); no modifica la aplicación |
| Ejecución | Node.js 24.7 en macOS 27.2; `npm run demo` (puerto 4310) y servidor real en puerto efímero para las pruebas |
| Arquitectura encontrada | servidor HTTP propio sin framework; almacenamiento en archivos JSON por generaciones con manifiesto atómico; interfaz web estática (Astro) adaptable a celular; portales de contratista y cliente dentro de la misma aplicación. Coincide con el alcance previo (archivos JSON y CSV); no hay base de datos ni aplicación nativa |
| Tamaño | 8,690 líneas entre servidor, interfaz y pruebas; 106 entidades en un esquema único |
| Pruebas existentes | 13 pruebas automatizadas del proyecto; se ejecutaron y pasaron las 13. Usan el servidor real, no sustitutos |
| Pruebas de esta auditoría | 78 casos propios (CAS-01 a CAS-60, 11 adversos, 7 de reglas) con 655 comprobaciones. Cada caso arranca el servidor real sobre una carpeta temporal y crea sus datos por la API |
| Datos | escenario de la sección 26 (obras A y B, K1, K2, C1, S1, S2, D1, T1). Ningún dato real en pruebas ni en este informe |
| Fuentes reales | los cinco libros de Excel se leyeron en memoria y en solo lectura; de ellos solo se reportan conteos |

Lo que **no** se hizo: no se modificó el código de la aplicación, no se tocaron `var/demo` ni `var/operacion` con datos de prueba, no se enviaron mensajes ni se ejecutaron pagos. Para la prueba de navegador se iniciaron sesiones en la demostración (eso escribe eventos de acceso, no datos de negocio).

Criterio de evidencia: "cumple verificado" exige un caso ejecutado contra el servidor real. Lo que solo se leyó en el código quedó como "cumple parcialmente" o "no verificable", con el motivo.

## A. Dictamen ejecutivo

| Bloque | Dictamen | Fundamento |
|---|---|---|
| **A · Cierre semanal** | **NO APTO en esta versión; apto con limitaciones al corregir H-01 y H-02** | De 123 requisitos del bloque: 82 cumplen verificados, 26 parciales, 4 no cumplen, 6 no verificables, 4 requieren decisión, 1 no aplica. El ciclo captura → revisión → observación → autorización → cierre → pago es exacto, atómico e idempotente. Lo impiden un acceso indebido (H-01) y un pago sobre documento sin autorización vigente (H-02). También pesan H-04 (catálogo desactivado sigue en uso) y H-11 (el tablero no muestra lo excluido) |
| **B · Control administrativo** | **NO APTO como control integral** | De 54 requisitos: 32 verificados, 9 parciales, 2 no cumplen, 7 no verificables, 4 requieren decisión. Gastos, distribución, pago mixto, caja chica y prorrateo funcionan. No cumple: movimientos anteriores al saldo inicial alteran el saldo (H-07) y el periodo cerrado no bloquea gastos retroactivos (H-06). Faltan la apertura de saldos, la valorización de insumos y la política de resultados |
| **C · Clientes y documentos** | **NO APTO hasta corregir H-03; después, apto con limitaciones** | De 58 requisitos: 36 verificados, 19 parciales, 1 no cumple, 2 no aplican. Versiones, aprobación parcial, anticipo, retención, factura y cobro concilian, y el cliente no ve datos internos. Lo impide que el retrabajo se vuelva cobrable (H-03). Limitan H-12, H-13, H-14 y H-15 |
| **Transversal** (accesos, persistencia, auditoría, importación) | Sólido salvo H-01, H-05 y la apertura | De 88: 57 verificados, 23 parciales, 2 no cumplen, 3 no verificables, 2 requieren decisión, 1 no aplica |

Cobertura global: **207 de 323 requisitos cumplen con evidencia** (64.1 %); 77 parciales, 9 no cumplen, 16 no verificables, 10 requieren decisión de DCL y 4 no aplican. De los 93 críticos: 80 verificados, 8 parciales, 3 no cumplen (ACC-08, AVA-08, TES-01), 1 no verificable y 1 requiere decisión. Los no verificables y las decisiones pendientes no se contaron como cumplimiento.

Lo que una persona ya no tendría que reconstruir en Excel, con evidencia: el total del sábado por medio de pago, qué partidas quedaron fuera y siguen disponibles, cuánto se debe a cada contratista, qué ejecución falta estimar al cliente y qué se ha cobrado.

## C. Registro de hallazgos

Prioridad: **1** bloquea operar · **2** corregir antes de usar el bloque afectado · **3** corregir pronto · **4** mejora.
Cada hallazgo se reproduce con `node auditoria/<archivo>.mjs <caso>`; los pasos están en ese archivo y el resultado en [casos.md](casos.md). Ningún importe de esta sección es una pérdida de DCL: son datos de prueba.

### H-01 · El administrador técnico puede concederse la facultad de autorizar pagos — Crítica, prioridad 1
- **Requisitos:** ACC-08, ACC-13. **Caso:** ADV-01.
- **Precondiciones:** un usuario con rol de administración técnica; un pago preparado.
- **Pasos:** el administrador intenta autorizar el pago (403, correcto) → `POST /api/users/{su id}/roles` con el rol de dirección → `POST /api/disbursements/{id}/authorize`.
- **Esperado:** la asignación de un rol con facultad económica requiere a alguien con esa facultad, o al menos no puede hacerse sobre uno mismo.
- **Obtenido:** asignación 200 y autorización 200. También creó un usuario nuevo con rol de dirección.
- **Atenuante:** la asignación queda en la auditoría con su autor.
- **Efecto:** quien administra cuentas puede autorizar pagos, estimaciones y cierres. Anula la separación de funciones.
- **Dónde:** `server/usecases/admin.js` (`/api/users`, `/api/users/:id/roles`): solo exige `users.manage`.

### H-02 · Una estimación reabierta sigue siendo pagable — Crítica, prioridad 1
- **Requisitos:** EST-12, PAG-16, CIE-12. **Caso:** ADV-03.
- **Precondiciones:** estimación autorizada por 10,000 con 8,000 pagados.
- **Pasos:** dirección la reabre con motivo (vuelve a "revisión interna") → tesorería prepara 2,000 → dirección autoriza → tesorería confirma con recibo.
- **Esperado:** mientras el documento no tenga autorización vigente, su obligación no admite pagos nuevos.
- **Obtenido:** 200 en los tres pasos; obligación pagada al 100 % con la estimación en revisión.
- **Lo que sí funciona:** reautorizar por debajo de lo pagado se bloquea con indicación de tratar el sobrepago (CAS-29).
- **Efecto:** se puede pagar completo un importe que se está corrigiendo a la baja.
- **Dónde:** `cestimates.js` `reopen` no cambia la obligación; `payments.js` no revalida el documento de origen.

### H-03 · El retrabajo se suma como ejecución entregada y cobrable — Crítica, prioridad 2 (bloque C)
- **Requisitos:** AVA-08, CLI-02, ADI-11. **Caso:** CAS-20.
- **Pasos:** validar 20 m² en una partida de presupuesto → capturar y validar 5 m² de retrabajo (causa: error de instalación) en la misma partida.
- **Esperado:** entregado 20; cobrable 20; el costo de la reparación identificado aparte.
- **Obtenido:** seguimiento del presupuesto 25 ejecutados; disponible para cobrar 25. Un retrabajo sin partida de presupuesto también aparece como cobrable.
- **Efecto:** la estimación al cliente propondría metros reparados como si fueran nuevos; además el retrabajo entra a la estimación del contratista a tarifa completa sin decisión sobre quién lo absorbe.
- **Dónde:** `budgets.js` `tracking` y `kestimates.js` `billable` solo excluyen el tipo "adicional".

### H-04 · Contratistas y conceptos desactivados siguen aceptando registros — Alta, prioridad 2
- **Requisitos:** OBR-08, TAR-11, AVA-10. **Casos:** CAS-56, REG-02.
- **Obtenido:** con el contratista inactivo se creó una estimación nueva y una captura; con el concepto inactivo se capturó un avance. Los históricos y los documentos emitidos sí se conservan y el registro no se puede borrar.
- **Efecto:** se puede seguir generando deuda con alguien dado de baja.
- **Dónde:** `progress.js` y `cestimates.js` no consultan el estado del catálogo.

### H-05 · Editar sin enviar la versión leída pisa el cambio de otra persona — Alta, prioridad 2
- **Requisitos:** PER-06. **Caso:** CAS-55.
- **Obtenido:** con `recordVersion` la segunda edición recibe conflicto y ve ambos valores (correcto). Sin ese dato, `PATCH /api/progress/{id}` respondió 200 y dejó 13 donde había 11.
- **Efecto:** la protección depende de que cada pantalla envíe la versión. No se revisó pantalla por pantalla cuáles la envían.
- **Dónde:** `store.js` aplica `expectedVersion` solo si llega.

### H-06 · El periodo económico cerrado no bloquea cambios retroactivos — Alta, prioridad 2 (bloque B)
- **Requisitos:** RES-09. **Caso:** ADV-10.
- **Obtenido:** con 2026-08 cerrado se capturó y autorizó un gasto fechado el 25/08/2026. La reapertura de periodo no existe (limitación ya declarada por el proyecto).
- **Efecto:** el resultado de un mes cerrado cambia sin rastro de versión.

### H-07 · Un movimiento anterior al saldo inicial altera el saldo — Crítica por requisito, prioridad 2 (bloque B)
- **Requisitos:** TES-01, IMP-14. **Caso:** CAS-53.
- **Pasos:** cuenta con saldo inicial de 1,000 al 30/06/2026 → +100 y −20 posteriores (saldo 1,080, correcto) → comisión de 50 con fecha 10/05/2026.
- **Obtenido:** aceptado; saldo 1,030.
- **Efecto:** cargar historia anterior al corte cuenta dos veces lo que el saldo inicial ya incluye.
- **Dónde:** `cash.js` no compara la fecha del movimiento con `openingDate`.

### H-08 · Existencias y cuentas pueden quedar en negativo — Media, prioridad 3
- **Requisitos:** INS-03, TES-02. **Casos:** CAS-45, CAS-46.
- **Obtenido:** entregar 25 con 10 en almacén y consumir 40 con 25 en obra se aceptan con una advertencia; la existencia queda en −15 y marcada como negativa. Una transferencia por más del saldo de la cuenta también se acepta.
- **Nota:** el negativo no se oculta. Falta la política (D-14).

### H-09 · La caja chica admite reponer más de lo comprobado — Media, prioridad 3
- **Requisitos:** CAJ-04. **Caso:** CAS-43. Con todo comprobado y repuesto, otra reposición de 500 se aceptó.

### H-10 · La misma fotografía cuenta dos veces como evidencia — Media, prioridad 3
- **Requisitos:** EVI-04. **Caso:** CAS-18. El reintento con la misma clave de operación no duplica (correcto); elegir de nuevo el mismo archivo crea otro adjunto con el mismo contenido y otra evidencia.

### H-11 · Tras una autorización parcial, la partida diferida desaparece del tablero y del cierre — Alta, prioridad 2
- **Requisitos:** CIE-06. **Caso:** CAS-13 y comprobación adicional.
- **Obtenido:** antes de autorizar, el tablero sí avisa: "1 partida observada" y el documento "quedará fuera de este cierre". Después de autorizar parcialmente (5,000 autorizados, 2,000 diferidos), el tablero muestra 0 observadas y "Pendientes informados" vacío, y el cierre emitido registra cero pendientes. El importe por cerrar es correcto y la partida queda disponible la semana siguiente.
- **Efecto:** quien cierra ya no ve qué se quedó fuera ni por qué; el cierre emitido tampoco lo documenta.

### H-12 · La estimación al cliente propone el excedente sobre contrato sin aviso — Media, prioridad 3
- **Requisitos:** PRE-08, PRE-07, CLI-02. **Caso:** CAS-07. Con 100 m² contratados y 105 ejecutados, la estimación generada propone 105 sin advertencia. La captura sí avisa y la validación exige motivo. El seguimiento muestra −5 en cantidad y 0.00 en importe pendiente.

### H-13 · El excedente de un cobro no queda identificado — Media, prioridad 3
- **Requisitos:** COB-10. **Caso:** CAS-37. Cobro de 9,000 con 8,000 aplicados: los 1,000 restantes no aparecen como "sin aplicar" ni como anticipo en el cobro, el listado o el resumen. El dinero sí entró completo a banco.

### H-14 · El vencimiento que vio el cliente se sustituye al aprobar; la antigüedad no admite fecha de corte — Media, prioridad 3
- **Requisitos:** COB-12, SEM-06. **Caso:** CAS-38. El cliente vio vencimiento 01/10/2026; al aprobar, el sistema lo cambió a 28/10/2026 (aprobación + 15 días del contrato) sin aviso. Los días vencidos se calculan bien (11), pero siempre contra el día de hoy.

### H-15 · El enlace de una emisión sustituida sigue entregando el PDF anterior — Media, prioridad 3
- **Requisitos:** DOC-07. **Caso:** ADV-09. Tras reemitir, la emisión anterior queda "sustituida" en el sistema, pero su enlace responde 200 con el PDF viejo y sin advertencia. Revocar el enlace sí funciona.

### H-16 · "Quien recibe" el pago acepta cualquier nombre — Media, prioridad 3
- **Requisitos:** PAG-06. **Caso:** ADV-07. Un pago en efectivo con un tercero como receptor se registra sin relación con el beneficiario ni autorización específica.

### H-17 · La tarifa se elige por la semana del documento, no por la fecha de ejecución — Media, prioridad 3
- **Requisitos:** TAR-03. **Caso:** CAS-10. Trabajo ejecutado el 30/08 e incluido dos semanas después se pagó a la tarifa vigente desde el 31/08 (400 en lugar de 350). Además se aceptaron dos tarifas con el mismo alcance y la misma vigencia. Requiere la decisión D-04.

### H-18 · La reclasificación de un gasto autorizado no aparece en el historial del gasto — Baja, prioridad 4
- **Requisitos:** GAS-14. **Caso:** CAS-41 y comprobación adicional.
- **Obtenido:** redistribuir 700/300 a 600/400 sobre un gasto ya autorizado exige motivo y deja cuatro eventos de auditoría con ese motivo y los valores eliminados. Esos eventos cuelgan de los renglones de distribución: al consultar el historial por el gasto solo aparecen "captura" y "estado". El total de empresa no cambió.
- **Efecto:** el rastro existe pero no se encuentra desde el gasto.

### H-19 · No se puede registrar un precio cero expreso; el catálogo sí acepta tarifa cero — Media, prioridad 3
- **Requisitos:** TAR-09. **Casos:** CAS-11, REG-02. La partida sin tarifa bloquea la autorización (correcto). El precio excepcional exige ser mayor que cero aun con motivo; en cambio una tarifa de catálogo en 0 se guarda sin motivo.

### H-20 · Importar una versión con cantidad distinta no exige resolución — Media, prioridad 3
- **Requisitos:** IMP-09. **Caso:** CAS-50. La simulación sí reporta "1 cambio" (72.78 frente a 72.08) y el conflicto de fecha queda como incidencia abierta. Pero el registro no muestra el valor anterior y la confirmación se aceptó sin resolver.

### H-21 · Cantidades fuera de rango y fracciones de pieza — Media, prioridad 3
- **Requisitos:** TAR-10. **Caso:** CAS-49. Se aceptó una cantidad de veinte dígitos y 1.37 en un concepto cuya unidad es pieza. Las cantidades con más de cuatro decimales se redondean a cuatro.

### H-22 · El gasto no expone su fecha de autorización — Baja, prioridad 4
- **Requisitos:** GAS-02. **Caso:** CAS-42. Muestra quién autorizó; la fecha solo está en la auditoría.

### H-23 · La bandeja de pendientes no indica antigüedad ni responsable — Media, prioridad 4
- **Requisitos:** REP-06, ADI-14. **Caso:** REG-04. Agrupa por acción ("por validar", "por pagar"…) según los permisos de quien entra.

### H-24 · El consumo de insumos no se valoriza — Media, capacidad pendiente (bloque B)
- **Requisitos:** INS-08, RES-04. **Caso:** CAS-45. Las cantidades concilian; ningún reporte da el costo del material consumido por obra. La compra para almacén no se imputa a la obra (correcto).

### H-25 · Un rechazo total del cliente deja la estimación como "Aprobada" — Baja, prioridad 4
- **Requisitos:** CLI-14 (nota). **Caso:** ADV-09. Las cantidades se liberan bien; el estado y la etiqueta "aprobación parcial" confunden.

### H-26 · Los campos de importe eliminan las comas — Alta por requisito, prioridad 2; evidencia solo estática
- **Requisitos:** MOV-02. **Dónde:** `web/src/app/core.js`, campo decimal (`raw()` quita comas y espacios). "1250,50" se interpretaría como 125,050.
- **Verificado por ejecución:** la API rechaza "1,29" con explicación y la pantalla de captura de avances no altera el texto.
- **No ejecutado:** el caso en un formulario de importes; el intento con navegador sin interfaz no logró abrir el diálogo.

### H-27 · "Cantidad pagada" del avance incluye lo reservado en un borrador — Baja, prioridad 4
- **Requisitos:** SEM-12. **Caso:** REG-03. Con la estimación aún en borrador el avance ya muestra 10 en ese campo.

### H-28 · La referencia de la API está desactualizada — Baja, prioridad 4
- `docs/contratos-de-api.md` no incluye rutas existentes (bandeja de trabajo, explorador de reportes, definición de tarifa desde la partida).

### H-29 · El adicional se valida sin fotografía con solo escribir un motivo — Media, prioridad 3
- **Requisitos:** EVI-03. **Caso:** CAS-18. Para avances existe una excepción explícita con facultad y motivo; para adicionales cualquier texto en "motivo" cumple, sin registro como excepción de evidencia.

### H-30 · No existe la apertura de saldos — Alta, capacidad pendiente
- **Requisitos:** IMP-14, IMP-15, IMP-16.
- **Obtenido:** los cinco libros reales se interpretan sin error (51 hojas, 13 ocultas; decenas de miles de registros). Cualquier estrategia de confirmación los deja como registros de origen; no se convierten en saldos, obligaciones ni documentos. Solo las cuentas de caja y banco tienen saldo inicial.
- **Efecto:** no se puede arrancar con lo que hoy se debe a cada contratista ni con lo que cada cliente adeuda.

## E. Conciliaciones

Fecha de corte: la de cada caso (datos de prueba, agosto–octubre de 2026). Moneda: MXN. Tolerancia: cero centavos. Estados incluidos: los indicados en cada renglón.

| # | Conciliación | Cifras | Diferencia | Explicación |
|---|---|---|---|---|
| 1 | Presupuesto: original + aditivas − deductivas = vigente (aprobadas) | 100,000 + 10,000 − 5,000 = 105,000 (CAS-16). Contratado 100 m², ejecutado validado 105 (CAS-07) | 0 en importe vigente. Pendiente −5 m² mostrado; importe pendiente mostrado 0.00 | Error de presentación: el excedente no se muestra en importe (H-12) |
| 2 | Cantidad validada = asignada + disponible, contratista | 87.5 ml = 62.5 autorizados + 25 diferidos disponibles (CAS-13) | 0 | — |
| 2b | Cantidad validada = aprobada + propuesta + disponible, cliente | 60 m² = 40 + 15 + 5 (CAS-31) | 0 | — |
| 2c | Entregado frente a cobrable con retrabajo | 20 m² entregados; 25 cobrables (CAS-20) | **+5 m²** | Error (H-03) |
| 3 | Partidas de la estimación = autorizado + diferido; cierre = autorizado | 12,100 = 8,600 + 3,500; cierre 8,600 (CAS-60) | 0 | — |
| 4 | Bruto = banco + descuentos + anticipos + efectivo | 322,879.30 = 41,110 + 3,770 + 0 + 277,999.30 (CAS-21) | 0.00 | — |
| 5 | Obligación − pagos confirmados + reversos = saldo | 10,000 − 4,000 − 6,000 + 6,000 = 6,000 (CAS-28); 8,600 − 5,000 = 3,600 (CAS-60) | 0 | — |
| 6 | Estimación al cliente − amortización − cobros = saldo; anticipo | 30,000 − 3,000 = 27,000; − 10,000 = 17,000; anticipo 5,000 − 3,000 = 2,000 (CAS-60). 1,000 + 80 − 75.60 − 50 = 954.40 (CAS-35, tasas solo de prueba) | 0 | Tras liberar la garantía el saldo por cobrar sube a 1,080 pero el resumen del documento sigue en 1,030: cifra desactualizada en el documento (COB-06) |
| 7 | Comprobante = asignaciones; costo no se duplica al pagar | 1,000 = 700 + 300 → 600 + 400; costo 1,000 antes y después del pago (CAS-41, CAS-42) | 0 | — |
| 8 | Costo de empresa = mano de obra + gastos asignados | 100,000 + 10,000 prorrateados (3,000 y 7,000) = 110,000 (CAS-44) | 0 | No se cotejó el desglose por obra del reporte; rubros sin asignar no pueden autorizarse |
| 9 | Caja chica: entregas + reposiciones = disponible + comprobado | 2,000 + 1,200 = 2,000 + 1,200 (CAS-43) | 0 | Se aceptó una reposición extra de 500 (H-09) |
| 10 | Insumos: inicial + entradas − entregas + devoluciones = existencia | Almacén 0 + 50 − 30 + 5 = 25; obra 30 − 25 − 5 = 0; consumido 25 (CAS-45) | 0 en cantidad | Sin valor en dinero (H-24) |
| 11 | Caja y bancos: inicial + movimientos = saldo | 5,000 + 10,000 = 7,000 + 8,000 tras traspaso de 2,000 (CAS-46). Caja 500,000 − 5,000 = 495,000; banco 1,000,000 + 5,000 + 10,000 = 1,015,000 (CAS-60) | 0 | Con un movimiento anterior al saldo inicial: 1,080 → 1,030 (H-07) |
| 12 | Importación: fuente = leídos + excluidos; convertidos | Libro de prueba: 4 registros + 1 subtotal excluido; total 300, no 600 (CAS-51). Libros reales: 9,808 / 18,520 / 22,670 / 16,220 / 192 registros interpretados | Convertidos en saldos: 0 | Limitación del sistema (H-30). Las incidencias detectadas en los libros reales (errores de fórmula, fechas en conflicto, diferencias de importe) quedan sin resolver porque no se cargaron |
| 13 | Pantalla = API = CSV = documento | 0.01 + 0.01 = 0.02 en estimación, cierre, documento, CSV y obligación (CAS-49); 2,500 y 1,200 en listado y CSV (CAS-48) | 0 | El PDF se coteja por las cadenas que dibuja, no extrayendo texto del archivo |
| 14 | Original = respaldo restaurado = paquete reimportado | Idénticos todos los registros salvo 1 evento de auditoría y 1 manifiesto de respaldo escritos después de la copia; paquete por JSON y por CSV idéntico (CAS-59) | 0 | Diferencia esperada: el respaldo se registra a sí mismo después de copiarse |

## F. Mapa de reglas

| Regla | Dónde se calcula | Dónde se autoriza | Dónde se guarda | Rutas que la eluden |
|---|---|---|---|---|
| Cantidad del avance (periodo, acumulado, generador) | `progress.js` | validación en `reviewEntry` | `progressEntries`, `generatorLines` | Ninguna encontrada. La vista previa del generador se calcula también en la pantalla (`operacion.js`), con aviso de que el servidor decide |
| Tarifa aplicable | `common.js resolveRate` | alta de tarifa; precio excepcional con motivo | `rates`; copia en la partida | Tarifa por semana del documento (H-17); tarifa cero sin motivo (H-19) |
| Importe por partida y redondeo | `decimal.js lineAmount` | — | partida y versión congelada | Ninguna: una sola función |
| Asignación de cantidad a documentos | `cestimates.js`, `kestimates.js` | autorización de cada documento | `executionAllocations` | Retrabajo cuenta como cobrable (H-03) |
| Conformidad y autorización del contratista | `cestimates.js accept`, `authorize` | dirección; política de parciales | `approvals`, `documentVersions` | Política de parciales activa de fábrica (D-03) |
| Liquidación del cierre | `closes.js` | dirección | `weeklyCloses`, `paymentInstructions` | Ninguna; tablero incompleto (H-11) |
| Saldo de la obligación | `ledger.js obligationState` | autorizar y confirmar pago | `disbursements`, `paymentApplications` | Pago con documento reabierto (H-02); receptor libre (H-16) |
| Total de la estimación al cliente | `kestimates.js` (líneas con base) | aprobación del cliente o registro externo | `kEstimates.calc`, versión publicada | Vencimiento recalculado al aprobar (H-14) |
| Saldo por cobrar y antigüedad | `ledger.js receivableState`, `receivables.js aging` | reverso con facultad | `receipts`, `receiptApplications` | Excedente sin identificar (H-13); sin fecha de corte (H-14) |
| Costo por obra | `reports.js workCosts`, reporte de costos | autorización del gasto | `expenses`, `expenseAllocations` | Periodo cerrado no bloquea (H-06) |
| Saldo de cuenta | `cash.js` | ajustes con autorización | `cashMovements` | Fecha anterior a la apertura (H-07); saldo negativo (H-08) |
| Permisos y alcance | `auth.js buildAccess`, `permissions.js` | administración de usuarios | `roleAssignments`, `delegations` | Autoasignación de rol (H-01) |
| Edición concurrente | `store.js` | — | `recordVersion` | Solicitud sin versión (H-05) |

Fórmulas repetidas que pueden divergir: la vista previa del generador en pantalla; el formato de importes en la interfaz (`core.js`) frente al del servidor (`decimal.js`); el margen de la ficha de obra (`workFinancials`) frente al resultado de empresa (`/api/results`), que usan fechas distintas para ingreso y costo.

## G. Plan de corrección

No se ejecutó ninguna corrección. Orden por riesgo; cada punto es acotado y no requiere reescribir.

**Corregir un fallo**

| # | Hallazgo | Alcance mínimo | Módulos | Prueba de aceptación | Riesgo de regresión |
|---|---|---|---|---|---|
| 1 | H-01 | Asignar o crear un rol con permisos económicos exige un permiso distinto de `users.manage` (o la aprobación de dirección) y nunca sobre uno mismo | `admin.js`, `permissions.js` | ADV-01 completo en verde | Bajo; revisar el alta inicial de usuarios (`scripts/setup.js`) |
| 2 | H-02 | Al reabrir, la obligación pasa a un estado no pagable; preparar, autorizar y confirmar revalidan que el documento de origen siga autorizado | `cestimates.js`, `payments.js`, `ledger.js` | ADV-03 en verde; CAS-29 sigue en verde | Medio: cierres y complementos leen el estado de la obligación |
| 3 | H-03 | Excluir el retrabajo de lo entregado y lo cobrable salvo decisión expresa | `budgets.js`, `kestimates.js` | CAS-20 en verde | Bajo |
| 4 | H-04 | Rechazar capturas, estimaciones y pagos nuevos con catálogo inactivo | `progress.js`, `cestimates.js`, `common.js` | CAS-56 y REG-02 en verde | Bajo |
| 5 | H-05 | Exigir la versión leída en toda edición de entidades versionadas | `http.js` o `store.js`; revisar pantallas | CAS-55 en verde; recorrer formularios | Medio: pantallas que hoy no la envían fallarán |
| 6 | H-07 | Rechazar movimientos con fecha anterior al saldo inicial | `cash.js` | CAS-53 en verde | Bajo |
| 7 | H-06 | Bloquear captura y autorización en periodo cerrado; reapertura con facultad | `expenses.js`, `reports.js` | ADV-10 en verde | Bajo |
| 8 | H-11 | Mostrar en el tablero las partidas diferidas y sin tarifa con su motivo | `closes.js`, pantalla de cierre | CAS-13 en verde | Bajo |
| 9 | H-26 | Rechazar la coma decimal o interpretarla sin ambigüedad en los campos de importe; probar en navegador | `web/src/app/core.js` | Caso de navegador nuevo | Bajo |
| 10 | H-12, H-13, H-14, H-15, H-16, H-20, H-21, H-29 | Un cambio pequeño cada uno (aviso, campo o validación) | varios | Casos citados en verde | Bajo |
| 11 | H-08, H-09, H-10, H-18, H-19, H-22, H-23, H-25, H-27, H-28 | Ajustes menores | varios | Casos citados | Bajo |

**Completar una capacidad**

| Capacidad | Depende de | Alcance mínimo |
|---|---|---|
| Apertura de saldos (H-30) | D-16 | Captura de saldos iniciales por contratista, cliente y anticipo a una fecha, con conciliación contra los registros importados |
| Valorización de insumos (H-24) | D-14 | Costo unitario en la recepción y costo del consumo por obra |
| Antigüedad y responsable en la bandeja (H-23) | — | Dos campos calculados |
| Fecha de corte en cuentas por cobrar (H-14) | — | Parámetro de fecha en la consulta |

**Decidir una política** (sección H): H-17, H-19 y la política de parciales cambian de comportamiento según la decisión; no deben corregirse antes.

## H. Decisiones pendientes

**Para Lucía**

| # | Decisión | Alternativas | Comportamiento actual |
|---|---|---|---|
| D-01 | Corte semanal y capturas tardías | (a) lo tardío entra como complemento de la semana cerrada; (b) pasa a la semana siguiente | Ambas existen; la persona elige |
| D-02 | Quién autoriza qué y hasta qué importe | (a) solo dirección; (b) coordinación hasta un límite; (c) doble aprobación arriba de un importe | Solo dirección; ningún límite cargado |
| D-03 | ¿Se paga lo acordado aunque haya partidas observadas? | (a) sí, lo observado se difiere; (b) no, se detiene todo el documento | Sí (activado de fábrica sin acuerdo) |
| D-04 | Tarifa que rige: ¿la vigente al ejecutar o al estimar? Niveles de detalle | (a) fecha de ejecución; (b) semana del documento | Semana del documento; niveles de detalle sin cargar |
| D-05 | ¿Qué corrección obliga a que el contratista vuelva a aceptar? | (a) cualquier cambio de cantidad o precio; (b) solo si cambia el total | Cualquier cambio en la partida |
| D-06 | Jornada y destajo sobre la misma actividad; descuento mayor al neto; documentación pendiente | (a) permitir con justificación; (b) bloquear | No se cruza; el descuento mayor se bloquea; la documentación no bloquea |
| D-07 | Retrabajo: quién lo absorbe y si se cobra | (a) contratista si es error suyo; (b) DCL; (c) cliente si lo pidió | Se paga a tarifa completa y se vuelve cobrable (H-03) |
| D-08 | Qué trabajos exigen fotografía y quién concede excepciones | (a) solo ocultos y adicionales; (b) todos | Ocultos y adicionales; excepción por dirección |
| D-09 | Equivalencias entre lo que se paga y lo que se cobra (m² frente a lote) | definir por concepto | Se relacionan por partida de presupuesto; sin conversión de unidades |
| D-10 | Anticipo, amortización, retención, impuesto y comisión por contrato | valores y bases de cada contrato | Sin valores por omisión: sin contrato validado no se puede aprobar |
| D-11 | Redondeo y diferencias pequeñas | (a) tolerancia de centavos con motivo; (b) cero | Parámetro en 1.00, pero los cobros rechazan hasta 0.01 de diferencia |
| D-12 | Cuándo se reconoce ingreso y costo; obra en proceso | (a) al aprobar el cliente; (b) al facturar; (c) al cobrar | Sin definir: el resultado se marca "parcial" y el final queda vacío |
| D-13 | Base para repartir costos sociales y supervisión | (a) mano de obra autorizada; (b) porcentaje fijo; (c) manual | Las tres existen; ninguna aprobada |
| D-14 | Inventario, compras para almacén, activos y existencias negativas | (a) bloquear negativos; (b) permitir con justificación | Se permiten con advertencia; activos sin política |
| D-15 | Vinta, Senter, inversiones y movimientos de socios | incluir, excluir o separar | Toda obra nace "pendiente de clasificar" y queda fuera del resultado |
| D-16 | Arranque: historia completa o saldos a una fecha; qué libro manda si difieren | (a) saldos al corte + movimientos posteriores; (b) histórico | Sin definir; no hay apertura (H-30) |
| D-17 | Acceso de contratistas y clientes; cómo aceptan | (a) portal; (b) aceptación registrada por DCL con evidencia | Ambas existen |
| D-18 | ¿Se necesita capturar sin señal? ¿Teléfonos compartidos? | (a) solo borrador de texto; (b) también fotografías | Borrador de texto por usuario; las fotos pendientes no sobreviven |

**Para Alphaqueb**

| # | Decisión | Nota |
|---|---|---|
| D-19 | Alcance contratado por etapa | El sistema anuncia y contiene funciones de B y C; conviene declarar cuáles se entregan como terminadas y cuáles como preparación |
| D-20 | Quién puede conceder roles con facultad económica | Necesario para corregir H-01 |
| D-21 | Dónde se va a hospedar y con qué disco | El almacenamiento en archivos exige disco durable (PER-10); hoy no hay despliegue que auditar |

## I. Limitaciones de esta auditoría

| Limitación | Consecuencia | Próximo paso |
|---|---|---|
| La entrevista ("Markdown pegado.md") no está en disco | No se cotejaron los hechos de la entrevista más allá de lo que cita la solicitud | Proporcionar el archivo |
| Los PDF fuente (193_MedinaArq, E1, E2) no se leyeron | No se cotejó el control del cliente contra sus estimaciones impresas | Cotejo manual de E1 y E2 contra el libro Balcones |
| La interfaz se probó poco con navegador | 16 requisitos no verificables y varios parciales, sobre todo de celular (MOV) | Recorrer en navegador y en un teléfono real: captura con cámara, pérdida de señal, formularios de importes |
| H-26 solo tiene evidencia estática | No se debe dar por confirmado | Reproducir en navegador antes de corregir |
| Los libros reales se interpretaron pero no se cargaron | No hay conciliación de apertura ni de saldos reales | Decidir D-16 y construir la apertura |
| Los usuarios de prueba se crearon con la utilidad del proyecto, no por la pantalla de usuarios | El alta por interfaz no quedó probada | Caso adicional |
| No se midió volumen ni rendimiento | Se desconoce el comportamiento con años de historia | Cargar un conjunto representativo y medir; DCL debe validar la carga objetivo |
| No hay despliegue | Persistencia en disco durable, respaldo fuera de la máquina y acceso por internet sin auditar | Definir D-21 |
| Idempotencia de aprobación, pago y publicación no probada con la misma clave | PER-05 quedó parcial | Tres casos adicionales |
| Varias reglas del proyecto se apoyan en su propia suite | Se ejecutó (13 de 13) pero no se reescribieron como casos propios | Aceptable; indicado en la matriz |
| La fecha de corte de CAS-38 coincide con el día de ejecución | El caso depende de la fecha en que se corra | Agregar fecha de corte al sistema (H-14) |

## Cómo repetir la auditoría

```
node auditoria/casos-01-20.mjs
node auditoria/casos-21-40.mjs
node auditoria/casos-41-60.mjs
node auditoria/casos-adversos.mjs
node auditoria/casos-reglas.mjs
node auditoria/generar.mjs        # regenera matriz.md y casos.md
node auditoria/fuentes-reales.mjs # solo conteos de los libros reales, en memoria
```

Cada archivo acepta identificadores de caso como argumentos (por ejemplo `node auditoria/casos-adversos.mjs ADV-01`).
