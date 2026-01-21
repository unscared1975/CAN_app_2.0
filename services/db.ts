

import { Alumno, Modulo, Horario, Inscripcion, Pago, Asistencia, AttendanceStatus, CentroConfig, InscripcionEstado, Egreso } from '../types';

const STORAGE_KEYS = {
  ALUMNOS: 'can_v2_alumnos',
  MODULOS: 'can_v2_modulos',
  HORARIOS: 'can_v2_horarios',
  INSCRIPCIONES: 'can_v2_inscripciones',
  PAGOS: 'can_v2_pagos',
  EGRESOS: 'can_v2_egresos',
  ASISTENCIAS: 'can_v2_asistencias',
  CONFIG: 'can_v2_config',
  CONCEPTO_MEM: 'can_v2_concept_mem'
};

const DEFAULT_CONFIG: CentroConfig = {
  nombre: "Centro de Nivelación",
  direccion: "Condominio Sevilla Las Terrazas 1 C. Santa Ana Este Nro. 14",
  instagram: "@profe.vivivi",
  facebook: "Clases de nivelación Sevilla",
  tiktok: "@profe.vivivi"
};

// In-memory cache
let _cacheAlumnos: Alumno[] | null = null;
let _cacheModulos: Modulo[] | null = null;
let _cacheHorarios: Horario[] | null = null;
let _cacheInscripciones: Inscripcion[] | null = null;
let _cachePagos: Pago[] | null = null;
let _cacheEgresos: Egreso[] | null = null;
let _cacheAsistencias: Asistencia[] | null = null;
let _cacheConfig: CentroConfig | null = null;
let _cacheConceptMem: Record<string, string> | null = null;

