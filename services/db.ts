
import { Alumno, Modulo, Horario, Inscripcion, Pago, Asistencia, AttendanceStatus, CentroConfig, InscripcionEstado, Egreso } from '../types';
import { supabase } from './supabase';

// Helper to map DB snake_case to App camelCase
const mapAlumno = (a: any): Alumno => ({
  id: a.id,
  nombre: a.nombre,
  apellido: a.apellido,
  colegio: a.colegio,
  grado: a.grado,
  fotoUrl: a.foto_url,
  tutorNombre: a.tutor_nombre,
  tutorTelefono: a.tutor_telefono
});

const mapModulo = (m: any): Modulo => ({
  id: m.id,
  nombre: m.nombre,
  totalClases: m.total_clases,
  horasPorClase: m.horas_por_clase,
  costoBase: m.costo_base
});

const mapHorario = (h: any): Horario => ({
  id: h.id,
  moduloId: h.modulo_id,
  horaInicio: h.hora_inicio,
  horaFin: h.hora_fin,
  dias: h.dias
});

const mapInscripcion = (i: any): Inscripcion => ({
  id: i.id,
  alumnoId: i.alumno_id,
  moduloId: i.modulo_id,
  horarioId: i.horario_id,
  fechaInscripcion: i.fecha_inscripcion,
  saldoClases: i.saldo_clases,
  costoAcordado: i.costo_acordado,
  activo: i.activo,
  estado: i.estado as InscripcionEstado,
  customModulo: i.custom_modulo
});

const mapPago = (p: any): Pago => ({
  id: p.id,
  inscripcionId: p.inscripcion_id,
  monto: p.monto,
  fecha: p.fecha,
  metodo: p.metodo,
  concepto: p.concepto,
  reciboNum: p.recibo_num,
  nota: p.nota
});

const mapEgreso = (e: any): Egreso => ({
  id: e.id,
  monto: e.monto,
  fecha: e.fecha,
  categoria: e.categoria,
  descripcion: e.descripcion,
  nroFactura: e.nro_factura
});

const mapAsistencia = (a: any): Asistencia => ({
  id: a.id,
  inscripcionId: a.inscripcion_id,
  fecha: a.fecha,
  estado: a.estado as AttendanceStatus,
  observacion: a.observacion
});

const DEFAULT_CONFIG: CentroConfig = {
  nombre: "Centro de Nivelación",
  direccion: "Condominio Sevilla Las Terrazas 1 C. Santa Ana Este Nro. 14",
  instagram: "@profe.vivivi",
  facebook: "Clases de nivelación Sevilla",
  tiktok: "@profe.vivivi"
};

// In-memory cache
let _cacheAlumnos: Alumno[] = [];
let _cacheModulos: Modulo[] = [];
let _cacheHorarios: Horario[] = [];
let _cacheInscripciones: Inscripcion[] = [];
let _cachePagos: Pago[] = [];
let _cacheEgresos: Egreso[] = [];
let _cacheAsistencias: Asistencia[] = [];
let _cacheConfig: CentroConfig | null = null;
let _cacheConceptMem: Record<string, string> | null = null;

// Default Data Constants
const DEFAULT_MODULOS = [
  { id: 'm1', nombre: 'Módulo A', total_clases: 12, horas_por_clase: 2, costo_base: 500 },
  { id: 'm2', nombre: 'Módulo B', total_clases: 8, horas_por_clase: 2, costo_base: 400 },
  { id: 'm3', nombre: 'Módulo C', total_clases: 8, horas_por_clase: 4, costo_base: 700 },
  { id: 'm4', nombre: 'Módulo D', total_clases: 20, horas_por_clase: 1, costo_base: 500 },
];

