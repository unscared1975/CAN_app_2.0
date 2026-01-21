
import React, { useState, useEffect } from 'react';
import { Modulo, Horario, Alumno, Inscripcion } from '../types';
import { dbService } from '../services/db';

interface RegistrationFormProps {
  modulos: Modulo[];
  horarios: Horario[];
  onSubmit: (data: any) => void;
  initialData?: { alumno: Alumno, inscripcion: Inscripcion, isRenewal?: boolean };
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ modulos, horarios, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', colegio: '', grado: '',
    tutorNombre: '', tutorTelefono: '',
    moduloId: '', horarioId: '',
    fotoUrl: '',
    fechaInscripcion: new Date().toISOString().split('T')[0],
    costoAcordado: '',
    customTotalClases: '',
    customHorasPorClase: '1',
  });

  useEffect(() => {
    if (initialData) {
      const { alumno, inscripcion, isRenewal } = initialData;
      setFormData({
        nombre: alumno.nombre || '',
        apellido: alumno.apellido || '',
        colegio: alumno.colegio || '',
        grado: alumno.grado || '',
        tutorNombre: alumno.tutorNombre || '',
        tutorTelefono: alumno.tutorTelefono || '',
        moduloId: isRenewal ? '' : (inscripcion.moduloId || ''),
        horarioId: isRenewal ? '' : (inscripcion.horarioId || ''),
        fotoUrl: alumno.fotoUrl || '',
        fechaInscripcion: isRenewal ? new Date().toISOString().split('T')[0] : (inscripcion.fechaInscripcion || new Date().toISOString().split('T')[0]),
        costoAcordado: isRenewal ? '' : (inscripcion.costoAcordado?.toString() || ''),
        customTotalClases: inscripcion.customModulo?.totalClases.toString() || '',
        customHorasPorClase: inscripcion.customModulo?.horasPorClase.toString() || '1',
      });
    }
  }, [initialData]);

  const availableHorarios = horarios.filter(h => h.moduloId === formData.moduloId);

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mid = e.target.value;
    const selectedMod = modulos.find(m => m.id === mid);

    setFormData(prev => ({
      ...prev,
      moduloId: mid,
      horarioId: '',
      costoAcordado: selectedMod ? selectedMod.costoBase.toString() : (mid === 'custom' ? prev.costoAcordado : '')
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, fotoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdjustCost = (amount: number) => {
    setFormData(prev => {
      const current = parseFloat(prev.costoAcordado) || 0;
      return { ...prev, costoAcordado: Math.max(0, current + amount).toString() };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCustom = formData.moduloId === 'custom';

    if (!formData.moduloId) return alert("Seleccione un módulo académico");
    if (!formData.fechaInscripcion) return alert("Seleccione una fecha de inicio de clases");
    if (!formData.costoAcordado || parseFloat(formData.costoAcordado) <= 0) return alert("Indique el costo final pactado");

    if (!isCustom && !formData.horarioId) return alert("Seleccione un horario/turno");

    if (isCustom) {
      if (!formData.customTotalClases || parseInt(formData.customTotalClases) <= 0) {
        return alert("Ingrese un número válido de clases para el módulo personalizado");
      }
    }

    const initials = dbService.getInitials(formData.nombre, formData.apellido);
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${initials}&background=26475C&color=fff&bold=true&format=svg`;

    const payload: any = {
      alumno: {
        id: initialData?.alumno.id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        colegio: formData.colegio,
        grado: formData.grado,
        tutorNombre: formData.tutorNombre,
        tutorTelefono: formData.tutorTelefono,
        fotoUrl: formData.fotoUrl || defaultAvatarUrl
      },
      inscripcionId: initialData?.isRenewal ? null : initialData?.inscripcion.id,
      moduloId: formData.moduloId,
      horarioId: isCustom ? 'custom-h' : formData.horarioId,
      fechaInscripcion: formData.fechaInscripcion,
      costoAcordado: parseFloat(formData.costoAcordado),
      isRenewal: initialData?.isRenewal
    };

    if (isCustom) {
      payload.customModulo = {
        id: 'custom',
        nombre: 'Módulo Personalizado',
        totalClases: parseInt(formData.customTotalClases),
        horasPorClase: parseFloat(formData.customHorasPorClase),
        costoBase: parseFloat(formData.costoAcordado)
      };
    }

    onSubmit(payload);
  };

  const initials = dbService.getInitials(formData.nombre, formData.apellido);
  const previewUrl = formData.fotoUrl ||
    (formData.nombre
      ? `https://ui-avatars.com/api/?name=${initials}&background=F1F5F9&color=26475C&bold=true&size=256`
      : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png');

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 px-2 md:px-0">
      <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 md:gap-6 border-b border-slate-50 pb-4 md:pb-6">
          <div className="relative shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center group cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
              <img src={previewUrl} alt="Alumno" className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
            </div>
            {!initialData?.isRenewal && (
              <label className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-xl cursor-pointer hover:bg-slate-700 transition-all shadow-xl z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">
              {initialData?.isRenewal ? 'Renovación de Módulo' : initialData ? 'Editar Ficha' : 'Nueva Inscripción'}
            </h2>
            <p className="text-[10px] font-bold text-inactive uppercase tracking-widest mt-1">
              {initialData?.isRenewal ? `Actualizando servicios para ${formData.nombre}` : 'Complete los campos requeridos'}
            </p>
          </div>
        </div>

        {/* Sección Datos Personales - Grid Ajustado (Gap-4 en lugar de Gap-10) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div className="space-y-2 md:space-y-3">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Datos del Estudiante
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              <input
                placeholder="Nombres"
                value={formData.nombre}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 rounded-xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-primary/10 transition-all text-sm"
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                required
                disabled={initialData?.isRenewal}
              />
              <input
                placeholder="Apellidos"
                value={formData.apellido}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 rounded-xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-primary/10 transition-all text-sm"
                onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                required
                disabled={initialData?.isRenewal}
              />
              <input
                placeholder="Colegio"
                value={formData.colegio}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 rounded-xl outline-none focus:bg-white border-2 border-transparent focus:border-primary/10 transition-all text-sm"
                onChange={e => setFormData({ ...formData, colegio: e.target.value })}
                disabled={initialData?.isRenewal}
              />
              <input
                placeholder="Grado"
                value={formData.grado}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 rounded-xl outline-none focus:bg-white border-2 border-transparent focus:border-primary/10 transition-all text-sm"
                onChange={e => setFormData({ ...formData, grado: e.target.value })}
                disabled={initialData?.isRenewal}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Tutor Responsable
            </h3>
            <div className="grid grid-cols-1 gap-2 md:gap-3">
              <input
                placeholder="Nombre Completo del Tutor"
                value={formData.tutorNombre}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 rounded-xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-primary/10 transition-all text-sm"
                onChange={e => setFormData({ ...formData, tutorNombre: e.target.value })}
                required
                disabled={initialData?.isRenewal}
              />
              <input
                placeholder="Teléfono / WhatsApp"
                value={formData.tutorTelefono}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 rounded-xl outline-none focus:bg-white border-2 border-transparent focus:border-primary/10 transition-all text-sm"
                onChange={e => setFormData({ ...formData, tutorTelefono: e.target.value })}
                required
                disabled={initialData?.isRenewal}
              />
            </div>
          </div>
        </div>

        {/* Sección Académica - Compactada */}
        <div className="pt-6 space-y-4 border-t border-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div>
              <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">Fecha de Inicio</label>
              <input
                type="date"
                value={formData.fechaInscripcion}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-white border border-slate-200 rounded-xl font-bold text-primary outline-none focus:border-primary/30 transition-all text-sm"
                onChange={e => setFormData({ ...formData, fechaInscripcion: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">Módulo Académico</label>
              <select
                value={formData.moduloId}
                className="w-full px-3 py-2 md:px-4 md:py-3 bg-white border border-slate-200 rounded-xl font-bold text-primary outline-none focus:border-primary/30 transition-all cursor-pointer text-sm"
                onChange={handleModuleChange}
                required
              >
                <option value="">-- Seleccionar --</option>
                {modulos.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.totalClases} clases)</option>)}
                <option value="custom">★ Módulo Personalizado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {formData.moduloId !== 'custom' ? (
              <div>
                <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">Turno / Horario</label>
                <select
                  value={formData.horarioId}
                  className="w-full px-3 py-2 md:px-4 md:py-3 bg-white border border-slate-200 rounded-xl font-bold text-primary outline-none focus:border-primary/30 transition-all cursor-pointer disabled:opacity-50 text-sm"
                  disabled={!formData.moduloId}
                  onChange={e => setFormData({ ...formData, horarioId: e.target.value })}
                  required={formData.moduloId !== 'custom'}
                >
                  <option value="">-- Seleccionar --</option>
                  {availableHorarios.map(h => <option key={h.id} value={h.id}>{h.horaInicio} - {h.horaFin}</option>)}
                </select>
              </div>
            ) : (
              <div className="bg-primary/5 p-4 rounded-xl animate-in zoom-in-95 duration-200">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Módulo Especial
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-inactive uppercase tracking-widest block mb-1">Total Clases</label>
                    <input
                      type="number"
                      placeholder="Ej: 12"
                      min="1"
                      value={formData.customTotalClases}
                      className="w-full px-3 py-2 bg-white rounded-lg font-bold text-primary outline-none border border-slate-200 focus:border-primary/20 text-xs"
                      onChange={e => setFormData({ ...formData, customTotalClases: e.target.value })}
                      required={formData.moduloId === 'custom'}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-inactive uppercase tracking-widest block mb-1">Hrs/Clase</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 1.5"
                      value={formData.customHorasPorClase}
                      className="w-full px-3 py-2 bg-white rounded-lg font-bold text-primary outline-none border border-slate-200 focus:border-primary/20 text-xs"
                      onChange={e => setFormData({ ...formData, customHorasPorClase: e.target.value })}
                      required={formData.moduloId === 'custom'}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-primary text-white p-4 rounded-2xl flex flex-col justify-center">
              <label className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-80 decoration-white/30 underline-offset-4">COSTO (Bs.-)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAdjustCost(-50)}
                  className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg hover:bg-white/20 transition-all font-black active:scale-95"
                >
                  -
                </button>
                <div className="flex-1 flex items-center gap-2 border-b-2 border-white/30 focus-within:border-white transition-all">
                  <span className="text-xl font-black">Bs.</span>
                  <input
                    type="number"
                    value={formData.costoAcordado}
                    onChange={e => setFormData({ ...formData, costoAcordado: e.target.value })}
                    className="w-full bg-transparent text-2xl font-black outline-none py-1 placeholder:text-white/20 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAdjustCost(50)}
                  className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg hover:bg-white/20 transition-all font-black active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-700 active:scale-95 transition-all">
          {initialData?.isRenewal ? 'Activar Renovación' : initialData ? 'Guardar Cambios' : 'Registrar Alumno'}
        </button>
      </form>
    </div>
  );
};
