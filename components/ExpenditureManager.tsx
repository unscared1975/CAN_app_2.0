
import React, { useState, useMemo } from 'react';
import { dbService } from '../services/db';
import { ICONS } from '../constants';
import { Egreso, EgresoCategory } from '../types';
import { ExpenditureReportModal } from './ExpenditureReportModal';

interface ExpenditureManagerProps {
  onUpdate: () => void;
}

export const ExpenditureManager: React.FC<ExpenditureManagerProps> = ({ onUpdate }) => {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'Otros' as EgresoCategory,
    monto: '',
    descripcion: ''
  });

  const [filterCat, setFilterCat] = useState<string>('');
  const [status, setStatus] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const categories: EgresoCategory[] = ['Sueldos', 'Alquiler', 'Materiales', 'Pago de Servicios', 'Otros'];

  const egresos = useMemo(() => {
    return dbService.getEgresos().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [status, filterCat]);

  const filteredEgresos = useMemo(() => {
    return filterCat ? egresos.filter(e => e.categoria === filterCat) : egresos;
  }, [egresos, filterCat]);

  const totalIngresos = useMemo(() => dbService.getPagos().reduce((sum, p) => sum + Number(p.monto), 0), []);
  const totalEgresosVal = useMemo(() => filteredEgresos.reduce((sum, e) => sum + Number(e.monto), 0), [filteredEgresos]);
  const saldoNeto = totalIngresos - totalEgresosVal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.monto || Number(formData.monto) <= 0) return alert("Ingrese un monto válido");
    if (!formData.descripcion) return alert("Ingrese una descripción");

    dbService.registrarEgreso({
      fecha: formData.fecha,
      categoria: formData.categoria,
      monto: Number(formData.monto),
      descripcion: formData.descripcion
    });

    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'Otros',
      monto: '',
      descripcion: ''
    });

    setStatus({ msg: 'Gasto registrado correctamente', type: 'success' });
    setTimeout(() => setStatus(null), 3000);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Seguro que desea eliminar este registro de gasto?")) {
      dbService.eliminarEgreso(id);
      setStatus({ msg: 'Registro eliminado', type: 'success' });
      setTimeout(() => setStatus(null), 3000);
      onUpdate();
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 max-w-[1200px] mx-auto animate-in fade-in duration-500 px-2 md:px-0">
      {status && (
        <div className={`fixed top-8 right-8 z-[110] px-8 py-4 rounded-2xl shadow-2xl text-white font-black text-xs uppercase animate-in slide-in-from-top-10 ${status.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {status.msg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all"
        >
          <ICONS.Printer className="w-4 h-4" /> REPORTE DE GASTOS
        </button>
      </div>

      {/* Financial Summary Cards (Subtle Version) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100 relative overflow-hidden group hover:bg-emerald-50 transition-colors">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 opacity-70">Ingresos Totales (+)</p>
            <p className="text-2xl font-black text-emerald-800">{totalIngresos} Bs.</p>
          </div>
          <div className="absolute -right-3 -bottom-3 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <ICONS.CurrencyDollar className="w-16 h-16" />
          </div>
        </div>

        <div className="bg-red-50/50 p-5 rounded-[2rem] border border-red-100 relative overflow-hidden group hover:bg-red-50 transition-colors">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1 opacity-70">Egresos Filtrados (-)</p>
            <p className="text-2xl font-black text-red-800">{totalEgresosVal} Bs.</p>
          </div>
          <div className="absolute -right-3 -bottom-3 text-red-500/10 group-hover:text-red-500/20 transition-colors">
            <ICONS.TrendDown className="w-16 h-16" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-slate-200 relative overflow-hidden group shadow-sm">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 opacity-70">Saldo Neto Actual (=)</p>
            <p className="text-2xl font-black text-primary">{saldoNeto} Bs.</p>
          </div>
          <div className="absolute -right-3 -bottom-3 text-primary/5 group-hover:text-primary/10 transition-colors">
            <ICONS.Dashboard className="w-16 h-16" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario Compacto - Estilo Móvil */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4">REGISTRAR EGRESO</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-inactive uppercase tracking-widest ml-1 mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold text-primary text-xs outline-none border-2 border-transparent focus:border-primary/10 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-inactive uppercase tracking-widest ml-1 mb-1 block">Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value as EgresoCategory })}
                  className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold text-primary text-xs outline-none border-2 border-transparent focus:border-primary/10 transition-all cursor-pointer"
                >
                  {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-inactive uppercase tracking-widest ml-1 mb-1 block">Monto (Bs.)</label>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={e => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full px-5 py-3 bg-red-50 rounded-xl font-black text-red-600 text-xs outline-none border-2 border-red-100 focus:border-red-200 transition-all shadow-inner"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-inactive uppercase tracking-widest ml-1 mb-1 block">Descripción</label>
                <input
                  type="text"
                  placeholder="Detalle del gasto..."
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold text-primary text-xs outline-none focus:bg-white border-2 border-transparent focus:border-primary/10 transition-all"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/10 hover:bg-red-700 transition-all active:scale-95">
              CONFIRMAR GASTO (-)
            </button>
          </form>
        </div>

        {/* Listado de Gastos */}
        <div className="lg:col-span-8 space-y-6">


          <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-inactive uppercase tracking-widest">
                    <th className="px-6 py-4 whitespace-nowrap">Fecha</th>
                    <th className="px-6 py-4 whitespace-nowrap">Categoría</th>
                    <th className="px-6 py-4 w-full">Descripción</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Monto</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredEgresos.length === 0 ? (
                    <tr><td colSpan={5} className="py-20 text-center text-inactive uppercase text-[10px] font-black tracking-widest opacity-50 italic">No hay egresos registrados</td></tr>
                  ) : (
                    filteredEgresos.map(e => (
                      <tr key={e.id} className="hover:bg-red-50/30 transition-colors group">
                        <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{dbService.formatDateDisplay(e.fecha)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-100">{e.categoria}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-primary uppercase leading-tight">{e.descripcion}</td>
                        <td className="px-6 py-4 text-right text-red-600 font-black whitespace-nowrap">-{e.monto} Bs.</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(e.id)} className="p-2 text-inactive hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><ICONS.Plus className="w-5 h-5 rotate-45" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredEgresos.map(e => (
                <div key={e.id} className="p-5 active:bg-red-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{e.categoria}</p>
                    <h4 className="text-sm font-black text-primary uppercase leading-tight mt-1">{e.descripcion}</h4>
                    <p className="text-[9px] font-bold text-inactive mt-1 uppercase">{dbService.formatDateDisplay(e.fecha)}</p>
                  </div>
                  <p className="text-base font-black text-red-600">-{e.monto} Bs.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showReportModal && <ExpenditureReportModal onClose={() => setShowReportModal(false)} />}
    </div >
  );
};
