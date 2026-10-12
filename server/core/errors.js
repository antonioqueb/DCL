// Errores de aplicación con mensaje concreto: campo afectado, motivo y forma de corregirlo.
export class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status; this.code = code; this.extra = extra;
  }
  toJSON() { return { error: this.code, message: this.message, ...this.extra }; }
}
export const invalid = (message, field, fix) => new AppError(422, 'validacion', message, { field, fix });
export const forbidden = (message = 'No tiene permiso para esta acción.', extra) => new AppError(403, 'sin_permiso', message, extra);
export const notFound = (what = 'El registro') => new AppError(404, 'no_encontrado', `${what} no existe o no está disponible para usted.`);
export const blocked = (message, reasons, fix) => new AppError(409, 'bloqueado', message, { reasons, fix });
export const unauthenticated = () => new AppError(401, 'sin_sesion', 'Inicie sesión para continuar.');
export class ConflictError extends AppError {
  constructor(collection, current, attempted) {
    super(409, 'conflicto', 'Otra persona modificó este registro mientras usted lo editaba. Compare ambas versiones antes de guardar.', { collection, current, attempted });
  }
}
export class StorageError extends AppError {
  constructor(message, extra) { super(503, 'almacenamiento', message, extra); }
}
