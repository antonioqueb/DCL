-- Modelo relacional equivalente al esquema de archivos (generado; no editar a mano).
-- Claves primarias UUID, foráneas explícitas, estados como CHECK, decimales exactos.

-- Organización
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  name text NOT NULL,
  legal_name text
);

-- Usuario
CREATE TABLE users (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  username text NOT NULL,
  name text NOT NULL,
  email text,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo')),
  party_id uuid,
  must_change_password boolean,
  session_epoch integer
);
CREATE UNIQUE INDEX users_username_uk ON users (username) WHERE archived_at IS NULL;
CREATE INDEX users_party_id_ix ON users (party_id);

-- Rol
CREATE TABLE roles (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  audience text NOT NULL CHECK (audience IN ('interno', 'contratista', 'cliente'))
);
CREATE UNIQUE INDEX roles_code_uk ON roles (code) WHERE archived_at IS NULL;

-- Permiso de rol
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  role_id uuid NOT NULL,
  permission text NOT NULL
);
CREATE UNIQUE INDEX role_permissions_role_id_permission_uk ON role_permissions (role_id, permission) WHERE archived_at IS NULL;
CREATE INDEX role_permissions_role_id_ix ON role_permissions (role_id);

-- Asignación de rol
CREATE TABLE role_assignments (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global', 'obra', 'asignadas')),
  work_id uuid,
  valid_from date,
  valid_to date
);
CREATE INDEX role_assignments_user_id_ix ON role_assignments (user_id);
CREATE INDEX role_assignments_role_id_ix ON role_assignments (role_id);
CREATE INDEX role_assignments_work_id_ix ON role_assignments (work_id);

-- Delegación
CREATE TABLE delegations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  permission text NOT NULL,
  work_id uuid,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('activa', 'revocada'))
);
CREATE INDEX delegations_from_user_id_ix ON delegations (from_user_id);
CREATE INDEX delegations_to_user_id_ix ON delegations (to_user_id);
CREATE INDEX delegations_work_id_ix ON delegations (work_id);

-- Límite de autorización
CREATE TABLE authorization_limits (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  role_id uuid,
  user_id uuid,
  kind text NOT NULL CHECK (kind IN ('estimacion_contratista', 'pago', 'precio_excepcional', 'adicional_costo', 'ajuste_avance', 'gasto', 'ajuste_saldo')),
  max_amount numeric(18,2),
  currency text,
  note text
);
CREATE INDEX authorization_limits_role_id_ix ON authorization_limits (role_id);
CREATE INDEX authorization_limits_user_id_ix ON authorization_limits (user_id);

-- Configuración
CREATE TABLE settings (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  key text NOT NULL,
  value jsonb,
  description text,
  requires_decision boolean
);
CREATE UNIQUE INDEX settings_key_uk ON settings (key) WHERE archived_at IS NULL;

-- Decisión pendiente
CREATE TABLE pending_decisions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  topic text NOT NULL,
  question text NOT NULL,
  provisional text NOT NULL,
  status text NOT NULL CHECK (status IN ('pendiente', 'validada')),
  resolution text,
  decided_by_name text,
  decided_at date
);
CREATE UNIQUE INDEX pending_decisions_code_uk ON pending_decisions (code) WHERE archived_at IS NULL;

-- Notificación interna
CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  user_id uuid NOT NULL,
  work_id uuid,
  event text NOT NULL,
  object_type text,
  object_id text,
  title text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('normal', 'alta')),
  due_date date,
  status text NOT NULL CHECK (status IN ('nueva', 'leida', 'resuelta')),
  dedupe_key text NOT NULL
);
CREATE UNIQUE INDEX notifications_dedupe_key_uk ON notifications (dedupe_key) WHERE archived_at IS NULL;
CREATE INDEX notifications_user_id_ix ON notifications (user_id);
CREATE INDEX notifications_work_id_ix ON notifications (work_id);

-- Solicitud de aprobación
CREATE TABLE approval_requests (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  object_type text NOT NULL,
  object_id text NOT NULL,
  kind text NOT NULL,
  work_id uuid,
  requested_by uuid,
  amount numeric(18,2),
  reason text,
  status text NOT NULL CHECK (status IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution text
);
CREATE INDEX approval_requests_work_id_ix ON approval_requests (work_id);
CREATE INDEX approval_requests_requested_by_ix ON approval_requests (requested_by);
CREATE INDEX approval_requests_resolved_by_ix ON approval_requests (resolved_by);

-- Aprobación
CREATE TABLE approvals (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  object_type text NOT NULL,
  object_id text NOT NULL,
  object_version integer NOT NULL,
  item_id text,
  item_rev integer,
  decision text NOT NULL CHECK (decision IN ('aprobado', 'rechazado', 'aceptado', 'observado', 'excepcion')),
  actor_id uuid,
  actor_name text NOT NULL,
  on_behalf_of_user_id uuid,
  at timestamptz NOT NULL,
  scope text NOT NULL,
  valid boolean NOT NULL,
  invalidated_at timestamptz,
  invalidated_reason text,
  note text,
  channel text NOT NULL CHECK (channel IN ('sistema', 'portal', 'externo')),
  evidence_attachment_id uuid
);
CREATE INDEX approvals_actor_id_ix ON approvals (actor_id);
CREATE INDEX approvals_on_behalf_of_user_id_ix ON approvals (on_behalf_of_user_id);
CREATE INDEX approvals_evidence_attachment_id_ix ON approvals (evidence_attachment_id);

-- Versión congelada de documento (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE document_versions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  doc_type text NOT NULL,
  doc_id text NOT NULL,
  version integer NOT NULL,
  reason text,
  snapshot jsonb NOT NULL,
  snapshot_hash text NOT NULL,
  frozen_at timestamptz NOT NULL,
  frozen_by text
);
CREATE UNIQUE INDEX document_versions_doc_type_doc_id_version_uk ON document_versions (doc_type, doc_id, version) WHERE archived_at IS NULL;

-- Registro de tiempo de trabajo
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  user_id uuid NOT NULL,
  activity text NOT NULL CHECK (activity IN ('preparacion_cierre', 'revision', 'captura', 'conciliacion')),
  period_id uuid,
  date date NOT NULL,
  minutes integer NOT NULL,
  source text NOT NULL CHECK (source IN ('registro', 'declarada')),
  note text
);
CREATE INDEX activity_logs_user_id_ix ON activity_logs (user_id);
CREATE INDEX activity_logs_period_id_ix ON activity_logs (period_id);

-- Persona o empresa
CREATE TABLE parties (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  legal_name text,
  normalized_name text NOT NULL,
  is_client boolean,
  is_supplier boolean,
  is_contractor boolean,
  tax_id text,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo')),
  valid_from date,
  valid_to date,
  restricted_notes text
);
CREATE UNIQUE INDEX parties_code_uk ON parties (code) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX parties_normalized_name_uk ON parties (normalized_name) WHERE archived_at IS NULL;

-- Alias histórico
CREATE TABLE party_aliases (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  party_id uuid NOT NULL,
  alias text NOT NULL,
  normalized_alias text NOT NULL
);
CREATE UNIQUE INDEX party_aliases_normalized_alias_uk ON party_aliases (normalized_alias) WHERE archived_at IS NULL;
CREATE INDEX party_aliases_party_id_ix ON party_aliases (party_id);

-- Contacto
CREATE TABLE contacts (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  party_id uuid NOT NULL,
  name text NOT NULL,
  position text,
  phone text,
  email text,
  is_representative boolean,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE INDEX contacts_party_id_ix ON contacts (party_id);

-- Cuenta de pago de tercero
CREATE TABLE party_bank_accounts (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  party_id uuid NOT NULL,
  bank text,
  holder text,
  account_number text,
  clabe text,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE INDEX party_bank_accounts_party_id_ix ON party_bank_accounts (party_id);

-- Trabajador
CREATE TABLE workers (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  contractor_id uuid,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo')),
  docs_pending text,
  pay_account_pending boolean
);
CREATE UNIQUE INDEX workers_code_uk ON workers (code) WHERE archived_at IS NULL;
CREATE INDEX workers_contractor_id_ix ON workers (contractor_id);

-- Cuadrilla
CREATE TABLE crews (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  contractor_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX crews_code_uk ON crews (code) WHERE archived_at IS NULL;
CREATE INDEX crews_contractor_id_ix ON crews (contractor_id);

-- Integrante de cuadrilla
CREATE TABLE crew_memberships (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  crew_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  valid_from date NOT NULL,
  valid_to date
);
CREATE INDEX crew_memberships_crew_id_ix ON crew_memberships (crew_id);
CREATE INDEX crew_memberships_worker_id_ix ON crew_memberships (worker_id);

-- Aviso de personal
CREATE TABLE personnel_notices (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  worker_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('alta', 'baja', 'pendiente')),
  date date NOT NULL,
  note text,
  attachment_id uuid,
  status text NOT NULL CHECK (status IN ('abierto', 'atendido'))
);
CREATE INDEX personnel_notices_worker_id_ix ON personnel_notices (worker_id);
CREATE INDEX personnel_notices_attachment_id_ix ON personnel_notices (attachment_id);

-- Unidad
CREATE TABLE units (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('area', 'longitud', 'pieza', 'lote', 'tiempo', 'servicio')),
  decimals integer NOT NULL,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX units_code_uk ON units (code) WHERE archived_at IS NULL;

-- Categoría de costo
CREATE TABLE cost_categories (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  class text NOT NULL CHECK (class IN ('costo_instalacion', 'gasto_administrativo', 'gasto_comercial', 'impuesto', 'activo_inversion', 'prestamo', 'movimiento_socios', 'transferencia_interna')),
  parent_id uuid,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX cost_categories_code_uk ON cost_categories (code) WHERE archived_at IS NULL;
CREATE INDEX cost_categories_parent_id_ix ON cost_categories (parent_id);

-- Concepto
CREATE TABLE concepts (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  catalog text NOT NULL CHECK (catalog IN ('contratacion', 'comercial')),
  family text,
  unit_id uuid NOT NULL,
  evidence_policy text NOT NULL CHECK (evidence_policy IN ('opcional', 'requerida')),
  hidden_work boolean,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo')),
  valid_from date,
  valid_to date
);
CREATE UNIQUE INDEX concepts_code_uk ON concepts (code) WHERE archived_at IS NULL;
CREATE INDEX concepts_unit_id_ix ON concepts (unit_id);

-- Alias de concepto
CREATE TABLE concept_aliases (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  concept_id uuid NOT NULL,
  alias text NOT NULL,
  normalized_alias text NOT NULL
);
CREATE INDEX concept_aliases_concept_id_ix ON concept_aliases (concept_id);

-- Equivalencia entre concepto de contratación y comercial
CREATE TABLE concept_links (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  contract_concept_id uuid NOT NULL,
  commercial_concept_id uuid NOT NULL,
  note text,
  validated boolean
);
CREATE UNIQUE INDEX concept_links_contract_concept_id_commercial_concept_id_uk ON concept_links (contract_concept_id, commercial_concept_id) WHERE archived_at IS NULL;
CREATE INDEX concept_links_contract_concept_id_ix ON concept_links (contract_concept_id);
CREATE INDEX concept_links_commercial_concept_id_ix ON concept_links (commercial_concept_id);

-- Versión de tarifa
CREATE TABLE rates (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  circuit text NOT NULL CHECK (circuit IN ('contratacion', 'comercial')),
  concept_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  work_id uuid,
  contractor_id uuid,
  price numeric(18,4) NOT NULL,
  currency text NOT NULL,
  valid_from date NOT NULL,
  valid_to date,
  includes text,
  status text NOT NULL CHECK (status IN ('vigente', 'inactiva')),
  exceptional boolean,
  reason text,
  approved_by uuid
);
CREATE INDEX rates_concept_id_ix ON rates (concept_id);
CREATE INDEX rates_unit_id_ix ON rates (unit_id);
CREATE INDEX rates_work_id_ix ON rates (work_id);
CREATE INDEX rates_contractor_id_ix ON rates (contractor_id);
CREATE INDEX rates_approved_by_ix ON rates (approved_by);

-- Nivel de detalle por lote
CREATE TABLE detail_levels (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  cost_amount numeric(18,2),
  sale_amount numeric(18,2),
  currency text,
  note text,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX detail_levels_code_uk ON detail_levels (code) WHERE archived_at IS NULL;

-- Motivo de ajuste
CREATE TABLE adjustment_reasons (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  applies_to text,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX adjustment_reasons_code_uk ON adjustment_reasons (code) WHERE archived_at IS NULL;

-- Tipo de comprobante
CREATE TABLE voucher_types (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  has_tax_breakdown boolean,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX voucher_types_code_uk ON voucher_types (code) WHERE archived_at IS NULL;

-- Medio de pago
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('efectivo', 'transferencia', 'cheque', 'otro')),
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX payment_methods_code_uk ON payment_methods (code) WHERE archived_at IS NULL;

-- Cuenta de caja o banco
CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('efectivo', 'banco')),
  currency text NOT NULL,
  opening_balance numeric(18,2) NOT NULL,
  opening_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo')),
  bank_reference text
);
CREATE UNIQUE INDEX accounts_code_uk ON accounts (code) WHERE archived_at IS NULL;

-- Obra
CREATE TABLE works (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  client_id uuid,
  representative_contact_id uuid,
  address text,
  start_date date,
  end_date date,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('planeacion', 'activa', 'suspendida', 'cierre_operativo', 'cierre_financiero', 'archivada')),
  operational_close_date date,
  financial_close_date date,
  payment_terms text,
  consolidation text NOT NULL CHECK (consolidation IN ('incluida', 'excluida', 'pendiente_clasificar')),
  consolidation_note text
);
CREATE UNIQUE INDEX works_code_uk ON works (code) WHERE archived_at IS NULL;
CREATE INDEX works_client_id_ix ON works (client_id);
CREATE INDEX works_representative_contact_id_ix ON works (representative_contact_id);

-- Ubicación jerárquica
CREATE TABLE locations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  parent_id uuid,
  kind text NOT NULL CHECK (kind IN ('edificio', 'nivel', 'zona', 'habitacion', 'superficie')),
  name text NOT NULL,
  sort_order integer,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE INDEX locations_work_id_ix ON locations (work_id);
CREATE INDEX locations_parent_id_ix ON locations (parent_id);

-- Asignación a obra
CREATE TABLE work_assignments (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('supervisor', 'coordinador', 'auxiliar', 'tesoreria', 'contratista', 'cuadrilla', 'cliente')),
  user_id uuid,
  party_id uuid,
  crew_id uuid,
  valid_from date NOT NULL,
  valid_to date,
  note text
);
CREATE INDEX work_assignments_work_id_ix ON work_assignments (work_id);
CREATE INDEX work_assignments_user_id_ix ON work_assignments (user_id);
CREATE INDEX work_assignments_party_id_ix ON work_assignments (party_id);
CREATE INDEX work_assignments_crew_id_ix ON work_assignments (crew_id);

-- Cierre de obra
CREATE TABLE work_closures (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('operativo', 'financiero')),
  date date NOT NULL,
  checklist jsonb NOT NULL,
  exceptions jsonb,
  authorized_by uuid NOT NULL,
  note text
);
CREATE INDEX work_closures_work_id_ix ON work_closures (work_id);
CREATE INDEX work_closures_authorized_by_ix ON work_closures (authorized_by);

