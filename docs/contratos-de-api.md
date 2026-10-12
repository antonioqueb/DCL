# Contratos de API

API HTTP con JSON, reutilizable por futuras aplicaciones móviles o de escritorio.

- **Sesión**: cookie `dcl_sesion` (HttpOnly, SameSite=Lax) obtenida con `POST /api/login`.
- **Escrituras**: encabezado `x-dcl-solicitud: 1` obligatorio e `idempotency-key` (un valor por operación, reutilizado en reintentos).
- **Control de versión**: al editar se envía `recordVersion`; si otra persona guardó antes, la respuesta es `409 conflicto` con `current` y `attempted`.
- **Listados**: `q`, `f.<campo>=a,b`, `from`, `to`, `sort=campo|-campo`, `page`, `pageSize`, `format=csv`. Responden `{ items, total, totals, columns }`; los totales cubren todo el conjunto filtrado.
- **Errores**: `{ error, message, field?, reasons?, fix? }` con estados 401, 403, 404, 409 (`bloqueado`, `conflicto`, `duplicado`), 422 (`validacion`).
- **Importes y cantidades**: texto decimal con punto (`"322879.30"`); fechas `AAAA-MM-DD`; instantes ISO-8601 UTC.

## activity-logs

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/activity-logs` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/activity-logs` | Sesión; permiso y alcance verificados en el caso de uso |

## additionals

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/additionals` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/additionals/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/additionals` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/additionals/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/additionals/:id/operation` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/additionals/:id/cost` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/additionals/:id/sale` | Sesión; permiso y alcance verificados en el caso de uso |

## admin

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/admin/backups` | Permiso `backup.manage` |
| POST | `/api/admin/backups` | Permiso `backup.manage` |
| GET | `/api/admin/backups/:stamp/verify` | Permiso `backup.manage` |
| POST | `/api/admin/export` | Permiso `export.package` |
| GET | `/api/admin/dictionary` | Sesión; permiso y alcance verificados en el caso de uso |

## allocation-rules

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/allocation-rules` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/allocation-rules` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/allocation-rules/:id/approve` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/allocation-rules/:id/new-version` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/allocation-rules/:id/run` | Sesión; permiso y alcance verificados en el caso de uso |

## annotations

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/annotations/:id/links` | Sesión; permiso y alcance verificados en el caso de uso |
| DELETE | `/api/annotations/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## ar-adjustments

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/ar-adjustments/:id/decide` | Sesión; permiso y alcance verificados en el caso de uso |

## assignments

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/assignments/:id/end` | Sesión; permiso y alcance verificados en el caso de uso |

## attachments

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/attachments` | Sesión; permiso y alcance verificados en el caso de uso · cuerpo binario |
| POST | `/api/attachments/:id/thumb` | Sesión; permiso y alcance verificados en el caso de uso · cuerpo binario |
| GET | `/api/attachments/:id/content` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/attachments/:id/thumb` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/attachments/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## audit

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/audit` | Permiso `audit.view` |
| GET | `/api/audit/verify` | Permiso `audit.view` |

## budget-versions

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/budget-versions/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/budget-versions/:id/new-version` | Sesión; permiso y alcance verificados en el caso de uso |
| PUT | `/api/budget-versions/:id/items` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/budget-versions/:id/transition` | Sesión; permiso y alcance verificados en el caso de uso |

## c-estimates

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/c-estimates` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/c-estimates/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/c-estimates/:id/versions/:version` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/generate` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/items` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/items/:itemId/status` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/items/:itemId/price` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/transition` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/accept` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/external-conformity` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/observe` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/authorize` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/c-estimates/:id/reopen` | Sesión; permiso y alcance verificados en el caso de uso |

## cash

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/cash/accounts` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/cash/movements` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/cash/transfers` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/cash/movements` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/cash/projection` | Sesión; permiso y alcance verificados en el caso de uso |

## catalog

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/catalog/:name` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/catalog/:name/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/catalog/:name` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/catalog/:name/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| DELETE | `/api/catalog/:name/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## change-orders

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/change-orders` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/change-orders/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/change-orders/:id/decide` | Sesión; permiso y alcance verificados en el caso de uso |

