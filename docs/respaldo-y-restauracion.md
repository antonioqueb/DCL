# Respaldo y restauración

## Qué contiene un respaldo
`<datos>/backups/<marca>/`: todas las colecciones de una misma generación, los adjuntos que referencian, las credenciales (huellas de contraseña, sin sesiones) y `backup.json` con sumas de verificación. Copie esa carpeta fuera del servidor: un respaldo en el mismo disco no protege de una falla del disco.

## Crear
- Desde la aplicación: Configuración → Respaldos → Crear respaldo ahora (permiso de administración técnica).
- Por línea de comandos, con el servidor detenido: `npm run backup` (agregue `-- --demo` para la demostración).
- Programe uno diario y otro antes de cada importación o actualización.

## Verificar
`npm run backup -- --verify <marca>` o el botón Verificar. Comprueba sumas, estructura, referencias y adjuntos sin tocar la operación.

## Restaurar
1. **Siempre primero en una carpeta aislada:** `npm run restore -- <marca> --into /ruta/prueba`. Arranque un servidor apuntando a esa carpeta (`DCL_DATA_DIR=/ruta/prueba npm start`) y compare saldos y documentos.
2. **Sobre la operación, con el servidor detenido:** `npm run restore -- <marca> --confirmar`. Antes de sustituir nada se valida el respaldo y se crea otro del estado actual (queda indicado en la salida). La restauración se registra en el historial.
3. Un respaldo de demostración no se restaura sobre operación ni al revés.

## Recuperación ante fallas
- **El servidor no arranca por "corrupción".** No borre nada. La carpeta `manifests/` conserva las últimas generaciones: restaure el respaldo más reciente o, con apoyo técnico, apunte `manifest.json` a un manifiesto anterior íntegro.
- **Candado de instancia.** Si el servidor terminó de forma abrupta, el candado se libera al volver a iniciar en el mismo equipo. Si los datos se movieron de equipo, elimine `instance.lock` solo tras confirmar que ningún servidor los usa.

## Límites
La protección depende del disco y del sistema de archivos: se usa escritura a archivo temporal, sincronización y renombrado atómico dentro del mismo volumen. No use carpetas sincronizadas o compartidas entre computadoras como carpeta de datos.
