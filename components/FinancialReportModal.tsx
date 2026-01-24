import React, { useState } from 'react';
import { ICONS } from '../constants';
import { dbService } from '../services/db';
import { reportService } from '../services/reportService';

interface Props {
    onClose: () => void;
}

type RangeType = 'HOY' | 'SEMANA' | 'MES' | 'CUSTOM';

export const FinancialReportModal: React.FC<Props> = ({ onClose }) => {
    const [rangeType, setRangeType] = useState<RangeType>('HOY');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [loading, setLoading] = useState(false);

    // Preview States
    const [previewMode, setPreviewMode] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [reportTitle, setReportTitle] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);

    const handleConsult = () => {
        setLoading(true);
        try {
            const allPagos = dbService.getPagos();
            const allInscripciones = dbService.getAllInscripciones();

            let filteredPagos = [];
            let calculatedTitle = '';

            const now = new Date();

            if (rangeType === 'HOY') {
                const todayStr = now.toISOString().split('T')[0];
                filteredPagos = allPagos.filter(p => p.fecha.startsWith(todayStr));
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

                filteredPagos = allPagos.filter(p => {
                    const d = new Date(p.fecha + 'T12:00:00'); // Safe Parse
                    return d >= monday && d <= nextSunday;
                });
                calculatedTitle = `Semana del ${monday.toLocaleDateString()} al ${nextSunday.toLocaleDateString()}`;
            } else if (rangeType === 'MES') {
                const monthStr = now.toISOString().slice(0, 7);
                filteredPagos = allPagos.filter(p => p.fecha.startsWith(monthStr));
                calculatedTitle = `Reporte Mensual: ${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
            } else if (rangeType === 'CUSTOM') {
                filteredPagos = allPagos.filter(p => p.fecha.startsWith(selectedMonth));
                calculatedTitle = `Reporte Histórico: ${new Date(selectedMonth + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`; // -02 to avoid timezone prev month issues
            }

            const maestro = dbService.getArchivoMaestro();
            const data = filteredPagos.map(p => {
                const insc = maestro.find(i => i.id === p.inscripcionId);
                const alumno = insc?.alumno;
                return {
                    fecha: p.fecha,
                    tutor: alumno?.tutorNombre || 'Desconocido',
                    metodo: p.metodo,
                    alumno: alumno ? `${alumno.nombre} ${alumno.apellido}` : 'Desconocido',
                    monto: Number(p.monto)
                };
            }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            const total = data.reduce((acc, curr) => acc + curr.monto, 0);

            setReportData(data);
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
            const doc = reportService.generateFinancialReport(reportData, reportTitle, totalAmount);
            const fileName = `Reporte_Financiero_${rangeType}_${new Date().getTime()}.pdf`;
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
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight">
                        {previewMode ? 'Vista Previa de Extracto' : 'Generar Extracto'}
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
                                    className={`p-4 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${rangeType === type ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
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
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-primary outline-none focus:ring-2 ring-primary/20"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleConsult}
                            disabled={loading}
                            className="w-full py-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? 'Consultando...' : (
                                <>
                                    <ICONS.ListCheck className="w-5 h-5" /> Consultar Extracto
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <h4 className="text-center py-3 text-xs font-black uppercase tracking-widest text-slate-500">{reportTitle}</h4>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto border border-slate-100 rounded-2xl p-4 custom-scrollbar">
                            {reportData.length === 0 ? (
                                <p className="text-center py-10 text-slate-400 font-medium italic">No se encontraron movimientos en este rango.</p>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 sticky top-0 bg-white">
                                            <th className="pb-3 pl-2">Fecha</th>
                                            <th className="pb-3">Tutor</th>
                                            <th className="pb-3 text-center">Método</th>
                                            <th className="pb-3">Alumno</th>
                                            <th className="pb-3 pr-2 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="text-[11px] group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 pl-2 font-bold text-slate-500 whitespace-nowrap">{dbService.formatDateDisplay(row.fecha)}</td>
                                                <td className="py-3 font-black text-slate-700 uppercase">{row.tutor}</td>
                                                <td className="py-3 text-center"><span className="px-2 py-0.5 bg-white border border-slate-200 rounded-[6px] text-[9px] font-bold uppercase text-slate-500">{row.metodo}</span></td>
                                                <td className="py-3 text-slate-600 uppercase font-medium">{row.alumno}</td>
                                                <td className="py-3 pr-2 text-right font-black text-emerald-600 tracking-tight">{row.monto} Bs.</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <span className="text-xs font-black text-primary uppercase tracking-widest opacity-70">Total Ingresos</span>
                            <span className="text-2xl font-black text-primary tracking-tight">{totalAmount} Bs.</span>
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
                                className="py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-slate-700 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
