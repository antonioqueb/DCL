// Datos de arranque comunes: roles, unidades, medios de pago, categorías, parámetros y el registro
// de decisiones que Lucía debe validar. No contiene tarifas, límites ni reglas económicas inventadas.
import { installRoles } from '../usecases/admin.js';

const UNITS = [['m2', 'Metro cuadrado', 'area', 2], ['ml', 'Metro lineal', 'longitud', 2], ['pza', 'Pieza', 'pieza', 0], ['lote', 'Lote', 'lote', 0], ['jornada', 'Jornada', 'tiempo', 2], ['hora', 'Hora', 'tiempo', 2], ['servicio', 'Servicio', 'servicio', 0], ['bulto', 'Bulto', 'pieza', 0], ['cubeta', 'Cubeta', 'pieza', 0]];
const METHODS = [['EFE', 'Efectivo', 'efectivo'], ['TRA', 'Transferencia', 'transferencia'], ['CHE', 'Cheque', 'cheque'], ['OTR', 'Otro', 'otro']];
const VOUCHERS = [['FAC', 'Factura', true], ['NOT', 'Nota o remisión', false], ['EFE', 'Evidencia de efectivo', false], ['REC', 'Recibo', false]];
const CATS = [
  ['INST', 'Costos de instalación', 'costo_instalacion', null], ['MO', 'Mano de obra', 'costo_instalacion', 'INST'], ['ADH', 'Adhesivo', 'costo_instalacion', 'INST'], ['SEL', 'Sellador', 'costo_instalacion', 'INST'], ['BOQ', 'Boquilla', 'costo_instalacion', 'INST'], ['OIN', 'Otros insumos', 'costo_instalacion', 'INST'],
  ['FLE', 'Fletes', 'costo_instalacion', 'INST'], ['MAN', 'Maniobras', 'costo_instalacion', 'INST'], ['SUP', 'Supervisión', 'costo_instalacion', 'INST'], ['CSO', 'Costo social', 'costo_instalacion', 'INST'], ['VIA', 'Viáticos', 'costo_instalacion', 'INST'], ['TAL', 'Taller', 'costo_instalacion', 'INST'], ['EXT', 'Gastos extraordinarios', 'costo_instalacion', 'INST'],
  ['ADM', 'Gastos administrativos', 'gasto_administrativo', null], ['COM', 'Gastos comerciales', 'gasto_comercial', null], ['CBA', 'Comisiones bancarias', 'gasto_administrativo', 'ADM'], ['IMP', 'Impuestos', 'impuesto', null], ['ACT', 'Activos o inversiones', 'activo_inversion', null], ['PRE', 'Préstamos', 'prestamo', null], ['SOC', 'Movimientos de socios', 'movimiento_socios', null], ['TIN', 'Transferencias internas', 'transferencia_interna', null],
];
const REASONS = [['MED', 'Error de medición'], ['CAP', 'Error de captura'], ['CON', 'Conciliación con contratista'], ['DUP', 'Registro duplicado'], ['ALC', 'Cambio de alcance']];
// Parámetros provisionales: `true` en el tercer campo indica que dependen de una decisión de Lucía.
const SETTINGS = [
  ['week.endOffsetDays', 5, false, 'Día de fin de la semana operativa contado desde el lunes (5 = sábado).'],
  ['policy.partialAuthorization', true, true, 'Permite autorizar las partidas acordadas y diferir las observadas.'],
  ['policy.conformityRequired', true, true, 'Exige conformidad vigente del contratista (o excepción con motivo) para autorizar.'],
  ['policy.selfValidation', false, true, 'Permite que quien captura un avance lo valide.'],
  ['policy.cashReceiptRequired', true, true, 'Exige recibo o constancia para confirmar pagos en efectivo.'],
  ['tolerance.cents', '1.00', true, 'Diferencia máxima que puede ajustarse como centavos, con motivo y autorización.'],
  ['workday.maxPerDay', '1', true, 'Jornadas máximas por trabajador y día antes de pedir explicación.'],
  ['workday.hoursPerDay', '8', true, 'Horas por jornada antes de pedir explicación.'],
  ['revenue.policy', 'no_definida', true, 'Política de reconocimiento de ingresos. Mientras no se defina, los resultados se etiquetan como parciales.'],
  ['startup.strategy', 'no_definida', true, 'Estrategia de arranque: histórico completo o saldos iniciales a una fecha más movimientos posteriores.'],
  ['startup.openingDate', null, true, 'Fecha de apertura de saldos, cuando la estrategia sea saldos iniciales.'],
];
const DECISIONS = [
  ['D01', 'Autorizaciones', '¿Quién captura, revisa, acepta y autoriza cada documento, y con qué límites de monto?', 'Matriz inicial de permisos por rol; sin límites de monto definidos (ninguno se inventa).'],
  ['D02', 'Autorizaciones', '¿Cómo se delega una aprobación y cuándo se permite autorizar parcialmente?', 'Delegaciones con vigencia entre personal interno; autorización parcial activada como parámetro de demostración.'],
  ['D03', 'Catálogo y tarifas', 'Catálogo vigente, tarifas por contratista y obra y niveles de detalle por lote.', 'El catálogo real está vacío hasta que se importe o capture; una partida sin tarifa queda "pendiente de valorar".'],
  ['D04', 'Catálogo y tarifas', 'Equivalencias reales entre conceptos de contratación y comerciales.', 'Los vínculos se capturan manualmente y se marcan como no validados; no se asume relación uno a uno.'],
  ['D05', 'Mano de obra', 'Reglas de jornadas, préstamos, descuentos, anticipos y retrabajos.', 'Cada descuento requiere soporte y autorización; no hay descuentos automáticos.'],
  ['D06', 'Evidencia', '¿Qué evidencias son obligatorias y qué excepciones se permiten?', 'Obligatoria en adicionales y trabajos que quedan ocultos; configurable por concepto; excepción con motivo y autorización.'],
  ['D07', 'Contratos', 'Condiciones vigentes de anticipo, amortización, impuestos y garantías por contrato.', 'Cada contrato lleva sus condiciones; si la base de un cálculo no está definida, ese importe se captura manualmente y se marca pendiente.'],
  ['D08', 'Costos', 'Tratamiento de costos sociales, supervisión, taller, comisiones e insumos en stock.', 'Prorrateos solo con una regla aprobada; el stock no se carga a una obra hasta registrar su destino.'],
  ['D09', 'Resultados', 'Reconocimiento de ingresos y costos, trabajo en proceso y cierre de periodos.', 'Los resultados se muestran como parciales y explican su base; no se declara utilidad contable definitiva.'],
  ['D10', 'Resultados', 'Clasificación de Vinta, Senter y movimientos de socios o inversiones.', 'Quedan "pendientes de clasificar" y fuera de los márgenes hasta validarse; se muestran aparte.'],
  ['D11', 'Arranque', 'Fecha de apertura, histórico que se migrará y fuente válida de cada saldo.', 'La importación opera en simulación; confirmar exige elegir estrategia y conciliar la apertura.'],
  ['D12', 'Conectividad', 'Conectividad real de las obras, uso de portal por contratistas y clientes, y requisitos sin conexión.', 'Trabajo conectado con borradores locales de texto; las fotografías exigen carga confirmada.'],
];

