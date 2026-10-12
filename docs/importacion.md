# Estrategia de importación

## Flujo
1. **Carga.** El archivo original se guarda intacto como adjunto, con nombre y huella. El mismo archivo no crea otro lote.
2. **Identificación.** Se reconoce el tipo por sus hojas y encabezados y se listan todas las hojas, incluidas las ocultas (una hoja oculta se lee igual; no implica obra inactiva).
3. **Simulación sin escritura.** Conteos de altas, coincidencias, cambios, rechazos y subtotales excluidos; comparación de la suma leída contra los totales del propio archivo; incidencias.
4. **Confirmación idempotente.** Se guardan los registros normalizados con su origen (hoja, fila, celda), las incidencias y, si se elige, las obras y personas que no existan. Reimportar no duplica.
5. **Conciliación entre archivos.** Coincidencias propuestas e incidencias por diferencias.
6. **Reversión.** Posible mientras nada posterior dependa del lote; si no, se indican los registros que requieren corrección trazable.

Nunca se evalúan macros, enlaces externos ni fórmulas: se leen los valores guardados y el texto de la fórmula se conserva como evidencia. `#REF!`, `#NAME?` y `#DIV/0!` generan incidencia; no se convierten en cero.

## Perfiles (verificados leyendo los archivos reales, sin modificarlos)

| Archivo | Hojas | Qué se normaliza | Qué se excluye |
|---|---|---|---|
| `S35_Estimaciones.xlsx` | 22 (11 ocultas) | Partida de contratación por obra, sección, ubicación y concepto; **un registro por partida y semana** a partir de los bloques horizontales `Semana NN`; rayas de la hoja `Otros` | Columnas Ejecutado / Por ejecutar / Pasado de presupuesto, filas de totales |
| `230101_Pagos Semanales.xlsx` | 14 | Partidas de pago por semana, contratista, obra y concepto; cierre semanal (bruto, nómina bancaria, descuentos, efectivo); beneficiarios de nómina bancaria; avisos de personal | Sumas sin etiqueta, total de nómina, columnas espejo |
| `260113_GastosDCL.xlsx` | 5 (2 ocultas) | Un registro por comprobante de gasto; un registro por ingreso o ajuste de `Rem. INSTAL.` | Fila de totales, bloque de posición de caja, hojas `pivot`, `Inversiones`, `Listas` |
| `260106_FlujosDCL.xlsx` | 8 | Movimientos de caja y banco de `GLOBAL`; asignaciones por obra de `RESIDENCIALES` y `PROYECTOS` (una por obra y fecha) | Columnas de saldo, bloques de proyección y resumen, `PIVOT OBRAS`, `ResultadoQ` y hojas auxiliares |
| `260731_Balcones.xlsx` | 2 | Presupuesto del cliente, aditivas, partidas por estimación, estado de cuenta (estimaciones, pagos, amortización) | Totales, impuestos, amortización y columnas derivadas |

Total: 51 hojas, 13 ocultas. Además se acepta un CSV de personas y empresas (`nombre, razon social, cliente, proveedor, contratista, alias`).

## Validaciones que ya detectan los casos documentados
- **Balcones, semana 35**: la hoja suma $28,183.00 y coincide con su total; `Pagos Semanales` reproduce el cierre (bruto $322,879.30, nómina bancaria $41,110.00, descuentos $3,500.00 y $270.00, efectivo $277,999.30); `Flujos` trae −$28,183.00 como mano de obra de la semana 35. Al confirmar los tres lotes se propone **una coincidencia** por obra, semana e importe: un solo hecho, no tres gastos.
- **Estimación 2**: 14-abr-2025 en el estado de cuenta frente a "14 de abril 2026" en el control → incidencia de fechas en conflicto con ambas fechas. También se detecta la estimación 4 (30 vs 31 de julio).
- **72.08 vs 72.78 m²**: incidencia de diferencia de medición entre dos partidas de la misma zona y estimación; no se promedia.
- **Partida de $21,141**: presupuestada sin columnas de seguimiento → incidencia; se importa como pendiente.
- **Comisión $49,693.70 vs $49,569.37**: diferencia de $124.33 registrada con sus dos orígenes.
- **Anticipo**: bruto $350,283.56, comisión $35,028.36 y neto $315,255.20 quedan identificados como tres conceptos.
- Años que retroceden en encabezados, semanas repetidas, unidades no reconocidas (`CUADRILLA`, `escaler`, `huellas`), fechas como texto, 9,275 celdas `#NAME?` en una columna oculta de Gastos (reportadas como una sola incidencia).
- Etiquetas "8% IVA", "7% amortización" y "15%": incidencia informativa; son condiciones de un contrato que deben validarse, no reglas del sistema.

## Fuente por dato y conflictos
La tabla vigente se muestra en Configuración → Importación. Ningún archivo prevalece de forma absoluta: cada discrepancia se vuelve incidencia o coincidencia por revisar, con su resolución.

## Estrategia de arranque (decisión D11)
Al confirmar se elige: conservar el lote como origen conciliable, saldos iniciales a una fecha más movimientos posteriores, o histórico completo. La pantalla muestra la conciliación de apertura por cuenta (movimientos anteriores al saldo inicial).

## Qué queda pendiente
- **Los registros importados no se convierten todavía en documentos operativos** (avances, estimaciones, gastos, cobros o movimientos). Quedan normalizados, trazables y conciliados entre archivos. La conversión depende de la estrategia de arranque y de la fuente válida de cada saldo, que dirección debe decidir; hacerlo antes duplicaría saldos o inventaría estados (por ejemplo, gastos históricos "sin pagar").
- **Pagos semanales anteriores a 2023** usan otros formatos de columnas: se identifican y no se interpretan.
- **Alias de obras** entre archivos (`Mansion` / `MANSION ROSARIO`, `Rosario2` / `ROSARO II`, `Aguila4` / `Aguila 8`) deben capturarse en la pantalla de importación para que las coincidencias se propongan.
- **PDF**: se adjuntan como evidencia; no hay OCR ni captura asistida.
- No se ha ejecutado una importación real confirmada: las pruebas automatizadas usan libros de prueba con la misma forma. Los archivos reales solo se leyeron en simulación.
