# Diccionario de datos

Versión de esquema: 1. Generado a partir de `server/domain/schema.js` (fuente única).

Convenciones: identificadores UUID como texto; fechas de operación `AAAA-MM-DD`; instantes ISO-8601 en UTC; decimales con punto, sin separador de miles; nulo = campo vacío.

## Núcleo

### Organización — `organizations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `name` | Texto | Sí |  |
| `legalName` | Texto | No |  |

### Usuario — `users`

Unicidad lógica: (username).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `username` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `email` | Texto | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |
| `partyId` | Referencia | No | → `parties.id` |
| `mustChangePassword` | Booleano (true/false) | No |  |
| `sessionEpoch` | Entero | No |  |

### Rol — `roles`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `description` | Texto largo | No |  |
| `audience` | Catálogo de estados | Sí | interno, contratista, cliente |

### Permiso de rol — `rolePermissions`

Unicidad lógica: (roleId, permission).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `roleId` | Referencia | Sí | → `roles.id` |
| `permission` | Texto | Sí |  |

### Asignación de rol — `roleAssignments`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `userId` | Referencia | Sí | → `users.id` |
| `roleId` | Referencia | Sí | → `roles.id` |
| `scope` | Catálogo de estados | Sí | global, obra, asignadas |
| `workId` | Referencia | No | → `works.id` |
| `validFrom` | Fecha de operación (AAAA-MM-DD) | No |  |
| `validTo` | Fecha de operación (AAAA-MM-DD) | No |  |

### Delegación — `delegations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `fromUserId` | Referencia | Sí | → `users.id` |
| `toUserId` | Referencia | Sí | → `users.id` |
| `permission` | Texto | Sí |  |
| `workId` | Referencia | No | → `works.id` |
| `validFrom` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `validTo` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `reason` | Texto largo | Sí |  |
| `status` | Catálogo de estados | Sí | activa, revocada |

### Límite de autorización — `authorizationLimits`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `roleId` | Referencia | No | → `roles.id` |
| `userId` | Referencia | No | → `users.id` |
| `kind` | Catálogo de estados | Sí | estimacion_contratista, pago, precio_excepcional, adicional_costo, ajuste_avance, gasto, ajuste_saldo |
| `maxAmount` | Decimal(18,2) | No |  |
| `currency` | Texto | No |  |
| `note` | Texto largo | No |  |

### Configuración — `settings`

Unicidad lógica: (key).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `key` | Texto | Sí |  |
| `value` | Objeto anidado declarado (JSON) | No |  |
| `description` | Texto largo | No |  |
| `requiresDecision` | Booleano (true/false) | No |  |

### Decisión pendiente — `pendingDecisions`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `topic` | Texto | Sí |  |
| `question` | Texto largo | Sí |  |
| `provisional` | Texto largo | Sí |  |
| `status` | Catálogo de estados | Sí | pendiente, validada |
| `resolution` | Texto largo | No |  |
| `decidedByName` | Texto | No |  |
| `decidedAt` | Fecha de operación (AAAA-MM-DD) | No |  |

### Notificación interna — `notifications`

Unicidad lógica: (dedupeKey).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `userId` | Referencia | Sí | → `users.id` |
| `workId` | Referencia | No | → `works.id` |
| `event` | Texto | Sí |  |
| `objectType` | Texto | No |  |
| `objectId` | Texto | No |  |
| `title` | Texto | Sí |  |
| `priority` | Catálogo de estados | Sí | normal, alta |
| `dueDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `status` | Catálogo de estados | Sí | nueva, leida, resuelta |
| `dedupeKey` | Texto | Sí |  |

### Solicitud de aprobación — `approvalRequests`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `objectType` | Texto | Sí |  |
| `objectId` | Texto | Sí |  |
| `kind` | Texto | Sí |  |
| `workId` | Referencia | No | → `works.id` |
| `requestedBy` | Referencia | No | → `users.id` |
| `amount` | Decimal(18,2) | No |  |
| `reason` | Texto largo | No |  |
| `status` | Catálogo de estados | Sí | pendiente, aprobada, rechazada, cancelada |
| `resolvedBy` | Referencia | No | → `users.id` |
| `resolvedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `resolution` | Texto largo | No |  |

### Aprobación — `approvals`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `objectType` | Texto | Sí |  |
| `objectId` | Texto | Sí |  |
| `objectVersion` | Entero | Sí |  |
| `itemId` | Texto | No |  |
| `itemRev` | Entero | No |  |
| `decision` | Catálogo de estados | Sí | aprobado, rechazado, aceptado, observado, excepcion |
| `actorId` | Referencia | No | → `users.id` |
| `actorName` | Texto | Sí |  |
| `onBehalfOfUserId` | Referencia | No | → `users.id` |
| `at` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `scope` | Texto | Sí |  |
| `valid` | Booleano (true/false) | Sí |  |
| `invalidatedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `invalidatedReason` | Texto largo | No |  |
| `note` | Texto largo | No |  |
| `channel` | Catálogo de estados | Sí | sistema, portal, externo |
| `evidenceAttachmentId` | Referencia | No | → `attachments.id` |

### Versión congelada de documento — `documentVersions` · histórico inmutable

Unicidad lógica: (docType, docId, version).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `docType` | Texto | Sí |  |
| `docId` | Texto | Sí |  |
| `version` | Entero | Sí |  |
| `reason` | Texto largo | No |  |
| `snapshot` | Objeto anidado declarado (JSON) | Sí |  |
| `snapshotHash` | Texto | Sí |  |
| `frozenAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `frozenBy` | Texto | No |  |

### Registro de tiempo de trabajo — `activityLogs`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `userId` | Referencia | Sí | → `users.id` |
| `activity` | Catálogo de estados | Sí | preparacion_cierre, revision, captura, conciliacion |
| `periodId` | Referencia | No | → `weekPeriods.id` |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `minutes` | Entero | Sí |  |
| `source` | Catálogo de estados | Sí | registro, declarada |
| `note` | Texto largo | No |  |

## Catálogos

### Persona o empresa — `parties`

Unicidad lógica: (code); (normalizedName).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `legalName` | Texto | No |  |
| `normalizedName` | Texto | Sí |  |
| `isClient` | Booleano (true/false) | No |  |
| `isSupplier` | Booleano (true/false) | No |  |
| `isContractor` | Booleano (true/false) | No |  |
| `taxId` | Texto restringido | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |
| `validFrom` | Fecha de operación (AAAA-MM-DD) | No |  |
| `validTo` | Fecha de operación (AAAA-MM-DD) | No |  |
| `restrictedNotes` | Texto restringido | No |  |

### Alias histórico — `partyAliases`

Unicidad lógica: (normalizedAlias).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `partyId` | Referencia | Sí | → `parties.id` |
| `alias` | Texto | Sí |  |
| `normalizedAlias` | Texto | Sí |  |

### Contacto — `contacts`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `partyId` | Referencia | Sí | → `parties.id` |
| `name` | Texto | Sí |  |
| `position` | Texto | No |  |
| `phone` | Texto | No |  |
| `email` | Texto | No |  |
| `isRepresentative` | Booleano (true/false) | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Cuenta de pago de tercero — `partyBankAccounts`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `partyId` | Referencia | Sí | → `parties.id` |
| `bank` | Texto | No |  |
| `holder` | Texto | No |  |
| `accountNumber` | Texto restringido | No |  |
| `clabe` | Texto restringido | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Trabajador — `workers`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `normalizedName` | Texto | Sí |  |
| `contractorId` | Referencia | No | → `parties.id` |
| `status` | Catálogo de estados | Sí | activo, inactivo |
| `docsPending` | Texto largo | No |  |
| `payAccountPending` | Booleano (true/false) | No |  |