-- Contrato / condiciones
CREATE TABLE contracts (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  client_id uuid NOT NULL,
  code text NOT NULL,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('borrador', 'vigente', 'sustituido')),
  currency text NOT NULL,
  advance_kind text NOT NULL CHECK (advance_kind IN ('ninguno', 'porcentaje', 'importe')),
  advance_pct numeric(9,4),
  advance_amount numeric(18,2),
  advance_base text,
  amortization_pct numeric(9,4),
  amortization_base text NOT NULL CHECK (amortization_base IN ('subtotal', 'total_con_impuestos', 'no_definida')),
  retention_pct numeric(9,4),
  retention_base text NOT NULL CHECK (retention_base IN ('subtotal', 'total_con_impuestos', 'no_definida')),
  retention_release text,
  tax_rate numeric(9,4),
  tax_label text,
  due_days integer,
  agreement_attachment_id uuid,
  terms_validated boolean NOT NULL,
  notes text
);
CREATE INDEX contracts_work_id_ix ON contracts (work_id);
CREATE INDEX contracts_client_id_ix ON contracts (client_id);
CREATE INDEX contracts_agreement_attachment_id_ix ON contracts (agreement_attachment_id);

-- Presupuesto
CREATE TABLE budgets (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL
);
CREATE UNIQUE INDEX budgets_code_uk ON budgets (code) WHERE archived_at IS NULL;
CREATE INDEX budgets_work_id_ix ON budgets (work_id);

-- Versión de presupuesto
CREATE TABLE budget_versions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  budget_id uuid NOT NULL,
  work_id uuid NOT NULL,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('borrador', 'en_revision', 'enviado', 'aceptado', 'rechazado', 'sustituido', 'cancelado')),
  is_current boolean NOT NULL,
  sent_at timestamptz,
  accepted_at date,
  accepted_by_name text,
  acceptance_evidence_id uuid,
  conditions text,
  tax_treatment text
);
CREATE UNIQUE INDEX budget_versions_budget_id_version_uk ON budget_versions (budget_id, version) WHERE archived_at IS NULL;
CREATE INDEX budget_versions_budget_id_ix ON budget_versions (budget_id);
CREATE INDEX budget_versions_work_id_ix ON budget_versions (work_id);
CREATE INDEX budget_versions_acceptance_evidence_id_ix ON budget_versions (acceptance_evidence_id);

-- Partida de presupuesto
CREATE TABLE budget_items (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  budget_version_id uuid NOT NULL,
  work_id uuid NOT NULL,
  chapter text,
  location_id uuid,
  concept_id uuid,
  description text NOT NULL,
  unit_id uuid NOT NULL,
  qty numeric(18,4) NOT NULL,
  price numeric(18,4) NOT NULL,
  discount_pct numeric(9,4),
  amount numeric(18,2) NOT NULL,
  includes text,
  status text NOT NULL CHECK (status IN ('vigente', 'cancelada', 'sustituida')),
  replaced_by_id uuid,
  sort_order integer
);
CREATE INDEX budget_items_budget_version_id_ix ON budget_items (budget_version_id);
CREATE INDEX budget_items_work_id_ix ON budget_items (work_id);
CREATE INDEX budget_items_location_id_ix ON budget_items (location_id);
CREATE INDEX budget_items_concept_id_ix ON budget_items (concept_id);
CREATE INDEX budget_items_unit_id_ix ON budget_items (unit_id);
CREATE INDEX budget_items_replaced_by_id_ix ON budget_items (replaced_by_id);

-- Modificación de contrato (aditiva o deductiva)
CREATE TABLE change_orders (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  budget_id uuid,
  folio text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('aditiva', 'deductiva')),
  change_type text NOT NULL CHECK (change_type IN ('cambio_cantidad', 'concepto_nuevo', 'cambio_precio', 'sustitucion', 'eliminacion_alcance')),
  origin text,
  reason text NOT NULL,
  proposer_id uuid,
  status text NOT NULL CHECK (status IN ('propuesta', 'en_revision', 'aprobada', 'rechazada', 'cancelada')),
  effective_date date,
  client_approved_by_name text,
  approval_evidence_id uuid,
  internal_approved_by uuid,
  amount numeric(18,2) NOT NULL
);
CREATE UNIQUE INDEX change_orders_folio_uk ON change_orders (folio) WHERE archived_at IS NULL;
CREATE INDEX change_orders_work_id_ix ON change_orders (work_id);
CREATE INDEX change_orders_budget_id_ix ON change_orders (budget_id);
CREATE INDEX change_orders_proposer_id_ix ON change_orders (proposer_id);
CREATE INDEX change_orders_approval_evidence_id_ix ON change_orders (approval_evidence_id);
CREATE INDEX change_orders_internal_approved_by_ix ON change_orders (internal_approved_by);

-- Partida de modificación
CREATE TABLE change_order_items (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  change_order_id uuid NOT NULL,
  budget_item_id uuid,
  concept_id uuid,
  location_id uuid,
  description text NOT NULL,
  unit_id uuid NOT NULL,
  qty_delta numeric(18,4) NOT NULL,
  price numeric(18,4) NOT NULL,
  amount numeric(18,2) NOT NULL
);
CREATE INDEX change_order_items_change_order_id_ix ON change_order_items (change_order_id);
CREATE INDEX change_order_items_budget_item_id_ix ON change_order_items (budget_item_id);
CREATE INDEX change_order_items_concept_id_ix ON change_order_items (concept_id);
CREATE INDEX change_order_items_location_id_ix ON change_order_items (location_id);
CREATE INDEX change_order_items_unit_id_ix ON change_order_items (unit_id);

-- Periodo semanal
CREATE TABLE week_periods (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  year integer NOT NULL,
  week integer NOT NULL,
  code text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  cutoff_date date,
  status text NOT NULL CHECK (status IN ('abierta', 'en_cierre', 'cerrada'))
);
CREATE UNIQUE INDEX week_periods_year_week_uk ON week_periods (year, week) WHERE archived_at IS NULL;

-- Visita o captura
CREATE TABLE captures (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  supervisor_id uuid NOT NULL,
  visit_date date NOT NULL,
  period_id uuid NOT NULL,
  device text,
  note text
);
CREATE INDEX captures_work_id_ix ON captures (work_id);
CREATE INDEX captures_supervisor_id_ix ON captures (supervisor_id);
CREATE INDEX captures_period_id_ix ON captures (period_id);

-- Avance
CREATE TABLE progress_entries (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  capture_id uuid,
  work_id uuid NOT NULL,
  location_id uuid NOT NULL,
  contractor_id uuid,
  crew_id uuid,
  concept_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  execution_date date NOT NULL,
  period_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('periodo', 'acumulado')),
  qty numeric(18,4) NOT NULL,
  cumulative_measured numeric(18,4),
  base_cumulative numeric(18,4),
  description text,
  notes text,
  internal_notes text,
  work_type text NOT NULL CHECK (work_type IN ('ordinario', 'adicional', 'retrabajo')),
  rework_kind text CHECK (rework_kind IN ('error_instalacion', 'cambio_solicitado', 'trabajo_adicional')),
  budget_item_id uuid,
  additional_id uuid,
  status text NOT NULL CHECK (status IN ('borrador', 'reportado', 'validado', 'rechazado')),
  author_id uuid NOT NULL,
  validated_by uuid,
  validated_at timestamptz,
  rejected_reason text,
  evidence_required boolean NOT NULL,
  evidence_exception jsonb,
  duplicate_flag text NOT NULL CHECK (duplicate_flag IN ('ninguno', 'posible', 'descartado')),
  over_budget boolean,
  over_budget_note text,
  device text,
  captured_at timestamptz NOT NULL,
  last_reviewed_at timestamptz
);
CREATE INDEX progress_entries_capture_id_ix ON progress_entries (capture_id);
CREATE INDEX progress_entries_work_id_ix ON progress_entries (work_id);
CREATE INDEX progress_entries_location_id_ix ON progress_entries (location_id);
CREATE INDEX progress_entries_contractor_id_ix ON progress_entries (contractor_id);
CREATE INDEX progress_entries_crew_id_ix ON progress_entries (crew_id);
CREATE INDEX progress_entries_concept_id_ix ON progress_entries (concept_id);
CREATE INDEX progress_entries_unit_id_ix ON progress_entries (unit_id);
CREATE INDEX progress_entries_period_id_ix ON progress_entries (period_id);
CREATE INDEX progress_entries_budget_item_id_ix ON progress_entries (budget_item_id);
CREATE INDEX progress_entries_additional_id_ix ON progress_entries (additional_id);
CREATE INDEX progress_entries_author_id_ix ON progress_entries (author_id);
CREATE INDEX progress_entries_validated_by_ix ON progress_entries (validated_by);

