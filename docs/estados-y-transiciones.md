# Catálogo de estados y transiciones

Ningún estado se obtiene automáticamente por la existencia de otro: presupuestado, reportado, validado, autorizado, pagado, propuesto, aprobado, facturado y cobrado son hechos distintos.

## Avance
`borrador → reportado → validado | rechazado` · `rechazado → borrador` (al corregir)

- Validar exige: no ser quien capturó (salvo política), evidencia obligatoria o excepción autorizada, y aprobación expresa si supera el presupuesto.
- Un avance validado no se edita: se ajusta (`propuesto → autorizado | rechazado`).

## Estimación de contratista
`borrador → revisión interna → revisión del contratista → conciliación de observaciones ⇄ revisión del contratista → lista para autorizar → autorizada → cerrada` · `cancelada` desde borrador o revisión interna · `autorizada/cerrada → revisión interna` por reapertura (nueva versión, con motivo).

Partidas: `pendiente → observada → pendiente` (al resolver) `→ acordada → autorizada`; `diferida` o `rechazada` liberan su ejecución.

Pago (independiente del documento): `sin pago · parcial · pagado · con reverso`, derivado de desembolsos confirmados.

## Cierre semanal
`emitido` (ordinario, uno por semana) · complementos identificados con motivo. Semana: `abierta → cerrada`.

## Desembolso
`preparado → autorizado → pendiente de confirmación → confirmado → revertido` · `rechazado` antes de confirmar. Aplicaciones: `reservada → confirmada → revertida | liberada`.

## Adicional (tres decisiones independientes)
- Trabajo: `reportado → en aclaración → validado → resuelto` · `rechazado`
- Pago al contratista: `pendiente → autorizado | rechazado | no aplica`
- Cobro al cliente: `pendiente → propuesto → aprobado por el cliente | rechazado por el cliente` · `absorbido` · `no aplica`

## Presupuesto
`borrador → en revisión → enviado → aceptado | rechazado` · `sustituido` (al aceptar otra versión) · `cancelado`

Modificación (aditiva o deductiva): `propuesta → en revisión → aprobada | rechazada | cancelada`. Solo la aprobada modifica el presupuesto vigente.

## Estimación al cliente
`borrador → revisión interna → enviada → observada → corregida → enviada → aprobada` · `cancelada`

Partidas: `propuesta → aceptada | observada (aceptación parcial) | rechazada | diferida`. Facturación (`sin factura · parcial · facturada`) y cobranza (`sin cobro · parcial · cobrada`) se derivan de sus relaciones.

## Gasto
`borrador → pendiente de información → revisado → autorizado → con ajuste` (reclasificación) · `cancelado`. El estado de pago se deriva de las aplicaciones.

## Obra
`planeación → activa ⇄ suspendida → cierre operativo → cierre financiero → archivada`. Cada cierre guarda su revisión y las excepciones autorizadas.

## Documento emitido
`borrador` (el registro aún no está congelado) · `vigente` · `sustituido` (se conserva).

## Importación
Lote: `cargado → simulado → confirmado → revertido`. Incidencia: `abierta → resuelta | descartada`. Coincidencia: `pendiente → aceptada | rechazada`.