const DEFAULT_HORARIOS = [
  { id: 'h1', modulo_id: 'm1', hora_inicio: '10:00', hora_fin: '12:00' },
  { id: 'h2', modulo_id: 'm1', hora_inicio: '14:00', hora_fin: '16:00' },
  { id: 'h3', modulo_id: 'm1', hora_inicio: '16:00', hora_fin: '18:00' },
  { id: 'h4', modulo_id: 'm2', hora_inicio: '10:00', hora_fin: '12:00' },
  { id: 'h5', modulo_id: 'm2', hora_inicio: '14:00', hora_fin: '16:00' },
  { id: 'h6', modulo_id: 'm2', hora_inicio: '16:00', hora_fin: '18:00' },
  { id: 'h7', modulo_id: 'm3', hora_inicio: '14:00', hora_fin: '18:00' },
  { id: 'h8', modulo_id: 'm4', hora_inicio: '10:00', hora_fin: '11:00' },
  { id: 'h9', modulo_id: 'm4', hora_inicio: '11:00', hora_fin: '12:00' },
  { id: 'h10', modulo_id: 'm4', hora_inicio: '14:00', hora_fin: '15:00' },
  { id: 'h11', modulo_id: 'm4', hora_inicio: '15:00', hora_fin: '16:00' },
  { id: 'h12', modulo_id: 'm4', hora_inicio: '16:00', hora_fin: '17:00' },
  { id: 'h13', modulo_id: 'm4', hora_inicio: '17:00', hora_fin: '18:00' },
];

let _initPromise: Promise<void> | null = null;