-- Renglón de generador
CREATE TABLE generator_lines (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  entry_id uuid NOT NULL,
  label text,
  length numeric(18,4),
  width numeric(18,4),
  height numeric(18,4),
  pieces numeric(18,4),
  deduction numeric(18,4),
  result numeric(18,4) NOT NULL,
  formula text NOT NULL,
  sort_order integer
);
CREATE INDEX generator_lines_entry_id_ix ON generator_lines (entry_id);

-- Ajuste de avance
CREATE TABLE progress_adjustments (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  entry_id uuid NOT NULL,
  qty_delta numeric(18,4) NOT NULL,
  reason_id uuid,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('propuesto', 'autorizado', 'rechazado')),
  proposed_by uuid,
  authorized_by uuid,
  authorized_at timestamptz,
  observation_id uuid
);
CREATE INDEX progress_adjustments_entry_id_ix ON progress_adjustments (entry_id);
CREATE INDEX progress_adjustments_reason_id_ix ON progress_adjustments (reason_id);
CREATE INDEX progress_adjustments_proposed_by_ix ON progress_adjustments (proposed_by);
CREATE INDEX progress_adjustments_authorized_by_ix ON progress_adjustments (authorized_by);
CREATE INDEX progress_adjustments_observation_id_ix ON progress_adjustments (observation_id);

-- Archivo adjunto
CREATE TABLE attachments (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  original_name text NOT NULL,
  mime text NOT NULL,
  size integer NOT NULL,
  sha256 text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('foto', 'documento', 'plano', 'comprobante', 'importacion', 'emitido', 'otro')),
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL,
  taken_at_declared timestamptz,
  taken_at_source text NOT NULL CHECK (taken_at_source IN ('declarada', 'no_disponible')),
  has_thumb boolean,
  thumb_sha256 text,
  work_id uuid,
  confidentiality text NOT NULL CHECK (confidentiality IN ('operativo', 'interno', 'laboral', 'financiero'))
);
CREATE INDEX attachments_uploaded_by_ix ON attachments (uploaded_by);
CREATE INDEX attachments_work_id_ix ON attachments (work_id);

-- Vínculo de evidencia
CREATE TABLE evidence_links (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  attachment_id uuid NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  work_id uuid,
  location_id uuid,
  client_visible boolean NOT NULL,
  caption text
);
CREATE INDEX evidence_links_attachment_id_ix ON evidence_links (attachment_id);
CREATE INDEX evidence_links_work_id_ix ON evidence_links (work_id);
CREATE INDEX evidence_links_location_id_ix ON evidence_links (location_id);

-- Plano
CREATE TABLE plans (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  name text NOT NULL,
  discipline text
);
CREATE INDEX plans_work_id_ix ON plans (work_id);

-- Versión de plano
CREATE TABLE plan_versions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  plan_id uuid NOT NULL,
  version integer NOT NULL,
  attachment_id uuid NOT NULL,
  page_count integer,
  status text NOT NULL CHECK (status IN ('vigente', 'sustituida')),
  note text
);
CREATE UNIQUE INDEX plan_versions_plan_id_version_uk ON plan_versions (plan_id, version) WHERE archived_at IS NULL;
CREATE INDEX plan_versions_plan_id_ix ON plan_versions (plan_id);
CREATE INDEX plan_versions_attachment_id_ix ON plan_versions (attachment_id);

-- Anotación de plano
CREATE TABLE plan_annotations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  plan_version_id uuid NOT NULL,
  page integer NOT NULL,
  shape text NOT NULL CHECK (shape IN ('punto', 'linea', 'poligono')),
  points jsonb NOT NULL,
  label text,
  location_id uuid
);
CREATE INDEX plan_annotations_plan_version_id_ix ON plan_annotations (plan_version_id);
CREATE INDEX plan_annotations_location_id_ix ON plan_annotations (location_id);

-- Vínculo anotación–partida
CREATE TABLE annotation_links (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  annotation_id uuid NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL
);
CREATE INDEX annotation_links_annotation_id_ix ON annotation_links (annotation_id);

-- Documento emitido
CREATE TABLE issued_documents (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  doc_type text NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  object_version integer NOT NULL,
  audience text NOT NULL CHECK (audience IN ('interno', 'contratista', 'cliente')),
  folio text NOT NULL,
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('borrador', 'vigente', 'sustituido')),
  attachment_id uuid NOT NULL,
  model jsonb NOT NULL,
  model_hash text NOT NULL,
  issued_by uuid,
  issued_at timestamptz NOT NULL,
  work_id uuid,
  party_id uuid,
  published boolean NOT NULL
);
CREATE INDEX issued_documents_attachment_id_ix ON issued_documents (attachment_id);
CREATE INDEX issued_documents_issued_by_ix ON issued_documents (issued_by);
CREATE INDEX issued_documents_work_id_ix ON issued_documents (work_id);
CREATE INDEX issued_documents_party_id_ix ON issued_documents (party_id);

-- Enlace restringido
CREATE TABLE share_links (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  token_hash text NOT NULL,
  issued_document_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by_user uuid,
  last_access_at timestamptz
);
CREATE INDEX share_links_issued_document_id_ix ON share_links (issued_document_id);
CREATE INDEX share_links_created_by_user_ix ON share_links (created_by_user);

-- Adicional / trabajo fuera de alcance
CREATE TABLE additionals (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  work_id uuid NOT NULL,
  location_id uuid,
  date date NOT NULL,
  requester_name text,
  reported_by uuid,
  executor_id uuid,
  description text NOT NULL,
  cause text,
  kind text NOT NULL CHECK (kind IN ('trabajo_nuevo', 'correccion_medicion', 'dano', 'reposicion', 'retrabajo', 'cambio_solicitado')),
  urgency text NOT NULL CHECK (urgency IN ('normal', 'urgente')),
  unit_id uuid,
  qty numeric(18,4),
  related_entry_id uuid,
  valuation text CHECK (valuation IN ('catalogo', 'nivel', 'excepcional')),
  concept_id uuid,
  detail_level_id uuid,
  executed boolean NOT NULL,
  op_status text NOT NULL CHECK (op_status IN ('reportado', 'en_aclaracion', 'validado', 'rechazado', 'resuelto')),
  op_by uuid,
  op_at timestamptz,
  op_note text,
  cost_status text NOT NULL CHECK (cost_status IN ('pendiente', 'autorizado', 'rechazado', 'no_aplica')),
  cost_amount numeric(18,2),
  cost_by uuid,
  cost_at timestamptz,
  sale_status text NOT NULL CHECK (sale_status IN ('pendiente', 'propuesto', 'aprobado_cliente', 'rechazado_cliente', 'absorbido', 'no_aplica')),
  sale_amount numeric(18,2),
  sale_by uuid,
  sale_at timestamptz,
  sale_note text,
  client_approval_evidence_id uuid
);
CREATE UNIQUE INDEX additionals_folio_uk ON additionals (folio) WHERE archived_at IS NULL;
CREATE INDEX additionals_work_id_ix ON additionals (work_id);
CREATE INDEX additionals_location_id_ix ON additionals (location_id);
CREATE INDEX additionals_reported_by_ix ON additionals (reported_by);
CREATE INDEX additionals_executor_id_ix ON additionals (executor_id);
CREATE INDEX additionals_unit_id_ix ON additionals (unit_id);
CREATE INDEX additionals_related_entry_id_ix ON additionals (related_entry_id);
CREATE INDEX additionals_concept_id_ix ON additionals (concept_id);
CREATE INDEX additionals_detail_level_id_ix ON additionals (detail_level_id);
CREATE INDEX additionals_op_by_ix ON additionals (op_by);
CREATE INDEX additionals_cost_by_ix ON additionals (cost_by);
CREATE INDEX additionals_sale_by_ix ON additionals (sale_by);
CREATE INDEX additionals_client_approval_evidence_id_ix ON additionals (client_approval_evidence_id);

-- Incidencia
CREATE TABLE incidents (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  additional_id uuid,
  title text NOT NULL,
  description text,
  responsible_id uuid,
  due_date date,
  status text NOT NULL CHECK (status IN ('abierta', 'en_proceso', 'cerrada')),
  closed_at timestamptz,
  close_evidence_id uuid,
  close_note text
);
CREATE INDEX incidents_work_id_ix ON incidents (work_id);
CREATE INDEX incidents_additional_id_ix ON incidents (additional_id);
CREATE INDEX incidents_responsible_id_ix ON incidents (responsible_id);
CREATE INDEX incidents_close_evidence_id_ix ON incidents (close_evidence_id);

-- Comentario de incidencia (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE incident_comments (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  incident_id uuid NOT NULL,
  text text NOT NULL,
  author_id uuid NOT NULL,
  at timestamptz NOT NULL
);
CREATE INDEX incident_comments_incident_id_ix ON incident_comments (incident_id);
CREATE INDEX incident_comments_author_id_ix ON incident_comments (author_id);

-- Jornada / raya
CREATE TABLE workdays (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  worker_id uuid,
  crew_id uuid,
  contractor_id uuid,
  date date NOT NULL,
  period_id uuid NOT NULL,
  time_unit text NOT NULL CHECK (time_unit IN ('jornada', 'hora')),
  qty numeric(18,4) NOT NULL,
  rate numeric(18,4),
  amount numeric(18,2),
  currency text,
  status text NOT NULL CHECK (status IN ('capturada', 'aprobada', 'rechazada')),
  approved_by uuid,
  overlap_justification text,
  note text
);
CREATE INDEX workdays_worker_id_ix ON workdays (worker_id);
CREATE INDEX workdays_crew_id_ix ON workdays (crew_id);
CREATE INDEX workdays_contractor_id_ix ON workdays (contractor_id);
CREATE INDEX workdays_period_id_ix ON workdays (period_id);
CREATE INDEX workdays_approved_by_ix ON workdays (approved_by);

-- Distribución de jornada por obra
CREATE TABLE workday_allocations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  workday_id uuid NOT NULL,
  work_id uuid NOT NULL,
  qty numeric(18,4) NOT NULL,
  amount numeric(18,2)
);
CREATE INDEX workday_allocations_workday_id_ix ON workday_allocations (workday_id);
CREATE INDEX workday_allocations_work_id_ix ON workday_allocations (work_id);