### Cuadrilla — `crews`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `contractorId` | Referencia | Sí | → `parties.id` |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Integrante de cuadrilla — `crewMemberships`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `crewId` | Referencia | Sí | → `crews.id` |
| `workerId` | Referencia | Sí | → `workers.id` |
| `validFrom` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `validTo` | Fecha de operación (AAAA-MM-DD) | No |  |

### Aviso de personal — `personnelNotices`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workerId` | Referencia | Sí | → `workers.id` |
| `kind` | Catálogo de estados | Sí | alta, baja, pendiente |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `note` | Texto largo | No |  |
| `attachmentId` | Referencia | No | → `attachments.id` |
| `status` | Catálogo de estados | Sí | abierto, atendido |

### Unidad — `units`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | area, longitud, pieza, lote, tiempo, servicio |
| `decimals` | Entero | Sí |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Categoría de costo — `costCategories`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `class` | Catálogo de estados | Sí | costo_instalacion, gasto_administrativo, gasto_comercial, impuesto, activo_inversion, prestamo, movimiento_socios, transferencia_interna |
| `parentId` | Referencia | No | → `costCategories.id` |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Concepto — `concepts`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `normalizedName` | Texto | Sí |  |
| `catalog` | Catálogo de estados | Sí | contratacion, comercial |
| `family` | Texto | No |  |
| `unitId` | Referencia | Sí | → `units.id` |
| `evidencePolicy` | Catálogo de estados | Sí | opcional, requerida |
| `hiddenWork` | Booleano (true/false) | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |
| `validFrom` | Fecha de operación (AAAA-MM-DD) | No |  |
| `validTo` | Fecha de operación (AAAA-MM-DD) | No |  |

### Alias de concepto — `conceptAliases`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `conceptId` | Referencia | Sí | → `concepts.id` |
| `alias` | Texto | Sí |  |
| `normalizedAlias` | Texto | Sí |  |

### Equivalencia entre concepto de contratación y comercial — `conceptLinks`

Unicidad lógica: (contractConceptId, commercialConceptId).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `contractConceptId` | Referencia | Sí | → `concepts.id` |
| `commercialConceptId` | Referencia | Sí | → `concepts.id` |
| `note` | Texto largo | No |  |
| `validated` | Booleano (true/false) | No |  |

### Versión de tarifa — `rates`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `circuit` | Catálogo de estados | Sí | contratacion, comercial |
| `conceptId` | Referencia | Sí | → `concepts.id` |
| `unitId` | Referencia | Sí | → `units.id` |
| `workId` | Referencia | No | → `works.id` |
| `contractorId` | Referencia | No | → `parties.id` |
| `price` | Decimal(18,4) | Sí |  |
| `currency` | Texto | Sí |  |
| `validFrom` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `validTo` | Fecha de operación (AAAA-MM-DD) | No |  |
| `includes` | Texto largo | No |  |
| `status` | Catálogo de estados | Sí | vigente, inactiva |
| `exceptional` | Booleano (true/false) | No |  |
| `reason` | Texto largo | No |  |
| `approvedBy` | Referencia | No | → `users.id` |

### Nivel de detalle por lote — `detailLevels`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `costAmount` | Decimal(18,2) | No |  |
| `saleAmount` | Decimal(18,2) | No |  |
| `currency` | Texto | No |  |
| `note` | Texto largo | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Motivo de ajuste — `adjustmentReasons`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `appliesTo` | Texto | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Tipo de comprobante — `voucherTypes`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `hasTaxBreakdown` | Booleano (true/false) | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Medio de pago — `paymentMethods`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | efectivo, transferencia, cheque, otro |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Cuenta de caja o banco — `accounts`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | efectivo, banco |
| `currency` | Texto | Sí |  |
| `openingBalance` | Decimal(18,2) | Sí |  |
| `openingDate` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |
| `bankReference` | Texto restringido | No |  |

## Obras

### Obra — `works`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `clientId` | Referencia | No | → `parties.id` |
| `representativeContactId` | Referencia | No | → `contacts.id` |
| `address` | Texto largo | No |  |
| `startDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `endDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `currency` | Texto | Sí |  |
| `status` | Catálogo de estados | Sí | planeacion, activa, suspendida, cierre_operativo, cierre_financiero, archivada |
| `operationalCloseDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `financialCloseDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `paymentTerms` | Texto largo | No |  |
| `consolidation` | Catálogo de estados | Sí | incluida, excluida, pendiente_clasificar |
| `consolidationNote` | Texto largo | No |  |

### Ubicación jerárquica — `locations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `parentId` | Referencia | No | → `locations.id` |
| `kind` | Catálogo de estados | Sí | edificio, nivel, zona, habitacion, superficie |
| `name` | Texto | Sí |  |
| `sortOrder` | Entero | No |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Asignación a obra — `workAssignments`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `kind` | Catálogo de estados | Sí | supervisor, coordinador, auxiliar, tesoreria, contratista, cuadrilla, cliente |
| `userId` | Referencia | No | → `users.id` |
| `partyId` | Referencia | No | → `parties.id` |
| `crewId` | Referencia | No | → `crews.id` |
| `validFrom` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `validTo` | Fecha de operación (AAAA-MM-DD) | No |  |
| `note` | Texto largo | No |  |

### Cierre de obra — `workClosures`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `kind` | Catálogo de estados | Sí | operativo, financiero |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `checklist` | Objeto anidado declarado (JSON) | Sí |  |
| `exceptions` | Objeto anidado declarado (JSON) | No |  |
| `authorizedBy` | Referencia | Sí | → `users.id` |
| `note` | Texto largo | No |  |

## Clientes

### Contrato / condiciones — `contracts`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `clientId` | Referencia | Sí | → `parties.id` |
| `code` | Texto | Sí |  |
| `version` | Entero | Sí |  |
| `status` | Catálogo de estados | Sí | borrador, vigente, sustituido |
| `currency` | Texto | Sí |  |
| `advanceKind` | Catálogo de estados | Sí | ninguno, porcentaje, importe |
| `advancePct` | Decimal(9,4) | No |  |
| `advanceAmount` | Decimal(18,2) | No |  |
| `advanceBase` | Texto largo | No |  |
| `amortizationPct` | Decimal(9,4) | No |  |
| `amortizationBase` | Catálogo de estados | Sí | subtotal, total_con_impuestos, no_definida |
| `retentionPct` | Decimal(9,4) | No |  |
| `retentionBase` | Catálogo de estados | Sí | subtotal, total_con_impuestos, no_definida |
| `retentionRelease` | Texto largo | No |  |
| `taxRate` | Decimal(9,4) | No |  |
| `taxLabel` | Texto | No |  |
| `dueDays` | Entero | No |  |
| `agreementAttachmentId` | Referencia | No | → `attachments.id` |
| `termsValidated` | Booleano (true/false) | Sí |  |
| `notes` | Texto largo | No |  |

### Presupuesto — `budgets`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |

### Versión de presupuesto — `budgetVersions`