## client-advances

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/client-advances` | Sesión; permiso y alcance verificados en el caso de uso |

## client-observations

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/client-observations/:id/answer` | Sesión; permiso y alcance verificados en el caso de uso |

## closes

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/closes/board` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/closes` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/closes/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## collection-actions

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/collection-actions/:id/status` | Sesión; permiso y alcance verificados en el caso de uso |

## contractor

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/contractor/statement` | Sesión; permiso y alcance verificados en el caso de uso |

## contractor-advances

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/contractor-advances` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/contractor-advances/:id/repay` | Sesión; permiso y alcance verificados en el caso de uso |

## delegations

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/delegations` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/delegations` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/delegations/:id/revoke` | Sesión; permiso y alcance verificados en el caso de uso |

## demo

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/demo/reset` | Sesión; permiso y alcance verificados en el caso de uso |

## disbursements

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/disbursements` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/disbursements/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/disbursements` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/disbursements/:id/authorize` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/disbursements/:id/send` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/disbursements/:id/confirm` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/disbursements/:id/reject` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/disbursements/:id/reverse` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/disbursements/:id/dismiss-duplicate` | Sesión; permiso y alcance verificados en el caso de uso |

## documents

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/documents/types` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/documents/preview` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/documents/issue` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/documents` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/documents/:id/pdf` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/documents/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/documents/:id/publish` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/documents/:id/share` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/documents/:id/links` | Sesión; permiso y alcance verificados en el caso de uso |

## economic-periods

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/economic-periods` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/economic-periods` | Sesión; permiso y alcance verificados en el caso de uso |

## evidence

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/evidence` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/evidence` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/evidence/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| DELETE | `/api/evidence/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## expenses

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/expenses` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/expenses/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/expenses` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/expenses/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| PUT | `/api/expenses/:id/allocations` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/expenses/:id/status` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/expenses/:id/dismiss-duplicate` | Sesión; permiso y alcance verificados en el caso de uso |

## health

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | Público |

## history

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/history` | Sesión; permiso y alcance verificados en el caso de uso |

## home

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/home` | Sesión; permiso y alcance verificados en el caso de uso |

## imports

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/imports` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/imports` | Sesión; permiso y alcance verificados en el caso de uso · cuerpo binario |
| GET | `/api/imports/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/imports/:id/simulate` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/imports/:id/records` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/imports/:id/confirm` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/imports/:id/revert` | Sesión; permiso y alcance verificados en el caso de uso |
| PUT | `/api/imports/work-aliases` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/imports/cross-match` | Sesión; permiso y alcance verificados en el caso de uso |

## incidents

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/incidents` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/incidents` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/incidents/:id/comment` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/incidents/:id/close` | Sesión; permiso y alcance verificados en el caso de uso |

## invoices

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/invoices` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/invoices` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/invoices/:id/links` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/invoices/:id/cancel` | Sesión; permiso y alcance verificados en el caso de uso |

## k-estimates

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/k-estimates` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/k-estimates/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/k-estimates/:id/client-preview` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/k-estimates/:id/versions/:version` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates/:id/items` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates/:id/generate` | Sesión; permiso y alcance verificados en el caso de uso |
| DELETE | `/api/k-estimates/:id/items/:itemId` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/k-estimates/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates/:id/transition` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates/:id/respond` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates/:id/register-approval` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates/:id/ar-adjustments` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/k-estimates/:id/collection` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/k-estimates/:id/collection` | Sesión; permiso y alcance verificados en el caso de uso |

## locations

| Método | Ruta | Acceso |
|---|---|---|
| PATCH | `/api/locations/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## login

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/login` | Público |

## logout

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/logout` | Público |

## match-proposals

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/match-proposals` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/match-proposals/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## notifications

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/notifications` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/notifications/:id/:action` | Sesión; permiso y alcance verificados en el caso de uso |

## obligations

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/obligations` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/obligations/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/obligations/:id/components` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/obligations/:id/apply-advance` | Sesión; permiso y alcance verificados en el caso de uso |

## observations

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/observations/:id/resolve` | Sesión; permiso y alcance verificados en el caso de uso |

