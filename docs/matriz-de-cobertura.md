# Matriz de cobertura

Estado: **Hecho** (implementado y con prueba automatizada del flujo), **Hecho s/p** (implementado y ejercitado por la demostración o la API, sin prueba automatizada específica), **Parcial**, **Pendiente**. Servicios en `server/usecases/`; pruebas en `tests/`.

| § | Tema | Pantallas | Servicio | Entidades principales | Pruebas | Estado |
|---|---|---|---|---|---|---|
| 1–2 | Ciclo y bloques A, B, C | Todas | Todos | — | Recorridos 1–8 | Hecho |
| 3 | Experiencia y plataformas | Interfaz adaptable e instalable; tablas con búsqueda, filtros, orden, columnas, paginación, totales y CSV; estados de carga, vacío, error, sin permiso, conflicto | `web/js/core.js`, `table.js` | — | Recorrido visual | Hecho s/p (formularios sin prueba automatizada) |
| 4 | Roles y permisos | Usuarios, Roles, Delegaciones | `admin.js`, `core/auth.js` | users, roles, rolePermissions, roleAssignments, delegations, authorizationLimits | `c_plataforma` permisos | Hecho |
| 5 | Catálogos y personas | Configuración → catálogos | `catalogs.js` | parties, partyAliases, contacts, workers, crews, crewMemberships, partyBankAccounts, personnelNotices | Indirecta | Hecho s/p |
| 6 | Obras y expediente | Obras, ficha con pestañas, cierres | `works.js`, `reports.js` | works, locations, workAssignments, workClosures | Indirecta | Hecho s/p |
| 7 | Conceptos, unidades, tarifas | Conceptos, Tarifas, Niveles de detalle | `catalogs.js`, `common.resolveRate` | concepts, conceptLinks, rates, detailLevels | Criterios 7, 8 | Hecho |
| 8 | Presupuestos y modificaciones | Presupuesto de obra, versión, aditivas y deductivas | `budgets.js` | contracts, budgets, budgetVersions, budgetItems, changeOrders | Criterio 21 | Hecho (modificaciones s/p) |
| 9 | Captura y generadores | Capturar avance, Avances, detalle | `progress.js` | captures, progressEntries, generatorLines, progressAdjustments | Criterios 4, 5, 6 | Hecho |
| 10 | Fotografías, archivos, planos | Evidencias, Planos | `attachments.js` | attachments, evidenceLinks, plans, planVersions, planAnnotations | Permisos de descarga; criterio 36 | Hecho; planos s/p |
| 11 | Estimaciones a contratistas | Lista, detalle, portal | `cestimates.js` | cEstimates, cEstimateItems, executionAllocations, observations, approvals, documentVersions | Recorrido 1; criterios 9–12 | Hecho |
| 12 | Adicionales, incidencias | Adicionales, Incidencias | `additionals.js` | additionals, incidents, incidentComments | Recorrido 2 | Hecho (incidencias s/p) |
| 13 | Jornadas y rayas | Jornadas y rayas | `additionals.js` | workdays, workdayAllocations, contractorAdvances | Demostración | Hecho s/p; cruce con partidas: Parcial |
| 14 | Cierre semanal | Cierre semanal, cierre emitido | `closes.js` | weeklyCloses, closeDocuments, payComponents, paymentInstructions | Criterios 14, 32 | Hecho |
| 15 | Pagos | Obligaciones, Desembolsos, Anticipos | `payments.js`, `ledger.js` | obligations, disbursements, paymentApplications, advanceApplications | Criterios 15–18 | Hecho |
| 16 | Estimaciones al cliente | Lista, detalle, vista previa, portal | `kestimates.js` | kEstimates, kEstimateItems, clientObservations | Recorrido 3 | Hecho |
| 17 | Anticipos, retenciones, impuestos, cobranza | Cuentas por cobrar, Cobros, Facturas, Anticipos | `receivables.js` | invoices, invoiceLinks, receipts, receiptApplications, clientAdvances, retentions, arAdjustments, collectionActions | Recorrido 4; criterio 20 | Hecho; devoluciones: Pendiente; ajustes y gestión s/p |
| 18 | Gastos y proveedores | Gastos | `expenses.js` | expenses, expenseAllocations | Recorrido 5; criterio 23 | Hecho |
| 19 | Distribución, caja chica, insumos | Prorrateos, Caja chica, Insumos | `expenses.js`, `cash.js`, `supplies.js` | allocationRules, allocationRuns, pettyFunds, pettyMovements, supplies, supplyMovements | Criterios 25–27 | Hecho; prorrateo por regla s/p; indicador por m²: Parcial |
| 20 | Caja, bancos, conciliación | Caja y bancos, Conciliación, Proyección | `cash.js` | accounts, cashMovements, transfers, reconBatches, bankLines, reconLinks | Criterio 24; conciliación | Hecho; proyección s/p |
| 21 | Resultados | Resultados, Cierre de periodo | `reports.js` | economicPeriods | Resultado parcial y transferencia | Hecho s/p (resultado final: no se calcula a propósito) |
| 22 | Inicio y reportes | Inicio por rol, Reportes | `reports.js` | activityLogs | Criterio 28 | Hecho s/p |
| 23 | Documentos y comunicación | Documentos, PDF, enlaces, avisos | `documents.js`, `pdf/render.js` | issuedDocuments, shareLinks, notifications | Criterios 37, 38 | Hecho |
| 24 | Importación | Importación, Incidencias, Coincidencias | `imports.js`, `importers/` | importBatches, sourceRecords, matchProposals, qualityIssues | Criterios 13, 29, 30; lectura de los 5 libros reales | Parcial: no convierte en documentos operativos; pagos anteriores a 2023 y PDF pendientes |
| 25 | Casos reales | — | Pruebas e importación | — | Todos los casos reproducidos | Hecho |
| 26 | Modelo de datos | Diccionario | `domain/schema.js` | ~105 entidades | Validación de esquema y referencias | Hecho |
| 27 | Cálculos y precisión | — | `domain/decimal.js` | — | Importes exactos en todas las pruebas | Hecho; otras monedas: Pendiente |
| 28 | Persistencia sin base de datos | Respaldos | `core/store.js`, `core/backup.js` | auditEvents, idempotentOps, backupManifests | Criterios 32–35, 39 | Hecho |
| 29 | CSV y paquete portable | Exportar paquete, CSV en cada tabla | `core/csv.js`, `core/package.js` | — | Criterio 31 | Hecho |
| 30 | Conectividad y borradores | Captura | `web/js/pages/operacion.js` | — | Idempotencia en servidor | Hecho s/p (sin prueba en dispositivo) |
| 31 | Seguridad y auditoría | Historial | `core/auth.js`, `core/http.js`, `admin.js` | auditEvents | Permisos, cadena de auditoría | Hecho |
| 32 | Migración futura | — | `docs/migracion.md`, `scripts/gen-docs.js` | — | Paquete de ida y vuelta | Hecho (preparación); adaptador: fuera de etapa |
| 33 | Demostración | Perfiles en el acceso, reinicio | `seed/demo.js` | — | Aislamiento (criterio 40) | Hecho |
| 34 | Criterios de aceptación | — | — | — | 40 criterios: ver [pruebas](pruebas-y-limitaciones.md) | Hecho, con las salvedades indicadas en 36 y 38 |
| 35 | Decisiones pendientes | Decisiones pendientes, Parámetros | `seed/base.js` | pendingDecisions, settings | — | Hecho |
| 36 | Entregables | `README.md`, `docs/` | — | — | — | Hecho |