Unicidad lógica: (budgetId, version).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `budgetId` | Referencia | Sí | → `budgets.id` |
| `workId` | Referencia | Sí | → `works.id` |
| `version` | Entero | Sí |  |
| `status` | Catálogo de estados | Sí | borrador, en_revision, enviado, aceptado, rechazado, sustituido, cancelado |
| `isCurrent` | Booleano (true/false) | Sí |  |
| `sentAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `acceptedAt` | Fecha de operación (AAAA-MM-DD) | No |  |
| `acceptedByName` | Texto | No |  |
| `acceptanceEvidenceId` | Referencia | No | → `attachments.id` |
| `conditions` | Texto largo | No |  |
| `taxTreatment` | Texto largo | No |  |

### Partida de presupuesto — `budgetItems`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `budgetVersionId` | Referencia | Sí | → `budgetVersions.id` |
| `workId` | Referencia | Sí | → `works.id` |
| `chapter` | Texto | No |  |
| `locationId` | Referencia | No | → `locations.id` |
| `conceptId` | Referencia | No | → `concepts.id` |
| `description` | Texto largo | Sí |  |
| `unitId` | Referencia | Sí | → `units.id` |
| `qty` | Decimal(18,4) | Sí |  |
| `price` | Decimal(18,4) | Sí |  |
| `discountPct` | Decimal(9,4) | No |  |
| `amount` | Decimal(18,2) | Sí |  |
| `includes` | Texto largo | No |  |
| `status` | Catálogo de estados | Sí | vigente, cancelada, sustituida |
| `replacedById` | Referencia | No | → `budgetItems.id` |
| `sortOrder` | Entero | No |  |

### Modificación de contrato (aditiva o deductiva) — `changeOrders`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `budgetId` | Referencia | No | → `budgets.id` |
| `folio` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | aditiva, deductiva |
| `changeType` | Catálogo de estados | Sí | cambio_cantidad, concepto_nuevo, cambio_precio, sustitucion, eliminacion_alcance |
| `origin` | Texto largo | No |  |
| `reason` | Texto largo | Sí |  |
| `proposerId` | Referencia | No | → `users.id` |
| `status` | Catálogo de estados | Sí | propuesta, en_revision, aprobada, rechazada, cancelada |
| `effectiveDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `clientApprovedByName` | Texto | No |  |
| `approvalEvidenceId` | Referencia | No | → `attachments.id` |
| `internalApprovedBy` | Referencia | No | → `users.id` |
| `amount` | Decimal(18,2) | Sí |  |

### Partida de modificación — `changeOrderItems`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `changeOrderId` | Referencia | Sí | → `changeOrders.id` |
| `budgetItemId` | Referencia | No | → `budgetItems.id` |
| `conceptId` | Referencia | No | → `concepts.id` |
| `locationId` | Referencia | No | → `locations.id` |
| `description` | Texto largo | Sí |  |
| `unitId` | Referencia | Sí | → `units.id` |
| `qtyDelta` | Decimal(18,4) | Sí |  |
| `price` | Decimal(18,4) | Sí |  |
| `amount` | Decimal(18,2) | Sí |  |

## Operación

### Periodo semanal — `weekPeriods`

Unicidad lógica: (year, week).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `year` | Entero | Sí |  |
| `week` | Entero | Sí |  |
| `code` | Texto | Sí |  |
| `startDate` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `endDate` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `cutoffDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `status` | Catálogo de estados | Sí | abierta, en_cierre, cerrada |

### Visita o captura — `captures`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `supervisorId` | Referencia | Sí | → `users.id` |
| `visitDate` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `periodId` | Referencia | Sí | → `weekPeriods.id` |
| `device` | Texto | No |  |
| `note` | Texto largo | No |  |

### Avance — `progressEntries`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `captureId` | Referencia | No | → `captures.id` |
| `workId` | Referencia | Sí | → `works.id` |
| `locationId` | Referencia | Sí | → `locations.id` |
| `contractorId` | Referencia | No | → `parties.id` |
| `crewId` | Referencia | No | → `crews.id` |
| `conceptId` | Referencia | Sí | → `concepts.id` |
| `unitId` | Referencia | Sí | → `units.id` |
| `executionDate` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `periodId` | Referencia | Sí | → `weekPeriods.id` |
| `mode` | Catálogo de estados | Sí | periodo, acumulado |
| `qty` | Decimal(18,4) | Sí |  |
| `cumulativeMeasured` | Decimal(18,4) | No |  |
| `baseCumulative` | Decimal(18,4) | No |  |
| `description` | Texto largo | No |  |
| `notes` | Texto largo | No |  |
| `internalNotes` | Texto largo | No |  |
| `workType` | Catálogo de estados | Sí | ordinario, adicional, retrabajo |
| `reworkKind` | Catálogo de estados | No | error_instalacion, cambio_solicitado, trabajo_adicional |
| `budgetItemId` | Referencia | No | → `budgetItems.id` |
| `additionalId` | Referencia | No | → `additionals.id` |
| `status` | Catálogo de estados | Sí | borrador, reportado, validado, rechazado |
| `authorId` | Referencia | Sí | → `users.id` |
| `validatedBy` | Referencia | No | → `users.id` |
| `validatedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `rejectedReason` | Texto largo | No |  |
| `evidenceRequired` | Booleano (true/false) | Sí |  |
| `evidenceException` | Objeto anidado declarado (JSON) | No |  |
| `duplicateFlag` | Catálogo de estados | Sí | ninguno, posible, descartado |
| `overBudget` | Booleano (true/false) | No |  |
| `overBudgetNote` | Texto largo | No |  |
| `device` | Texto | No |  |
| `capturedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `lastReviewedAt` | Instante (ISO-8601 con zona, UTC) | No |  |

### Renglón de generador — `generatorLines`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `entryId` | Referencia | Sí | → `progressEntries.id` |
| `label` | Texto | No |  |
| `length` | Decimal(18,4) | No |  |
| `width` | Decimal(18,4) | No |  |
| `height` | Decimal(18,4) | No |  |
| `pieces` | Decimal(18,4) | No |  |
| `deduction` | Decimal(18,4) | No |  |
| `result` | Decimal(18,4) | Sí |  |
| `formula` | Texto | Sí |  |
| `sortOrder` | Entero | No |  |

### Ajuste de avance — `progressAdjustments`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `entryId` | Referencia | Sí | → `progressEntries.id` |
| `qtyDelta` | Decimal(18,4) | Sí |  |
| `reasonId` | Referencia | No | → `adjustmentReasons.id` |
| `reason` | Texto largo | Sí |  |
| `status` | Catálogo de estados | Sí | propuesto, autorizado, rechazado |
| `proposedBy` | Referencia | No | → `users.id` |
| `authorizedBy` | Referencia | No | → `users.id` |
| `authorizedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `observationId` | Referencia | No | → `observations.id` |

## Archivos