export const dbService = {
  // Now async!
  init: async () => {
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
      try {
        const [
          alumnosRes,
          modulosRes,
          horariosRes,
          inscripcionesRes,
          pagosRes,
          egresosRes,
          asistenciasRes,
          configRes
        ] = await Promise.all([
          supabase.from('alumnos').select('*'),
          supabase.from('modulos').select('*'),
          supabase.from('horarios').select('*'),
          supabase.from('inscripciones').select('*'),
          supabase.from('pagos').select('*'),
          supabase.from('egresos').select('*'),
          supabase.from('asistencias').select('*'),
          supabase.from('config').select('*')
        ]);

        if (alumnosRes.data) _cacheAlumnos = alumnosRes.data.map(mapAlumno);

        // Modulos: Si falla o viene vacío, usar defaults
        if (modulosRes.data && modulosRes.data.length > 0) {
          _cacheModulos = modulosRes.data.map(mapModulo);
        } else {

          _cacheModulos = DEFAULT_MODULOS.map(mapModulo);
          // Intentar sincronizar en segundo plano
          dbService.seedDefaults().catch(console.error);
        }

        // Horarios: Igual
        if (horariosRes.data && horariosRes.data.length > 0) {
          _cacheHorarios = horariosRes.data.map(mapHorario);
        } else {
          _cacheHorarios = DEFAULT_HORARIOS.map(mapHorario);
        }

        if (inscripcionesRes.data) _cacheInscripciones = inscripcionesRes.data.map(mapInscripcion);
        if (pagosRes.data) _cachePagos = pagosRes.data.map(mapPago);
        if (egresosRes.data) _cacheEgresos = egresosRes.data.map(mapEgreso);
        if (asistenciasRes.data) _cacheAsistencias = asistenciasRes.data.map(mapAsistencia);

        if (configRes.data && configRes.data.length > 0) {
          const mainConfig = configRes.data.find((c: any) => c.key === 'main');
          if (mainConfig) _cacheConfig = mainConfig.value;
          else _cacheConfig = DEFAULT_CONFIG;
        } else {
          _cacheConfig = DEFAULT_CONFIG;
        }

      } catch (e) {
        console.error("Error inicializando DB:", e);
        // Fallback crítico si falla TODA la conexión (ej: offline timeout)
        if (_cacheModulos.length === 0) _cacheModulos = DEFAULT_MODULOS.map(mapModulo);
        if (_cacheHorarios.length === 0) _cacheHorarios = DEFAULT_HORARIOS.map(mapHorario);
      }
    })();

    return _initPromise;
  },

  seedDefaults: async () => {
    // Upsert to DB
    await supabase.from('modulos').upsert(DEFAULT_MODULOS);
    await supabase.from('horarios').upsert(DEFAULT_HORARIOS);
  },

  getInitials: (nombre: string = '', apellido: string = '') => {
    const primerNombre = nombre.trim().split(/\s+/)[0] || '';
    const primerApellido = apellido.trim().split(/\s+/)[0] || '';
    return ((primerNombre.charAt(0) || '') + (primerApellido.charAt(0) || '')).toUpperCase();
  },

  formatDateDisplay: (dateStr: string) => {
    if (!dateStr) return '--/--/--';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0].slice(-2)}`;
    }
    return dateStr;
  },

  getConfig: (): CentroConfig => {
    return _cacheConfig || DEFAULT_CONFIG;
  },

  saveConfig: async (config: CentroConfig) => {
    _cacheConfig = config;
    await supabase.from('config').upsert({ key: 'main', value: config });
  },

  getAlumnos: (): Alumno[] => _cacheAlumnos,

  saveAlumno: async (alumno: Omit<Alumno, 'id'>) => {
    const id = crypto.randomUUID();
    const nuevo: Alumno = { ...alumno, id };
    _cacheAlumnos = [..._cacheAlumnos, nuevo];

    const { error } = await supabase.from('alumnos').insert({
      id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      colegio: alumno.colegio,
      grado: alumno.grado,
      foto_url: alumno.fotoUrl,
      tutor_nombre: alumno.tutorNombre,
      tutor_telefono: alumno.tutorTelefono
    });

    if (error) {
      console.error("Error saving alumno:", error);
      _cacheAlumnos = _cacheAlumnos.filter(a => a.id !== id);
      throw new Error("No se pudo guardar en la nube. Verifique su conexión o credenciales.");
    }
    return nuevo;
  },

  updateAlumno: async (alumno: Alumno) => {
    const idx = _cacheAlumnos.findIndex(a => a.id === alumno.id);
    if (idx !== -1) {
      _cacheAlumnos[idx] = { ..._cacheAlumnos[idx], ...alumno };
      _cacheAlumnos = [..._cacheAlumnos];

      await supabase.from('alumnos').update({
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        colegio: alumno.colegio,
        grado: alumno.grado,
        foto_url: alumno.fotoUrl,
        tutor_nombre: alumno.tutorNombre,
        tutor_telefono: alumno.tutorTelefono
      }).eq('id', alumno.id);

      return _cacheAlumnos[idx];
    }
    return null;
  },

  getModulos: (): Modulo[] => _cacheModulos,
  getHorarios: (): Horario[] => _cacheHorarios,
  getPagos: (): Pago[] => _cachePagos,
  getEgresos: (): Egreso[] => _cacheEgresos,
  getAsistencias: (): Asistencia[] => _cacheAsistencias,

  registrarEgreso: async (egreso: Omit<Egreso, 'id'>) => {
    const id = crypto.randomUUID();
    const nuevo: Egreso = { ...egreso, id, monto: Number(egreso.monto) };

    _cacheEgresos = [..._cacheEgresos, nuevo];

    await supabase.from('egresos').insert({
      id,
      monto: nuevo.monto,
      fecha: nuevo.fecha,
      categoria: nuevo.categoria,
      descripcion: nuevo.descripcion,
      nro_factura: nuevo.nroFactura
    });

    return nuevo;
  },

  eliminarEgreso: async (id: string) => {
    _cacheEgresos = _cacheEgresos.filter(e => e.id !== id);
    await supabase.from('egresos').delete().eq('id', id);
  },

  editarEgreso: async (egreso: Egreso) => {
    const idx = _cacheEgresos.findIndex(e => e.id === egreso.id);
    if (idx !== -1) {
      _cacheEgresos[idx] = { ...egreso, monto: Number(egreso.monto) };
      _cacheEgresos = [..._cacheEgresos];

      await supabase.from('egresos').update({
        monto: egreso.monto,
        fecha: egreso.fecha,
        categoria: egreso.categoria,
        descripcion: egreso.descripcion,
        nro_factura: egreso.nroFactura
      }).eq('id', egreso.id);

      return _cacheEgresos[idx];
    }
    return null;
  },

  getLastAttendanceDate: (inscripcionId: string): string | null => {
    const inscAsist = _cacheAsistencias
      .filter(a => a.inscripcionId === inscripcionId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return inscAsist.length > 0 ? inscAsist[0].fecha : null;
  },

  saveLastConcept: (alumnoId: string, concepto: string) => {
    if (!_cacheConceptMem) _cacheConceptMem = {};
    _cacheConceptMem[alumnoId] = concepto;
    try {
      localStorage.setItem('can_v2_concept_mem', JSON.stringify(_cacheConceptMem));
    } catch { }
  },

  getLastConcept: (alumnoId: string): string | null => {
    if (!_cacheConceptMem) {
      try { _cacheConceptMem = JSON.parse(localStorage.getItem('can_v2_concept_mem') || '{}'); }
      catch { _cacheConceptMem = {}; }
    }
    return _cacheConceptMem ? (_cacheConceptMem[alumnoId] || null) : null;
  },

  getTotalAbonado: (inscripcionId: string): number => {
    return _cachePagos.filter(p => p.inscripcionId === inscripcionId).reduce((acc, p) => acc + Number(p.monto), 0);
  },

  getTotalInvertidoAnual: (alumnoId: string): number => {
    const misInscripcionesIds = _cacheInscripciones.filter(i => i.alumnoId === alumnoId).map(i => i.id);
    return _cachePagos.filter(p => misInscripcionesIds.includes(p.inscripcionId)).reduce((acc, p) => acc + Number(p.monto), 0);
  },

  registrarPago: async (pagoData: Omit<Pago, 'id' | 'reciboNum'>) => {
    const count = (_cachePagos.length + 1).toString().padStart(3, '0');
    const reciboNum = `${new Date().getFullYear()}-${count}`;
    const id = crypto.randomUUID();

    const nuevoPago: Pago = {
      ...pagoData,
      monto: Number(pagoData.monto),
      id,
      reciboNum
    };

    _cachePagos = [..._cachePagos, nuevoPago];

    await supabase.from('pagos').insert({
      id,
      inscripcion_id: pagoData.inscripcionId,
      monto: nuevoPago.monto,
      fecha: pagoData.fecha,
      metodo: pagoData.metodo,
      concepto: pagoData.concepto,
      recibo_num: reciboNum,
      nota: pagoData.nota
    });

    await dbService.sincronizarEstadoInscripcion(pagoData.inscripcionId);
    return nuevoPago;
  },

  updatePago: async (pago: Pago) => {
    const idx = _cachePagos.findIndex(p => p.id === pago.id);
    if (idx !== -1) {
      _cachePagos[idx] = { ...pago, monto: Number(pago.monto) };
      _cachePagos = [..._cachePagos];

      await supabase.from('pagos').update({
        monto: pago.monto,
        fecha: pago.fecha,
        metodo: pago.metodo,
        concepto: pago.concepto,
        nota: pago.nota
      }).eq('id', pago.id);

      await dbService.sincronizarEstadoInscripcion(pago.inscripcionId);
      return _cachePagos[idx];
    }
    return null;
  },

  deletePago: async (pagoId: string) => {
    const idx = _cachePagos.findIndex(p => p.id === pagoId);
    if (idx !== -1) {
      const inscripcionId = _cachePagos[idx].inscripcionId;
      _cachePagos = _cachePagos.filter(p => p.id !== pagoId);

      await supabase.from('pagos').delete().eq('id', pagoId);

      // Update inscription status after deleting payment (re-check debt)
      await dbService.sincronizarEstadoInscripcion(inscripcionId);
    }
  },

  getAllInscripciones: (): Inscripcion[] => _cacheInscripciones,

  sincronizarEstadoInscripcion: async (inscripcionId: string) => {
    const idx = _cacheInscripciones.findIndex(i => i.id === inscripcionId);
    if (idx !== -1) {
      const totalAbonado = dbService.getTotalAbonado(inscripcionId);
      const costo = _cacheInscripciones[idx].costoAcordado;
      let nuevoEstado: InscripcionEstado | null = null;

      if (totalAbonado < costo && (_cacheInscripciones[idx].estado === 'Finalizado' || _cacheInscripciones[idx].estado === 'Archivado')) {
        nuevoEstado = 'Finalizado con Deuda';
      } else if (totalAbonado >= costo && _cacheInscripciones[idx].estado === 'Finalizado con Deuda') {
        nuevoEstado = 'Finalizado';
      }

      if (nuevoEstado && nuevoEstado !== _cacheInscripciones[idx].estado) {
        _cacheInscripciones[idx].estado = nuevoEstado;
        _cacheInscripciones = [..._cacheInscripciones];
        await supabase.from('inscripciones').update({ estado: nuevoEstado }).eq('id', inscripcionId);
      }
    }
  },

  createInscripcion: async (insc: Omit<Inscripcion, 'id' | 'saldoClases' | 'activo' | 'estado'>) => {
    let totalClases = 0;
    const isCustom = insc.moduloId === 'custom' || insc.moduloId === 'Personalizado';
    if (isCustom && insc.customModulo) {
      totalClases = insc.customModulo.totalClases;
    } else {
      const modulo = _cacheModulos.find(m => m.id === insc.moduloId);
      if (!modulo) throw new Error(`Módulo no encontrado.`);
      totalClases = modulo.totalClases;
    }

    const updatesPromises: any[] = [];
    _cacheInscripciones.forEach((i, index) => {
      if (i.alumnoId === insc.alumnoId && i.estado === 'Activo') {
        const abonado = dbService.getTotalAbonado(i.id);
        const newState = abonado < i.costoAcordado ? 'Finalizado con Deuda' : 'Finalizado';
        _cacheInscripciones[index] = { ...i, estado: newState, activo: false };

        updatesPromises.push(
          supabase.from('inscripciones').update({ estado: newState, activo: false }).eq('id', i.id)
        );
      }
    });

    await Promise.all(updatesPromises);

    const id = crypto.randomUUID();
    const nueva: Inscripcion = {
      ...insc,
      id,
      saldoClases: totalClases,
      activo: true,
      estado: 'Activo',
      fechaInscripcion: insc.fechaInscripcion || new Date().toISOString().split('T')[0]
    };

    _cacheInscripciones = [..._cacheInscripciones, nueva];

    const { error } = await supabase.from('inscripciones').insert({
      id,
      alumno_id: nueva.alumnoId,
      modulo_id: nueva.moduloId,
      horario_id: nueva.horarioId,
      fecha_inscripcion: nueva.fechaInscripcion,
      saldo_clases: nueva.saldoClases,
      costo_acordado: nueva.costoAcordado,
      activo: true,
      estado: 'Activo',
      custom_modulo: nueva.customModulo
    });

    if (error) {
      console.error("Error creating inscripcion:", error);
      _cacheInscripciones = _cacheInscripciones.filter(i => i.id !== id);
      throw new Error("Error guardando inscripción en nube.");
    }
    return nueva;
  },

  updateInscripcion: async (insc: Partial<Inscripcion> & { id: string }) => {
    const idx = _cacheInscripciones.findIndex(i => i.id === insc.id);
    if (idx !== -1) {
      // Lógica para recalcular saldoClases si cambia el Módulo
      // El saldo debe ser: TotalClasesNuevo - ClasesConsumidas(P o F)
      const currentInsc = _cacheInscripciones[idx];
      let shouldRecalculate = false;
      let newTotalClases = 0;

      // 1. Detectar si cambió el ID del módulo
      if (insc.moduloId && insc.moduloId !== currentInsc.moduloId) {
        shouldRecalculate = true;
      }
      // 2. O si es un módulo personalizado y cambiaron sus propiedades (ej. total de clases)
      else if ((insc.moduloId === 'custom' || currentInsc.moduloId === 'custom') && insc.customModulo) {
        shouldRecalculate = true;
      }

      // ESTRATEGIA ROBUSTA: Si se provee un moduloId (aunque sea el mismo), forzamos recalculo para asegurar consistencia
      if (insc.moduloId) {
        shouldRecalculate = true;
      }

      if (shouldRecalculate) {
        const targetModuleId = insc.moduloId || currentInsc.moduloId;

        // Determinar el nuevo total de clases
        if (targetModuleId === 'custom' || targetModuleId === 'Personalizado') {
          const customMod = insc.customModulo || currentInsc.customModulo;
          if (customMod) newTotalClases = customMod.totalClases;
        } else {
          const mod = _cacheModulos.find(m => m.id === targetModuleId);
          if (mod) newTotalClases = mod.totalClases;
        }

        // Calcular clases ya consumidas (P o F)
        if (newTotalClases > 0) {
          const consumidas = _cacheAsistencias.filter(a =>
            a.inscripcionId === insc.id && (a.estado === 'P' || a.estado === 'F')
          ).length;

          // Actualizar el saldo (Asegurando no negativo)
          const nuevoSaldo = Math.max(0, newTotalClases - consumidas);



          insc.saldoClases = nuevoSaldo;
        }
      }

      _cacheInscripciones[idx] = { ..._cacheInscripciones[idx], ...insc };
      _cacheInscripciones = [..._cacheInscripciones];

      const updatePayload: any = {};
      if (insc.moduloId) updatePayload.modulo_id = insc.moduloId;
      if (insc.horarioId) updatePayload.horario_id = insc.horarioId;
      if (insc.fechaInscripcion) updatePayload.fecha_inscripcion = insc.fechaInscripcion;
      if (insc.costoAcordado !== undefined) updatePayload.costo_acordado = insc.costoAcordado;
      if (insc.saldoClases !== undefined) updatePayload.saldo_clases = insc.saldoClases;
      if (insc.estado) updatePayload.estado = insc.estado;
      if (insc.customModulo) updatePayload.custom_modulo = insc.customModulo;

      await supabase.from('inscripciones').update(updatePayload).eq('id', insc.id);
    }
  },

  getInscripcionesActivas: (): Inscripcion[] => {
    return dbService.getArchivoMaestro().filter(i => i.estado === 'Activo');
  },

  getArchivoMaestro: (): Inscripcion[] => {
    return _cacheInscripciones.map(i => {
      const isCustom = i.moduloId === 'custom' || i.moduloId === 'Personalizado';
      const foundModulo = isCustom ? i.customModulo : _cacheModulos.find(m => m.id === i.moduloId);
      return {
        ...i,
        alumno: _cacheAlumnos.find(a => a.id === i.alumnoId),
        modulo: foundModulo,
        horario: isCustom ? { id: 'custom-h', moduloId: 'custom', horaInicio: 'Personalizado', horaFin: '' } : _cacheHorarios.find(h => h.id === i.horarioId)
      };
    }).sort((a, b) => new Date(b.fechaInscripcion).getTime() - new Date(a.fechaInscripcion).getTime());
  },

  getCuentasPorCobrar: (): Inscripcion[] => {
    return dbService.getArchivoMaestro().filter(i => {
      const totalAbonado = dbService.getTotalAbonado(i.id);
      return totalAbonado < i.costoAcordado;
    });
  },

  deleteAlumno: async (alumnoId: string) => {
    // 1. Identificar todas las inscripciones del alumno
    const inscripcionesDelAlumno = _cacheInscripciones.filter(i => i.alumnoId === alumnoId);
    const inscripcionesIds = inscripcionesDelAlumno.map(i => i.id);

    // 2. Eliminar Asistencias asociadas a esas inscripciones
    // Cache
    _cacheAsistencias = _cacheAsistencias.filter(a => !inscripcionesIds.includes(a.inscripcionId));
    // DB
    if (inscripcionesIds.length > 0) {
      await supabase.from('asistencias').delete().in('inscripcion_id', inscripcionesIds);
    }

    // 3. Eliminar Pagos asociados a esas inscripciones
    // Cache
    _cachePagos = _cachePagos.filter(p => !inscripcionesIds.includes(p.inscripcionId));
    // DB
    if (inscripcionesIds.length > 0) {
      await supabase.from('pagos').delete().in('inscripcion_id', inscripcionesIds);
    }

    // 4. Eliminar las Inscripciones
    // Cache
    _cacheInscripciones = _cacheInscripciones.filter(i => i.alumnoId !== alumnoId);
    // DB
    await supabase.from('inscripciones').delete().eq('alumno_id', alumnoId);

    // 5. Eliminar al Alumno
    // Cache
    _cacheAlumnos = _cacheAlumnos.filter(a => a.id !== alumnoId);
    // DB
    await supabase.from('alumnos').delete().eq('id', alumnoId);
  },

  registrarAsistencia: async (inscripcionId: string, estado: AttendanceStatus, fecha: string, observacion: string = '') => {
    const iIdx = _cacheInscripciones.findIndex(i => i.id === inscripcionId);
    if (iIdx === -1) throw new Error('Inscripción no encontrada');

    if (new Date(fecha) < new Date(_cacheInscripciones[iIdx].fechaInscripcion)) {
      throw new Error(`Fecha inválida: La clase no puede ser anterior al inicio del módulo (${dbService.formatDateDisplay(_cacheInscripciones[iIdx].fechaInscripcion)})`);
    }

    const existenteIdx = _cacheAsistencias.findIndex(a => a.inscripcionId === inscripcionId && a.fecha === fecha);

    if (existenteIdx !== -1) {
      const anterior = _cacheAsistencias[existenteIdx].estado;
      if (anterior === 'P' || anterior === 'F') _cacheInscripciones[iIdx].saldoClases += 1;

      _cacheAsistencias[existenteIdx].estado = estado;
      _cacheAsistencias[existenteIdx].observacion = observacion;

      await supabase.from('asistencias').update({
        estado,
        observacion
      }).eq('id', _cacheAsistencias[existenteIdx].id);

    } else {
      const id = crypto.randomUUID();
      _cacheAsistencias.push({ id, inscripcionId, fecha, estado, observacion });

      await supabase.from('asistencias').insert({
        id,
        inscripcion_id: inscripcionId,
        fecha,
        estado,
        observacion
      });
    }

    if (estado === 'P' || estado === 'F') {
      if (_cacheInscripciones[iIdx].saldoClases > 0) {
        _cacheInscripciones[iIdx].saldoClases -= 1;
      }
    }

    await supabase.from('inscripciones').update({
      saldo_clases: _cacheInscripciones[iIdx].saldoClases
    }).eq('id', _cacheInscripciones[iIdx].id);

    _cacheInscripciones = [..._cacheInscripciones];
    _cacheAsistencias = [..._cacheAsistencias];

    return _cacheInscripciones[iIdx];
  },

  hasNewerInscription: (alumnoId: string, currentInscripcionId: string): boolean => {
    const current = _cacheInscripciones.find(i => i.id === currentInscripcionId);
    if (!current) return false;

    return _cacheInscripciones.some(i =>
      i.alumnoId === alumnoId &&
      i.id !== currentInscripcionId &&
      (new Date(i.fechaInscripcion).getTime() > new Date(current.fechaInscripcion).getTime() || i.estado === 'Activo')
    );
  },

  editarAsistencia: async (asistenciaId: string, data: { fecha: string, estado: AttendanceStatus, observacion: string }) => {
    const aIdx = _cacheAsistencias.findIndex(a => a.id === asistenciaId);
    if (aIdx === -1) throw new Error('Registro no encontrado');

    const iIdx = _cacheInscripciones.findIndex(i => i.id === _cacheAsistencias[aIdx].inscripcionId);
    if (iIdx === -1) throw new Error('Inscripción no encontrada');

    const oldStatus = _cacheAsistencias[aIdx].estado;
    const newStatus = data.estado;

    if ((oldStatus === 'P' || oldStatus === 'F') && newStatus === 'L') {
      _cacheInscripciones[iIdx].saldoClases += 1;
    } else if (oldStatus === 'L' && (newStatus === 'P' || newStatus === 'F')) {
      _cacheInscripciones[iIdx].saldoClases -= 1;
    }

    _cacheAsistencias[aIdx].fecha = data.fecha;
    _cacheAsistencias[aIdx].estado = data.estado;
    _cacheAsistencias[aIdx].observacion = data.observacion;

    await supabase.from('asistencias').update({
      fecha: data.fecha,
      estado: data.estado,
      observacion: data.observacion
    }).eq('id', asistenciaId);

    await supabase.from('inscripciones').update({
      saldo_clases: _cacheInscripciones[iIdx].saldoClases
    }).eq('id', _cacheInscripciones[iIdx].id);

    _cacheAsistencias = [..._cacheAsistencias];
    _cacheInscripciones = [..._cacheInscripciones];

    return _cacheInscripciones[iIdx];
  }
};
