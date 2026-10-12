# Matriz inicial de permisos

Propuesta de arranque: dirección debe validarla (decisión D01). Los permisos se verifican en el servidor por acción y por obra; cada rol puede ajustarse en Configuración → Roles y permisos, con motivo e historial.

| Permiso | Dirección | Coordinación | Supervisor | Auxiliar administrativa | Tesorería | Contratista | Cliente o representante | Administrador técnico | Auditor |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Consultar obras y su expediente operativo (`works.view`) | ● | ● | ● | ● | ● |  |  |  | ● |
| Crear y editar obras, ubicaciones y asignaciones (`works.manage`) | ● |  |  |  |  |  |  |  |  |
| Autorizar el cierre operativo de una obra (`works.close.operational`) | ● |  |  |  |  |  |  |  |  |
| Autorizar el cierre financiero de una obra (`works.close.financial`) | ● |  |  |  |  |  |  |  |  |
| Consultar catálogos (`catalogs.view`) | ● | ● | ● | ● | ● |  |  | ● | ● |
| Mantener catálogos (conceptos, unidades, personas, cuentas) (`catalogs.manage`) | ● |  |  |  |  |  |  |  |  |
| Ver tarifas de contratación (lo que se paga al contratista) (`rates.contract.view`) | ● | ● |  |  |  |  |  |  |  |
| Ver precios comerciales (lo que se cobra al cliente) (`rates.client.view`) | ● |  |  |  |  |  |  |  |  |
| Crear versiones de tarifa (`rates.manage`) | ● |  |  |  |  |  |  |  |  |
| Aprobar precios excepcionales (`rates.exception.approve`) | ● |  |  |  |  |  |  |  |  |
| Ver datos bancarios y fiscales de terceros (`banking.view`) | ● |  |  |  | ● |  |  |  |  |
| Ver avisos y documentos de personal (`personnel.view`) | ● |  |  |  |  |  |  |  |  |
| Consultar avances (`progress.view`) | ● | ● | ● |  |  |  |  |  | ● |
| Capturar avances y evidencias (`progress.capture`) | ● |  | ● |  |  |  |  |  |  |
| Validar o rechazar avances (`progress.validate`) | ● | ● |  |  |  |  |  |  |  |
| Autorizar ajustes de avance (incluye negativos) (`progress.adjust.authorize`) | ● |  |  |  |  |  |  |  |  |
| Aprobar ejecución por encima del presupuesto (`progress.overbudget.approve`) | ● |  |  |  |  |  |  |  |  |
| Autorizar excepciones de evidencia obligatoria (`evidence.exception.authorize`) | ● |  |  |  |  |  |  |  |  |
| Reportar adicionales e incidencias (`additionals.report`) | ● | ● | ● |  |  |  |  |  |  |
| Validar que un adicional existe (`additionals.validate`) | ● | ● |  |  |  |  |  |  |  |
| Autorizar cuánto se paga por un adicional (`additionals.cost.authorize`) | ● |  |  |  |  |  |  |  |  |
| Decidir el cobro de un adicional al cliente (`additionals.sale.authorize`) | ● |  |  |  |  |  |  |  |  |
| Capturar jornadas y rayas (`workdays.capture`) | ● | ● | ● |  |  |  |  |  |  |
| Aprobar jornadas y rayas (`workdays.approve`) | ● | ● |  |  |  |  |  |  |  |
| Consultar estimaciones de contratistas (`cestimates.view`) | ● | ● |  |  |  |  |  |  | ● |
| Preparar y revisar estimaciones de contratistas (`cestimates.prepare`) | ● | ● |  |  |  |  |  |  |  |
| Resolver observaciones de contratistas (`cestimates.resolve`) | ● | ● |  |  |  |  |  |  |  |
| Autorizar estimaciones de contratistas (`cestimates.authorize`) | ● |  |  |  |  |  |  |  |  |
| Reabrir una estimación autorizada (`cestimates.reopen`) | ● |  |  |  |  |  |  |  |  |
| Responder como contratista (aceptar u observar) (`cestimates.respond`) |  |  |  |  |  | ● |  |  |  |
| Consultar el cierre semanal (`close.view`) | ● | ● |  |  | ● |  |  |  | ● |
| Preparar el cierre semanal y sus componentes (`close.prepare`) | ● | ● |  |  |  |  |  |  |  |
| Confirmar el cierre semanal (`close.confirm`) | ● |  |  |  |  |  |  |  |  |
| Autorizar descuentos y componentes de liquidación (`paycomponents.authorize`) | ● |  |  |  |  |  |  |  |  |
| Consultar obligaciones y pagos (`payments.view`) | ● |  |  |  | ● |  |  |  | ● |
| Preparar desembolsos (`payments.prepare`) | ● |  |  |  | ● |  |  |  |  |
| Autorizar desembolsos (`payments.authorize`) | ● |  |  |  |  |  |  |  |  |
| Confirmar desembolsos con comprobante (`payments.confirm`) | ● |  |  |  | ● |  |  |  |  |
| Revertir desembolsos confirmados (`payments.reverse`) | ● |  |  |  |  |  |  |  |  |
| Autorizar anticipos y préstamos a contratistas (`advances.contractor.authorize`) | ● |  |  |  |  |  |  |  |  |
| Consultar presupuestos (`budgets.view`) | ● | ● |  |  |  |  |  |  | ● |
| Preparar presupuestos y contratos (`budgets.manage`) | ● |  |  |  |  |  |  |  |  |
| Aprobar aditivas y deductivas (`changeorders.approve`) | ● |  |  |  |  |  |  |  |  |
| Consultar estimaciones al cliente (`kestimates.view`) | ● |  |  |  |  |  |  |  | ● |
| Preparar estimaciones al cliente (`kestimates.prepare`) | ● |  |  |  |  |  |  |  |  |
| Publicar documentos al cliente y registrar su aprobación (`kestimates.publish`) | ● |  |  |  |  |  |  |  |  |
| Responder como cliente (aceptar u observar) (`kestimates.respond`) |  |  |  |  |  |  | ● |  |  |
| Consultar cuentas por cobrar (`receivables.view`) | ● |  |  | ● | ● |  |  |  | ● |
| Registrar cobros, facturas y gestión de cobranza (`receipts.register`) | ● |  |  | ● | ● |  |  |  |  |
| Autorizar ajustes de cuentas por cobrar e incobrables (`ar.adjust.authorize`) | ● |  |  |  |  |  |  |  |  |
| Consultar gastos (`expenses.view`) | ● |  |  | ● | ● |  |  |  | ● |
| Capturar gastos, comprobantes y proveedores (`expenses.capture`) | ● |  |  | ● |  |  |  |  |  |
| Autorizar gastos y su distribución (`expenses.authorize`) | ● |  |  |  |  |  |  |  |  |
| Operar caja chica (`pettycash.manage`) | ● |  |  | ● |  |  |  |  |  |
| Registrar insumos (`supplies.manage`) | ● |  |  | ● |  |  |  |  |  |
| Solicitar insumos (`supplies.request`) | ● | ● | ● | ● |  |  |  |  |  |
| Consultar caja y bancos (`cash.view`) | ● |  |  |  | ● |  |  |  | ● |
| Registrar movimientos y transferencias (`cash.manage`) | ● |  |  |  | ● |  |  |  |  |
| Conciliar bancos (`recon.manage`) | ● |  |  |  | ● |  |  |  |  |
| Autorizar ajustes de saldo (`balance.adjust.authorize`) | ● |  |  |  |  |  |  |  |  |
| Ver resultados económicos y márgenes (`results.view`) | ● |  |  |  |  |  |  |  |  |
| Consultar reportes operativos (`reports.view`) | ● | ● |  |  |  |  |  |  | ● |
| Emitir documentos (`documents.issue`) | ● | ● |  |  |  |  |  |  |  |
| Crear enlaces restringidos (`documents.share`) | ● |  |  |  |  |  |  |  |  |
| Importar archivos (`import.manage`) | ● |  |  |  |  |  |  | ● |  |
| Exportar el paquete portable (`export.package`) |  |  |  |  |  |  |  | ● |  |
| Configuración general (`config.manage`) | ● |  |  |  |  |  |  | ● |  |
| Usuarios, roles y delegaciones (`users.manage`) |  |  |  |  |  |  |  | ● |  |
| Consultar el historial de auditoría (`audit.view`) | ● |  |  |  |  |  |  |  | ● |
| Registro de decisiones pendientes (`decisions.view`) | ● |  |  |  |  |  |  | ● | ● |
| Respaldos y restauración (`backup.manage`) |  |  |  |  |  |  |  | ● |  |
| Cierre de periodo económico (`period.close`) | ● |  |  |  |  |  |  |  |  |

## Alcance

- **Dirección, tesorería, auxiliar, administración técnica y auditoría**: alcance global, salvo que se asigne por obra.
- **Supervisor y coordinación**: solo las obras que tienen asignadas (o una obra específica).
- **Contratista**: únicamente estimaciones, pagos, evidencias y documentos de su propia empresa, y solo cuando se le compartieron.
- **Cliente**: únicamente sus obras y los documentos expresamente publicados.
- **Delegaciones**: una facultad propia puede delegarse con vigencia; lo aprobado queda a nombre de quien actuó y "por delegación de".
- **Límites de monto**: configurables por rol o persona y tipo de autorización. No hay ninguno definido de origen.
