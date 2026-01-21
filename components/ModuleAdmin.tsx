
import React from 'react';
import { Modulo } from '../types';

interface ModuleAdminProps {
  modulos: Modulo[];
  onUpdateCost: (id: string, cost: number) => void;
}

export const ModuleAdmin: React.FC<ModuleAdminProps> = ({ modulos, onUpdateCost }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {modulos.map(m => (
        <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-xl font-black text-primary">{m.nombre}</h4>
            <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold text-inactive rounded-lg uppercase tracking-tighter">
              {m.totalClases} clases
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-inactive uppercase tracking-widest mb-1 block">Costo Base (Bs)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={m.costoBase}
                  onChange={(e) => onUpdateCost(m.id, parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl font-black text-slate-800 text-lg focus:bg-white transition-all"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onUpdateCost(m.id, m.costoBase - 50)}
                className="py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black hover:bg-red-500 hover:text-white transition-all active:scale-95"
              >
                - 50 Bs
              </button>
              <button 
                onClick={() => onUpdateCost(m.id, m.costoBase + 50)}
                className="py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
              >
                + 50 Bs
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