-- Estimación de contratista
CREATE TABLE c_estimates (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  work_id uuid NOT NULL,
  contractor_id uuid NOT NULL,
  period_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ordinaria', 'complementaria')),
  complement_reason text,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('borrador', 'revision_interna', 'revision_contratista', 'conciliacion', 'lista_autorizar', 'autorizada', 'cerrada', 'cancelada')),
  currency text NOT NULL,
  gross_total numeric(18,2),
  authorized_total numeric(18,2),
  authorized_at timestamptz,
  authorized_by uuid,
  close_id uuid,
  sent_to_contractor_at timestamptz,
  notes text
);
CREATE UNIQUE INDEX c_estimates_folio_uk ON c_estimates (folio) WHERE archived_at IS NULL;
CREATE INDEX c_estimates_work_id_ix ON c_estimates (work_id);
CREATE INDEX c_estimates_contractor_id_ix ON c_estimates (contractor_id);
CREATE INDEX c_estimates_period_id_ix ON c_estimates (period_id);
CREATE INDEX c_estimates_authorized_by_ix ON c_estimates (authorized_by);
CREATE INDEX c_estimates_close_id_ix ON c_estimates (close_id);

-- Partida de estimación de contratista
CREATE TABLE c_estimate_items (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  estimate_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('avance', 'jornada', 'adicional', 'fijo')),
  location_id uuid,
  concept_id uuid,
  description text,
  unit_id uuid,
  qty numeric(18,4) NOT NULL,
  unit_price numeric(18,4),
  amount numeric(18,2),
  rate_snapshot jsonb,
  method text NOT NULL CHECK (method IN ('cantidad', 'jornada', 'hora', 'lote', 'destajo', 'fijo')),
  work_type text NOT NULL CHECK (work_type IN ('ordinario', 'adicional', 'retrabajo')),
  group_label text,
  status text NOT NULL CHECK (status IN ('pendiente', 'observada', 'acordada', 'autorizada', 'rechazada', 'diferida')),
  rev integer NOT NULL,
  additional_id uuid,
  workday_id uuid,
  sort_order integer
);
CREATE INDEX c_estimate_items_estimate_id_ix ON c_estimate_items (estimate_id);
CREATE INDEX c_estimate_items_location_id_ix ON c_estimate_items (location_id);
CREATE INDEX c_estimate_items_concept_id_ix ON c_estimate_items (concept_id);
CREATE INDEX c_estimate_items_unit_id_ix ON c_estimate_items (unit_id);
CREATE INDEX c_estimate_items_additional_id_ix ON c_estimate_items (additional_id);
CREATE INDEX c_estimate_items_workday_id_ix ON c_estimate_items (workday_id);

-- Asignación de ejecución a documento
CREATE TABLE execution_allocations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  circuit text NOT NULL CHECK (circuit IN ('contratista', 'cliente')),
  progress_entry_id uuid NOT NULL,
  qty numeric(18,4) NOT NULL,
  unit_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('cEstimate', 'kEstimate')),
  doc_id text NOT NULL,
  item_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('reservada', 'confirmada', 'liberada'))
);
CREATE INDEX execution_allocations_progress_entry_id_ix ON execution_allocations (progress_entry_id);
CREATE INDEX execution_allocations_unit_id_ix ON execution_allocations (unit_id);

-- Observación del contratista
CREATE TABLE observations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  estimate_id uuid NOT NULL,
  item_id uuid NOT NULL,
  allocation_id uuid,
  estimate_version integer NOT NULL,
  author_id uuid NOT NULL,
  proposed_qty numeric(18,4),
  proposed_amount numeric(18,2),
  text text NOT NULL,
  evidence_attachment_id uuid,
  status text NOT NULL CHECK (status IN ('abierta', 'resuelta')),
  resolution text CHECK (resolution IN ('aceptada', 'parcial', 'rechazada')),
  resolved_qty numeric(18,4),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  before jsonb,
  after jsonb
);
CREATE INDEX observations_estimate_id_ix ON observations (estimate_id);
CREATE INDEX observations_item_id_ix ON observations (item_id);
CREATE INDEX observations_allocation_id_ix ON observations (allocation_id);
CREATE INDEX observations_author_id_ix ON observations (author_id);
CREATE INDEX observations_evidence_attachment_id_ix ON observations (evidence_attachment_id);
CREATE INDEX observations_resolved_by_ix ON observations (resolved_by);

-- Cierre semanal
CREATE TABLE weekly_closes (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  period_id uuid NOT NULL,
  version integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ordinario', 'complemento')),
  parent_close_id uuid,
  reason text,
  status text NOT NULL CHECK (status IN ('emitido', 'sustituido')),
  closed_at timestamptz NOT NULL,
  closed_by uuid NOT NULL,
  currency text NOT NULL,
  gross_total numeric(18,2) NOT NULL,
  discounts_total numeric(18,2) NOT NULL,
  advances_total numeric(18,2) NOT NULL,
  bank_total numeric(18,2) NOT NULL,
  cash_total numeric(18,2) NOT NULL,
  extra_cost_total numeric(18,2) NOT NULL
);
CREATE UNIQUE INDEX weekly_closes_folio_uk ON weekly_closes (folio) WHERE archived_at IS NULL;
CREATE INDEX weekly_closes_period_id_ix ON weekly_closes (period_id);
CREATE INDEX weekly_closes_parent_close_id_ix ON weekly_closes (parent_close_id);
CREATE INDEX weekly_closes_closed_by_ix ON weekly_closes (closed_by);

-- Documento incluido en cierre (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE close_documents (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  close_id uuid NOT NULL,
  estimate_id uuid NOT NULL,
  estimate_version integer NOT NULL,
  obligation_id uuid NOT NULL,
  gross numeric(18,2) NOT NULL
);
CREATE INDEX close_documents_close_id_ix ON close_documents (close_id);
CREATE INDEX close_documents_estimate_id_ix ON close_documents (estimate_id);
CREATE INDEX close_documents_obligation_id_ix ON close_documents (obligation_id);

-- Componente de liquidación
CREATE TABLE pay_components (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  obligation_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('nomina_bancaria', 'transferencia', 'cheque', 'descuento', 'anticipo_aplicado', 'costo_adicional')),
  nature text NOT NULL CHECK (nature IN ('parte_del_pago', 'descuento', 'anticipo_aplicado', 'costo_adicional_dcl')),
  amount numeric(18,2) NOT NULL,
  support text,
  attachment_id uuid,
  authorized_by uuid,
  status text NOT NULL CHECK (status IN ('propuesto', 'autorizado', 'cancelado')),
  advance_application_id uuid
);
CREATE INDEX pay_components_obligation_id_ix ON pay_components (obligation_id);
CREATE INDEX pay_components_attachment_id_ix ON pay_components (attachment_id);
CREATE INDEX pay_components_authorized_by_ix ON pay_components (authorized_by);
CREATE INDEX pay_components_advance_application_id_ix ON pay_components (advance_application_id);

-- Instrucción de pago
CREATE TABLE payment_instructions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  close_id uuid NOT NULL,
  obligation_id uuid NOT NULL,
  beneficiary_id uuid NOT NULL,
  medium text NOT NULL CHECK (medium IN ('efectivo', 'banco')),
  amount numeric(18,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pendiente', 'atendida', 'cancelada')),
  disbursement_id uuid
);
CREATE INDEX payment_instructions_close_id_ix ON payment_instructions (close_id);
CREATE INDEX payment_instructions_obligation_id_ix ON payment_instructions (obligation_id);
CREATE INDEX payment_instructions_beneficiary_id_ix ON payment_instructions (beneficiary_id);
CREATE INDEX payment_instructions_disbursement_id_ix ON payment_instructions (disbursement_id);

-- Obligación de pago
CREATE TABLE obligations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('contratista', 'proveedor', 'otro')),
  beneficiary_id uuid NOT NULL,
  payee_name text,
  source_type text NOT NULL CHECK (source_type IN ('cEstimate', 'expense', 'manual')),
  source_id text,
  work_id uuid,
  period_id uuid,
  gross_amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  due_date date,
  status text NOT NULL CHECK (status IN ('autorizada', 'cancelada'))
);
CREATE UNIQUE INDEX obligations_folio_uk ON obligations (folio) WHERE archived_at IS NULL;
CREATE INDEX obligations_beneficiary_id_ix ON obligations (beneficiary_id);
CREATE INDEX obligations_work_id_ix ON obligations (work_id);
CREATE INDEX obligations_period_id_ix ON obligations (period_id);

-- Anticipo o préstamo a contratista
CREATE TABLE contractor_advances (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  party_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('anticipo', 'prestamo')),
  date date NOT NULL,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  disbursement_id uuid,
  work_id uuid,
  authorized_by uuid NOT NULL,
  note text,
  status text NOT NULL CHECK (status IN ('vigente', 'cancelado'))
);
CREATE INDEX contractor_advances_party_id_ix ON contractor_advances (party_id);
CREATE INDEX contractor_advances_disbursement_id_ix ON contractor_advances (disbursement_id);
CREATE INDEX contractor_advances_work_id_ix ON contractor_advances (work_id);
CREATE INDEX contractor_advances_authorized_by_ix ON contractor_advances (authorized_by);

-- Aplicación de anticipo a contratista
CREATE TABLE advance_applications (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  advance_id uuid NOT NULL,
  obligation_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('aplicada', 'revertida'))
);
CREATE INDEX advance_applications_advance_id_ix ON advance_applications (advance_id);
CREATE INDEX advance_applications_obligation_id_ix ON advance_applications (obligation_id);

-- Abono de contratista
CREATE TABLE advance_repayments (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  advance_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  date date NOT NULL,
  account_id uuid,
  cash_movement_id uuid,
  note text
);
CREATE INDEX advance_repayments_advance_id_ix ON advance_repayments (advance_id);
CREATE INDEX advance_repayments_account_id_ix ON advance_repayments (account_id);
CREATE INDEX advance_repayments_cash_movement_id_ix ON advance_repayments (cash_movement_id);

-- Desembolso
CREATE TABLE disbursements (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pago', 'anticipo', 'reverso', 'reposicion_caja')),
  date date NOT NULL,
  account_id uuid NOT NULL,
  method_id uuid NOT NULL,
  beneficiary_id uuid,
  payee_name text,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  reference text,
  status text NOT NULL CHECK (status IN ('preparado', 'autorizado', 'pendiente_confirmacion', 'confirmado', 'rechazado', 'revertido')),
  authorized_by uuid,
  confirmed_at timestamptz,
  confirmed_by uuid,
  delivered_by_name text,
  receipt_attachment_id uuid,
  reverses_id uuid,
  reverse_reason text,
  duplicate_flag text NOT NULL CHECK (duplicate_flag IN ('ninguno', 'posible', 'descartado')),
  note text
);
CREATE UNIQUE INDEX disbursements_folio_uk ON disbursements (folio) WHERE archived_at IS NULL;
CREATE INDEX disbursements_account_id_ix ON disbursements (account_id);
CREATE INDEX disbursements_method_id_ix ON disbursements (method_id);
CREATE INDEX disbursements_beneficiary_id_ix ON disbursements (beneficiary_id);
CREATE INDEX disbursements_authorized_by_ix ON disbursements (authorized_by);
CREATE INDEX disbursements_confirmed_by_ix ON disbursements (confirmed_by);
CREATE INDEX disbursements_receipt_attachment_id_ix ON disbursements (receipt_attachment_id);
CREATE INDEX disbursements_reverses_id_ix ON disbursements (reverses_id);

-- Aplicación de pago
CREATE TABLE payment_applications (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  disbursement_id uuid NOT NULL,
  obligation_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('reservada', 'confirmada', 'liberada', 'revertida'))
);
CREATE INDEX payment_applications_disbursement_id_ix ON payment_applications (disbursement_id);
CREATE INDEX payment_applications_obligation_id_ix ON payment_applications (obligation_id);