### Archivo adjunto — `attachments`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `originalName` | Texto | Sí |  |
| `mime` | Texto | Sí |  |
| `size` | Entero | Sí |  |
| `sha256` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | foto, documento, plano, comprobante, importacion, emitido, otro |
| `uploadedBy` | Referencia | No | → `users.id` |
| `uploadedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `takenAtDeclared` | Instante (ISO-8601 con zona, UTC) | No |  |
| `takenAtSource` | Catálogo de estados | Sí | declarada, no_disponible |
| `hasThumb` | Booleano (true/false) | No |  |
| `thumbSha256` | Texto | No |  |
| `workId` | Referencia | No | → `works.id` |
| `confidentiality` | Catálogo de estados | Sí | operativo, interno, laboral, financiero |

### Vínculo de evidencia — `evidenceLinks`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `attachmentId` | Referencia | Sí | → `attachments.id` |
| `objectType` | Texto | Sí |  |
| `objectId` | Texto | Sí |  |
| `workId` | Referencia | No | → `works.id` |
| `locationId` | Referencia | No | → `locations.id` |
| `clientVisible` | Booleano (true/false) | Sí |  |
| `caption` | Texto | No |  |

### Plano — `plans`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `name` | Texto | Sí |  |
| `discipline` | Texto | No |  |

### Versión de plano — `planVersions`

Unicidad lógica: (planId, version).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `planId` | Referencia | Sí | → `plans.id` |
| `version` | Entero | Sí |  |
| `attachmentId` | Referencia | Sí | → `attachments.id` |
| `pageCount` | Entero | No |  |
| `status` | Catálogo de estados | Sí | vigente, sustituida |
| `note` | Texto largo | No |  |

### Anotación de plano — `planAnnotations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `planVersionId` | Referencia | Sí | → `planVersions.id` |
| `page` | Entero | Sí |  |
| `shape` | Catálogo de estados | Sí | punto, linea, poligono |
| `points` | Objeto anidado declarado (JSON) | Sí |  |
| `label` | Texto | No |  |
| `locationId` | Referencia | No | → `locations.id` |

### Vínculo anotación–partida — `annotationLinks`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `annotationId` | Referencia | Sí | → `planAnnotations.id` |
| `objectType` | Texto | Sí |  |
| `objectId` | Texto | Sí |  |

### Documento emitido — `issuedDocuments`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `docType` | Texto | Sí |  |
| `objectType` | Texto | Sí |  |
| `objectId` | Texto | Sí |  |
| `objectVersion` | Entero | Sí |  |
| `audience` | Catálogo de estados | Sí | interno, contratista, cliente |
| `folio` | Texto | Sí |  |
| `title` | Texto | Sí |  |
| `status` | Catálogo de estados | Sí | borrador, vigente, sustituido |
| `attachmentId` | Referencia | Sí | → `attachments.id` |
| `model` | Objeto anidado declarado (JSON) | Sí |  |
| `modelHash` | Texto | Sí |  |
| `issuedBy` | Referencia | No | → `users.id` |
| `issuedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `workId` | Referencia | No | → `works.id` |
| `partyId` | Referencia | No | → `parties.id` |
| `published` | Booleano (true/false) | Sí |  |

### Enlace restringido — `shareLinks`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `tokenHash` | Texto | Sí |  |
| `issuedDocumentId` | Referencia | Sí | → `issuedDocuments.id` |
| `expiresAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `revokedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `createdByUser` | Referencia | No | → `users.id` |
| `lastAccessAt` | Instante (ISO-8601 con zona, UTC) | No |  |

## Operación

### Adicional / trabajo fuera de alcance — `additionals`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `workId` | Referencia | Sí | → `works.id` |
| `locationId` | Referencia | No | → `locations.id` |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `requesterName` | Texto | No |  |
| `reportedBy` | Referencia | No | → `users.id` |
| `executorId` | Referencia | No | → `parties.id` |
| `description` | Texto largo | Sí |  |
| `cause` | Texto largo | No |  |
| `kind` | Catálogo de estados | Sí | trabajo_nuevo, correccion_medicion, dano, reposicion, retrabajo, cambio_solicitado |
| `urgency` | Catálogo de estados | Sí | normal, urgente |
| `unitId` | Referencia | No | → `units.id` |
| `qty` | Decimal(18,4) | No |  |
| `relatedEntryId` | Referencia | No | → `progressEntries.id` |
| `valuation` | Catálogo de estados | No | catalogo, nivel, excepcional |
| `conceptId` | Referencia | No | → `concepts.id` |
| `detailLevelId` | Referencia | No | → `detailLevels.id` |
| `executed` | Booleano (true/false) | Sí |  |
| `opStatus` | Catálogo de estados | Sí | reportado, en_aclaracion, validado, rechazado, resuelto |
| `opBy` | Referencia | No | → `users.id` |
| `opAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `opNote` | Texto largo | No |  |
| `costStatus` | Catálogo de estados | Sí | pendiente, autorizado, rechazado, no_aplica |
| `costAmount` | Decimal(18,2) | No |  |
| `costBy` | Referencia | No | → `users.id` |
| `costAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `saleStatus` | Catálogo de estados | Sí | pendiente, propuesto, aprobado_cliente, rechazado_cliente, absorbido, no_aplica |
| `saleAmount` | Decimal(18,2) | No |  |
| `saleBy` | Referencia | No | → `users.id` |
| `saleAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `saleNote` | Texto largo | No |  |
| `clientApprovalEvidenceId` | Referencia | No | → `attachments.id` |

### Incidencia — `incidents`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `additionalId` | Referencia | No | → `additionals.id` |
| `title` | Texto | Sí |  |
| `description` | Texto largo | No |  |
| `responsibleId` | Referencia | No | → `users.id` |
| `dueDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `status` | Catálogo de estados | Sí | abierta, en_proceso, cerrada |
| `closedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `closeEvidenceId` | Referencia | No | → `attachments.id` |
| `closeNote` | Texto largo | No |  |

### Comentario de incidencia — `incidentComments` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `incidentId` | Referencia | Sí | → `incidents.id` |
| `text` | Texto largo | Sí |  |
| `authorId` | Referencia | Sí | → `users.id` |
| `at` | Instante (ISO-8601 con zona, UTC) | Sí |  |

### Jornada / raya — `workdays`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workerId` | Referencia | No | → `workers.id` |
| `crewId` | Referencia | No | → `crews.id` |
| `contractorId` | Referencia | No | → `parties.id` |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `periodId` | Referencia | Sí | → `weekPeriods.id` |
| `timeUnit` | Catálogo de estados | Sí | jornada, hora |
| `qty` | Decimal(18,4) | Sí |  |
| `rate` | Decimal(18,4) | No |  |
| `amount` | Decimal(18,2) | No |  |
| `currency` | Texto | No |  |
| `status` | Catálogo de estados | Sí | capturada, aprobada, rechazada |
| `approvedBy` | Referencia | No | → `users.id` |
| `overlapJustification` | Texto largo | No |  |
| `note` | Texto largo | No |  |

### Distribución de jornada por obra — `workdayAllocations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workdayId` | Referencia | Sí | → `workdays.id` |
| `workId` | Referencia | Sí | → `works.id` |
| `qty` | Decimal(18,4) | Sí |  |
| `amount` | Decimal(18,2) | No |  |

### Estimación de contratista — `cEstimates`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `workId` | Referencia | Sí | → `works.id` |
| `contractorId` | Referencia | Sí | → `parties.id` |
| `periodId` | Referencia | Sí | → `weekPeriods.id` |
| `kind` | Catálogo de estados | Sí | ordinaria, complementaria |
| `complementReason` | Texto largo | No |  |
| `version` | Entero | Sí |  |
| `status` | Catálogo de estados | Sí | borrador, revision_interna, revision_contratista, conciliacion, lista_autorizar, autorizada, cerrada, cancelada |
| `currency` | Texto | Sí |  |
| `grossTotal` | Decimal(18,2) | No |  |
| `authorizedTotal` | Decimal(18,2) | No |  |
| `authorizedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `authorizedBy` | Referencia | No | → `users.id` |
| `closeId` | Referencia | No | → `weeklyCloses.id` |
| `sentToContractorAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `notes` | Texto largo | No |  |

