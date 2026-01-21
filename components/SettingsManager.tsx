
import React, { useState } from 'react';
import { CentroConfig } from '../types';
import { dbService } from '../services/db';

export const SettingsManager: React.FC = () => {
  const [config, setConfig] = useState<CentroConfig>(dbService.getConfig());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    dbService.saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      <h3 className="text-xl font-black text-primary uppercase tracking-tighter mb-6">Identidad del Centro</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">Nombre del Centro</label>
          <input 
            value={config.nombre}
            onChange={e => setConfig({...config, nombre: e.target.value})}
            className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold text-primary focus:bg-white outline-none border-2 border-transparent focus:border-primary/20 transition-all"
          />
        </div>
        
        <div>
          <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">Dirección Física</label>
          <input 
            value={config.direccion}
            onChange={e => setConfig({...config, direccion: e.target.value})}
            className="w-full px-5 py-3 bg-slate-50 rounded-xl focus:bg-white outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">Instagram</label>
            <input 
              value={config.instagram}
              onChange={e => setConfig({...config, instagram: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">Facebook</label>
            <input 
              value={config.facebook}
              onChange={e => setConfig({...config, facebook: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-inactive uppercase tracking-widest block mb-1">TikTok</label>
            <input 
              value={config.tiktok}
              onChange={e => setConfig({...config, tiktok: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      <button 
        onClick={handleSave}
        className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
          saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-slate-700'
        }`}
      >
        {saved ? '✓ Cambios Guardados' : 'Guardar Configuración'}
      </button>
    </div>
  );
};