-- Estimación al cliente
CREATE TABLE k_estimates (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  work_id uuid NOT NULL,
  client_id uuid NOT NULL,
  contract_id uuid,
  number integer NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('borrador', 'revision_interna', 'enviada', 'observada', 'corregida', 'aprobada', 'cancelada', 'sustituida')),
  currency text NOT NULL,
  subtotal numeric(18,2) NOT NULL,
  adjustments numeric(18,2) NOT NULL,
  tax_amount numeric(18,2),
  amortization numeric(18,2),
  retention numeric(18,2),
  total numeric(18,2),
  approved_subtotal numeric(18,2),
  calc jsonb,
  due_date date,
  published_version integer,
  approved_at timestamptz,
  doc_date_declared date,
  notes text
);
CREATE UNIQUE INDEX k_estimates_folio_uk ON k_estimates (folio) WHERE archived_at IS NULL;
CREATE INDEX k_estimates_work_id_ix ON k_estimates (work_id);
CREATE INDEX k_estimates_client_id_ix ON k_estimates (client_id);
CREATE INDEX k_estimates_contract_id_ix ON k_estimates (contract_id);

-- Partida de estimación al cliente
CREATE TABLE k_estimate_items (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  estimate_id uuid NOT NULL,
  budget_item_id uuid,
  change_order_id uuid,
  additional_id uuid,
  concept_id uuid,
  chapter text,
  location_id uuid,
  description text NOT NULL,
  unit_id uuid NOT NULL,
  contracted_qty numeric(18,4),
  prev_approved_qty numeric(18,4) NOT NULL,
  proposed_qty numeric(18,4) NOT NULL,
  accepted_qty numeric(18,4),
  price numeric(18,4) NOT NULL,
  amount numeric(18,2) NOT NULL,
  accepted_amount numeric(18,2),
  status text NOT NULL CHECK (status IN ('propuesta', 'aceptada', 'observada', 'rechazada', 'diferida')),
  difference_reason text,
  rev integer NOT NULL,
  sort_order integer
);
CREATE INDEX k_estimate_items_estimate_id_ix ON k_estimate_items (estimate_id);
CREATE INDEX k_estimate_items_budget_item_id_ix ON k_estimate_items (budget_item_id);
CREATE INDEX k_estimate_items_change_order_id_ix ON k_estimate_items (change_order_id);
CREATE INDEX k_estimate_items_additional_id_ix ON k_estimate_items (additional_id);
CREATE INDEX k_estimate_items_concept_id_ix ON k_estimate_items (concept_id);
CREATE INDEX k_estimate_items_location_id_ix ON k_estimate_items (location_id);
CREATE INDEX k_estimate_items_unit_id_ix ON k_estimate_items (unit_id);

-- Observación del cliente
CREATE TABLE client_observations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  estimate_id uuid NOT NULL,
  item_id uuid,
  estimate_version integer NOT NULL,
  text text NOT NULL,
  author_name text NOT NULL,
  author_user_id uuid,
  at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('abierta', 'atendida')),
  response text
);
CREATE INDEX client_observations_estimate_id_ix ON client_observations (estimate_id);
CREATE INDEX client_observations_item_id_ix ON client_observations (item_id);
CREATE INDEX client_observations_author_user_id_ix ON client_observations (author_user_id);

-- Factura externa registrada
CREATE TABLE invoices (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  client_id uuid NOT NULL,
  work_id uuid,
  date date NOT NULL,
  subtotal numeric(18,2),
  tax numeric(18,2),
  total numeric(18,2) NOT NULL,
  currency text NOT NULL,
  due_date date,
  attachment_id uuid,
  status text NOT NULL CHECK (status IN ('registrada', 'cancelada'))
);
CREATE INDEX invoices_client_id_ix ON invoices (client_id);
CREATE INDEX invoices_work_id_ix ON invoices (work_id);
CREATE INDEX invoices_attachment_id_ix ON invoices (attachment_id);

-- Relación factura–estimación
CREATE TABLE invoice_links (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  invoice_id uuid NOT NULL,
  k_estimate_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL
);
CREATE INDEX invoice_links_invoice_id_ix ON invoice_links (invoice_id);
CREATE INDEX invoice_links_k_estimate_id_ix ON invoice_links (k_estimate_id);

-- Cobro
CREATE TABLE receipts (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cobro', 'anticipo', 'devolucion')),
  date date NOT NULL,
  account_id uuid NOT NULL,
  method_id uuid,
  reference text,
  client_id uuid NOT NULL,
  work_id uuid,
  gross_amount numeric(18,2) NOT NULL,
  commission numeric(18,2),
  net_amount numeric(18,2) NOT NULL,
  commission_nature text,
  commission_validated boolean,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('confirmado', 'revertido')),
  note text
);
CREATE UNIQUE INDEX receipts_folio_uk ON receipts (folio) WHERE archived_at IS NULL;
CREATE INDEX receipts_account_id_ix ON receipts (account_id);
CREATE INDEX receipts_method_id_ix ON receipts (method_id);
CREATE INDEX receipts_client_id_ix ON receipts (client_id);
CREATE INDEX receipts_work_id_ix ON receipts (work_id);

-- Aplicación de cobro
CREATE TABLE receipt_applications (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  receipt_id uuid NOT NULL,
  k_estimate_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('aplicada', 'revertida'))
);
CREATE INDEX receipt_applications_receipt_id_ix ON receipt_applications (receipt_id);
CREATE INDEX receipt_applications_k_estimate_id_ix ON receipt_applications (k_estimate_id);

-- Anticipo de cliente
CREATE TABLE client_advances (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  client_id uuid NOT NULL,
  contract_id uuid,
  receipt_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('vigente', 'devuelto'))
);
CREATE INDEX client_advances_work_id_ix ON client_advances (work_id);
CREATE INDEX client_advances_client_id_ix ON client_advances (client_id);
CREATE INDEX client_advances_contract_id_ix ON client_advances (contract_id);
CREATE INDEX client_advances_receipt_id_ix ON client_advances (receipt_id);

-- Amortización de anticipo de cliente
CREATE TABLE client_advance_applications (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  advance_id uuid NOT NULL,
  k_estimate_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('aplicada', 'revertida'))
);
CREATE INDEX client_advance_applications_advance_id_ix ON client_advance_applications (advance_id);
CREATE INDEX client_advance_applications_k_estimate_id_ix ON client_advance_applications (k_estimate_id);

-- Retención de garantía
CREATE TABLE retentions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  k_estimate_id uuid NOT NULL,
  work_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('retenida', 'liberada'))
);
CREATE INDEX retentions_k_estimate_id_ix ON retentions (k_estimate_id);
CREATE INDEX retentions_work_id_ix ON retentions (work_id);

-- Liberación de retención
CREATE TABLE retention_releases (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  retention_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  date date NOT NULL,
  note text
);
CREATE INDEX retention_releases_retention_id_ix ON retention_releases (retention_id);

-- Ajuste de cuenta por cobrar
CREATE TABLE ar_adjustments (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  k_estimate_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('centavos', 'nota_ajuste', 'incobrable', 'recuperacion')),
  amount numeric(18,2) NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('propuesto', 'autorizado', 'rechazado')),
  proposed_by uuid,
  authorized_by uuid,
  related_adjustment_id uuid,
  receipt_id uuid
);
CREATE INDEX ar_adjustments_k_estimate_id_ix ON ar_adjustments (k_estimate_id);
CREATE INDEX ar_adjustments_proposed_by_ix ON ar_adjustments (proposed_by);
CREATE INDEX ar_adjustments_authorized_by_ix ON ar_adjustments (authorized_by);
CREATE INDEX ar_adjustments_related_adjustment_id_ix ON ar_adjustments (related_adjustment_id);
CREATE INDEX ar_adjustments_receipt_id_ix ON ar_adjustments (receipt_id);

-- Gestión de cobranza
CREATE TABLE collection_actions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  k_estimate_id uuid NOT NULL,
  responsible_id uuid,
  kind text NOT NULL CHECK (kind IN ('seguimiento', 'compromiso_pago', 'disputa')),
  date date NOT NULL,
  follow_up_date date,
  promise_date date,
  promise_amount numeric(18,2),
  note text,
  status text NOT NULL CHECK (status IN ('abierta', 'cumplida', 'incumplida', 'cerrada'))
);
CREATE INDEX collection_actions_k_estimate_id_ix ON collection_actions (k_estimate_id);
CREATE INDEX collection_actions_responsible_id_ix ON collection_actions (responsible_id);

-- Gasto / documento de proveedor
CREATE TABLE expenses (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  folio text NOT NULL,
  supplier_id uuid,
  doc_date date NOT NULL,
  received_date date,
  economic_period char(7),
  description text NOT NULL,
  category_id uuid,
  voucher_type_id uuid,
  currency text NOT NULL,
  subtotal numeric(18,2),
  tax numeric(18,2),
  total numeric(18,2) NOT NULL,
  reference text,
  attachment_id uuid,
  status text NOT NULL CHECK (status IN ('borrador', 'pendiente_informacion', 'revisado', 'autorizado', 'cancelado', 'con_ajuste')),
  quality text NOT NULL CHECK (quality IN ('completo', 'sin_desglose', 'pendiente')),
  negative_nature text CHECK (negative_nature IN ('devolucion', 'reclasificacion', 'reverso', 'traslado')),
  treatment text NOT NULL CHECK (treatment IN ('gasto', 'activo_pendiente', 'no_resultado')),
  duplicate_flag text NOT NULL CHECK (duplicate_flag IN ('ninguno', 'posible', 'descartado')),
  obligation_id uuid,
  petty_fund_id uuid,
  authorized_by uuid,
  additional_id uuid
);
CREATE UNIQUE INDEX expenses_folio_uk ON expenses (folio) WHERE archived_at IS NULL;
CREATE INDEX expenses_supplier_id_ix ON expenses (supplier_id);
CREATE INDEX expenses_category_id_ix ON expenses (category_id);
CREATE INDEX expenses_voucher_type_id_ix ON expenses (voucher_type_id);
CREATE INDEX expenses_attachment_id_ix ON expenses (attachment_id);
CREATE INDEX expenses_obligation_id_ix ON expenses (obligation_id);
CREATE INDEX expenses_petty_fund_id_ix ON expenses (petty_fund_id);
CREATE INDEX expenses_authorized_by_ix ON expenses (authorized_by);
CREATE INDEX expenses_additional_id_ix ON expenses (additional_id);

-- Asignación de costo
CREATE TABLE expense_allocations (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  expense_id uuid NOT NULL,
  target text NOT NULL CHECK (target IN ('obra', 'administracion', 'stock')),
  work_id uuid,
  method text NOT NULL CHECK (method IN ('porcentaje', 'importe', 'base')),
  pct numeric(9,4),
  amount numeric(18,2) NOT NULL,
  basis_note text,
  allocation_run_id uuid,
  rounding_adjust numeric(18,2)
);
CREATE INDEX expense_allocations_expense_id_ix ON expense_allocations (expense_id);
CREATE INDEX expense_allocations_work_id_ix ON expense_allocations (work_id);
CREATE INDEX expense_allocations_allocation_run_id_ix ON expense_allocations (allocation_run_id);

