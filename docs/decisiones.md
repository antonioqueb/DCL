# Bitácora de decisiones

## Decisiones de negocio pendientes de validar por dirección
Están registradas en la aplicación (Configuración → Decisiones pendientes) con su comportamiento provisional. Ninguna se convirtió en regla definitiva.

| Clave | Decisión | Comportamiento provisional |
|---|---|---|
| D01 | Quién captura, revisa, acepta y autoriza, y límites de monto | Matriz inicial por rol; sin límites de monto (no se inventan) |
| D02 | Delegación y autorización parcial | Delegaciones con vigencia; autorización parcial activada como parámetro |
| D03 | Catálogo, tarifas por contratista y obra, niveles de detalle | Catálogo real vacío; partida sin tarifa = pendiente de valorar |
| D04 | Equivalencias entre conceptos de contratación y comerciales | Vínculos manuales marcados como no validados |
| D05 | Jornadas, préstamos, descuentos, anticipos y retrabajos | Descuentos solo con soporte y autorización |
| D06 | Evidencias obligatorias y excepciones | Obligatoria en adicionales y trabajos ocultos; configurable por concepto |
| D07 | Anticipo, amortización, impuestos y garantías por contrato | Condiciones por contrato; sin base definida el importe queda por definir |
| D08 | Costos sociales, supervisión, taller, comisiones, stock | Prorrateo solo con regla aprobada; el stock no se carga a obra |
| D09 | Reconocimiento de ingresos y costos, cierre de periodos | Resultados etiquetados como parciales |
| D10 | Vinta, Senter, socios e inversiones | Pendientes de clasificar, fuera de márgenes y visibles aparte |
| D11 | Fecha de apertura, histórico a migrar y fuente de cada saldo | La importación no genera saldos |
| D12 | Conectividad, portales y trabajo sin conexión | Conectado, con borradores de texto |

## Supuestos de negocio adoptados (configurables)
- La semana operativa va de lunes a sábado con numeración ISO; la fecha de corte es editable por semana.
- Un avance se paga por el circuito del contratista y se cobra por el del cliente de forma independiente; pagar no implica cobrar.
- La obligación de pago nace al autorizar la estimación; el cierre semanal genera las instrucciones.
- Quien captura un avance no lo valida; el efectivo se confirma con recibo; autorizar exige conformidad vigente o excepción con motivo.
- Tolerancia de centavos en cobranza: $1.00.
- El margen por obra usa el trabajo aprobado por el cliente como ingreso, declarado como resultado parcial.
- El conjunto de demostración usa IVA 16 %, anticipo y amortización 10 % y retención 5 % como **ejemplos ficticios** de un contrato sin validar.

## Decisiones técnicas (reversibles)
| Decisión | Motivo |
|---|---|
| Node.js sin marco de trabajo; interfaz sin compilación | Menos piezas que mantener y sin paso de construcción |
| Dependencias: `pdfkit`, `exceljs`, `jszip`, `pdfjs-dist` | PDF, lectura de Excel, paquete portable, vista de planos PDF |
| Colecciones JSON por generación y manifiesto atómico | Atomicidad y recuperación sin base de datos |
| Operaciones atómicas síncronas | El proceso único garantiza exclusión sin colas |
| Esquema único en `schema.js` | Validación, diccionario, CSV y modelo relacional salen de la misma fuente |
| Decimales como texto con BigInt | Exactitud y traslado directo a `NUMERIC` |
| Contraseñas con `scrypt` nativo | Sin criptografía propia ni dependencias |
| Miniaturas generadas en el navegador | Evita dependencias nativas de imagen; el original se conserva íntegro |
| Columnas de tabla definidas por el servidor | Pantalla y CSV coinciden y respetan permisos |
| Auditoría particionada por día; registros de origen por lote | Acota lo que se reescribe en cada operación |
| Demostración construida mediante la API real | Los datos de ejemplo obedecen las mismas reglas |