export const dbService = {
  init: () => {
    // Initialize defaults if missing in localStorage
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    }

    // Initialize defaults if missing
    if (!localStorage.getItem(STORAGE_KEYS.MODULOS)) {
      const modulos: Modulo[] = [
        { id: 'm1', nombre: 'Módulo A', totalClases: 12, horasPorClase: 2, costoBase: 500 },
        { id: 'm2', nombre: 'Módulo B', totalClases: 8, horasPorClase: 2, costoBase: 400 },
        { id: 'm3', nombre: 'Módulo C', totalClases: 8, horasPorClase: 4, costoBase: 700 },
        { id: 'm4', nombre: 'Módulo D', totalClases: 20, horasPorClase: 1, costoBase: 500 },
      ];
      localStorage.setItem(STORAGE_KEYS.MODULOS, JSON.stringify(modulos));

      const horarios: Horario[] = [
        { id: 'h1', moduloId: 'm1', horaInicio: '10:00', horaFin: '12:00' },
        { id: 'h2', moduloId: 'm1', horaInicio: '14:00', horaFin: '16:00' },
        { id: 'h3', moduloId: 'm1', horaInicio: '16:00', horaFin: '18:00' },
        { id: 'h4', moduloId: 'm2', horaInicio: '10:00', horaFin: '12:00' },
        { id: 'h5', moduloId: 'm2', horaInicio: '14:00', horaFin: '16:00' },
        { id: 'h6', moduloId: 'm2', horaInicio: '16:00', horaFin: '18:00' },
        { id: 'h7', moduloId: 'm3', horaInicio: '14:00', horaFin: '18:00' },
        { id: 'h8', moduloId: 'm4', horaInicio: '10:00', horaFin: '11:00' },
        { id: 'h9', moduloId: 'm4', horaInicio: '11:00', horaFin: '12:00' },
        { id: 'h10', moduloId: 'm4', horaInicio: '14:00', horaFin: '15:00' },
        { id: 'h11', moduloId: 'm4', horaInicio: '15:00', horaFin: '16:00' },
        { id: 'h12', moduloId: 'm4', horaInicio: '16:00', horaFin: '17:00' },
        { id: 'h13', moduloId: 'm4', horaInicio: '17:00', horaFin: '18:00' },
      ];
      localStorage.setItem(STORAGE_KEYS.HORARIOS, JSON.stringify(horarios));
    } else {
      // Force update of standard module prices if they exist in storage
      try {
        const modulos: Modulo[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODULOS) || '[]');
        const updates = [
          { id: 'm1', costoBase: 500 },
          { id: 'm2', costoBase: 400 },
          { id: 'm3', costoBase: 700 },
          { id: 'm4', costoBase: 500 },
        ];

        let changed = false;
        updates.forEach(u => {
          const idx = modulos.findIndex(m => m.id === u.id);
          if (idx !== -1 && modulos[idx].costoBase !== u.costoBase) {
            modulos[idx].costoBase = u.costoBase;
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem(STORAGE_KEYS.MODULOS, JSON.stringify(modulos));
        }
      } catch (e) {
        console.error("Error auto-updating module prices", e);
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.ALUMNOS)) localStorage.setItem(STORAGE_KEYS.ALUMNOS, '[]');
    if (!localStorage.getItem(STORAGE_KEYS.INSCRIPCIONES)) localStorage.setItem(STORAGE_KEYS.INSCRIPCIONES, '[]');
    if (!localStorage.getItem(STORAGE_KEYS.PAGOS)) localStorage.setItem(STORAGE_KEYS.PAGOS, '[]');
    if (!localStorage.getItem(STORAGE_KEYS.EGRESOS)) localStorage.setItem(STORAGE_KEYS.EGRESOS, '[]');
    if (!localStorage.getItem(STORAGE_KEYS.ASISTENCIAS)) localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, '[]');
    if (!localStorage.getItem(STORAGE_KEYS.CONCEPTO_MEM)) localStorage.setItem(STORAGE_KEYS.CONCEPTO_MEM, '{}');

    // Load into cache
    dbService.refreshCache();
  },

  refreshCache: () => {
    try {
      _cacheAlumnos = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALUMNOS) || '[]');
      _cacheModulos = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODULOS) || '[]');
      _cacheHorarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.HORARIOS) || '[]');
      _cacheInscripciones = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSCRIPCIONES) || '[]');
      _cachePagos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGOS) || '[]');
      _cacheEgresos = JSON.parse(localStorage.getItem(STORAGE_KEYS.EGRESOS) || '[]');
      _cacheAsistencias = JSON.parse(localStorage.getItem(STORAGE_KEYS.ASISTENCIAS) || '[]');
      _cacheConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(DEFAULT_CONFIG));
      _cacheConceptMem = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONCEPTO_MEM) || '{}');
    } catch (e) {
      console.error("Failed to refresh cache", e);
    }
  },

  getInitials: (nombre: string = '', apellido: string = '') => {
    const primerNombre = nombre.trim().split(/\s+/)[0] || '';
    const primerApellido = apellido.trim().split(/\s+/)[0] || '';
    const inicialN = primerNombre.charAt(0) || '';
    const inicialA = primerApellido.charAt(0) || '';
    return (inicialN + inicialA).toUpperCase();
  },

  formatDateDisplay: (dateStr: string) => {
    if (!dateStr) return '--/--/--';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  },

  getConfig: (): CentroConfig => {
    if (!_cacheConfig) {
      try { _cacheConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(DEFAULT_CONFIG)); }
      catch { return DEFAULT_CONFIG; }
    }
    return _cacheConfig!;
  },

  saveConfig: (config: CentroConfig) => {
    _cacheConfig = config;
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  getAlumnos: (): Alumno[] => {
    if (!_cacheAlumnos) _cacheAlumnos = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALUMNOS) || '[]');
    return _cacheAlumnos!;
  },

  updateAlumno: (alumno: Alumno) => {
    const alumnos = dbService.getAlumnos();
    const idx = alumnos.findIndex(a => a.id === alumno.id);
    if (idx !== -1) {
      alumnos[idx] = { ...alumnos[idx], ...alumno };
      _cacheAlumnos = [...alumnos]; // Update cache ref
      localStorage.setItem(STORAGE_KEYS.ALUMNOS, JSON.stringify(alumnos));
      return alumnos[idx];
    }
    return null;
  },

  getModulos: (): Modulo[] => {
    if (!_cacheModulos) _cacheModulos = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODULOS) || '[]');
    return _cacheModulos!;
  },

  getHorarios: (): Horario[] => {
    if (!_cacheHorarios) _cacheHorarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.HORARIOS) || '[]');
    return _cacheHorarios!;
  },

  getPagos: (): Pago[] => {
    if (!_cachePagos) _cachePagos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGOS) || '[]');
    return _cachePagos!;
  },

  getEgresos: (): Egreso[] => {
    if (!_cacheEgresos) _cacheEgresos = JSON.parse(localStorage.getItem(STORAGE_KEYS.EGRESOS) || '[]');
    return _cacheEgresos!;
  },

  getAsistencias: (): Asistencia[] => {
    if (!_cacheAsistencias) _cacheAsistencias = JSON.parse(localStorage.getItem(STORAGE_KEYS.ASISTENCIAS) || '[]');
    return _cacheAsistencias!;
  },

  registrarEgreso: (egreso: Omit<Egreso, 'id'>) => {
    const egresos = dbService.getEgresos();
    const nuevo: Egreso = { ...egreso, id: crypto.randomUUID(), monto: Number(egreso.monto) };
    const newEgresos = [...egresos, nuevo];
    _cacheEgresos = newEgresos;
    localStorage.setItem(STORAGE_KEYS.EGRESOS, JSON.stringify(newEgresos));
    return nuevo;
  },

  eliminarEgreso: (id: string) => {
    const egresos = dbService.getEgresos();
    const filtrados = egresos.filter(e => e.id !== id);
    _cacheEgresos = filtrados;
    localStorage.setItem(STORAGE_KEYS.EGRESOS, JSON.stringify(filtrados));
  },

  getLastAttendanceDate: (inscripcionId: string): string | null => {
    const asistencias = dbService.getAsistencias();
    const inscAsist = asistencias
      .filter(a => a.inscripcionId === inscripcionId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return inscAsist.length > 0 ? inscAsist[0].fecha : null;
  },

  saveLastConcept: (alumnoId: string, concepto: string) => {
    try {
      if (!_cacheConceptMem) _cacheConceptMem = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONCEPTO_MEM) || '{}');
      _cacheConceptMem![alumnoId] = concepto;
      localStorage.setItem(STORAGE_KEYS.CONCEPTO_MEM, JSON.stringify(_cacheConceptMem));
    } catch (e) { console.error("Error saving concept mem", e); }
  },

  getLastConcept: (alumnoId: string): string | null => {
    try {
      if (!_cacheConceptMem) _cacheConceptMem = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONCEPTO_MEM) || '{}');
      return _cacheConceptMem![alumnoId] || null;
    } catch { return null; }
  },

  getTotalAbonado: (inscripcionId: string): number => {
    const pagos = dbService.getPagos();
    return pagos.filter(p => p.inscripcionId === inscripcionId).reduce((acc, p) => acc + Number(p.monto), 0);
  },

  getTotalInvertidoAnual: (alumnoId: string): number => {
    const inscripciones = dbService.getAllInscripciones();
    const misInscripcionesIds = inscripciones.filter(i => i.alumnoId === alumnoId).map(i => i.id);
    const pagos = dbService.getPagos();
    return pagos.filter(p => misInscripcionesIds.includes(p.inscripcionId)).reduce((acc, p) => acc + Number(p.monto), 0);
  },

  registrarPago: (pagoData: Omit<Pago, 'id' | 'reciboNum'>) => {
    const pagos = dbService.getPagos();
    const count = (pagos.length + 1).toString().padStart(3, '0');
    const nuevoPago: Pago = {
      ...pagoData,
      monto: Number(pagoData.monto),
      id: crypto.randomUUID(),
      reciboNum: `${new Date().getFullYear()}-${count}`
    };
    const newPagos = [...pagos, nuevoPago];
    _cachePagos = newPagos;
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(newPagos));
    dbService.sincronizarEstadoInscripcion(pagoData.inscripcionId);
    return nuevoPago;
  },

  updatePago: (pago: Pago) => {
    const pagos = dbService.getPagos();
    const idx = pagos.findIndex(p => p.id === pago.id);
    if (idx !== -1) {
      pagos[idx] = { ...pago, monto: Number(pago.monto) };
      _cachePagos = [...pagos];
      localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(pagos));
      dbService.sincronizarEstadoInscripcion(pago.inscripcionId);
      return pagos[idx];
    }
    return null;
  },

  getAllInscripciones: (): Inscripcion[] => {
    if (!_cacheInscripciones) _cacheInscripciones = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSCRIPCIONES) || '[]');
    return _cacheInscripciones!;
  },

  sincronizarEstadoInscripcion: (inscripcionId: string) => {
    const inscripciones = dbService.getAllInscripciones();
    const idx = inscripciones.findIndex(i => i.id === inscripcionId);
    if (idx !== -1) {
      const totalAbonado = dbService.getTotalAbonado(inscripcionId);
      const costo = inscripciones[idx].costoAcordado;
      if (totalAbonado < costo && (inscripciones[idx].estado === 'Finalizado' || inscripciones[idx].estado === 'Archivado')) {
        inscripciones[idx].estado = 'Finalizado con Deuda';
      } else if (totalAbonado >= costo && inscripciones[idx].estado === 'Finalizado con Deuda') {
        inscripciones[idx].estado = 'Finalizado';
      }
      _cacheInscripciones = [...inscripciones];
      localStorage.setItem(STORAGE_KEYS.INSCRIPCIONES, JSON.stringify(inscripciones));
    }
  },

  saveAlumno: (alumno: Omit<Alumno, 'id'>) => {
    const alumnos = dbService.getAlumnos();
    const nuevo: Alumno = { ...alumno, id: crypto.randomUUID() };
    const newAlumnos = [...alumnos, nuevo];
    _cacheAlumnos = newAlumnos;
    localStorage.setItem(STORAGE_KEYS.ALUMNOS, JSON.stringify(newAlumnos));
    return nuevo;
  },

  createInscripcion: (insc: Omit<Inscripcion, 'id' | 'saldoClases' | 'activo' | 'estado'>) => {
    let totalClases = 0;
    const isCustom = insc.moduloId === 'custom' || insc.moduloId === 'Personalizado';
    if (isCustom && insc.customModulo) {
      totalClases = insc.customModulo.totalClases;
    } else {
      const modulos = dbService.getModulos();
      const modulo = modulos.find(m => m.id === insc.moduloId);
      if (!modulo) throw new Error(`Módulo no encontrado.`);
      totalClases = modulo.totalClases;
    }
    const inscripciones = dbService.getAllInscripciones();

    // Inactivar inscripciones anteriores del mismo alumno
    inscripciones.forEach(i => {
      if (i.alumnoId === insc.alumnoId && i.estado === 'Activo') {
        const abonado = dbService.getTotalAbonado(i.id);
        i.estado = abonado < i.costoAcordado ? 'Finalizado con Deuda' : 'Finalizado';
        i.activo = false;
      }
    });

    const nueva: Inscripcion = {
      ...insc,
      id: crypto.randomUUID(),
      saldoClases: totalClases,
      activo: true,
      estado: 'Activo',
      fechaInscripcion: insc.fechaInscripcion || new Date().toISOString().split('T')[0]
    };
    const newInscripciones = [...inscripciones, nueva];
    _cacheInscripciones = newInscripciones;
    localStorage.setItem(STORAGE_KEYS.INSCRIPCIONES, JSON.stringify(newInscripciones));
    return nueva;
  },

  updateInscripcion: (insc: Partial<Inscripcion> & { id: string }) => {
    const inscripciones = dbService.getAllInscripciones();
    const idx = inscripciones.findIndex(i => i.id === insc.id);
    if (idx !== -1) {
      inscripciones[idx] = { ...inscripciones[idx], ...insc };
      _cacheInscripciones = [...inscripciones];
      localStorage.setItem(STORAGE_KEYS.INSCRIPCIONES, JSON.stringify(inscripciones));
    }
  },

  getInscripcionesActivas: (): Inscripcion[] => {
    try {
      const inscripciones = dbService.getAllInscripciones();
      const alumnos = dbService.getAlumnos();
      const modulos = dbService.getModulos();
      const horarios = dbService.getHorarios();
      return inscripciones.map(i => {
        const isCustom = i.moduloId === 'custom' || i.moduloId === 'Personalizado';
        const foundModulo = isCustom ? i.customModulo : modulos.find(m => m.id === i.moduloId);
        return {
          ...i,
          alumno: alumnos.find(a => a.id === i.alumnoId),
          modulo: foundModulo,
          horario: isCustom ? { id: 'custom-h', moduloId: 'custom', horaInicio: 'Personalizado', horaFin: '' } : horarios.find(h => h.id === i.horarioId)
        };
      }).filter(i => i.estado === 'Activo');
    } catch { return []; }
  },

  getArchivoMaestro: (): Inscripcion[] => {
    try {
      const inscripciones = dbService.getAllInscripciones();
      const alumnos = dbService.getAlumnos();
      const modulos = dbService.getModulos();
      const horarios = dbService.getHorarios();
      return inscripciones.map(i => {
        const isCustom = i.moduloId === 'custom' || i.moduloId === 'Personalizado';
        const foundModulo = isCustom ? i.customModulo : modulos.find(m => m.id === i.moduloId);
        return {
          ...i,
          alumno: alumnos.find(a => a.id === i.alumnoId),
          modulo: foundModulo,
          horario: isCustom ? { id: 'custom-h', moduloId: 'custom', horaInicio: 'Personalizado', horaFin: '' } : horarios.find(h => h.id === i.horarioId)
        };
      }).sort((a, b) => new Date(b.fechaInscripcion).getTime() - new Date(a.fechaInscripcion).getTime());
    } catch { return []; }
  },

  getCuentasPorCobrar: (): Inscripcion[] => {
    return dbService.getArchivoMaestro().filter(i => {
      const totalAbonado = dbService.getTotalAbonado(i.id);
      return totalAbonado < i.costoAcordado;
    });
  },

  registrarAsistencia: (inscripcionId: string, estado: AttendanceStatus, fecha: string, observacion: string = '') => {
    const inscripciones = dbService.getAllInscripciones();
    const idx = inscripciones.findIndex(i => i.id === inscripcionId);
    if (idx === -1) throw new Error('Inscripción no encontrada');
    if (new Date(fecha) < new Date(inscripciones[idx].fechaInscripcion)) {
      throw new Error(`Fecha inválida: La clase no puede ser anterior al inicio del módulo (${dbService.formatDateDisplay(inscripciones[idx].fechaInscripcion)})`);
    }
    const asistencias = dbService.getAsistencias();
    const existenteIdx = asistencias.findIndex(a => a.inscripcionId === inscripcionId && a.fecha === fecha);

    // Mutating cache/arrays directly since they are refs to what we just got
    // But we need to be careful to update the cache arrays if we push/replace
    let mustUpdateAsistencias = false;

    if (existenteIdx !== -1) {
      const anterior = asistencias[existenteIdx].estado;
      if (anterior === 'P' || anterior === 'F') inscripciones[idx].saldoClases += 1;
      asistencias[existenteIdx].estado = estado;
      asistencias[existenteIdx].observacion = observacion;
    } else {
      asistencias.push({ id: crypto.randomUUID(), inscripcionId, fecha, estado, observacion });
      mustUpdateAsistencias = true; // Pushed to array
    }

    if (estado === 'P' || estado === 'F') {
      if (inscripciones[idx].saldoClases <= 0) throw new Error('Sin saldo de clases.');
      inscripciones[idx].saldoClases -= 1;
    }

    if (mustUpdateAsistencias) _cacheAsistencias = [...asistencias];
    _cacheInscripciones = [...inscripciones]; // Inscripcion mutated in place

    localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(asistencias));
    localStorage.setItem(STORAGE_KEYS.INSCRIPCIONES, JSON.stringify(inscripciones));
    return inscripciones[idx];
  },

  hasNewerInscription: (alumnoId: string, currentInscripcionId: string): boolean => {
    const inscripciones = dbService.getAllInscripciones();
    const current = inscripciones.find(i => i.id === currentInscripcionId);
    if (!current) return false;

    return inscripciones.some(i =>
      i.alumnoId === alumnoId &&
      i.id !== currentInscripcionId &&
      (new Date(i.fechaInscripcion).getTime() > new Date(current.fechaInscripcion).getTime() || i.estado === 'Activo')
    );
  },

  editarAsistencia: (asistenciaId: string, data: { fecha: string, estado: AttendanceStatus, observacion: string }) => {
    const asistencias = dbService.getAsistencias();
    const aIdx = asistencias.findIndex(a => a.id === asistenciaId);
    if (aIdx === -1) throw new Error('Registro no encontrado');

    const inscripciones = dbService.getAllInscripciones();
    const iIdx = inscripciones.findIndex(i => i.id === asistencias[aIdx].inscripcionId);
    if (iIdx === -1) throw new Error('Inscripción no encontrada');

    if (new Date(data.fecha) < new Date(inscripciones[iIdx].fechaInscripcion)) {
      throw new Error(`Fecha inválida: No puede ser anterior al inicio del módulo.`);
    }

    const oldStatus = asistencias[aIdx].estado;
    const newStatus = data.estado;
    if ((oldStatus === 'P' || oldStatus === 'F') && newStatus === 'L') {
      inscripciones[iIdx].saldoClases += 1;
    } else if (oldStatus === 'L' && (newStatus === 'P' || newStatus === 'F')) {
      if (inscripciones[iIdx].saldoClases <= 0) throw new Error('Sin saldo.');
      inscripciones[iIdx].saldoClases -= 1;
    }

    asistencias[aIdx].fecha = data.fecha;
    asistencias[aIdx].estado = data.estado;
    asistencias[aIdx].observacion = data.observacion;

    _cacheAsistencias = [...asistencias];
    _cacheInscripciones = [...inscripciones];

    localStorage.setItem(STORAGE_KEYS.ASISTENCIAS, JSON.stringify(asistencias));
    localStorage.setItem(STORAGE_KEYS.INSCRIPCIONES, JSON.stringify(inscripciones));
    return inscripciones[iIdx];
  }
};
