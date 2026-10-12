# Reporte de pruebas y limitaciones

## Qué se probó

`npm test` ejecuta 12 pruebas (todas en verde) contra un **servidor real** en una carpeta temporal, por la API HTTP, con usuarios de cada rol. Los datos son de prueba y están rotulados; los importes de los casos documentados se usan solo aquí.

| Prueba | Recorridos y criterios cubiertos |
|---|---|
| `a_semana` · Recorrido 1 | Captura en dos ubicaciones con generador → validación → estimación agrupada (15.79 + 25.24 = 41.03 m² conservando ubicaciones) → observación del contratista → resolución con antes y después → nueva versión → aceptación → autorización → cierre → pago parcial → reverso. Criterios 2, 4, 7, 9, 11, 12, 15, 16, 17, 36 |
| `a_semana` · Caso de cierre | $322,879.30 − $41,110 − $3,500 − $270 = $277,999.30; descuento sin soporte o sin autorizar bloquea; fallo a mitad del cierre no deja nada; reintento idempotente. Criterios 14, 32, 33 |
| `b_c` · Recorridos 3 y 4 | Partida de $21,141 sin ejecución visible como pendiente; anticipo bruto/comisión/neto; estimación con avances de dos semanas sin duplicar ejecución; vista del cliente sin datos internos; aprobación parcial; amortización que no mueve bancos; factura que no duplica la cuenta por cobrar; cobro parcial. Criterios 3, 18, 19, 20, 21 |
| `b_c` · Recorrido 2 | Adicional pagado con cobro pendiente = exposición; rechazado para venta sigue visible. Criterio 22 |
| `b_c` · Recorrido 5 | Gasto distribuido 33.3333/33.3333/33.3334 % con residuo de centavos; un gasto, dos desembolsos; transferencia entre cuentas; caja chica; stock; indicador no calculable. Criterios 23–28 |
| `b_c` · Conciliación bancaria | Sugerir no confirma; reimportar el estado de cuenta no duplica; ajuste de saldo exige autorización |
| `c_plataforma` · Permisos | Matriz por rol contra rutas y descargas directas; acciones prohibidas; revocación de sesión; delegación con vigencia; límite de monto. Criterios 1–3 |
| `c_plataforma` · Mediciones | Acumulados comparables, negativos rechazados, evidencia obligatoria, ajuste negativo, partida sin tarifa, autorización parcial. Criterios 5, 6, 8, 10 |
| `c_plataforma` · Concurrencia | Conflicto con ambas versiones, idempotencia, segunda instancia rechazada, reinicio, corrupción detectada. Criterios 33–35, recorridos 6 y 7 |
| `c_plataforma` · Respaldo y paquete | Restauración en entorno aislado con mismos saldos y documentos; respaldo alterado rechazado; paquete por JSON y por CSV idéntico al origen; protección contra fórmulas reversible. Criterios 31, 39, recorrido 8 |
| `c_plataforma` · Documentos y demo | Mismo importe en pantalla, CSV y PDF; emitido vigente / sustituido / borrador; enlace revocable; operación y demostración no se mezclan. Criterios 37, 38, 40 |
| `c_plataforma` · Importación | Hoja oculta, error de fórmula, subtotales excluidos, año en conflicto, unidades, simulación sin escritura, idempotencia, coincidencia entre archivos sin crear costos, reversión. Criterios 13, 29, 30 |

Además:
- **Archivos reales (solo lectura, en simulación):** los cinco libros se analizaron con los perfiles; se confirmaron 51 hojas (13 ocultas) y los casos documentados (ver [importación](importacion.md)).
- **Demostración:** se construye recorriendo la API real con once usuarios.
- **Interfaz:** se abrieron en el navegador 83 pantallas como Dirección y 13 como Supervisor sin errores ni textos anómalos.

## Lo que NO se probó o se probó a medias
- **Formularios de la interfaz**: no hay pruebas automatizadas de pantalla. Se verificó que las pantallas cargan; no se ejercitó a mano cada formulario, diálogo y combinación. Es la zona con mayor probabilidad de fallos.
- **Portales de contratista y cliente**: verificados por API; sus pantallas no se revisaron visualmente.
- **Captura en teléfono real**, cámara, pérdida de conexión y reintento: implementados; sin prueba en dispositivo.
- **Anotación de planos** (incluido PDF): implementada; sin prueba interactiva.
- **Criterio 38**: la coincidencia con el PDF se comprueba sobre las cadenas que el generador dibuja, no extrayendo texto del PDF final.
- **Criterio 36**: probado en servidor (la evidencia existe solo tras la carga confirmada); el comportamiento visual de cargas pendientes no está automatizado.
- **Carga y volumen**: sin pruebas de rendimiento con histórico real.
- **Accesibilidad**: se usaron etiquetas, foco visible, navegación por teclado en tablas y estados con texto además de color; sin auditoría con lector de pantalla.

## Limitaciones abiertas (funciones pendientes o parciales)
| Tema | Estado |
|---|---|
| Conversión de registros importados en documentos operativos | **Pendiente** de la estrategia de arranque (D11). Hoy quedan normalizados y conciliados |
| Pagos semanales anteriores a 2023 | **Pendiente**: formatos previos no interpretados |
| Captura asistida de PDF | **Pendiente**: solo se adjuntan |
| Otras monedas y tipo de cambio | **Pendiente**: se conserva la moneda y se bloquea mezclar; no hay conversión |
| Devolución de dinero al cliente | **Pendiente**: se resuelve revirtiendo el cobro o anticipo |
| Indicador de consumo por m² | **Parcial**: cálculo disponible en la API; sin pantalla |
| Jornada ya remunerada dentro de una partida | **Parcial**: se advierte exceso de jornada por día; no se cruza contra partidas por cantidad |
| Distribución de un pago entre varios trabajadores beneficiarios | **Parcial**: se registra quién recibe; no hay desglose por trabajador |
| Solicitudes de aprobación como bandeja propia | **Parcial**: las aprobaciones se piden mediante avisos; la entidad genérica existe sin uso |
| Reapertura de un periodo económico cerrado | **Pendiente** |
| Migradores de versión de esquema | **Pendiente** hasta el primer cambio de esquema; hoy se verifica la versión |
| Adaptador de base de datos | **Fuera de esta etapa**; contratos, modelo y plan listos |
| Trabajo sin conexión con fotografías y varios dispositivos | **Fuera de esta etapa** |
| Transferencias bancarias, timbrado, nómina legal, mensajería, OCR | **Fuera de esta etapa**; no se simulan |