-- Fondo de caja chica
CREATE TABLE petty_funds (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  responsible_id uuid NOT NULL,
  authorized_amount numeric(18,2) NOT NULL,
  account_id uuid NOT NULL,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX petty_funds_code_uk ON petty_funds (code) WHERE archived_at IS NULL;
CREATE INDEX petty_funds_responsible_id_ix ON petty_funds (responsible_id);
CREATE INDEX petty_funds_account_id_ix ON petty_funds (account_id);

-- Movimiento de caja chica (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE petty_movements (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  fund_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('entrega', 'comprobacion', 'rechazo', 'devolucion', 'reposicion')),
  date date NOT NULL,
  amount numeric(18,2) NOT NULL,
  expense_id uuid,
  cash_movement_id uuid,
  note text
);
CREATE INDEX petty_movements_fund_id_ix ON petty_movements (fund_id);
CREATE INDEX petty_movements_expense_id_ix ON petty_movements (expense_id);
CREATE INDEX petty_movements_cash_movement_id_ix ON petty_movements (cash_movement_id);

-- Insumo
CREATE TABLE supplies (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  unit_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('activo', 'inactivo'))
);
CREATE UNIQUE INDEX supplies_code_uk ON supplies (code) WHERE archived_at IS NULL;
CREATE INDEX supplies_unit_id_ix ON supplies (unit_id);

-- Conversión de unidad de insumo
CREATE TABLE unit_conversions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  supply_id uuid NOT NULL,
  from_unit_id uuid NOT NULL,
  to_unit_id uuid NOT NULL,
  factor numeric(18,4) NOT NULL,
  note text NOT NULL,
  approved_by uuid NOT NULL
);
CREATE INDEX unit_conversions_supply_id_ix ON unit_conversions (supply_id);
CREATE INDEX unit_conversions_from_unit_id_ix ON unit_conversions (from_unit_id);
CREATE INDEX unit_conversions_to_unit_id_ix ON unit_conversions (to_unit_id);
CREATE INDEX unit_conversions_approved_by_ix ON unit_conversions (approved_by);

-- Solicitud de insumo
CREATE TABLE supply_requests (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  work_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  supply_id uuid NOT NULL,
  qty numeric(18,4) NOT NULL,
  reason text,
  needed_date date,
  status text NOT NULL CHECK (status IN ('solicitada', 'aprobada', 'rechazada', 'surtida')),
  approved_by uuid
);
CREATE INDEX supply_requests_work_id_ix ON supply_requests (work_id);
CREATE INDEX supply_requests_requester_id_ix ON supply_requests (requester_id);
CREATE INDEX supply_requests_supply_id_ix ON supply_requests (supply_id);
CREATE INDEX supply_requests_approved_by_ix ON supply_requests (approved_by);

-- Movimiento de insumo (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE supply_movements (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  supply_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('inventario_inicial', 'recepcion', 'entrega_obra', 'consumo', 'devolucion', 'ajuste')),
  date date NOT NULL,
  qty numeric(18,4) NOT NULL,
  unit_id uuid NOT NULL,
  work_id uuid,
  expense_id uuid,
  request_id uuid,
  note text
);
CREATE INDEX supply_movements_supply_id_ix ON supply_movements (supply_id);
CREATE INDEX supply_movements_unit_id_ix ON supply_movements (unit_id);
CREATE INDEX supply_movements_work_id_ix ON supply_movements (work_id);
CREATE INDEX supply_movements_expense_id_ix ON supply_movements (expense_id);
CREATE INDEX supply_movements_request_id_ix ON supply_movements (request_id);

-- Regla de prorrateo
CREATE TABLE allocation_rules (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('costo_social', 'supervision', 'taller', 'otro')),
  basis text NOT NULL CHECK (basis IN ('mano_obra_autorizada', 'porcentaje_fijo', 'manual')),
  params jsonb,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('borrador', 'aprobada', 'inactiva')),
  approved_by uuid
);
CREATE INDEX allocation_rules_approved_by_ix ON allocation_rules (approved_by);

-- Ejecución de prorrateo (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE allocation_runs (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  rule_id uuid NOT NULL,
  rule_version integer NOT NULL,
  period char(7) NOT NULL,
  expense_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  admin_portion numeric(18,2),
  basis jsonb NOT NULL,
  result jsonb NOT NULL,
  rounding_diff numeric(18,2) NOT NULL,
  run_by uuid
);
CREATE INDEX allocation_runs_rule_id_ix ON allocation_runs (rule_id);
CREATE INDEX allocation_runs_expense_id_ix ON allocation_runs (expense_id);
CREATE INDEX allocation_runs_run_by_ix ON allocation_runs (run_by);

-- Movimiento de caja o banco (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE cash_movements (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  account_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('cobro', 'pago', 'transferencia_salida', 'transferencia_entrada', 'prestamo_recibido', 'pago_principal', 'aportacion', 'retiro_socios', 'inversion', 'ajuste', 'comision', 'devolucion')),
  flow_class text NOT NULL CHECK (flow_class IN ('operacion', 'inversion', 'financiamiento', 'transferencia', 'ajuste')),
  op_date date NOT NULL,
  confirm_date date,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  counterparty_id uuid,
  counterparty_name text,
  reference text,
  source_type text,
  source_id text,
  transfer_id uuid,
  reverses_id uuid,
  note text,
  adjustment_category text,
  authorized_by uuid
);
CREATE INDEX cash_movements_account_id_ix ON cash_movements (account_id);
CREATE INDEX cash_movements_counterparty_id_ix ON cash_movements (counterparty_id);
CREATE INDEX cash_movements_transfer_id_ix ON cash_movements (transfer_id);
CREATE INDEX cash_movements_reverses_id_ix ON cash_movements (reverses_id);
CREATE INDEX cash_movements_authorized_by_ix ON cash_movements (authorized_by);

-- Transferencia entre cuentas propias (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE transfers (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  from_account_id uuid NOT NULL,
  to_account_id uuid NOT NULL,
  date date NOT NULL,
  amount numeric(18,2) NOT NULL,
  reference text,
  note text
);
CREATE INDEX transfers_from_account_id_ix ON transfers (from_account_id);
CREATE INDEX transfers_to_account_id_ix ON transfers (to_account_id);

-- Lote de conciliación
CREATE TABLE recon_batches (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  account_id uuid NOT NULL,
  file_name text NOT NULL,
  sha256 text NOT NULL,
  imported_at timestamptz NOT NULL,
  cutoff_date date,
  status text NOT NULL CHECK (status IN ('abierto', 'cerrado')),
  row_count integer NOT NULL
);
CREATE INDEX recon_batches_account_id_ix ON recon_batches (account_id);

-- Renglón de estado de cuenta
CREATE TABLE bank_lines (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  batch_id uuid NOT NULL,
  account_id uuid NOT NULL,
  line_no integer NOT NULL,
  date date NOT NULL,
  reference text,
  description text,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('sin_conciliar', 'conciliada', 'diferencia')),
  duplicate_flag text NOT NULL CHECK (duplicate_flag IN ('ninguno', 'posible'))
);
CREATE INDEX bank_lines_batch_id_ix ON bank_lines (batch_id);
CREATE INDEX bank_lines_account_id_ix ON bank_lines (account_id);

-- Vínculo conciliado
CREATE TABLE recon_links (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  bank_line_id uuid NOT NULL,
  cash_movement_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('sugerido', 'aceptado', 'rechazado')),
  basis text,
  decided_by uuid
);
CREATE INDEX recon_links_bank_line_id_ix ON recon_links (bank_line_id);
CREATE INDEX recon_links_cash_movement_id_ix ON recon_links (cash_movement_id);
CREATE INDEX recon_links_decided_by_ix ON recon_links (decided_by);

-- Periodo económico
CREATE TABLE economic_periods (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  code char(7) NOT NULL,
  status text NOT NULL CHECK (status IN ('abierto', 'en_revision', 'cerrado')),
  checklist jsonb,
  closed_by uuid,
  closed_at timestamptz,
  note text
);
CREATE UNIQUE INDEX economic_periods_code_uk ON economic_periods (code) WHERE archived_at IS NULL;
CREATE INDEX economic_periods_closed_by_ix ON economic_periods (closed_by);

-- Lote de importación
CREATE TABLE import_batches (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  profile text NOT NULL,
  file_name text NOT NULL,
  sha256 text NOT NULL,
  attachment_id uuid,
  uploaded_by uuid,
  status text NOT NULL CHECK (status IN ('cargado', 'simulado', 'confirmado', 'revertido')),
  strategy text,
  summary jsonb,
  mapping jsonb,
  confirmed_at timestamptz,
  reverted_at timestamptz
);
CREATE INDEX import_batches_attachment_id_ix ON import_batches (attachment_id);
CREATE INDEX import_batches_uploaded_by_ix ON import_batches (uploaded_by);

-- Registro de origen
CREATE TABLE source_records (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  batch_id uuid NOT NULL,
  sheet text,
  row integer,
  cell text,
  kind text NOT NULL,
  natural_key text NOT NULL,
  data jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('nuevo', 'coincidencia', 'cambio', 'rechazado', 'importado', 'excluido')),
  target_type text,
  target_id text,
  note text
);
CREATE INDEX source_records_batch_id_ix ON source_records (batch_id);

-- Coincidencia propuesta
CREATE TABLE match_proposals (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  batch_id uuid,
  a_type text NOT NULL,
  a_id text NOT NULL,
  b_type text NOT NULL,
  b_id text NOT NULL,
  basis text NOT NULL,
  amount numeric(18,2),
  status text NOT NULL CHECK (status IN ('pendiente', 'aceptada', 'rechazada')),
  decided_by uuid,
  note text
);
CREATE INDEX match_proposals_batch_id_ix ON match_proposals (batch_id);
CREATE INDEX match_proposals_decided_by_ix ON match_proposals (decided_by);

-- Incidencia de calidad de datos
CREATE TABLE quality_issues (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  batch_id uuid,
  source_record_id text,
  file_name text,
  sheet text,
  cell text,
  kind text NOT NULL CHECK (kind IN ('error_formula', 'fecha_ambigua', 'fecha_conflicto', 'unidad', 'categoria', 'nombre', 'tarifa', 'cantidad', 'saldo', 'subtotal', 'diferencia_medicion', 'diferencia_importe', 'hoja_oculta', 'otro')),
  detail text NOT NULL,
  responsible_id uuid,
  status text NOT NULL CHECK (status IN ('abierta', 'resuelta', 'descartada')),
  resolution text,
  dedupe_key text
);
CREATE INDEX quality_issues_batch_id_ix ON quality_issues (batch_id);
CREATE INDEX quality_issues_responsible_id_ix ON quality_issues (responsible_id);

-- Evento de auditoría (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  at timestamptz NOT NULL,
  actor_id text,
  actor_name text NOT NULL,
  on_behalf_of text,
  action text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('alta', 'cambio', 'baja', 'evento')),
  collection text,
  object_id text,
  object_version integer,
  reason text,
  diff jsonb,
  tx_id text NOT NULL,
  seq integer NOT NULL,
  prev_hash text NOT NULL,
  hash text NOT NULL
);

