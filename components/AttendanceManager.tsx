
import React, { useState, useMemo } from 'react';
import { Inscripcion, AttendanceStatus, Asistencia } from '../types';
import { dbService } from '../services/db';
import { ICONS } from '../constants';
import { reportService } from '../services/reportService';

interface AttendanceManagerProps {
  inscripciones: Inscripcion[];
  onUpdate: () => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ inscripciones, onUpdate }) => {
  const [mode, setMode] = useState<'daily' | 'individual'>('daily');
  const [selectedInscId, setSelectedInscId] = useState<string>('');
  const [fechaDiaria, setFechaDiaria] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ fecha: string, estado: AttendanceStatus, observacion: string }>({
    fecha: '',
    estado: 'P',
    observacion: ''
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    obs: '',
    status: 'P' as AttendanceStatus
  });

  const asistencias = dbService.getAsistencias();

  // Dependemos de la lista filtrada que viene por props
  const alumnosDiarios = inscripciones;

  const selectedInscripcion = useMemo(() =>
    inscripciones.find(i => i.id === selectedInscId),
    [inscripciones, selectedInscId]);

  const historialSeleccionado = useMemo(() => {
    return asistencias
      .filter(a => a.inscripcionId === selectedInscId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [asistencias, selectedInscId]);

  const handleRegister = async (inscripcionId: string, estado: AttendanceStatus, date: string, obs: string = '') => {
    try {
      await dbService.registrarAsistencia(inscripcionId, estado, date, obs);
      setStatus({ msg: 'Registro exitoso', type: 'success' });
      setTimeout(() => setStatus(null), 3000);
      setIsAddingNew(false);
      onUpdate();
    } catch (e: any) {
      setStatus({ msg: e.message, type: 'error' });
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const startEditing = (a: Asistencia) => {
    setEditingId(a.id);
    setEditForm({
      fecha: a.fecha,
      estado: a.estado,
      observacion: a.observacion || ''
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await dbService.editarAsistencia(editingId, editForm);
      setEditingId(null);
      setStatus({ msg: 'Actualizado correctamente', type: 'success' });
      setTimeout(() => setStatus(null), 3000);
      onUpdate();
    } catch (e: any) {
      setStatus({ msg: e.message, type: 'error' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const isModuleFinished = selectedInscripcion?.saldoClases === 0;

  return (
    <div className="space-y-10 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      {status && (
        <div className={`fixed top-8 right-8 z-[110] px-8 py-4 rounded-2xl shadow-2xl text-white font-black text-xs uppercase animate-in slide-in-from-top-10 ${status.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {status.msg}
        </div>
      )}

      {/* CABECERA DE NAVEGACIÓN Y ACCIONES PC */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Lado Izquierdo: Selectores de Vista */}
        <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm w-fit mx-auto md:mx-0">
          <button onClick={() => setMode('daily')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'daily' ? 'bg-primary text-white shadow-xl' : 'text-inactive hover:text-primary'}`}>Vista Hoy</button>
          <button onClick={() => setMode('individual')} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'individual' ? 'bg-primary text-white shadow-xl' : 'text-inactive hover:text-primary'}`}>Ficha Alumno</button>
        </div>

        {/* Lado Derecho: Botones de Acción (Desktop) */}
        {mode === 'individual' && selectedInscripcion && (
          <div className="hidden md:flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => { if (!isModuleFinished) setIsAddingNew(!isAddingNew); }}
              disabled={isModuleFinished}
              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-3 active:scale-95 ${isModuleFinished ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-slate-700'
                }`}
            >
              <ICONS.Plus className="w-4 h-4" /> {isModuleFinished ? 'Clases Agotadas' : 'Registrar Avance'}
            </button>
            <button
              onClick={() => reportService.generateProgressReport(selectedInscripcion, historialSeleccionado).save(reportService.getSuggestedFileName(selectedInscripcion))}
              className="px-8 py-3.5 bg-white border border-slate-200 text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
            >
              <ICONS.Download className="w-4 h-4" /> Descargar Historial
            </button>
          </div>
        )}
      </div>

      {mode === 'daily' ? (
        <div className="space-y-8">
          <div className="bg-white px-5 md:px-8 py-5 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
            <div>
              <h3 className="text-sm font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">REGISTRO DE ASISTENCIA DIARIA</h3>
              <p className="text-[10px] font-bold text-inactive uppercase tracking-widest">Lógica de Filtrado Sincronizada</p>
            </div>
            <input type="date" value={fechaDiaria} onChange={e => setFechaDiaria(e.target.value)} className="w-full md:w-auto px-6 py-3 bg-slate-50 rounded-2xl font-black text-primary text-xs outline-none border-2 border-transparent focus:border-primary/5 shadow-inner" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {alumnosDiarios.map(i => {
              const registro = asistencias.find(a => a.inscripcionId === i.id && a.fecha === fechaDiaria);
              const initials = dbService.getInitials(i.alumno?.nombre, i.alumno?.apellido);
              const isFinished = i.saldoClases === 0;
              const canRegisterToday = new Date(fechaDiaria) >= new Date(i.fechaInscripcion);
              const hasPhoto = i.alumno?.fotoUrl && !i.alumno.fotoUrl.includes('ui-avatars.com');

              const total = i.modulo?.totalClases || 0;
              const consumidas = total - i.saldoClases;

              return (
                <div key={i.id} onClick={() => { setSelectedInscId(i.id); setMode('individual'); }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden">
                  <div className="flex items-center gap-5 mb-8">
                    {hasPhoto ? (
                      <img src={i.alumno?.fotoUrl} className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-slate-100 shadow-sm" alt="Profile" />
                    ) : (
                      <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center font-black text-lg group-hover:bg-primary group-hover:text-white transition-all shadow-inner">{initials}</div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-black text-slate-800 text-base leading-none uppercase truncate mb-1">{i.alumno?.nombre} {i.alumno?.apellido}</h4>
                      </div>
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{i.modulo?.nombre}</p>
                    </div>
                  </div>

                  {isFinished ? (
                    <div className="py-4 rounded-2xl text-center font-black text-[11px] uppercase tracking-[0.2em] bg-slate-50 text-slate-400 border border-slate-200 animate-ez-flicker">
                      MÓDULO FINALIZADO
                    </div>
                  ) : registro ? (
                    <div className={`py-4 rounded-2xl text-center font-black text-[11px] uppercase tracking-[0.2em] border ${registro.estado === 'P' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      registro.estado === 'F' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                      REGISTRADO: {registro.estado === 'P' ? 'PRESENTE' : registro.estado === 'F' ? 'FALTA' : 'LICENCIA'}
                    </div>
                  ) : !canRegisterToday ? (
                    <div className="py-4 rounded-2xl text-center font-black text-[10px] uppercase tracking-tighter bg-red-50 text-red-400 border border-red-100">
                      FECHA ANTERIOR AL INICIO
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={(e) => { e.stopPropagation(); handleRegister(i.id, 'P', fechaDiaria); }} className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-600 hover:text-white transition-all">P</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRegister(i.id, 'F', fechaDiaria); }} className="py-4 bg-red-50 text-red-600 rounded-2xl font-black text-sm hover:bg-red-600 hover:text-white transition-all">F</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRegister(i.id, 'L', fechaDiaria); }} className="py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all">L</button>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className={`px-2 py-1 md:px-3 md:py-1.5 rounded-[10px] text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${isFinished ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      INICIO: {dbService.formatDateDisplay(i.fechaInscripcion)}
                    </div>
                    {isFinished && (
                      <div className="px-2 py-1 md:px-3 md:py-1.5 rounded-[10px] bg-slate-50 text-slate-400 border border-slate-100 text-[8px] md:text-[9px] font-black uppercase tracking-widest">
                        FIN: {dbService.formatDateDisplay(asistencias.filter(a => a.inscripcionId === i.id).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]?.fecha || new Date().toISOString())}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">CLASES PENDIENTES</span>
                    <span className={`text-sm font-black ${isFinished ? 'text-red-500' : 'text-primary'}`}>{i.saldoClases}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6 sticky top-8">
              <div className="relative">
                <select
                  value={selectedInscId}
                  onChange={(e) => setSelectedInscId(e.target.value)}
                  className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-black text-primary text-xs outline-none border-2 border-transparent focus:border-primary/5 shadow-inner appearance-none cursor-pointer"
                >
                  <option value="">-- Buscar Alumno --</option>
                  {alumnosDiarios.map(i => (
                    <option key={i.id} value={i.id}>{i.alumno?.nombre} {i.alumno?.apellido}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-primary"><ICONS.Users className="w-5 h-5" /></div>
              </div>

              {selectedInscripcion && (
                <div className="animate-in zoom-in-95 duration-300">
                  <div className={`p-10 rounded-[2.5rem] shadow-xl text-center relative overflow-hidden group mb-8 transition-colors ${isModuleFinished ? 'bg-slate-700' : 'bg-primary'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="w-20 h-20 rounded-[1.5rem] bg-white/20 flex items-center justify-center border-2 border-white/20 shadow-2xl mx-auto mb-6">
                      <span className="text-white font-black text-xl tracking-widest">{dbService.getInitials(selectedInscripcion.alumno?.nombre, selectedInscripcion.alumno?.apellido)}</span>
                    </div>
                    <h4 className="text-xl font-black tracking-tighter mb-1 uppercase leading-none text-white">{selectedInscripcion.alumno?.nombre} {selectedInscripcion.alumno?.apellido}</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-white">{selectedInscripcion.modulo?.nombre}</p>

                    {isModuleFinished && (
                      <p className="text-[11px] font-black uppercase tracking-widest mt-4 animate-ez-flicker">MÓDULO FINALIZADO</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 mt-8 pt-8 text-white">
                      <div className="text-center">
                        <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-1">Total Ciclo</p>
                        <p className="text-xl font-black">{selectedInscripcion.modulo?.totalClases}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-1">Restantes</p>
                        <p className={`text-xl font-black ${isModuleFinished ? 'text-red-400' : 'animate-pulse'}`}>{selectedInscripcion.saldoClases}</p>
                      </div>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN MÓVIL (Solo visibles en Móvil) */}
                  <div className="space-y-4 md:hidden">
                    <button
                      onClick={() => { if (!isModuleFinished) setIsAddingNew(!isAddingNew); }}
                      disabled={isModuleFinished}
                      className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isModuleFinished ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-slate-700'
                        }`}
                    >
                      <ICONS.Plus className="w-5 h-5" /> {isModuleFinished ? 'Clases Agotadas' : 'Registrar Avance'}
                    </button>
                    <button onClick={() => reportService.generateProgressReport(selectedInscripcion, historialSeleccionado).save(reportService.getSuggestedFileName(selectedInscripcion))} className="w-full py-5 bg-slate-100 text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                      <ICONS.Download className="w-5 h-5" /> Descargar Historial
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            {!selectedInscripcion ? (
              <div className="bg-white py-40 rounded-[4rem] border border-dashed border-slate-200 text-center flex flex-col items-center justify-center opacity-60">
                <ICONS.Clipboard className="w-16 h-16 text-slate-200 mb-6" />
                <p className="text-sm font-black text-inactive uppercase tracking-[0.4em] max-w-xs leading-relaxed">Seleccione un estudiante para auditar su historial de clases</p>
              </div>
            ) : (
              <div className="bg-white p-6 md:p-8 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-10 animate-in slide-in-from-right-10 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div> Historial Académico Detallado
                  </h3>
                  {isModuleFinished ? (
                    <span className="px-5 py-2 bg-red-50 text-[10px] font-black text-red-600 rounded-full uppercase tracking-widest border border-red-100 animate-ez-flicker">MÓDULO FINALIZADO</span>
                  ) : (
                    <span className="px-5 py-2 bg-slate-50 text-[10px] font-black text-inactive rounded-full uppercase tracking-widest border border-slate-100">Ciclo Activo</span>
                  )}
                </div>

                {isAddingNew && !isModuleFinished && (
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 animate-in zoom-in-95 space-y-8 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-inactive uppercase ml-2">Fecha Clase (Restricción: {dbService.formatDateDisplay(selectedInscripcion.fechaInscripcion)})</label>
                        <input
                          type="date"
                          min={selectedInscripcion.fechaInscripcion}
                          value={newEntry.date}
                          onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                          className="w-full px-4 py-3 bg-white rounded-xl font-bold text-primary text-xs outline-none border-2 border-slate-100 focus:border-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-inactive uppercase ml-2">Notas / Avance</label>
                        <input type="text" placeholder="Temas abordados..." value={newEntry.obs} onChange={e => setNewEntry({ ...newEntry, obs: e.target.value })} className="w-full px-4 py-3 bg-white rounded-xl font-bold text-slate-700 text-xs outline-none border-2 border-slate-100 focus:border-primary/20 transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {(['P', 'F', 'L'] as AttendanceStatus[]).map(s => (
                        <button key={s} onClick={() => handleRegister(selectedInscId, s, newEntry.date, newEntry.obs)} className={`py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-xl active:scale-95 transition-all shadow-lg ${s === 'P' ? 'bg-emerald-600 text-white shadow-emerald-500/10' : s === 'F' ? 'bg-red-600 text-white shadow-red-500/10' : 'bg-blue-600 text-white shadow-blue-500/10'
                          }`}>
                          {s === 'P' ? 'MARCAR PRESENTE' : s === 'F' ? 'REGISTRAR FALTA' : 'ASIGNAR LICENCIA'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto -mx-6 md:mx-0">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-4 text-[10px] font-black text-primary uppercase tracking-widest text-left whitespace-nowrap">FECHA</th>
                        <th className="px-4 py-4 text-[10px] font-black text-primary uppercase tracking-widest text-center whitespace-nowrap">ESTADO</th>
                        <th className="px-4 py-4 text-[10px] font-black text-primary uppercase tracking-widest text-left">OBSERVACIONES</th>
                        <th className="px-4 py-4 text-[10px] font-black text-primary uppercase tracking-widest text-right whitespace-nowrap">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {historialSeleccionado.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-20 text-center text-inactive uppercase text-[10px] font-black tracking-[0.4em] opacity-50 italic">No se han registrado clases en este módulo aún</td>
                        </tr>
                      ) : (
                        historialSeleccionado.map(h => (
                          <tr key={h.id} className={`group hover:bg-slate-50/50 transition-colors ${editingId === h.id ? 'bg-primary/5' : ''}`}>
                            <td className="px-4 py-4 w-[140px]">
                              {editingId === h.id ? (
                                <input
                                  type="date"
                                  min={selectedInscripcion.fechaInscripcion}
                                  value={editForm.fecha}
                                  onChange={e => setEditForm({ ...editForm, fecha: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-primary outline-none focus:border-primary"
                                />
                              ) : (
                                <span className="text-xs font-black text-slate-700 tracking-tighter whitespace-nowrap">{dbService.formatDateDisplay(h.fecha)}</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center w-[160px]">
                              {editingId === h.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  {(['P', 'F', 'L'] as AttendanceStatus[]).map(s => (
                                    <button key={s} onClick={() => setEditForm({ ...editForm, estado: s })} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${editForm.estado === s ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-inactive'}`}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${h.estado === 'P' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' :
                                  h.estado === 'F' ? 'bg-red-100 text-red-700 border border-red-200/50' :
                                    'bg-blue-100 text-blue-700 border border-blue-200/50'
                                  }`}>
                                  {h.estado === 'P' ? 'Presente' : h.estado === 'F' ? 'Falta' : 'Licencia'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {editingId === h.id ? (
                                <input type="text" value={editForm.observacion} onChange={e => setEditForm({ ...editForm, observacion: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary" />
                              ) : (
                                <p className="text-[11px] font-medium text-slate-500 italic truncate max-w-[200px] lg:max-w-xs" title={h.observacion}>{h.observacion || 'Sin observaciones registradas'}</p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right w-[100px]">
                              {editingId === h.id ? (
                                <div className="flex justify-end gap-2 animate-in slide-in-from-right-2">
                                  <button onClick={saveEdit} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"><ICONS.Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all"><ICONS.Plus className="w-3.5 h-3.5 rotate-45" /></button>
                                </div>
                              ) : (
                                <button onClick={() => startEditing(h)} className="p-2 bg-slate-100 text-primary rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-primary hover:text-white transition-all transform hover:scale-105">
                                  <ICONS.Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 opacity-80">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary"><ICONS.Settings className="w-5 h-5" /></div>
                    <p className="text-[10px] font-bold text-inactive uppercase tracking-widest max-w-[200px] leading-relaxed">Nota: La edición del estado sincroniza automáticamente el saldo de clases.</p>
                  </div>
                  <button onClick={() => reportService.shareModuleCompletionReport(selectedInscripcion)} className="px-8 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-3">
                    <ICONS.Share className="w-4 h-4" /> Notificar Finalización Ciclo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
      }
    </div >
  );
};