export function seedBase(tx) {
  installRoles(tx);
  for (const [code, name, kind, decimals] of UNITS) if (!tx.by('units', 'code', code).length) tx.insert('units', { code, name, kind, decimals, status: 'activo' });
  for (const [code, name, kind] of METHODS) if (!tx.by('paymentMethods', 'code', code).length) tx.insert('paymentMethods', { code, name, kind, status: 'activo' });
  for (const [code, name, hasTaxBreakdown] of VOUCHERS) if (!tx.by('voucherTypes', 'code', code).length) tx.insert('voucherTypes', { code, name, hasTaxBreakdown, status: 'activo' });
  for (const [code, name, cls, parent] of CATS) if (!tx.by('costCategories', 'code', code).length) tx.insert('costCategories', { code, name, class: cls, parentId: parent ? tx.by('costCategories', 'code', parent)[0].id : null, status: 'activo' });
  for (const [code, name] of REASONS) if (!tx.by('adjustmentReasons', 'code', code).length) tx.insert('adjustmentReasons', { code, name, appliesTo: 'avance', status: 'activo' });
  for (const [key, v, requiresDecision, description] of SETTINGS) if (!tx.by('settings', 'key', key).length) tx.insert('settings', { key, value: { v }, description, requiresDecision });
  for (const [code, topic, question, provisional] of DECISIONS) if (!tx.by('pendingDecisions', 'code', code).length) tx.insert('pendingDecisions', { code, topic, question, provisional, status: 'pendiente' });
}
