
import React from 'react';
import { Inscripcion, Pago, Asistencia } from '../types';
import { dbService } from '../services/db';
import { ICONS } from '../constants';

interface DashboardStatsProps {
  inscripciones: Inscripcion[];
  pagos: Pago[];
  asistencias: Asistencia[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ inscripciones, pagos, asistencias }) => {
  const hoyStr = new Date().toISOString().split('T')[0];
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth();
  const anioActual = fechaActual.getFullYear();
  
  // 1. Ingresos del Mes
  const ingresosMes = pagos
    .filter(p => {
      try {
        const pFecha = new Date(p.fecha);
        return pFecha.getMonth() === mesActual && pFecha.getFullYear() === anioActual;
      } catch { return false; }
    })
    .reduce((acc, p) => acc + Number(p.monto || 0), 0);
  
  // 2. Alumnos Activos
  const alumnosActivosCount = inscripciones.filter(i => i.estado === 'Activo').length;
  
  // 3. Asistencia Hoy (%)
  const asistenciasHoy = asistencias.filter(a => a.fecha === hoyStr);
  const presentesHoy = asistenciasHoy.filter(a => a.estado === 'P').length;
  const tasaAsistencia = asistenciasHoy.length > 0 
    ? Math.round((presentesHoy / asistenciasHoy.length) * 100) 
    : 0;

  // 4. Cuentas por Cobrar
  const allInscriptions = dbService.getArchivoMaestro();
  const totalCuentasPorCobrar = allInscriptions.reduce((acc, i) => {
    const abonado = dbService.getTotalAbonado(i.id);
    const costo = i.modulo?.costoBase || 0;
    const saldo = Math.max(0, costo - abonado);
    return acc + saldo;
  }, 0);

  const stats = [
    { label: 'Ingresos Mes', value: `${ingresosMes} Bs.`, Icon: ICONS.CurrencyDollar, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Alumnos Activos', value: alumnosActivosCount, Icon: ICONS.Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Asistencia Hoy', value: `${tasaAsistencia}%`, Icon: ICONS.Check, color: 'bg-amber-50 text-amber-600' },
    { label: 'Cobranza Total', value: `${totalCuentasPorCobrar} Bs.`, Icon: ICONS.TrendDown, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-primary/10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
            <s.Icon className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-inactive uppercase tracking-widest">{s.label}</p>
          <p className="text-xl font-black text-slate-800 tracking-tight">{s.value}</p>
        </div>
      ))}
    </div>
  );
};
