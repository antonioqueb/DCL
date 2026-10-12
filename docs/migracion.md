# Paquete y plan de migración a base de datos

## Lo que ya está preparado
- **Modelo relacional equivalente:** [`modelo-relacional.sql`](modelo-relacional.sql), generado del mismo esquema: tablas, claves primarias UUID, foráneas, índices, estados como `CHECK`, `NUMERIC(18,2)` para dinero y `NUMERIC(18,4)` para cantidades y precios.
- **Diccionario de datos:** [`diccionario-de-datos.md`](diccionario-de-datos.md).
- **Paquete portable:** `npm run export` produce un `.zip` con colecciones JSON, una tabla CSV por entidad o relación, diccionario, adjuntos y manifiesto con conteos y sumas. Probado: exportar y volver a cargar por JSON y por CSV conserva identificadores, relaciones, versiones, historial y archivos.
- **Contrato del repositorio:** los casos de uso solo dependen de `View` (`get`, `all`, `where`, `by`, `first`, `count`) y `Tx` (`insert`, `update` con versión esperada, `archive`, `remove`, `event`) dentro de `store.tx(meta, fn)`, más `putBlob/readBlob`.
- **Versión de esquema:** el manifiesto la registra; la aplicación se niega a abrir datos de otra versión en lugar de convertirlos en silencio.

## Qué falta para la etapa de base de datos
1. Implementar el adaptador relacional con la misma interfaz. Punto de atención: las operaciones atómicas son hoy síncronas; con una base de datos pasarán a ser asíncronas dentro de una transacción, lo que obliga a ajustar las firmas de los casos de uso (cambio mecánico, sin tocar reglas).
2. Mover la carga en memoria de colecciones a consultas (los listados y reportes ya pasan por una sola función de filtrado y paginación).
3. Migradores de versión de esquema de archivos: hoy existe la verificación de versión; el primer migrador se escribirá con el primer cambio de esquema, con copia previa, simulación y resultado.

## Procedimiento de corte
1. Anunciar la ventana y **detener el servidor** (congela escrituras).
2. `npm run backup` y `npm run export`; guardar ambos fuera del servidor.
3. Cargar en orden: organización → catálogos y personas → obras y ubicaciones → contratos y presupuestos → periodos → avances → estimaciones → cierres → obligaciones, desembolsos y aplicaciones → cobranza → gastos → caja → importación → auditoría. Los UUID se conservan; los adjuntos se copian por huella.
4. Activar las claves foráneas al final.
5. **Conciliar** antes de abrir: conteos por entidad contra el manifiesto; saldos de cuentas; totales por obra y semana; anticipos y sus saldos; pagos y cobros por estado; estados y versiones de documentos; huellas de adjuntos; verificación de la cadena de auditoría.
6. Ejecutar la misma batería de pruebas contra el adaptador nuevo.
7. Cambiar el adaptador por configuración y abrir. Sin escritura dual.
8. Sesiones y credenciales se trasladan aparte (`secure/auth.json`); lo más simple es pedir cambio de contraseña.

## Reversión
Si la conciliación falla antes de abrir, se vuelve a iniciar el modo de archivos con los datos intactos. Si ya se operó sobre la base, la reversión exige exportar de la base al formato del paquete los movimientos posteriores al corte; ese exportador debe existir antes de dar por bueno el corte. Una migración no se declara exitosa por haber copiado filas.