-- Operación idempotente (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE idempotent_ops (
  id uuid PRIMARY KEY,
  key text NOT NULL,
  actor_id text,
  action text NOT NULL,
  result jsonb,
  at timestamptz NOT NULL
);

-- Manifiesto de respaldo (histórico inmutable: sin UPDATE ni DELETE)
CREATE TABLE backup_manifests (
  id uuid PRIMARY KEY,
  organization_id uuid,
  record_version integer NOT NULL,
  schema_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  updated_at timestamptz NOT NULL,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  source_reference text,
  stamp text NOT NULL,
  generation integer NOT NULL,
  files integer NOT NULL,
  blobs integer NOT NULL,
  bytes integer NOT NULL,
  checksum text NOT NULL,
  created_by_name text,
  note text
);

-- Claves foráneas (se crean al final para permitir la carga de maestros y relaciones en orden)
ALTER TABLE organizations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE users ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE users ADD FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE roles ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE role_permissions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE role_permissions ADD FOREIGN KEY (role_id) REFERENCES roles(id);
ALTER TABLE role_assignments ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE role_assignments ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE role_assignments ADD FOREIGN KEY (role_id) REFERENCES roles(id);
ALTER TABLE role_assignments ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE delegations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE delegations ADD FOREIGN KEY (from_user_id) REFERENCES users(id);
ALTER TABLE delegations ADD FOREIGN KEY (to_user_id) REFERENCES users(id);
ALTER TABLE delegations ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE authorization_limits ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE authorization_limits ADD FOREIGN KEY (role_id) REFERENCES roles(id);
ALTER TABLE authorization_limits ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE settings ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE pending_decisions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE notifications ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE notifications ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE notifications ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE approval_requests ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE approval_requests ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE approval_requests ADD FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE approval_requests ADD FOREIGN KEY (resolved_by) REFERENCES users(id);
ALTER TABLE approvals ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE approvals ADD FOREIGN KEY (actor_id) REFERENCES users(id);
ALTER TABLE approvals ADD FOREIGN KEY (on_behalf_of_user_id) REFERENCES users(id);
ALTER TABLE approvals ADD FOREIGN KEY (evidence_attachment_id) REFERENCES attachments(id);
ALTER TABLE document_versions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE activity_logs ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE activity_logs ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE activity_logs ADD FOREIGN KEY (period_id) REFERENCES week_periods(id);
ALTER TABLE parties ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE party_aliases ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE party_aliases ADD FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE contacts ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE contacts ADD FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE party_bank_accounts ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE party_bank_accounts ADD FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE workers ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE workers ADD FOREIGN KEY (contractor_id) REFERENCES parties(id);
ALTER TABLE crews ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE crews ADD FOREIGN KEY (contractor_id) REFERENCES parties(id);
ALTER TABLE crew_memberships ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE crew_memberships ADD FOREIGN KEY (crew_id) REFERENCES crews(id);
ALTER TABLE crew_memberships ADD FOREIGN KEY (worker_id) REFERENCES workers(id);
ALTER TABLE personnel_notices ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE personnel_notices ADD FOREIGN KEY (worker_id) REFERENCES workers(id);
ALTER TABLE personnel_notices ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE units ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE cost_categories ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE cost_categories ADD FOREIGN KEY (parent_id) REFERENCES cost_categories(id);
ALTER TABLE concepts ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE concepts ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE concept_aliases ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE concept_aliases ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE concept_links ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE concept_links ADD FOREIGN KEY (contract_concept_id) REFERENCES concepts(id);
ALTER TABLE concept_links ADD FOREIGN KEY (commercial_concept_id) REFERENCES concepts(id);
ALTER TABLE rates ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE rates ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE rates ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE rates ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE rates ADD FOREIGN KEY (contractor_id) REFERENCES parties(id);
ALTER TABLE rates ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE detail_levels ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE adjustment_reasons ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE voucher_types ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE payment_methods ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE accounts ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE works ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE works ADD FOREIGN KEY (client_id) REFERENCES parties(id);
ALTER TABLE works ADD FOREIGN KEY (representative_contact_id) REFERENCES contacts(id);
ALTER TABLE locations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE locations ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE locations ADD FOREIGN KEY (parent_id) REFERENCES locations(id);
ALTER TABLE work_assignments ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE work_assignments ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE work_assignments ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE work_assignments ADD FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE work_assignments ADD FOREIGN KEY (crew_id) REFERENCES crews(id);
ALTER TABLE work_closures ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE work_closures ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE work_closures ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE contracts ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE contracts ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE contracts ADD FOREIGN KEY (client_id) REFERENCES parties(id);
ALTER TABLE contracts ADD FOREIGN KEY (agreement_attachment_id) REFERENCES attachments(id);
ALTER TABLE budgets ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE budgets ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE budget_versions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE budget_versions ADD FOREIGN KEY (budget_id) REFERENCES budgets(id);
ALTER TABLE budget_versions ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE budget_versions ADD FOREIGN KEY (acceptance_evidence_id) REFERENCES attachments(id);
ALTER TABLE budget_items ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE budget_items ADD FOREIGN KEY (budget_version_id) REFERENCES budget_versions(id);
ALTER TABLE budget_items ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE budget_items ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE budget_items ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE budget_items ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE budget_items ADD FOREIGN KEY (replaced_by_id) REFERENCES budget_items(id);
ALTER TABLE change_orders ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE change_orders ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE change_orders ADD FOREIGN KEY (budget_id) REFERENCES budgets(id);
ALTER TABLE change_orders ADD FOREIGN KEY (proposer_id) REFERENCES users(id);
ALTER TABLE change_orders ADD FOREIGN KEY (approval_evidence_id) REFERENCES attachments(id);
ALTER TABLE change_orders ADD FOREIGN KEY (internal_approved_by) REFERENCES users(id);
ALTER TABLE change_order_items ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE change_order_items ADD FOREIGN KEY (change_order_id) REFERENCES change_orders(id);
ALTER TABLE change_order_items ADD FOREIGN KEY (budget_item_id) REFERENCES budget_items(id);
ALTER TABLE change_order_items ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE change_order_items ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE change_order_items ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE week_periods ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE captures ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE captures ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE captures ADD FOREIGN KEY (supervisor_id) REFERENCES users(id);
ALTER TABLE captures ADD FOREIGN KEY (period_id) REFERENCES week_periods(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (capture_id) REFERENCES captures(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (contractor_id) REFERENCES parties(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (crew_id) REFERENCES crews(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (period_id) REFERENCES week_periods(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (budget_item_id) REFERENCES budget_items(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (additional_id) REFERENCES additionals(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (author_id) REFERENCES users(id);
ALTER TABLE progress_entries ADD FOREIGN KEY (validated_by) REFERENCES users(id);
ALTER TABLE generator_lines ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE generator_lines ADD FOREIGN KEY (entry_id) REFERENCES progress_entries(id);
ALTER TABLE progress_adjustments ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE progress_adjustments ADD FOREIGN KEY (entry_id) REFERENCES progress_entries(id);
ALTER TABLE progress_adjustments ADD FOREIGN KEY (reason_id) REFERENCES adjustment_reasons(id);
ALTER TABLE progress_adjustments ADD FOREIGN KEY (proposed_by) REFERENCES users(id);
ALTER TABLE progress_adjustments ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE progress_adjustments ADD FOREIGN KEY (observation_id) REFERENCES observations(id);
ALTER TABLE attachments ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE attachments ADD FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE attachments ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE evidence_links ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE evidence_links ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE evidence_links ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE evidence_links ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE plans ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE plans ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE plan_versions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE plan_versions ADD FOREIGN KEY (plan_id) REFERENCES plans(id);
ALTER TABLE plan_versions ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE plan_annotations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE plan_annotations ADD FOREIGN KEY (plan_version_id) REFERENCES plan_versions(id);
ALTER TABLE plan_annotations ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE annotation_links ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE annotation_links ADD FOREIGN KEY (annotation_id) REFERENCES plan_annotations(id);
ALTER TABLE issued_documents ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE issued_documents ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE issued_documents ADD FOREIGN KEY (issued_by) REFERENCES users(id);
ALTER TABLE issued_documents ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE issued_documents ADD FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE share_links ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE share_links ADD FOREIGN KEY (issued_document_id) REFERENCES issued_documents(id);
ALTER TABLE share_links ADD FOREIGN KEY (created_by_user) REFERENCES users(id);
ALTER TABLE additionals ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE additionals ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE additionals ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE additionals ADD FOREIGN KEY (reported_by) REFERENCES users(id);
ALTER TABLE additionals ADD FOREIGN KEY (executor_id) REFERENCES parties(id);
ALTER TABLE additionals ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE additionals ADD FOREIGN KEY (related_entry_id) REFERENCES progress_entries(id);
ALTER TABLE additionals ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE additionals ADD FOREIGN KEY (detail_level_id) REFERENCES detail_levels(id);
ALTER TABLE additionals ADD FOREIGN KEY (op_by) REFERENCES users(id);
ALTER TABLE additionals ADD FOREIGN KEY (cost_by) REFERENCES users(id);
ALTER TABLE additionals ADD FOREIGN KEY (sale_by) REFERENCES users(id);
ALTER TABLE additionals ADD FOREIGN KEY (client_approval_evidence_id) REFERENCES attachments(id);
ALTER TABLE incidents ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE incidents ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE incidents ADD FOREIGN KEY (additional_id) REFERENCES additionals(id);
ALTER TABLE incidents ADD FOREIGN KEY (responsible_id) REFERENCES users(id);
ALTER TABLE incidents ADD FOREIGN KEY (close_evidence_id) REFERENCES attachments(id);
ALTER TABLE incident_comments ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE incident_comments ADD FOREIGN KEY (incident_id) REFERENCES incidents(id);
ALTER TABLE incident_comments ADD FOREIGN KEY (author_id) REFERENCES users(id);
ALTER TABLE workdays ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE workdays ADD FOREIGN KEY (worker_id) REFERENCES workers(id);
ALTER TABLE workdays ADD FOREIGN KEY (crew_id) REFERENCES crews(id);
ALTER TABLE workdays ADD FOREIGN KEY (contractor_id) REFERENCES parties(id);
ALTER TABLE workdays ADD FOREIGN KEY (period_id) REFERENCES week_periods(id);
ALTER TABLE workdays ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE workday_allocations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE workday_allocations ADD FOREIGN KEY (workday_id) REFERENCES workdays(id);
ALTER TABLE workday_allocations ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE c_estimates ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE c_estimates ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE c_estimates ADD FOREIGN KEY (contractor_id) REFERENCES parties(id);
ALTER TABLE c_estimates ADD FOREIGN KEY (period_id) REFERENCES week_periods(id);
ALTER TABLE c_estimates ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE c_estimates ADD FOREIGN KEY (close_id) REFERENCES weekly_closes(id);
ALTER TABLE c_estimate_items ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE c_estimate_items ADD FOREIGN KEY (estimate_id) REFERENCES c_estimates(id);
ALTER TABLE c_estimate_items ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE c_estimate_items ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE c_estimate_items ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE c_estimate_items ADD FOREIGN KEY (additional_id) REFERENCES additionals(id);
ALTER TABLE c_estimate_items ADD FOREIGN KEY (workday_id) REFERENCES workdays(id);
ALTER TABLE execution_allocations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE execution_allocations ADD FOREIGN KEY (progress_entry_id) REFERENCES progress_entries(id);
ALTER TABLE execution_allocations ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE observations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE observations ADD FOREIGN KEY (estimate_id) REFERENCES c_estimates(id);
ALTER TABLE observations ADD FOREIGN KEY (item_id) REFERENCES c_estimate_items(id);
ALTER TABLE observations ADD FOREIGN KEY (allocation_id) REFERENCES execution_allocations(id);
ALTER TABLE observations ADD FOREIGN KEY (author_id) REFERENCES users(id);
ALTER TABLE observations ADD FOREIGN KEY (evidence_attachment_id) REFERENCES attachments(id);
ALTER TABLE observations ADD FOREIGN KEY (resolved_by) REFERENCES users(id);
ALTER TABLE weekly_closes ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE weekly_closes ADD FOREIGN KEY (period_id) REFERENCES week_periods(id);
ALTER TABLE weekly_closes ADD FOREIGN KEY (parent_close_id) REFERENCES weekly_closes(id);
ALTER TABLE weekly_closes ADD FOREIGN KEY (closed_by) REFERENCES users(id);
ALTER TABLE close_documents ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE close_documents ADD FOREIGN KEY (close_id) REFERENCES weekly_closes(id);
ALTER TABLE close_documents ADD FOREIGN KEY (estimate_id) REFERENCES c_estimates(id);
ALTER TABLE close_documents ADD FOREIGN KEY (obligation_id) REFERENCES obligations(id);
ALTER TABLE pay_components ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE pay_components ADD FOREIGN KEY (obligation_id) REFERENCES obligations(id);
ALTER TABLE pay_components ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE pay_components ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE pay_components ADD FOREIGN KEY (advance_application_id) REFERENCES advance_applications(id);
ALTER TABLE payment_instructions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE payment_instructions ADD FOREIGN KEY (close_id) REFERENCES weekly_closes(id);
ALTER TABLE payment_instructions ADD FOREIGN KEY (obligation_id) REFERENCES obligations(id);
ALTER TABLE payment_instructions ADD FOREIGN KEY (beneficiary_id) REFERENCES parties(id);
ALTER TABLE payment_instructions ADD FOREIGN KEY (disbursement_id) REFERENCES disbursements(id);
ALTER TABLE obligations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE obligations ADD FOREIGN KEY (beneficiary_id) REFERENCES parties(id);
ALTER TABLE obligations ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE obligations ADD FOREIGN KEY (period_id) REFERENCES week_periods(id);
ALTER TABLE contractor_advances ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE contractor_advances ADD FOREIGN KEY (party_id) REFERENCES parties(id);
ALTER TABLE contractor_advances ADD FOREIGN KEY (disbursement_id) REFERENCES disbursements(id);
ALTER TABLE contractor_advances ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE contractor_advances ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE advance_applications ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE advance_applications ADD FOREIGN KEY (advance_id) REFERENCES contractor_advances(id);
ALTER TABLE advance_applications ADD FOREIGN KEY (obligation_id) REFERENCES obligations(id);
ALTER TABLE advance_repayments ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE advance_repayments ADD FOREIGN KEY (advance_id) REFERENCES contractor_advances(id);
ALTER TABLE advance_repayments ADD FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE advance_repayments ADD FOREIGN KEY (cash_movement_id) REFERENCES cash_movements(id);
ALTER TABLE disbursements ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE disbursements ADD FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE disbursements ADD FOREIGN KEY (method_id) REFERENCES payment_methods(id);
ALTER TABLE disbursements ADD FOREIGN KEY (beneficiary_id) REFERENCES parties(id);
ALTER TABLE disbursements ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE disbursements ADD FOREIGN KEY (confirmed_by) REFERENCES users(id);
ALTER TABLE disbursements ADD FOREIGN KEY (receipt_attachment_id) REFERENCES attachments(id);
ALTER TABLE disbursements ADD FOREIGN KEY (reverses_id) REFERENCES disbursements(id);
ALTER TABLE payment_applications ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE payment_applications ADD FOREIGN KEY (disbursement_id) REFERENCES disbursements(id);
ALTER TABLE payment_applications ADD FOREIGN KEY (obligation_id) REFERENCES obligations(id);
ALTER TABLE k_estimates ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE k_estimates ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE k_estimates ADD FOREIGN KEY (client_id) REFERENCES parties(id);
ALTER TABLE k_estimates ADD FOREIGN KEY (contract_id) REFERENCES contracts(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (estimate_id) REFERENCES k_estimates(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (budget_item_id) REFERENCES budget_items(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (change_order_id) REFERENCES change_orders(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (additional_id) REFERENCES additionals(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (concept_id) REFERENCES concepts(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE k_estimate_items ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE client_observations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE client_observations ADD FOREIGN KEY (estimate_id) REFERENCES k_estimates(id);
ALTER TABLE client_observations ADD FOREIGN KEY (item_id) REFERENCES k_estimate_items(id);
ALTER TABLE client_observations ADD FOREIGN KEY (author_user_id) REFERENCES users(id);
ALTER TABLE invoices ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE invoices ADD FOREIGN KEY (client_id) REFERENCES parties(id);
ALTER TABLE invoices ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE invoices ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE invoice_links ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE invoice_links ADD FOREIGN KEY (invoice_id) REFERENCES invoices(id);
ALTER TABLE invoice_links ADD FOREIGN KEY (k_estimate_id) REFERENCES k_estimates(id);
ALTER TABLE receipts ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE receipts ADD FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE receipts ADD FOREIGN KEY (method_id) REFERENCES payment_methods(id);
ALTER TABLE receipts ADD FOREIGN KEY (client_id) REFERENCES parties(id);
ALTER TABLE receipts ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE receipt_applications ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE receipt_applications ADD FOREIGN KEY (receipt_id) REFERENCES receipts(id);
ALTER TABLE receipt_applications ADD FOREIGN KEY (k_estimate_id) REFERENCES k_estimates(id);
ALTER TABLE client_advances ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE client_advances ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE client_advances ADD FOREIGN KEY (client_id) REFERENCES parties(id);
ALTER TABLE client_advances ADD FOREIGN KEY (contract_id) REFERENCES contracts(id);
ALTER TABLE client_advances ADD FOREIGN KEY (receipt_id) REFERENCES receipts(id);
ALTER TABLE client_advance_applications ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE client_advance_applications ADD FOREIGN KEY (advance_id) REFERENCES client_advances(id);
ALTER TABLE client_advance_applications ADD FOREIGN KEY (k_estimate_id) REFERENCES k_estimates(id);
ALTER TABLE retentions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE retentions ADD FOREIGN KEY (k_estimate_id) REFERENCES k_estimates(id);
ALTER TABLE retentions ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE retention_releases ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE retention_releases ADD FOREIGN KEY (retention_id) REFERENCES retentions(id);
ALTER TABLE ar_adjustments ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE ar_adjustments ADD FOREIGN KEY (k_estimate_id) REFERENCES k_estimates(id);
ALTER TABLE ar_adjustments ADD FOREIGN KEY (proposed_by) REFERENCES users(id);
ALTER TABLE ar_adjustments ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE ar_adjustments ADD FOREIGN KEY (related_adjustment_id) REFERENCES ar_adjustments(id);
ALTER TABLE ar_adjustments ADD FOREIGN KEY (receipt_id) REFERENCES receipts(id);
ALTER TABLE collection_actions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE collection_actions ADD FOREIGN KEY (k_estimate_id) REFERENCES k_estimates(id);
ALTER TABLE collection_actions ADD FOREIGN KEY (responsible_id) REFERENCES users(id);
ALTER TABLE expenses ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE expenses ADD FOREIGN KEY (supplier_id) REFERENCES parties(id);
ALTER TABLE expenses ADD FOREIGN KEY (category_id) REFERENCES cost_categories(id);
ALTER TABLE expenses ADD FOREIGN KEY (voucher_type_id) REFERENCES voucher_types(id);
ALTER TABLE expenses ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE expenses ADD FOREIGN KEY (obligation_id) REFERENCES obligations(id);
ALTER TABLE expenses ADD FOREIGN KEY (petty_fund_id) REFERENCES petty_funds(id);
ALTER TABLE expenses ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE expenses ADD FOREIGN KEY (additional_id) REFERENCES additionals(id);
ALTER TABLE expense_allocations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE expense_allocations ADD FOREIGN KEY (expense_id) REFERENCES expenses(id);
ALTER TABLE expense_allocations ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE expense_allocations ADD FOREIGN KEY (allocation_run_id) REFERENCES allocation_runs(id);
ALTER TABLE petty_funds ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE petty_funds ADD FOREIGN KEY (responsible_id) REFERENCES users(id);
ALTER TABLE petty_funds ADD FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE petty_movements ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE petty_movements ADD FOREIGN KEY (fund_id) REFERENCES petty_funds(id);
ALTER TABLE petty_movements ADD FOREIGN KEY (expense_id) REFERENCES expenses(id);
ALTER TABLE petty_movements ADD FOREIGN KEY (cash_movement_id) REFERENCES cash_movements(id);
ALTER TABLE supplies ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE supplies ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE unit_conversions ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE unit_conversions ADD FOREIGN KEY (supply_id) REFERENCES supplies(id);
ALTER TABLE unit_conversions ADD FOREIGN KEY (from_unit_id) REFERENCES units(id);
ALTER TABLE unit_conversions ADD FOREIGN KEY (to_unit_id) REFERENCES units(id);
ALTER TABLE unit_conversions ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE supply_requests ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE supply_requests ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE supply_requests ADD FOREIGN KEY (requester_id) REFERENCES users(id);
ALTER TABLE supply_requests ADD FOREIGN KEY (supply_id) REFERENCES supplies(id);
ALTER TABLE supply_requests ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE supply_movements ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE supply_movements ADD FOREIGN KEY (supply_id) REFERENCES supplies(id);
ALTER TABLE supply_movements ADD FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE supply_movements ADD FOREIGN KEY (work_id) REFERENCES works(id);
ALTER TABLE supply_movements ADD FOREIGN KEY (expense_id) REFERENCES expenses(id);
ALTER TABLE supply_movements ADD FOREIGN KEY (request_id) REFERENCES supply_requests(id);
ALTER TABLE allocation_rules ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE allocation_rules ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE allocation_runs ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE allocation_runs ADD FOREIGN KEY (rule_id) REFERENCES allocation_rules(id);
ALTER TABLE allocation_runs ADD FOREIGN KEY (expense_id) REFERENCES expenses(id);
ALTER TABLE allocation_runs ADD FOREIGN KEY (run_by) REFERENCES users(id);
ALTER TABLE cash_movements ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE cash_movements ADD FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE cash_movements ADD FOREIGN KEY (counterparty_id) REFERENCES parties(id);
ALTER TABLE cash_movements ADD FOREIGN KEY (transfer_id) REFERENCES transfers(id);
ALTER TABLE cash_movements ADD FOREIGN KEY (reverses_id) REFERENCES cash_movements(id);
ALTER TABLE cash_movements ADD FOREIGN KEY (authorized_by) REFERENCES users(id);
ALTER TABLE transfers ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE transfers ADD FOREIGN KEY (from_account_id) REFERENCES accounts(id);
ALTER TABLE transfers ADD FOREIGN KEY (to_account_id) REFERENCES accounts(id);
ALTER TABLE recon_batches ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE recon_batches ADD FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE bank_lines ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE bank_lines ADD FOREIGN KEY (batch_id) REFERENCES recon_batches(id);
ALTER TABLE bank_lines ADD FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE recon_links ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE recon_links ADD FOREIGN KEY (bank_line_id) REFERENCES bank_lines(id);
ALTER TABLE recon_links ADD FOREIGN KEY (cash_movement_id) REFERENCES cash_movements(id);
ALTER TABLE recon_links ADD FOREIGN KEY (decided_by) REFERENCES users(id);
ALTER TABLE economic_periods ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE economic_periods ADD FOREIGN KEY (closed_by) REFERENCES users(id);
ALTER TABLE import_batches ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE import_batches ADD FOREIGN KEY (attachment_id) REFERENCES attachments(id);
ALTER TABLE import_batches ADD FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE source_records ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE source_records ADD FOREIGN KEY (batch_id) REFERENCES import_batches(id);
ALTER TABLE match_proposals ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE match_proposals ADD FOREIGN KEY (batch_id) REFERENCES import_batches(id);
ALTER TABLE match_proposals ADD FOREIGN KEY (decided_by) REFERENCES users(id);
ALTER TABLE quality_issues ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE quality_issues ADD FOREIGN KEY (batch_id) REFERENCES import_batches(id);
ALTER TABLE quality_issues ADD FOREIGN KEY (responsible_id) REFERENCES users(id);
ALTER TABLE backup_manifests ADD FOREIGN KEY (organization_id) REFERENCES organizations(id);