### Partida de estimación de contratista — `cEstimateItems`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `estimateId` | Referencia | Sí | → `cEstimates.id` |
| `sourceType` | Catálogo de estados | Sí | avance, jornada, adicional, fijo |
| `locationId` | Referencia | No | → `locations.id` |
| `conceptId` | Referencia | No | → `concepts.id` |
| `description` | Texto largo | No |  |
| `unitId` | Referencia | No | → `units.id` |
| `qty` | Decimal(18,4) | Sí |  |
| `unitPrice` | Decimal(18,4) | No |  |
| `amount` | Decimal(18,2) | No |  |
| `rateSnapshot` | Objeto anidado declarado (JSON) | No |  |
| `method` | Catálogo de estados | Sí | cantidad, jornada, hora, lote, destajo, fijo |
| `workType` | Catálogo de estados | Sí | ordinario, adicional, retrabajo |
| `groupLabel` | Texto | No |  |
| `status` | Catálogo de estados | Sí | pendiente, observada, acordada, autorizada, rechazada, diferida |
| `rev` | Entero | Sí |  |
| `additionalId` | Referencia | No | → `additionals.id` |
| `workdayId` | Referencia | No | → `workdays.id` |
| `sortOrder` | Entero | No |  |

### Asignación de ejecución a documento — `executionAllocations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `circuit` | Catálogo de estados | Sí | contratista, cliente |
| `progressEntryId` | Referencia | Sí | → `progressEntries.id` |
| `qty` | Decimal(18,4) | Sí |  |
| `unitId` | Referencia | Sí | → `units.id` |
| `docType` | Catálogo de estados | Sí | cEstimate, kEstimate |
| `docId` | Texto | Sí |  |
| `itemId` | Texto | Sí |  |
| `state` | Catálogo de estados | Sí | reservada, confirmada, liberada |

### Observación del contratista — `observations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `estimateId` | Referencia | Sí | → `cEstimates.id` |
| `itemId` | Referencia | Sí | → `cEstimateItems.id` |
| `allocationId` | Referencia | No | → `executionAllocations.id` |
| `estimateVersion` | Entero | Sí |  |
| `authorId` | Referencia | Sí | → `users.id` |
| `proposedQty` | Decimal(18,4) | No |  |
| `proposedAmount` | Decimal(18,2) | No |  |
| `text` | Texto largo | Sí |  |
| `evidenceAttachmentId` | Referencia | No | → `attachments.id` |
| `status` | Catálogo de estados | Sí | abierta, resuelta |
| `resolution` | Catálogo de estados | No | aceptada, parcial, rechazada |
| `resolvedQty` | Decimal(18,4) | No |  |
| `resolvedBy` | Referencia | No | → `users.id` |
| `resolvedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `resolutionNote` | Texto largo | No |  |
| `before` | Objeto anidado declarado (JSON) | No |  |
| `after` | Objeto anidado declarado (JSON) | No |  |

### Cierre semanal — `weeklyCloses`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `periodId` | Referencia | Sí | → `weekPeriods.id` |
| `version` | Entero | Sí |  |
| `kind` | Catálogo de estados | Sí | ordinario, complemento |
| `parentCloseId` | Referencia | No | → `weeklyCloses.id` |
| `reason` | Texto largo | No |  |
| `status` | Catálogo de estados | Sí | emitido, sustituido |
| `closedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `closedBy` | Referencia | Sí | → `users.id` |
| `currency` | Texto | Sí |  |
| `grossTotal` | Decimal(18,2) | Sí |  |
| `discountsTotal` | Decimal(18,2) | Sí |  |
| `advancesTotal` | Decimal(18,2) | Sí |  |
| `bankTotal` | Decimal(18,2) | Sí |  |
| `cashTotal` | Decimal(18,2) | Sí |  |
| `extraCostTotal` | Decimal(18,2) | Sí |  |

### Documento incluido en cierre — `closeDocuments` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `closeId` | Referencia | Sí | → `weeklyCloses.id` |
| `estimateId` | Referencia | Sí | → `cEstimates.id` |
| `estimateVersion` | Entero | Sí |  |
| `obligationId` | Referencia | Sí | → `obligations.id` |
| `gross` | Decimal(18,2) | Sí |  |

### Componente de liquidación — `payComponents`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `obligationId` | Referencia | Sí | → `obligations.id` |
| `kind` | Catálogo de estados | Sí | nomina_bancaria, transferencia, cheque, descuento, anticipo_aplicado, costo_adicional |
| `nature` | Catálogo de estados | Sí | parte_del_pago, descuento, anticipo_aplicado, costo_adicional_dcl |
| `amount` | Decimal(18,2) | Sí |  |
| `support` | Texto largo | No |  |
| `attachmentId` | Referencia | No | → `attachments.id` |
| `authorizedBy` | Referencia | No | → `users.id` |
| `status` | Catálogo de estados | Sí | propuesto, autorizado, cancelado |
| `advanceApplicationId` | Referencia | No | → `advanceApplications.id` |

### Instrucción de pago — `paymentInstructions`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `closeId` | Referencia | Sí | → `weeklyCloses.id` |
| `obligationId` | Referencia | Sí | → `obligations.id` |
| `beneficiaryId` | Referencia | Sí | → `parties.id` |
| `medium` | Catálogo de estados | Sí | efectivo, banco |
| `amount` | Decimal(18,2) | Sí |  |
| `status` | Catálogo de estados | Sí | pendiente, atendida, cancelada |
| `disbursementId` | Referencia | No | → `disbursements.id` |

## Tesorería

### Obligación de pago — `obligations`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | contratista, proveedor, otro |
| `beneficiaryId` | Referencia | Sí | → `parties.id` |
| `payeeName` | Texto | No |  |
| `sourceType` | Catálogo de estados | Sí | cEstimate, expense, manual |
| `sourceId` | Texto | No |  |
| `workId` | Referencia | No | → `works.id` |
| `periodId` | Referencia | No | → `weekPeriods.id` |
| `grossAmount` | Decimal(18,2) | Sí |  |
| `currency` | Texto | Sí |  |
| `dueDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `status` | Catálogo de estados | Sí | autorizada, cancelada |

### Anticipo o préstamo a contratista — `contractorAdvances`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `partyId` | Referencia | Sí | → `parties.id` |
| `kind` | Catálogo de estados | Sí | anticipo, prestamo |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `amount` | Decimal(18,2) | Sí |  |
| `currency` | Texto | Sí |  |
| `disbursementId` | Referencia | No | → `disbursements.id` |
| `workId` | Referencia | No | → `works.id` |
| `authorizedBy` | Referencia | Sí | → `users.id` |
| `note` | Texto largo | No |  |
| `status` | Catálogo de estados | Sí | vigente, cancelado |

### Aplicación de anticipo a contratista — `advanceApplications`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `advanceId` | Referencia | Sí | → `contractorAdvances.id` |
| `obligationId` | Referencia | Sí | → `obligations.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `status` | Catálogo de estados | Sí | aplicada, revertida |

### Abono de contratista — `advanceRepayments`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `advanceId` | Referencia | Sí | → `contractorAdvances.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `accountId` | Referencia | No | → `accounts.id` |
| `cashMovementId` | Referencia | No | → `cashMovements.id` |
| `note` | Texto largo | No |  |