## options

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/options` | Sesión; permiso y alcance verificados en el caso de uso |

## password

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/password` | Sesión; permiso y alcance verificados en el caso de uso |

## pay-components

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/pay-components/:id/decide` | Sesión; permiso y alcance verificados en el caso de uso |

## periods

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/periods` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/periods` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/periods/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## petty-funds

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/petty-funds` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/petty-funds` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/petty-funds/:id/movements` | Sesión; permiso y alcance verificados en el caso de uso |

## plan-versions

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/plan-versions/:id/annotations` | Sesión; permiso y alcance verificados en el caso de uso |

## plans

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/plans/:id/versions` | Sesión; permiso y alcance verificados en el caso de uso |

## progress

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/progress` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/progress/context` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/progress/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/progress` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/progress/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/progress/:id/submit` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/progress/:id/review` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/progress/:id/evidence-exception` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/progress/:id/dismiss-duplicate` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/progress/:id/adjustments` | Sesión; permiso y alcance verificados en el caso de uso |

## progress-adjustments

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/progress-adjustments/:id/decide` | Sesión; permiso y alcance verificados en el caso de uso |

## quality-issues

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/quality-issues` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/quality-issues/:id` | Sesión; permiso y alcance verificados en el caso de uso |

## rates

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/rates` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/rates` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/rates/:id/deactivate` | Sesión; permiso y alcance verificados en el caso de uso |

## receipts

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/receipts` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/receipts/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/receipts` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/receipts/:id/apply` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/receipts/:id/reverse` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/receipts/:id/commission` | Sesión; permiso y alcance verificados en el caso de uso |

## receivables

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/receivables` | Sesión; permiso y alcance verificados en el caso de uso |

## recon

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/recon/batches` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/recon/batches` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/recon/batches/:id/suggest` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/recon/batches/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/recon/links` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/recon/batches/:id/close` | Sesión; permiso y alcance verificados en el caso de uso |

## reports

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/reports` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/reports/:code` | Sesión; permiso y alcance verificados en el caso de uso |

## results

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/results` | Sesión; permiso y alcance verificados en el caso de uso |

## retentions

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/retentions/:id/release` | Sesión; permiso y alcance verificados en el caso de uso |

## role-assignments

| Método | Ruta | Acceso |
|---|---|---|
| DELETE | `/api/role-assignments/:id` | Permiso `users.manage` |

## roles

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/roles` | Permiso `users.manage` |
| PUT | `/api/roles/:id/permissions` | Permiso `users.manage` |

## session

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/session` | Público |

## settings

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/settings` | Permiso `config.manage` |
| PUT | `/api/settings/:key` | Permiso `config.manage` |

## share-links

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/share-links/:id/revoke` | Sesión; permiso y alcance verificados en el caso de uso |

## shared

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/shared/:token` | Público |

## supplies

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/supplies/stock` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/supplies/movements` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/supplies/movements` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/supplies/conversions` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/supplies/conversions` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/supplies/requests` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/supplies/requests` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/supplies/requests/:id/decide` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/supplies/ratio` | Sesión; permiso y alcance verificados en el caso de uso |

## users

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/users` | Permiso `users.manage` |
| POST | `/api/users` | Permiso `users.manage` |
| PATCH | `/api/users/:id` | Permiso `users.manage` |
| POST | `/api/users/:id/reset-password` | Permiso `users.manage` |
| POST | `/api/users/:id/roles` | Permiso `users.manage` |

## workdays

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/workdays` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/workdays` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/workdays/:id/decide` | Sesión; permiso y alcance verificados en el caso de uso |

## works

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/works` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| PATCH | `/api/works/:id` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id/closure-check` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works/:id/close` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works/:id/locations` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works/:id/assignments` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id/plans` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works/:id/plans` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id/contracts` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works/:id/contracts` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id/budgets` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works/:id/budgets` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id/budget-tracking` | Sesión; permiso y alcance verificados en el caso de uso |
| POST | `/api/works/:id/change-orders` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id/billable` | Sesión; permiso y alcance verificados en el caso de uso |
| GET | `/api/works/:id/summary` | Sesión; permiso y alcance verificados en el caso de uso |

