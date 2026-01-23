
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ViewMode, Inscripcion, AttendanceStatus, Modulo, Horario, UserRole, Alumno, Pago, Egreso } from './types';
import { dbService } from './services/db';
import { ICONS } from './constants';
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { PaymentModal } from './components/PaymentModal';
import { AttendanceManager } from './components/AttendanceManager';
import { ExpenditureManager } from './components/ExpenditureManager';
import { DashboardStats } from './components/DashboardStats';
import { SettingsManager } from './components/SettingsManager';
import { GeminiAssistant } from './components/GeminiAssistant';
import { receiptService } from './services/receiptService';
import { reportService } from './services/reportService';
import { Sidebar } from './components/Sidebar';
import { Layout } from './components/Layout';
import { FinancialReportModal } from './components/FinancialReportModal';

const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string, role: UserRole } | null>(() => {
    try {
      const saved = localStorage.getItem('can_v2_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [view, setView] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('can_v2_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role === 'TUTOR' ? ViewMode.MI_PROGRESO : ViewMode.DASHBOARD;
      }
    } catch { }
    return ViewMode.DASHBOARD;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpandedMobile, setIsSearchExpandedMobile] = useState(false);
  const [filterModulo, setFilterModulo] = useState('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'ACTIVO' | 'FINALIZADO'>('TODOS');
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [selectedInscripcion, setSelectedInscripcion] = useState<Inscripcion | null>(null);
  const [pagoToEdit, setPagoToEdit] = useState<Pago | undefined>(undefined);
  const [editingStudent, setEditingStudent] = useState<{ alumno: Alumno, inscripcion: Inscripcion, isRenewal?: boolean } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        // Timeout de seguridad: Si DB tarda más de 5s, forzamos carga
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Tiempo de espera agotado")), 8000));

        await Promise.race([
          dbService.init(),
          timeoutPromise
        ]);

        setInitializing(false);
      } catch (e: any) {
        console.error("Error crítico inicializando:", e);
        // No bloqueamos la app, permitimos entrar offline o con datos vacíos
        setInitError(e.message || "Error de conexión");
        setInitializing(false);
      }
    };
    initDB();
  }, []);

  useEffect(() => {
    if (!initializing) {
      loadData();
    }
  }, [view, initializing]);

  // Debug Error Banner (Solo visible si falló init)
  const ErrorBanner = () => initError ? (
    <div className="bg-red-50 text-red-600 px-4 py-2 text-[10px] font-bold text-center border-b border-red-100 flex items-center justify-center gap-2">
      <ICONS.TrendDown className="w-4 h-4" />
      <span>Modo Offline: {initError} - Verifique su conexión</span>
      <button onClick={() => setInitError(null)} className="ml-2 underline">Ocultar</button>
    </div>
  ) : null;

  const loadData = useCallback(() => {
    try {
      const all = dbService.getArchivoMaestro();
      if (view === ViewMode.ASISTENCIA_DIARIA) setInscripciones(all);
      else if (view === ViewMode.CUENTAS_COBRAR) setInscripciones(dbService.getCuentasPorCobrar());
      else if (view === ViewMode.DASHBOARD) setInscripciones(dbService.getInscripcionesActivas());
      else setInscripciones(all);

      setModulos(dbService.getModulos());
      setHorarios(dbService.getHorarios());
    } catch (e) { console.error("Error cargando datos:", e); }
  }, [view]);

  const viewTitles: Record<string, string> = {
    [ViewMode.DASHBOARD]: 'INICIO',
    [ViewMode.ALUMNOS]: 'GESTIÓN DE ALUMNOS',
    [ViewMode.CUENTAS_COBRAR]: 'CUENTAS POR COBRAR',
    [ViewMode.ASISTENCIA_DIARIA]: 'CONTROL DE ASISTENCIA',
    [ViewMode.PAGOS]: 'CAJA Y FINANZAS',
    [ViewMode.GASTOS]: 'GESTIÓN DE EGRESOS',
    [ViewMode.CONFIGURACION]: 'CONFIGURACIÓN',
    [ViewMode.REGISTRO]: 'FICHA DE REGISTRO',
    [ViewMode.MI_PROGRESO]: 'MI PROGRESO'
  };

  const currentTitle = useMemo(() => viewTitles[view] || 'PANEL CONTROL', [view]);

  const filteredInscripciones = useMemo(() => {
    let filtered = inscripciones;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.alumno?.nombre.toLowerCase().includes(term) ||
        i.alumno?.apellido.toLowerCase().includes(term) ||
        i.modulo?.nombre.toLowerCase().includes(term)
      );
    }
    if (filterModulo) filtered = filtered.filter(i => i.moduloId === filterModulo);
    if (filterStatus === 'ACTIVO') filtered = filtered.filter(i => i.saldoClases > 0);
    else if (filterStatus === 'FINALIZADO') filtered = filtered.filter(i => i.saldoClases === 0);
    if (view !== ViewMode.ALUMNOS) filtered = filtered.filter(i => i.estado !== 'Archivado');
    return filtered;
  }, [inscripciones, searchTerm, filterModulo, filterStatus, view]);

  const financialSummary = useMemo(() => {
    const allPagos = dbService.getPagos();
    const allEgresos = dbService.getEgresos();
    const validInscIds = new Set(filteredInscripciones.map(i => i.id));
    const filteredPagos = allPagos.filter(p => validInscIds.has(p.inscripcionId));
    let filteredEgresos = allEgresos;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredEgresos = allEgresos.filter(e =>
        e.descripcion.toLowerCase().includes(term) ||
        e.categoria.toLowerCase().includes(term)
      );
    }
    const totalIngresos = filteredPagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalEgresos = filteredEgresos.reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const saldoNeto = totalIngresos - totalEgresos;
    const history = [
      ...filteredPagos.map(p => {
        const insc = inscripciones.find(i => i.id === p.inscripcionId);
        const alumno = insc?.alumno;
        const totalPagado = insc ? dbService.getTotalAbonado(insc.id) : 0;
        const costo = insc?.costoAcordado || 0;
        const deuda = Math.max(0, costo - totalPagado);

        return {
          ...p,
          type: 'ingreso' as const,
          sortKey: new Date(p.fecha).getTime(),
          tutor: alumno?.tutorNombre || 'Desconocido',
          alumnoNombre: alumno ? `${alumno.nombre} ${alumno.apellido}` : 'Desconocido',
          modulo: insc?.modulo?.nombre,
          statusPago: { totalPagado, costo, deuda }
        };
      }),
      ...filteredEgresos.map(e => ({ ...e, type: 'egreso' as const, sortKey: new Date(e.fecha).getTime(), concepto: e.descripcion, metodo: 'Efectivo', reciboNum: 'EG-' + e.id.slice(0, 4) }))
    ].sort((a, b) => b.sortKey - a.sortKey);
    return { totalIngresos, totalEgresos, saldoNeto, history };
  }, [filteredInscripciones, searchTerm, inscripciones]);

  const handleRegistration = async (data: any) => {
    try {
      if (data.isRenewal) {
        await dbService.createInscripcion({ ...data, alumnoId: data.alumno.id });
        showNotification("Reinscripción exitosa", "success");
      } else if (data.alumno.id && data.inscripcionId) {
        await dbService.updateAlumno(data.alumno);
        await dbService.updateInscripcion({ id: data.inscripcionId, ...data });
        showNotification("Perfil actualizado", "success");
      } else {
        const alumno = await dbService.saveAlumno(data.alumno);
        // Ensure we have an ID before creating inscription
        if (alumno && alumno.id) {
          await dbService.createInscripcion({ alumnoId: alumno.id, ...data });
          showNotification("Alumno registrado", "success");
        } else {
          throw new Error("Error al guardar alumno");
        }
      }
      setEditingStudent(null);
      setView(ViewMode.ALUMNOS);
      loadData();
    } catch (error: any) { showNotification(error.message, "error"); }
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setSearchTerm('');
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div>
            <p className="text-sm font-black text-primary uppercase tracking-widest animate-pulse">Sincronizando Cloud...</p>
            <p className="text-[10px] text-slate-400 mt-2">Por favor espere un momento</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm onLogin={(e, r) => {
    const u = { email: e, role: r };
    setUser(u);
    localStorage.setItem('can_v2_user', JSON.stringify(u));
    setView(r === 'TUTOR' ? ViewMode.MI_PROGRESO : ViewMode.DASHBOARD);
  }} />;

  const showGlobalSearch = [ViewMode.ALUMNOS, ViewMode.ASISTENCIA_DIARIA, ViewMode.PAGOS, ViewMode.CUENTAS_COBRAR].includes(view);

  return (
    <Layout sidebar={
      <Sidebar
        userRole={user.role}
        currentView={view}
        onViewChange={(v) => { setView(v); setEditingStudent(null); }}
      />
    }>
      <ErrorBanner />
      {selectedInscripcion && (
        <PaymentModal
          inscripcion={selectedInscripcion}
          onClose={() => { setSelectedInscripcion(null); setPagoToEdit(undefined); }}
          onSuccess={() => { setSelectedInscripcion(null); setPagoToEdit(undefined); setView(ViewMode.PAGOS); loadData(); }}
        />
      )}

      {notification && (
        <div className="fixed top-8 right-8 z-[100] px-8 py-4 rounded-2xl shadow-2xl text-white font-black text-xs bg-emerald-500 animate-in slide-in-from-top-10">
          {notification.msg}
        </div>
      )}

      {showGlobalSearch && (
        <div className="mb-4 md:mb-8 max-w-[1200px] mx-auto animate-in fade-in duration-300">
          <div className="hidden md:flex items-center gap-3 bg-white p-3.5 rounded-[2rem] border border-slate-100 shadow-xl group focus-within:ring-4 ring-primary/5 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-inactive group-focus-within:text-primary group-focus-within:bg-primary/5 transition-all">
              <ICONS.Users className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="BUSQUEDA GLOBAL: Escriba nombre o módulo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 bg-transparent text-sm font-medium text-primary outline-none placeholder:text-inactive/50 uppercase tracking-tight"
            />
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-medium text-[10px] uppercase outline-none cursor-pointer hover:bg-slate-200 transition-all text-primary border border-slate-200"
              >
                <option value="TODOS">ESTADO: TODOS</option>
                <option value="ACTIVO">ACTIVOS</option>
                <option value="FINALIZADO">FINALIZADOS</option>
              </select>

              <select
                value={filterModulo}
                onChange={e => setFilterModulo(e.target.value)}
                className="px-4 py-2 bg-slate-50 rounded-xl font-medium text-[10px] uppercase outline-none cursor-pointer hover:bg-slate-100 transition-all text-primary"
              >
                <option value="">MÓDULO: TODOS</option>
                {modulos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <button onClick={() => { setSearchTerm(''); setFilterModulo(''); setFilterStatus('TODOS'); }} className="px-4 py-2 bg-primary text-white rounded-xl font-medium text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Limpiar</button>
            </div>
          </div>

          <div className="md:hidden flex items-center justify-between px-2 py-2">
            <h2 className="text-xl font-black text-primary uppercase tracking-tighter">{currentTitle}</h2>
            <button onClick={() => setIsSearchExpandedMobile(true)} className="p-3 bg-white rounded-xl shadow-md text-primary border border-slate-50"><ICONS.Users className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <header className="mb-6 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1200px] mx-auto px-2 md:px-0">
        <div className="hidden md:block">
          <h2 className="text-4xl font-black text-primary tracking-tighter uppercase leading-none mb-2">{currentTitle}</h2>
          <p className="text-xs font-bold text-inactive uppercase tracking-[0.2em]">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {(view === ViewMode.ALUMNOS || view === ViewMode.DASHBOARD) && (
            <button
              onClick={() => { setEditingStudent(null); setView(ViewMode.REGISTRO); }}
              className="flex-1 md:flex-none bg-primary text-white px-6 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <ICONS.Plus className="w-4 h-4 md:w-5 md:h-5" /> NUEVO ALUMNO
            </button>
          )}
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto">
        {view === ViewMode.REGISTRO && <RegistrationForm modulos={modulos} horarios={horarios} onSubmit={handleRegistration} initialData={editingStudent || undefined} />}

        {(view === ViewMode.ALUMNOS || view === ViewMode.CUENTAS_COBRAR) && (
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500 mx-2 md:mx-0">
            {/* VISTA DESKTOP: TABLA CON BARRA DE PROGRESO Y TUTOR */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-primary uppercase tracking-widest">
                    <th className="px-10 py-6">Estudiante</th>
                    <th className="px-10 py-6">Tutor</th>
                    <th className="px-10 py-6 text-center">Clases</th>
                    <th className="px-10 py-6 text-center">Estado</th>
                    {view === ViewMode.CUENTAS_COBRAR && <th className="px-10 py-6 text-right">Deuda</th>}
                    <th className="px-10 py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredInscripciones.map(i => {
                    const total = i.modulo?.totalClases || 0;
                    const consumidas = total - i.saldoClases;
                    const progressPercent = total > 0 ? (consumidas / total) * 100 : 0;
                    const barColor = progressPercent >= 100 ? 'bg-red-500' : progressPercent >= 75 ? 'bg-[#FF6400]' : 'bg-emerald-500';
                    const isFinished = i.saldoClases === 0;
                    const totalAbonado = dbService.getTotalAbonado(i.id);
                    const deuda = i.costoAcordado - totalAbonado;
                    const hasDebt = deuda > 0;
                    const hasNewer = dbService.hasNewerInscription(i.alumnoId, i.id);

                    return (
                      <tr key={i.id} className="hover:bg-slate-50/40 transition-colors group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <img
                              src={i.alumno?.fotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i.alumno?.id}`}
                              alt="Avatar"
                              className="w-12 h-12 rounded-full bg-slate-100 object-cover border-2 border-white shadow-sm"
                            />
                            <div className="space-y-1">
                              <p className="font-black uppercase text-slate-800 leading-tight min-w-[200px]">{i.alumno?.nombre} {i.alumno?.apellido}</p>
                              <p className="text-[9px] font-bold text-inactive uppercase tracking-widest">{i.modulo?.nombre}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="space-y-0.5">
                            <p className="text-xs font-black text-slate-700 uppercase leading-none">{i.alumno?.tutorNombre}</p>
                            <p className="text-[10px] font-bold text-inactive">{i.alumno?.tutorTelefono}</p>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg">
                              <span className={`text-sm font-black ${progressPercent >= 75 ? 'text-[#FF6400]' : 'text-primary'}`}>{consumidas}</span>
                              <span className="text-[10px] font-bold text-inactive">/ {total}</span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-700 ${barColor}`} style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          {isFinished ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                FINALIZADO
                              </span>
                              <span className="text-[9px] font-bold text-inactive">
                                {dbService.formatDateDisplay(dbService.getLastAttendanceDate(i.id) || '')}
                              </span>
                            </div>
                          ) : (
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${i.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}>{i.estado}</span>
                          )}
                        </td>
                        {view === ViewMode.CUENTAS_COBRAR && (
                          <td className="px-10 py-6 text-right whitespace-nowrap">
                            <span className="font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 text-xs">
                              - {deuda} Bs.
                            </span>
                          </td>
                        )}
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isFinished ? (
                              hasDebt ? (
                                <button
                                  onClick={() => setSelectedInscripcion(i)}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-black text-[9px] uppercase border border-red-200 text-center shadow-sm hover:shadow-md active:scale-95 leading-tight"
                                >
                                  <ICONS.CurrencyDollar className="w-4 h-4 shrink-0" />
                                  <span>SALDAR DEUDA PENDIENTE</span>
                                </button>
                              ) : hasNewer ? (
                                <button
                                  disabled
                                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase cursor-not-allowed border border-slate-200"
                                >
                                  <ICONS.CheckCircle className="w-4 h-4" /> RENOVADO
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setEditingStudent({ alumno: i.alumno!, inscripcion: i, isRenewal: true }); setView(ViewMode.REGISTRO); }}
                                  className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6400] text-white rounded-xl hover:bg-orange-700 transition-all font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 active:scale-95"
                                >
                                  <ICONS.Plus className="w-4 h-4" /> RENOVAR
                                </button>
                              )
                            ) : view === ViewMode.CUENTAS_COBRAR ? (
                              <button onClick={() => setSelectedInscripcion(i)} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 active:scale-95">
                                <ICONS.CurrencyDollar className="w-4 h-4" /> COBRAR
                              </button>
                            ) : (
                              <button onClick={() => { setEditingStudent({ alumno: i.alumno!, inscripcion: i }); setView(ViewMode.REGISTRO); }} className="p-3 bg-slate-100 text-primary rounded-xl hover:bg-primary hover:text-white transition-all transform hover:scale-110">
                                <ICONS.Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* VISTA MÓVIL: TARJETAS COMPACTAS (1080x2436 ready) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredInscripciones.map(i => {
                const total = i.modulo?.totalClases || 0;
                const consumidas = total - i.saldoClases;
                const progressPercent = total > 0 ? (consumidas / total) * 100 : 0;
                const barColor = progressPercent >= 100 ? 'bg-red-500' : progressPercent >= 75 ? 'bg-[#FF6400]' : 'bg-emerald-500';
                const isFinished = i.saldoClases === 0;
                const totalAbonado = dbService.getTotalAbonado(i.id);
                const deuda = i.costoAcordado - totalAbonado;
                const hasDebt = deuda > 0;
                const hasNewer = dbService.hasNewerInscription(i.alumnoId, i.id);

                return (
                  <div key={i.id} className="p-5 active:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={i.alumno?.fotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i.alumno?.id}`}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full bg-slate-100 object-cover border-2 border-white shadow-sm"
                        />
                        <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{i.alumno?.nombre} {i.alumno?.apellido}</h4>
                          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">{i.modulo?.nombre}</p>
                        </div>
                      </div>
                      {isFinished ? (
                        hasDebt ? (
                          <button onClick={() => setSelectedInscripcion(i)} className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm active:bg-red-100">
                            <ICONS.CurrencyDollar className="w-5 h-5" />
                          </button>
                        ) : hasNewer ? (
                          <div className="p-2.5 bg-slate-100 text-slate-400 rounded-xl border border-slate-200">
                            <ICONS.CheckCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <button onClick={() => { setEditingStudent({ alumno: i.alumno!, inscripcion: i, isRenewal: true }); setView(ViewMode.REGISTRO); }} className="p-2.5 bg-orange-50 text-[#FF6400] rounded-xl">
                            <ICONS.Plus className="w-5 h-5" />
                          </button>
                        )
                      ) : view === ViewMode.CUENTAS_COBRAR ? (
                        <button onClick={() => setSelectedInscripcion(i)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                          <ICONS.CurrencyDollar className="w-5 h-5" />
                        </button>
                      ) : (
                        <button onClick={() => { setEditingStudent({ alumno: i.alumno!, inscripcion: i }); setView(ViewMode.REGISTRO); }} className="p-2 text-inactive">
                          <ICONS.Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className={`h-full transition-all duration-700 ${barColor}`} style={{ width: `${progressPercent}%` }}></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-inactive uppercase tracking-widest">Tutor Responsable</span>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{i.alumno?.tutorNombre}</p>
                        <p className="text-[10px] font-medium text-slate-500">{i.alumno?.tutorTelefono}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-inactive uppercase tracking-widest block mb-1">Avance</span>
                        <div className="px-2.5 py-1 bg-slate-50 rounded-lg inline-block">
                          <span className="text-xs font-black text-primary">{consumidas}/{total}</span>
                        </div>
                      </div>
                    </div>

                    {isFinished ? (
                      hasDebt ? (
                        <button onClick={() => setSelectedInscripcion(i)} className="w-full mt-4 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-200 shadow-sm hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                          <ICONS.CurrencyDollar className="w-4 h-4" /> SALDAR DEUDA PENDIENTE
                        </button>
                      ) : hasNewer ? (
                        <button disabled className="w-full mt-4 py-3 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2">
                          <ICONS.CheckCircle className="w-4 h-4" /> MÓDULO RENOVADO
                        </button>
                      ) : (
                        <button onClick={() => { setEditingStudent({ alumno: i.alumno!, inscripcion: i, isRenewal: true }); setView(ViewMode.REGISTRO); }} className="w-full mt-4 py-3 bg-[#FF6400] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/10 active:scale-95 transition-all">
                          Renovar Módulo
                        </button>
                      )
                    ) : view === ViewMode.CUENTAS_COBRAR && (
                      <button onClick={() => setSelectedInscripcion(i)} className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all">
                        Realizar Cobro
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === ViewMode.ASISTENCIA_DIARIA && <AttendanceManager inscripciones={filteredInscripciones} onUpdate={loadData} />}
        {view === ViewMode.GASTOS && <ExpenditureManager onUpdate={loadData} />}

        {view === ViewMode.PAGOS && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 px-2 md:px-0">
            <div className="flex justify-end">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-700 active:scale-95 transition-all"
              >
                <ICONS.Printer className="w-4 h-4" /> Generar Extracto
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-emerald-600 text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Ingresos Filtrados (+)</p>
                <p className="text-2xl md:text-3xl font-black">{financialSummary.totalIngresos.toFixed(2)} Bs.</p>
                <div className="absolute -right-4 -bottom-4 opacity-10"><ICONS.CurrencyDollar className="w-20 h-20" /></div>
              </div>
              <div className="bg-red-600 text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Egresos Operativos (-)</p>
                <p className="text-2xl md:text-3xl font-black">{financialSummary.totalEgresos.toFixed(2)} Bs.</p>
                <div className="absolute -right-4 -bottom-4 opacity-10"><ICONS.TrendDown className="w-20 h-20" /></div>
              </div>
              <div className="bg-primary text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Saldo Neto Resultante (=)</p>
                <p className="text-3xl md:text-4xl font-black">{financialSummary.saldoNeto.toFixed(2)} Bs.</p>
                <div className="absolute -right-4 -bottom-4 opacity-10"><ICONS.Dashboard className="w-20 h-20" /></div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
                <ICONS.ListCheck className="w-5 h-5 text-primary" />
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Auditoría Cronológica Filtrada</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-inactive uppercase tracking-widest">
                      <th className="px-8 py-5">Fecha</th>
                      <th className="px-8 py-5">Responsable / Alumno</th>
                      <th className="px-8 py-5">Concepto / Estado de Cuenta</th>
                      <th className="px-8 py-5 text-center">Método</th>
                      <th className="px-8 py-5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {financialSummary.history.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-inactive uppercase text-[10px] font-black tracking-widest opacity-50 italic">No hay transacciones que coincidan con los filtros</td></tr>
                    ) : (
                      financialSummary.history.map((item: any) => (
                        <tr
                          key={item.id}
                          onClick={() => {
                            if (item.type === 'ingreso') {
                              const found = inscripciones.find(i => i.id === item.inscripcionId);
                              if (found) {
                                setSelectedInscripcion(found);
                                setPagoToEdit(item);
                              }
                            }
                          }}
                          className={`hover:bg-slate-50 transition-colors ${item.type === 'ingreso' ? 'cursor-pointer hover:bg-emerald-50/30' : ''}`}
                        >
                          <td className="px-8 py-5 text-xs font-bold text-slate-500">{dbService.formatDateDisplay(item.fecha)}</td>

                          {/* COLUMNA TUTOR / ALUMNO */}
                          <td className="px-8 py-5">
                            {item.type === 'ingreso' ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700 uppercase">{item.tutor}</span>
                                <span className="text-[10px] font-bold text-inactive uppercase tracking-wider flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-slate-300"></div> {item.alumnoNombre}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-400 uppercase italic">Gasto Operativo</span>
                            )}
                          </td>

                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${item.type === 'ingreso' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                              <div>
                                <p className="text-sm font-black text-primary uppercase leading-none">{item.concepto}</p>
                                <p className="text-[9px] font-bold text-inactive mt-1 uppercase tracking-widest">
                                  {item.type === 'ingreso' ? `RE: ${item.reciboNum}` : 'Administración'}
                                </p>
                                {item.type === 'ingreso' && item.statusPago && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">
                                      Total: {item.statusPago.costo.toFixed(2)} Bs
                                    </span>
                                    {item.statusPago.deuda > 0 ? (
                                      <span className="px-2 py-0.5 bg-red-50 rounded text-[9px] font-bold text-red-500 border border-red-100">
                                        Resta: {item.statusPago.deuda.toFixed(2)} Bs
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 rounded text-[9px] font-bold text-emerald-600 border border-emerald-100">
                                        ¡Cancelado!
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-primary uppercase">{item.metodo}</span>
                          </td>
                          <td className={`px-8 py-5 text-right font-black text-base ${item.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.type === 'ingreso' ? '+' : '-'}{Number(item.monto).toFixed(2)} Bs.
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
        }
        {
          view === ViewMode.DASHBOARD && (
            <div className="space-y-6 md:space-y-12 px-2 md:px-0">
              <DashboardStats inscripciones={dbService.getInscripcionesActivas()} pagos={dbService.getPagos()} asistencias={dbService.getAsistencias()} />
              <GeminiAssistant inscripciones={inscripciones} attendance={dbService.getAsistencias()} />
            </div>
          )
        }
        {view === ViewMode.CONFIGURACION && <SettingsManager />}
      </div >
      {showReportModal && <FinancialReportModal onClose={() => setShowReportModal(false)} />}
    </Layout >
  );
};

export default App;
