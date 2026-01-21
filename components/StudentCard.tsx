
import React, { useState, useEffect } from 'react';
import { Inscripcion, AttendanceStatus } from '../types';
import { dbService } from '../services/db';

interface StudentCardProps {
  inscripcion: Inscripcion;
  onAttendance: (status: AttendanceStatus) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ inscripcion, onAttendance }) => {
  const { alumno, modulo, horario, saldoClases } = inscripcion;
  const [pop, setPop] = useState(false);

  useEffect(() => {
    setPop(true);
    const timer = setTimeout(() => setPop(false), 300);
    return () => clearTimeout(timer);
  }, [saldoClases]);

  const totalAbonado = dbService.getTotalAbonado(inscripcion.id);
  const saldoDeuda = Math.max(0, (inscripcion.costoAcordado || 0) - totalAbonado);

  const isCritical = saldoClases <= 1;
  const isWarning = saldoClases >= 2 && saldoClases <= 3;

  if (!alumno || !modulo) return null;

  const hasRealPhoto = alumno.fotoUrl && !alumno.fotoUrl.includes('ui-avatars.com');
  const initials = dbService.getInitials(alumno.nombre, alumno.apellido);

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${isCritical ? 'border-red-100 ring-1 ring-red-50' : 'border-slate-100'} overflow-hidden hover:shadow-md transition-all duration-300`}>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          {hasRealPhoto ? (
            <img 
              src={alumno.fotoUrl} 
              alt={alumno.nombre} 
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-50 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center border-2 border-slate-50 shadow-sm">
              <span className="text-white font-black text-xs tracking-widest">{initials}</span>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <h3 className="text-lg font-extrabold text-[#28485c] truncate leading-tight">
              {alumno.nombre} {alumno.apellido}
            </h3>
            <p className="text-[10px] font-bold text-inactive uppercase tracking-wider">
              {modulo.nombre} • {horario?.horaInicio}-{horario?.horaFin}
            </p>
          </div>
          <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transform transition-transform duration-300 ${pop ? 'scale-125' : 'scale-100'} ${
            isCritical ? 'bg-red-500 text-white' : isWarning ? 'bg-[#FF6400] text-white' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {saldoClases} {saldoClases === 1 ? 'Clase' : 'Clases'}
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 p-2 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[9px] font-black text-inactive uppercase tracking-widest">Saldo Deuda:</span>
          <span className={`text-xs font-black ${saldoDeuda > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {saldoDeuda} Bs.
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onAttendance('P')}
            disabled={isCritical && saldoClases === 0}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-30"
          >
            <span className="text-base font-black">P</span>
            <span className="text-[8px] font-bold uppercase tracking-widest">Pres.</span>
          </button>
          <button
            onClick={() => onAttendance('F')}
            disabled={isCritical && saldoClases === 0}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
          >
            <span className="text-base font-black">F</span>
            <span className="text-[8px] font-bold uppercase tracking-widest">Falta</span>
          </button>
          <button
            onClick={() => onAttendance('L')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white transition-all"
          >
            <span className="text-base font-black">L</span>
            <span className="text-[8px] font-bold uppercase tracking-widest">Lic.</span>
          </button>
        </div>
      </div>
    </div>
  );
};
