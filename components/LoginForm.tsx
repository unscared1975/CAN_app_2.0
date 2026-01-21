
import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginFormProps {
  onLogin: (email: string, role: UserRole) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Credenciales Mock para la demo
    const validCredentials: Record<UserRole, { email: string, pass: string }> = {
      ADMIN: { email: 'admin@can.com', pass: 'admin123' },
      PROFESOR: { email: 'profe@can.com', pass: 'profe123' },
      TUTOR: { email: 'tutor@can.com', pass: 'tutor123' }
    };

    const creds = validCredentials[role];

    if (email === creds.email && password === creds.pass) {
      onLogin(email, role);
    } else {
      setError(`Credenciales incorrectas para el rol ${role}. Pruebe con ${creds.email} / ${creds.pass}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20 rotate-3">
            <span className="text-white text-3xl font-black -rotate-3 tracking-tighter">CAN</span>
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tighter">CAN app 2.0</h1>
          <p className="text-[10px] font-black text-inactive uppercase tracking-[0.2em] mt-2">Plataforma de Nivelación</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
          {(['ADMIN', 'PROFESOR', 'TUTOR'] as UserRole[]).map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                role === r ? 'bg-white text-primary shadow-sm' : 'text-inactive hover:text-slate-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-tight leading-tight">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Acceso</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none transition-all text-sm font-bold shadow-inner"
              placeholder={role === 'ADMIN' ? 'admin@can.com' : role === 'PROFESOR' ? 'profe@can.com' : 'tutor@can.com'}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contraseña</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none transition-all text-sm font-bold shadow-inner"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-700 hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};
