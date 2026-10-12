# Reglas de cálculo

## Representación
- Dinero, cantidades, precios y porcentajes se guardan como **texto decimal exacto** y se calculan con enteros escalados (`server/domain/decimal.js`). No se usa punto flotante.
- Escalas: dinero 2 decimales; cantidades, precios y porcentajes 4.
- **Redondeo único**: mitad lejos de cero. Se aplica al calcular cada partida, cada impuesto o porcentaje y nunca "al final para cuadrar".
- Pantalla y PDF usan formato es-MX (`$1,234.50`); CSV y API usan punto decimal sin separador de miles. Los tres salen del mismo modelo de documento.
- Cero, dato faltante y no aplicable son distintos: un importe sin definir se muestra "por definir", "por valorar" o "no disponible"; un porcentaje sin denominador es "no calculable".

## Fórmulas
| Cálculo | Regla |
|---|---|
| Renglón de generador | Superficie: largo × ancho (o alto) × piezas − deducciones. Longitud: longitud × piezas − deducciones. Piezas y lotes: piezas − deducciones. |
| Avance acumulado | Incremento = acumulado medido − acumulado validado comparable (misma obra, ubicación, concepto, unidad, partida de presupuesto y tipo de trabajo). |
| Cantidad vigente de un avance | Cantidad original + ajustes autorizados. |
| Importe de partida | Cantidad × precio, redondeado a centavos por partida. |
| Total de estimación | Suma de partidas incluidas con importe definido. |
| Liquidación | Neto por pagar = bruto autorizado − descuentos autorizados − anticipos aplicados. Efectivo = neto − componentes bancarios. Comprobación: bruto = banco + descuentos + anticipos + efectivo. |
| Saldo de obligación | Neto por pagar − aplicaciones de pagos confirmados. |
| Estimación al cliente | Total = subtotal + ajustes + impuestos − amortización − retención. Impuesto, amortización y retención usan el porcentaje y la **base que indique el contrato** (subtotal o total con impuestos). Sin regla definida quedan "por definir" o se capturan manualmente con motivo. La amortización nunca excede el anticipo pendiente. |
| Cuenta por cobrar | Total aprobado − cobros aplicados − ajustes autorizados. La factura relacionada no suma otra cuenta. |
| Antigüedad | Días desde la fecha de vencimiento (no desde la captura). |
| Reparto | Las partes suman exactamente el total; el residuo de centavos se asigna al último destino y se registra. |
| Saldo de cuenta | Saldo inicial fechado + movimientos confirmados. |
| Costo de obra | Estimaciones de contratista autorizadas + gastos autorizados según su distribución. Los pagos no se suman otra vez. |
| Margen sobre ejecución (parcial) | Trabajo aprobado por el cliente antes de impuestos − costos registrados. |

## Tarifas
Precedencia de más específica a más general: obra y contratista › contratista › obra › general. En el mismo nivel gana la vigencia más reciente que cubra la fecha de fin de la semana. Al incluir una tarifa en una estimación se guarda una copia (precio, moneda, unidad, vigencia, alcance, origen). Sin tarifa, la partida queda pendiente de valorar y no puede aceptarse ni autorizarse.

## Invariantes verificadas en el servidor
- Las asignaciones de costo suman el importe distribuible.
- Las aplicaciones de pago o cobro no superan el pago ni el saldo.
- Los anticipos aplicados no superan su saldo.
- La cantidad asignada a documentos vigentes no supera la ejecución validada, por circuito (pago al contratista y cobro al cliente por separado).
- Una aprobación vale para la revisión exacta de la partida y la versión del documento.
- Cancelar un movimiento confirmado genera un reverso.
- Un documento autorizado no cambia por actualizar catálogos.
- Toda referencia apunta a un registro existente de la misma organización.
- Una clave de operación repetida no vuelve a crear movimientos.

## Monedas
Cada documento conserva su moneda. No se suman monedas distintas: pagar una obligación desde una cuenta en otra moneda queda bloqueado hasta registrar una conversión explícita (pendiente de implementar; la moneda operativa actual es MXN).