### Desembolso — `disbursements`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | pago, anticipo, reverso, reposicion_caja |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `accountId` | Referencia | Sí | → `accounts.id` |
| `methodId` | Referencia | Sí | → `paymentMethods.id` |
| `beneficiaryId` | Referencia | No | → `parties.id` |
| `payeeName` | Texto | No |  |
| `amount` | Decimal(18,2) | Sí |  |
| `currency` | Texto | Sí |  |
| `reference` | Texto | No |  |
| `status` | Catálogo de estados | Sí | preparado, autorizado, pendiente_confirmacion, confirmado, rechazado, revertido |
| `authorizedBy` | Referencia | No | → `users.id` |
| `confirmedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `confirmedBy` | Referencia | No | → `users.id` |
| `deliveredByName` | Texto | No |  |
| `receiptAttachmentId` | Referencia | No | → `attachments.id` |
| `reversesId` | Referencia | No | → `disbursements.id` |
| `reverseReason` | Texto largo | No |  |
| `duplicateFlag` | Catálogo de estados | Sí | ninguno, posible, descartado |
| `note` | Texto largo | No |  |

### Aplicación de pago — `paymentApplications`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `disbursementId` | Referencia | Sí | → `disbursements.id` |
| `obligationId` | Referencia | Sí | → `obligations.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `status` | Catálogo de estados | Sí | reservada, confirmada, liberada, revertida |

## Clientes

### Estimación al cliente — `kEstimates`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `workId` | Referencia | Sí | → `works.id` |
| `clientId` | Referencia | Sí | → `parties.id` |
| `contractId` | Referencia | No | → `contracts.id` |
| `number` | Entero | Sí |  |
| `periodFrom` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `periodTo` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `version` | Entero | Sí |  |
| `status` | Catálogo de estados | Sí | borrador, revision_interna, enviada, observada, corregida, aprobada, cancelada, sustituida |
| `currency` | Texto | Sí |  |
| `subtotal` | Decimal(18,2) | Sí |  |
| `adjustments` | Decimal(18,2) | Sí |  |
| `taxAmount` | Decimal(18,2) | No |  |
| `amortization` | Decimal(18,2) | No |  |
| `retention` | Decimal(18,2) | No |  |
| `total` | Decimal(18,2) | No |  |
| `approvedSubtotal` | Decimal(18,2) | No |  |
| `calc` | Objeto anidado declarado (JSON) | No |  |
| `dueDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `publishedVersion` | Entero | No |  |
| `approvedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `docDateDeclared` | Fecha de operación (AAAA-MM-DD) | No |  |
| `notes` | Texto largo | No |  |

### Partida de estimación al cliente — `kEstimateItems`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `estimateId` | Referencia | Sí | → `kEstimates.id` |
| `budgetItemId` | Referencia | No | → `budgetItems.id` |
| `changeOrderId` | Referencia | No | → `changeOrders.id` |
| `additionalId` | Referencia | No | → `additionals.id` |
| `conceptId` | Referencia | No | → `concepts.id` |
| `chapter` | Texto | No |  |
| `locationId` | Referencia | No | → `locations.id` |
| `description` | Texto largo | Sí |  |
| `unitId` | Referencia | Sí | → `units.id` |
| `contractedQty` | Decimal(18,4) | No |  |
| `prevApprovedQty` | Decimal(18,4) | Sí |  |
| `proposedQty` | Decimal(18,4) | Sí |  |
| `acceptedQty` | Decimal(18,4) | No |  |
| `price` | Decimal(18,4) | Sí |  |
| `amount` | Decimal(18,2) | Sí |  |
| `acceptedAmount` | Decimal(18,2) | No |  |
| `status` | Catálogo de estados | Sí | propuesta, aceptada, observada, rechazada, diferida |
| `differenceReason` | Texto largo | No |  |
| `rev` | Entero | Sí |  |
| `sortOrder` | Entero | No |  |

### Observación del cliente — `clientObservations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `estimateId` | Referencia | Sí | → `kEstimates.id` |
| `itemId` | Referencia | No | → `kEstimateItems.id` |
| `estimateVersion` | Entero | Sí |  |
| `text` | Texto largo | Sí |  |
| `authorName` | Texto | Sí |  |
| `authorUserId` | Referencia | No | → `users.id` |
| `at` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `status` | Catálogo de estados | Sí | abierta, atendida |
| `response` | Texto largo | No |  |

### Factura externa registrada — `invoices`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `clientId` | Referencia | Sí | → `parties.id` |
| `workId` | Referencia | No | → `works.id` |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `subtotal` | Decimal(18,2) | No |  |
| `tax` | Decimal(18,2) | No |  |
| `total` | Decimal(18,2) | Sí |  |
| `currency` | Texto | Sí |  |
| `dueDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `attachmentId` | Referencia | No | → `attachments.id` |
| `status` | Catálogo de estados | Sí | registrada, cancelada |

### Relación factura–estimación — `invoiceLinks`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `invoiceId` | Referencia | Sí | → `invoices.id` |
| `kEstimateId` | Referencia | Sí | → `kEstimates.id` |
| `amount` | Decimal(18,2) | Sí |  |

### Cobro — `receipts`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | cobro, anticipo, devolucion |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `accountId` | Referencia | Sí | → `accounts.id` |
| `methodId` | Referencia | No | → `paymentMethods.id` |
| `reference` | Texto | No |  |
| `clientId` | Referencia | Sí | → `parties.id` |
| `workId` | Referencia | No | → `works.id` |
| `grossAmount` | Decimal(18,2) | Sí |  |
| `commission` | Decimal(18,2) | No |  |
| `netAmount` | Decimal(18,2) | Sí |  |
| `commissionNature` | Texto largo | No |  |
| `commissionValidated` | Booleano (true/false) | No |  |
| `currency` | Texto | Sí |  |
| `status` | Catálogo de estados | Sí | confirmado, revertido |
| `note` | Texto largo | No |  |

### Aplicación de cobro — `receiptApplications`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `receiptId` | Referencia | Sí | → `receipts.id` |
| `kEstimateId` | Referencia | Sí | → `kEstimates.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `status` | Catálogo de estados | Sí | aplicada, revertida |

### Anticipo de cliente — `clientAdvances`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `clientId` | Referencia | Sí | → `parties.id` |
| `contractId` | Referencia | No | → `contracts.id` |
| `receiptId` | Referencia | Sí | → `receipts.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `currency` | Texto | Sí |  |
| `status` | Catálogo de estados | Sí | vigente, devuelto |

### Amortización de anticipo de cliente — `clientAdvanceApplications`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `advanceId` | Referencia | Sí | → `clientAdvances.id` |
| `kEstimateId` | Referencia | Sí | → `kEstimates.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `status` | Catálogo de estados | Sí | aplicada, revertida |

### Retención de garantía — `retentions`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `kEstimateId` | Referencia | Sí | → `kEstimates.id` |
| `workId` | Referencia | Sí | → `works.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `status` | Catálogo de estados | Sí | retenida, liberada |

### Liberación de retención — `retentionReleases`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `retentionId` | Referencia | Sí | → `retentions.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `note` | Texto largo | No |  |

