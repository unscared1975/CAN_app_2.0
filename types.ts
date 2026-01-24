
export type AttendanceStatus = 'P' | 'F' | 'L';
export type PaymentMethod = 'Efectivo' | 'QR' | 'Transferencia';
export type UserRole = 'ADMIN' | 'PROFESOR' | 'TUTOR';
export type InscripcionEstado = 'Activo' | 'Finalizado' | 'Finalizado con Deuda' | 'Archivado';
export type EgresoCategory = 'Gastos Administrativos' | 'Gastos de Comercializacion' | 'Gastos de Financiamiento' | 'Otros';

export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  colegio?: string;
  grado?: string;
  fotoUrl: string;
  tutorNombre: string;
  tutorTelefono: string;
}

export interface Modulo {
  id: string;
  nombre: string;
  totalClases: number;
  horasPorClase: number;
  costoBase: number;
}

export interface Horario {
  id: string;
  moduloId: string;
  horaInicio: string;
  horaFin: string;
  dias?: string; // Ejemplo: "Lu, Mi, Vi"
}

export interface Inscripcion {
  id: string;
  alumnoId: string;
  moduloId: string;
  horarioId: string;
  fechaInscripcion: string;
  saldoClases: number;
  costoAcordado: number;
  activo: boolean;
  estado: InscripcionEstado;
  alumno?: Alumno;
  modulo?: Modulo;
  horario?: Horario;
  customModulo?: Modulo;
}

export interface Pago {
  id: string;
  inscripcionId: string;
  monto: number;
  fecha: string;
  metodo: PaymentMethod;
  concepto: string;
  reciboNum: string;
  nota?: string;
}

export interface Egreso {
  id: string;
  monto: number;
  fecha: string;
  categoria: EgresoCategory;
  descripcion: string;
  nroFactura?: string;
}

export interface Asistencia {
  id: string;
  inscripcionId: string;
  fecha: string;
  estado: AttendanceStatus;
  observacion?: string;
}

export interface CentroConfig {
  nombre: string;
  direccion: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  ALUMNOS = 'ALUMNOS',
  CUENTAS_COBRAR = 'CUENTAS_COBRAR',
  REGISTRO = 'REGISTRO',
  PAGOS = 'PAGOS',
  GASTOS = 'GASTOS',
  ASISTENCIA_DIARIA = 'ASISTENCIA_DIARIA',
  CONFIGURACION = 'CONFIGURACION',
  MI_PROGRESO = 'MI_PROGRESO'
}
