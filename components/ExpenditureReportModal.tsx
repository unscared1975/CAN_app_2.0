import React, { useState } from 'react';
import { ICONS } from '../constants';
import { dbService } from '../services/db';
import { reportService } from '../services/reportService';
import { Egreso } from '../types';

interface Props {
    onClose: () => void;
}

type RangeType = 'HOY' | 'SEMANA' | 'MES' | 'CUSTOM';

export const ExpenditureReportModal: React.FC<Props> = ({ onClose }) => {
    const [rangeType, setRangeType] = useState<RangeType>('HOY');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [loading, setLoading] = useState(false);

    // Preview States
    const [previewMode, setPreviewMode] = useState(false);
    const [reportData, setReportData] = useState<Egreso[]>([]);
    const [reportTitle, setReportTitle] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);

    const handleConsult = () => {
        setLoading(true);
        try {
            const allEgresos = dbService.getEgresos();

            let filteredEgresos = [];
            let calculatedTitle = '';

            const now = new Date();

            if (rangeType === 'HOY') {
                const todayStr = now.toISOString().split('T')[0];
                filteredEgresos = allEgresos.filter(e => e.fecha.startsWith(todayStr));
                calculatedTitle = `Reporte del Día: ${todayStr}`;
            } else if (rangeType === 'SEMANA') {
                const day = now.getDay() || 7; // 1 (Mon) to 7 (Sun)
                const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(now);
                monday.setDate(day === 0 ? now.getDate() - 6 : now.getDate() - (day - 1));
                monday.setHours(0, 0, 0, 0);

                const nextSunday = new Date(monday);
                nextSunday.setDate(monday.getDate() + 6);
                nextSunday.setHours(23, 59, 59, 999);

                filteredEgresos = allEgresos.filter(e => {
                    const d = new Date(e.fecha + 'T12:00:00'); // Safe Parse
                    return d >= monday && d <= nextSunday;
                });
                calculatedTitle = `Semana del ${monday.toLocaleDateString()} al ${nextSunday.toLocaleDateString()}`;
            } else if (rangeType === 'MES') {
                const monthStr = now.toISOString().slice(0, 7);
                filteredEgresos = allEgresos.filter(e => e.fecha.startsWith(monthStr));
                calculatedTitle = `Reporte Mensual: ${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
            } else if (rangeType === 'CUSTOM') {
                filteredEgresos = allEgresos.filter(e => e.fecha.startsWith(selectedMonth));
                calculatedTitle = `Reporte Histórico: ${new Date(selectedMonth + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
            }

            // Sort chronological
            filteredEgresos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            const total = filteredEgresos.reduce((acc, curr) => acc + Number(curr.monto), 0);

            setReportData(filteredEgresos);
            setReportTitle(calculatedTitle);
            setTotalAmount(total);
            setPreviewMode(true);
        } catch (e) {
            console.error(e);
            alert("Error al generar consulta");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        try {
            const doc = reportService.generateExpenditureReport(reportData, reportTitle, totalAmount);
            const fileName = `Reporte_Egresos_${rangeType}_${new Date().getTime()}.pdf`;
            doc.save(fileName);
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error al generar PDF");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`bg-white p-6 rounded-[2rem] shadow-2xl w-full transition-all duration-300 ${previewMode ? 'max-w-3xl' : 'max-w-md'} animate-in zoom-in-95`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-red-600 uppercase tracking-tight">
                        {previewMode ? 'Vista Previa de Egresos' : 'Reporte de Egresos'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">✕</button>
                </div>

                {!previewMode ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {(['HOY', 'SEMANA', 'MES', 'CUSTOM'] as RangeType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setRangeType(type)}
                                    className={`p-4 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${rangeType === type ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                                >
                                    {type === 'HOY' ? 'Hoy' : type === 'SEMANA' ? 'Esta Semana' : type === 'MES' ? 'Este Mes' : 'Mes Anterior'}
                                </button>
                            ))}
                        </div>

                        {rangeType === 'CUSTOM' && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="text-[10px] font-black uppercase text-inactive tracking-widest block mb-2">Seleccionar Mes y Año</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-red-600 outline-none focus:ring-2 ring-red-200"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleConsult}
                            disabled={loading}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? 'Consultando...' : (
                                <>
                                    <ICONS.ListCheck className="w-5 h-5" /> Consultar Egresos
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                        <div className="bg-red-50 p-1 rounded-xl">
                            <h4 className="text-center py-3 text-xs font-black uppercase tracking-widest text-red-400">{reportTitle}</h4>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto border border-slate-100 rounded-2xl p-4 custom-scrollbar">
                            {reportData.length === 0 ? (
                                <p className="text-center py-10 text-slate-400 font-medium italic">No se encontraron egresos en este rango.</p>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 sticky top-0 bg-white">
                                            <th className="pb-3 pl-2">Fecha</th>
                                            <th className="pb-3 text-center">Categoría</th>
                                            <th className="pb-3">Descripción</th>
                                            <th className="pb-3 pr-2 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="text-[11px] group hover:bg-red-50/20 transition-colors">
                                                <td className="py-3 pl-2 font-bold text-slate-500 whitespace-nowrap">{dbService.formatDateDisplay(row.fecha)}</td>
                                                <td className="py-3 text-center"><span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-[6px] text-[9px] font-black uppercase tracking-wider">{row.categoria}</span></td>
                                                <td className="py-3 text-slate-600 uppercase font-medium">{row.descripcion}</td>
                                                <td className="py-3 pr-2 text-right font-black text-red-600 tracking-tight">- {row.monto} Bs.</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex items-center justify-between bg-red-50/50 p-4 rounded-2xl border border-red-100">
                            <span className="text-xs font-black text-red-600 uppercase tracking-widest opacity-70">Total Egresos</span>
                            <span className="text-2xl font-black text-red-600 tracking-tight">{totalAmount} Bs.</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setPreviewMode(false)}
                                className="py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all text-xs"
                            >
                                Volver
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={reportData.length === 0}
                                className="py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ICONS.Printer className="w-4 h-4" /> Imprimir PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
