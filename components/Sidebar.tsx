
import React from 'react';
import { ViewMode, UserRole } from '../types';
import { ICONS } from '../constants';
import { dbService } from '../services/db';

interface SidebarProps {
    userRole: UserRole;
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, currentView, onViewChange }) => {
    const navItems = [
        { id: ViewMode.DASHBOARD, label: 'Inicio', icon: ICONS.Dashboard, roles: ['ADMIN', 'PROFESOR'] },
        { id: ViewMode.ALUMNOS, label: 'ALUMNOS', icon: ICONS.Users, roles: ['ADMIN', 'PROFESOR'] },
        { id: ViewMode.CUENTAS_COBRAR, label: 'Cobranza', icon: ICONS.TrendDown, roles: ['ADMIN'] },
        { id: ViewMode.ASISTENCIA_DIARIA, label: 'Asistencia', icon: ICONS.Clipboard, roles: ['ADMIN', 'PROFESOR'] },
        { id: ViewMode.PAGOS, label: 'Caja', icon: ICONS.CurrencyDollar, roles: ['ADMIN'] },
        { id: ViewMode.GASTOS, label: 'EGRESOS', icon: ICONS.TrendDown, roles: ['ADMIN'] },
        { id: ViewMode.CONFIGURACION, label: 'Ajustes', icon: ICONS.Settings, roles: ['ADMIN'] },
    ].filter(item => item.roles.includes(userRole));

    return (
        <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-72 bg-white border-t md:border-t-0 md:border-r border-slate-200 z-[60] md:min-h-screen flex md:flex-col shadow-2xl md:shadow-none">
            <div className="hidden md:flex flex-col items-center p-10 border-b border-slate-50">
                <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center mb-4 shadow-xl rotate-3">
                    <span className="text-white font-black text-3xl -rotate-3 tracking-tighter">CAN</span>
                </div>
                <h1 className="text-lg font-black text-primary tracking-tighter uppercase text-center leading-tight">
                    {dbService.getConfig().nombre}
                </h1>
            </div>

            <ul className="flex md:flex-col overflow-x-auto md:overflow-x-visible justify-start md:justify-start gap-3 md:gap-2 p-2 md:p-6 w-full">
                {navItems.map((item) => (
                    <li key={item.id} className="min-w-[70px] flex-shrink-0 flex-grow md:flex-grow-0 md:w-full">
                        <button
                            onClick={() => onViewChange(item.id as ViewMode)}
                            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 w-full px-4 py-3 md:rounded-2xl transition-all duration-200 ${currentView === item.id
                                ? 'text-primary bg-slate-50 md:bg-primary md:text-white md:shadow-lg shadow-primary/20 scale-105 md:scale-100 border-t-4 md:border-t-0 border-primary'
                                : 'text-inactive hover:text-primary hover:bg-slate-50'
                                }`}
                        >
                            <item.icon className={`w-6 h-6 md:w-5 md:h-5 transition-colors ${currentView === item.id && 'text-primary md:text-white'}`} />
                            <span className="text-[8px] md:text-xs font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};