### Ajuste de cuenta por cobrar — `arAdjustments`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `kEstimateId` | Referencia | Sí | → `kEstimates.id` |
| `kind` | Catálogo de estados | Sí | centavos, nota_ajuste, incobrable, recuperacion |
| `amount` | Decimal(18,2) | Sí |  |
| `reason` | Texto largo | Sí |  |
| `status` | Catálogo de estados | Sí | propuesto, autorizado, rechazado |
| `proposedBy` | Referencia | No | → `users.id` |
| `authorizedBy` | Referencia | No | → `users.id` |
| `relatedAdjustmentId` | Referencia | No | → `arAdjustments.id` |
| `receiptId` | Referencia | No | → `receipts.id` |

### Gestión de cobranza — `collectionActions`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `kEstimateId` | Referencia | Sí | → `kEstimates.id` |
| `responsibleId` | Referencia | No | → `users.id` |
| `kind` | Catálogo de estados | Sí | seguimiento, compromiso_pago, disputa |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `followUpDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `promiseDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `promiseAmount` | Decimal(18,2) | No |  |
| `note` | Texto largo | No |  |
| `status` | Catálogo de estados | Sí | abierta, cumplida, incumplida, cerrada |

## Administración

### Gasto / documento de proveedor — `expenses`

Unicidad lógica: (folio).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `folio` | Texto | Sí |  |
| `supplierId` | Referencia | No | → `parties.id` |
| `docDate` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `receivedDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `economicPeriod` | Periodo (AAAA-MM) | No |  |
| `description` | Texto largo | Sí |  |
| `categoryId` | Referencia | No | → `costCategories.id` |
| `voucherTypeId` | Referencia | No | → `voucherTypes.id` |
| `currency` | Texto | Sí |  |
| `subtotal` | Decimal(18,2) | No |  |
| `tax` | Decimal(18,2) | No |  |
| `total` | Decimal(18,2) | Sí |  |
| `reference` | Texto | No |  |
| `attachmentId` | Referencia | No | → `attachments.id` |
| `status` | Catálogo de estados | Sí | borrador, pendiente_informacion, revisado, autorizado, cancelado, con_ajuste |
| `quality` | Catálogo de estados | Sí | completo, sin_desglose, pendiente |
| `negativeNature` | Catálogo de estados | No | devolucion, reclasificacion, reverso, traslado |
| `treatment` | Catálogo de estados | Sí | gasto, activo_pendiente, no_resultado |
| `duplicateFlag` | Catálogo de estados | Sí | ninguno, posible, descartado |
| `obligationId` | Referencia | No | → `obligations.id` |
| `pettyFundId` | Referencia | No | → `pettyFunds.id` |
| `authorizedBy` | Referencia | No | → `users.id` |
| `additionalId` | Referencia | No | → `additionals.id` |

### Asignación de costo — `expenseAllocations`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `expenseId` | Referencia | Sí | → `expenses.id` |
| `target` | Catálogo de estados | Sí | obra, administracion, stock |
| `workId` | Referencia | No | → `works.id` |
| `method` | Catálogo de estados | Sí | porcentaje, importe, base |
| `pct` | Decimal(9,4) | No |  |
| `amount` | Decimal(18,2) | Sí |  |
| `basisNote` | Texto largo | No |  |
| `allocationRunId` | Referencia | No | → `allocationRuns.id` |
| `roundingAdjust` | Decimal(18,2) | No |  |

### Fondo de caja chica — `pettyFunds`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `responsibleId` | Referencia | Sí | → `users.id` |
| `authorizedAmount` | Decimal(18,2) | Sí |  |
| `accountId` | Referencia | Sí | → `accounts.id` |
| `currency` | Texto | Sí |  |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Movimiento de caja chica — `pettyMovements` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `fundId` | Referencia | Sí | → `pettyFunds.id` |
| `kind` | Catálogo de estados | Sí | entrega, comprobacion, rechazo, devolucion, reposicion |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `amount` | Decimal(18,2) | Sí |  |
| `expenseId` | Referencia | No | → `expenses.id` |
| `cashMovementId` | Referencia | No | → `cashMovements.id` |
| `note` | Texto largo | No |  |

### Insumo — `supplies`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `unitId` | Referencia | Sí | → `units.id` |
| `status` | Catálogo de estados | Sí | activo, inactivo |

### Conversión de unidad de insumo — `unitConversions`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `supplyId` | Referencia | Sí | → `supplies.id` |
| `fromUnitId` | Referencia | Sí | → `units.id` |
| `toUnitId` | Referencia | Sí | → `units.id` |
| `factor` | Decimal(18,4) | Sí |  |
| `note` | Texto largo | Sí |  |
| `approvedBy` | Referencia | Sí | → `users.id` |

### Solicitud de insumo — `supplyRequests`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `workId` | Referencia | Sí | → `works.id` |
| `requesterId` | Referencia | Sí | → `users.id` |
| `supplyId` | Referencia | Sí | → `supplies.id` |
| `qty` | Decimal(18,4) | Sí |  |
| `reason` | Texto largo | No |  |
| `neededDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `status` | Catálogo de estados | Sí | solicitada, aprobada, rechazada, surtida |
| `approvedBy` | Referencia | No | → `users.id` |

### Movimiento de insumo — `supplyMovements` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `supplyId` | Referencia | Sí | → `supplies.id` |
| `kind` | Catálogo de estados | Sí | inventario_inicial, recepcion, entrega_obra, consumo, devolucion, ajuste |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `qty` | Decimal(18,4) | Sí |  |
| `unitId` | Referencia | Sí | → `units.id` |
| `workId` | Referencia | No | → `works.id` |
| `expenseId` | Referencia | No | → `expenses.id` |
| `requestId` | Referencia | No | → `supplyRequests.id` |
| `note` | Texto largo | No |  |

### Regla de prorrateo — `allocationRules`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Texto | Sí |  |
| `name` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | costo_social, supervision, taller, otro |
| `basis` | Catálogo de estados | Sí | mano_obra_autorizada, porcentaje_fijo, manual |
| `params` | Objeto anidado declarado (JSON) | No |  |
| `version` | Entero | Sí |  |
| `status` | Catálogo de estados | Sí | borrador, aprobada, inactiva |
| `approvedBy` | Referencia | No | → `users.id` |

### Ejecución de prorrateo — `allocationRuns` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `ruleId` | Referencia | Sí | → `allocationRules.id` |
| `ruleVersion` | Entero | Sí |  |
| `period` | Periodo (AAAA-MM) | Sí |  |
| `expenseId` | Referencia | Sí | → `expenses.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `adminPortion` | Decimal(18,2) | No |  |
| `basis` | Objeto anidado declarado (JSON) | Sí |  |
| `result` | Objeto anidado declarado (JSON) | Sí |  |
| `roundingDiff` | Decimal(18,2) | Sí |  |
| `runBy` | Referencia | No | → `users.id` |

## Tesorería

### Movimiento de caja o banco — `cashMovements` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `accountId` | Referencia | Sí | → `accounts.id` |
| `type` | Catálogo de estados | Sí | cobro, pago, transferencia_salida, transferencia_entrada, prestamo_recibido, pago_principal, aportacion, retiro_socios, inversion, ajuste, comision, devolucion |
| `flowClass` | Catálogo de estados | Sí | operacion, inversion, financiamiento, transferencia, ajuste |
| `opDate` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `confirmDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `amount` | Decimal(18,2) | Sí |  |
| `currency` | Texto | Sí |  |
| `counterpartyId` | Referencia | No | → `parties.id` |
| `counterpartyName` | Texto | No |  |
| `reference` | Texto | No |  |
| `sourceType` | Texto | No |  |
| `sourceId` | Texto | No |  |
| `transferId` | Referencia | No | → `transfers.id` |
| `reversesId` | Referencia | No | → `cashMovements.id` |
| `note` | Texto largo | No |  |
| `adjustmentCategory` | Texto | No |  |
| `authorizedBy` | Referencia | No | → `users.id` |

### Transferencia entre cuentas propias — `transfers` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `fromAccountId` | Referencia | Sí | → `accounts.id` |
| `toAccountId` | Referencia | Sí | → `accounts.id` |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `amount` | Decimal(18,2) | Sí |  |
| `reference` | Texto | No |  |
| `note` | Texto largo | No |  |

### Lote de conciliación — `reconBatches`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `accountId` | Referencia | Sí | → `accounts.id` |
| `fileName` | Texto | Sí |  |
| `sha256` | Texto | Sí |  |
| `importedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `cutoffDate` | Fecha de operación (AAAA-MM-DD) | No |  |
| `status` | Catálogo de estados | Sí | abierto, cerrado |
| `rowCount` | Entero | Sí |  |

### Renglón de estado de cuenta — `bankLines`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `batchId` | Referencia | Sí | → `reconBatches.id` |
| `accountId` | Referencia | Sí | → `accounts.id` |
| `lineNo` | Entero | Sí |  |
| `date` | Fecha de operación (AAAA-MM-DD) | Sí |  |
| `reference` | Texto | No |  |
| `description` | Texto largo | No |  |
| `amount` | Decimal(18,2) | Sí |  |
| `status` | Catálogo de estados | Sí | sin_conciliar, conciliada, diferencia |
| `duplicateFlag` | Catálogo de estados | Sí | ninguno, posible |

### Vínculo conciliado — `reconLinks`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `bankLineId` | Referencia | Sí | → `bankLines.id` |
| `cashMovementId` | Referencia | Sí | → `cashMovements.id` |
| `amount` | Decimal(18,2) | Sí |  |
| `status` | Catálogo de estados | Sí | sugerido, aceptado, rechazado |
| `basis` | Texto | No |  |
| `decidedBy` | Referencia | No | → `users.id` |

## Administración

### Periodo económico — `economicPeriods`

Unicidad lógica: (code).

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `code` | Periodo (AAAA-MM) | Sí |  |
| `status` | Catálogo de estados | Sí | abierto, en_revision, cerrado |
| `checklist` | Objeto anidado declarado (JSON) | No |  |
| `closedBy` | Referencia | No | → `users.id` |
| `closedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `note` | Texto largo | No |  |

## Importación

### Lote de importación — `importBatches`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `profile` | Texto | Sí |  |
| `fileName` | Texto | Sí |  |
| `sha256` | Texto | Sí |  |
| `attachmentId` | Referencia | No | → `attachments.id` |
| `uploadedBy` | Referencia | No | → `users.id` |
| `status` | Catálogo de estados | Sí | cargado, simulado, confirmado, revertido |
| `strategy` | Texto | No |  |
| `summary` | Objeto anidado declarado (JSON) | No |  |
| `mapping` | Objeto anidado declarado (JSON) | No |  |
| `confirmedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `revertedAt` | Instante (ISO-8601 con zona, UTC) | No |  |

### Registro de origen — `sourceRecords`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `batchId` | Referencia | Sí | → `importBatches.id` |
| `sheet` | Texto | No |  |
| `row` | Entero | No |  |
| `cell` | Texto | No |  |
| `kind` | Texto | Sí |  |
| `naturalKey` | Texto | Sí |  |
| `data` | Objeto anidado declarado (JSON) | Sí |  |
| `status` | Catálogo de estados | Sí | nuevo, coincidencia, cambio, rechazado, importado, excluido |
| `targetType` | Texto | No |  |
| `targetId` | Texto | No |  |
| `note` | Texto largo | No |  |

### Coincidencia propuesta — `matchProposals`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `batchId` | Referencia | No | → `importBatches.id` |
| `aType` | Texto | Sí |  |
| `aId` | Texto | Sí |  |
| `bType` | Texto | Sí |  |
| `bId` | Texto | Sí |  |
| `basis` | Texto largo | Sí |  |
| `amount` | Decimal(18,2) | No |  |
| `status` | Catálogo de estados | Sí | pendiente, aceptada, rechazada |
| `decidedBy` | Referencia | No | → `users.id` |
| `note` | Texto largo | No |  |

### Incidencia de calidad de datos — `qualityIssues`

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `batchId` | Referencia | No | → `importBatches.id` |
| `sourceRecordId` | Texto | No |  |
| `fileName` | Texto | No |  |
| `sheet` | Texto | No |  |
| `cell` | Texto | No |  |
| `kind` | Catálogo de estados | Sí | error_formula, fecha_ambigua, fecha_conflicto, unidad, categoria, nombre, tarifa, cantidad, saldo, subtotal, diferencia_medicion, diferencia_importe, hoja_oculta, otro |
| `detail` | Texto largo | Sí |  |
| `responsibleId` | Referencia | No | → `users.id` |
| `status` | Catálogo de estados | Sí | abierta, resuelta, descartada |
| `resolution` | Texto largo | No |  |
| `dedupeKey` | Texto | No |  |

## Auditoría

### Evento de auditoría — `auditEvents` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `at` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `actorId` | Texto | No |  |
| `actorName` | Texto | Sí |  |
| `onBehalfOf` | Texto | No |  |
| `action` | Texto | Sí |  |
| `kind` | Catálogo de estados | Sí | alta, cambio, baja, evento |
| `collection` | Texto | No |  |
| `objectId` | Texto | No |  |
| `objectVersion` | Entero | No |  |
| `reason` | Texto largo | No |  |
| `diff` | Objeto anidado declarado (JSON) | No |  |
| `txId` | Texto | Sí |  |
| `seq` | Entero | Sí |  |
| `prevHash` | Texto | Sí |  |
| `hash` | Texto | Sí |  |

### Operación idempotente — `idempotentOps` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `key` | Texto | Sí |  |
| `actorId` | Texto | No |  |
| `action` | Texto | Sí |  |
| `result` | Objeto anidado declarado (JSON) | No |  |
| `at` | Instante (ISO-8601 con zona, UTC) | Sí |  |

### Manifiesto de respaldo — `backupManifests` · histórico inmutable

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `id` | Identificador (UUID, texto) | Sí |  |
| `organizationId` | Referencia | No | → `organizations.id` |
| `recordVersion` | Entero | Sí |  |
| `schemaVersion` | Entero | Sí |  |
| `createdAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `createdBy` | Texto | No |  |
| `updatedAt` | Instante (ISO-8601 con zona, UTC) | Sí |  |
| `updatedBy` | Texto | No |  |
| `archivedAt` | Instante (ISO-8601 con zona, UTC) | No |  |
| `archivedBy` | Texto | No |  |
| `sourceReference` | Texto | No |  |
| `stamp` | Texto | Sí |  |
| `generation` | Entero | Sí |  |
| `files` | Entero | Sí |  |
| `blobs` | Entero | Sí |  |
| `bytes` | Entero | Sí |  |
| `checksum` | Texto | Sí |  |
| `createdByName` | Texto | No |  |
| `note` | Texto largo | No |  |
