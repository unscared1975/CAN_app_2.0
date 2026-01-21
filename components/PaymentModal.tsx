
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Inscripcion, PaymentMethod, Pago } from '../types';
import { dbService } from '../services/db';
import { receiptService } from '../services/receiptService';
import { ICONS } from '../constants';
import html2canvas from 'html2canvas';

interface PaymentModalProps {
  inscripcion: Inscripcion;
  onClose: () => void;
  onSuccess: () => void;
  pagoToEdit?: Pago;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ inscripcion, onClose, onSuccess, pagoToEdit }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const totalAbonadoSinEste = useMemo(() => {
    const total = dbService.getTotalAbonado(inscripcion.id);
    return pagoToEdit ? (total - Number(pagoToEdit.monto)) : total;
  }, [inscripcion.id, pagoToEdit]);

  const saldoRestanteReferencia = useMemo(() => inscripcion.costoAcordado - totalAbonadoSinEste, [inscripcion.costoAcordado, totalAbonadoSinEste]);

  const [monto, setMonto] = useState<number>(pagoToEdit ? Number(pagoToEdit.monto) : saldoRestanteReferencia);
  const [metodo, setMetodo] = useState<PaymentMethod>(pagoToEdit?.metodo || 'QR');
  const [fecha, setFecha] = useState(pagoToEdit?.fecha || new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState(pagoToEdit?.concepto || '');
  const [nota, setNota] = useState(pagoToEdit?.nota || 'Solo tiene opción a una falta y a una licencia, tomar en cuenta eso por favor.');

  const [lastSavedPago, setLastSavedPago] = useState<Pago | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Memoria de Concepto Específica por Alumno (Solo si no estamos editando)
  useEffect(() => {
    if (!pagoToEdit && inscripcion.alumnoId) {
      const memo = dbService.getLastConcept(inscripcion.alumnoId);
      if (memo) {
        setConcepto(memo);
      } else {
        const hStr = inscripcion.horario ? `${inscripcion.horario.horaInicio} a ${inscripcion.horario.horaFin}` : '';
        // SE ELIMINÓ EL PREFIJO 'Modulo:' POR REDUNDANCIA
        setConcepto(`${inscripcion.modulo?.nombre || ''} ${hStr}`);
      }
    }
  }, [inscripcion.alumnoId, inscripcion.modulo, inscripcion.horario, pagoToEdit]);

  const handleConfirmPayment = async () => {
    if (monto <= 0) return alert("Ingrese un monto");
    setLoading(true);
    try {
      let result: Pago | null;
      if (pagoToEdit) {
        result = await dbService.updatePago({
          ...pagoToEdit,
          monto,
          metodo,
          concepto,
          fecha,
          nota
        });
      } else {
        result = await dbService.registrarPago({
          inscripcionId: inscripcion.id,
          monto,
          metodo,
          concepto,
          fecha,
          nota
        });
        dbService.saveLastConcept(inscripcion.alumnoId!, concepto);
      }

      if (result) {
        setLastSavedPago(result);
        setIsConfirmed(true);
      }
    } catch (e) {
      alert("Error en sistema");
    } finally {
      setLoading(false);
    }
  };

  const handleShareImage = async () => {
    if (!modalRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(modalRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        width: 414,
        height: modalRef.current.offsetHeight
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.98));
      if (blob && navigator.share) {
        const file = new File([blob], `Recibo_${lastSavedPago?.reciboNum}.jpg`, { type: 'image/jpeg' });
        await navigator.share({ files: [file], title: 'Comprobante CAN' });
      } else {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg');
        link.download = `Recibo_CAN_${lastSavedPago?.reciboNum}.jpg`;
        link.click();
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-[#1B3A4B]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      {/* Simulación Resolución 1080 x 2436 px (Scale factor applied) */}
      <div className="bg-white w-full max-w-[414px] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        <div ref={modalRef} className="bg-white w-full">
          {/* Cabecera Fija 100px (25mm) */}
          <div className="h-[100px] bg-[#26475C] flex flex-col items-center justify-center px-4 relative">
            <img src="https://i.ibb.co/4ZZDcntJ/CAN-30-X30-Circulo.png" alt="Logo" className="w-[42px] h-[42px] mb-1" />
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.1em] leading-none">CENTRO DE NIVELACIÓN CAN</h2>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
              {pagoToEdit && !isConfirmed ? 'REVISAR PAGO' : isConfirmed ? 'RECIBO OFICIAL' : 'REGISTRAR PAGO'}
            </p>
            {!isConfirmed && (
              <button onClick={onClose} className="absolute top-4 right-4 text-white/40"><ICONS.Plus className="w-6 h-6 rotate-45" /></button>
            )}
          </div>

          <div className="px-[20px] py-[16px] space-y-[8px]">
            <div className="text-center">
              {isConfirmed && (
                <p className="text-[18px] font-bold text-[#10B981] uppercase tracking-tighter mb-1 animate-in zoom-in">★ PAGO EXITOSO ★</p>
              )}
              <h4 className="text-[16px] font-semibold text-[#1B3A4B] uppercase truncate leading-tight">
                {inscripcion.alumno?.nombre} {inscripcion.alumno?.apellido}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-[10px]">
              <div className="p-[12px] bg-[#F8FAFC] rounded-[20px] border border-[#F1F5F9] text-center">
                <p className="text-[11px] font-medium text-[#4B5563] uppercase mb-1">Costo Módulo</p>
                <p className="text-[18px] font-bold text-[#26475C]">{inscripcion.costoAcordado} Bs.</p>
              </div>
              <div className={`p-[12px] rounded-[20px] border text-center ${isConfirmed ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-[#F0F9FF] border-[#E0F2FE]'}`}>
                <p className={`text-[11px] font-medium uppercase mb-1 ${isConfirmed ? 'text-[#059669]' : 'text-[#26475C]'}`}>
                  {pagoToEdit && !isConfirmed ? 'MONTO A CORREGIR' : 'ABONO REGISTRADO'}
                </p>
                <div className="text-[18px] font-bold flex items-center justify-center gap-2">
                  {!isConfirmed && (
                    <button onClick={() => setMonto(prev => Math.max(0, prev - 50))} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200 text-xs">-</button>
                  )}
                  {isConfirmed ? (lastSavedPago?.monto) : (
                    <input type="number" value={monto} onChange={e => setMonto(parseFloat(e.target.value) || 0)} className="bg-transparent w-[70px] text-center outline-none border-b border-[#26475C]/20" />
                  )}
                  {!isConfirmed && (
                    <button onClick={() => setMonto(prev => prev + 50)} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200 text-xs">+</button>
                  )}
                  <span className={isConfirmed ? 'text-[#047857]' : 'text-[#26475C]'}>Bs.</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[10px] py-[10px] border-y border-[#F1F5F9]">
              <div className="text-center">
                <label className="text-[11px] font-medium text-[#4B5563] uppercase block mb-1">F. Operación</label>
                <div className="text-[13px] font-bold text-[#26475C]">
                  {isConfirmed ? dbService.formatDateDisplay(fecha) : (
                    <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="bg-[#F8FAFC] px-2 rounded-md outline-none text-[11px]" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <label className="text-[11px] font-medium text-[#4B5563] uppercase block mb-1">Inicio Inscripción</label>
                <div className="text-[13px] font-bold text-[#26475C]">{dbService.formatDateDisplay(inscripcion.fechaInscripcion)}</div>
              </div>
            </div>

            <div className="space-y-[8px]">
              <div className={`p-[12px] rounded-[20px] ${isConfirmed ? 'bg-white border border-[#F1F5F9]' : 'bg-[#F8FAFC]'}`}>
                <label className="text-[11px] font-medium text-[#4B5563] uppercase block mb-1">Concepto</label>
                <input value={concepto} readOnly={isConfirmed} onChange={e => setConcepto(e.target.value)} className="bg-transparent w-full text-[13px] font-bold text-[#1B3A4B] outline-none" placeholder="..." />
              </div>

              <div className={`p-[12px] rounded-[20px] ${isConfirmed ? 'bg-white border border-[#F1F5F9]' : 'bg-[#F8FAFC]'}`}>
                <label className="text-[11px] font-medium text-[#4B5563] uppercase block mb-1">Nota:</label>
                {isConfirmed ? (
                  <p className="text-[11px] font-medium italic text-[#4B5563] leading-tight animate-in fade-in">{nota}</p>
                ) : (
                  <textarea
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    className="bg-transparent w-full text-[11px] font-bold text-[#1B3A4B] outline-none resize-none h-[44px]"
                    placeholder="Escriba advertencias o notas..."
                  />
                )}
              </div>

              {!isConfirmed && (
                <div className="flex gap-[8px]">
                  {(['QR', 'Efectivo', 'Transferencia'] as PaymentMethod[]).map(m => (
                    <button key={m} onClick={() => setMetodo(m)} className={`flex-1 py-[10px] rounded-[14px] text-[11px] font-bold uppercase transition-all ${metodo === m ? 'bg-[#26475C] text-white shadow-lg shadow-[#26475C]/20' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>{m}</button>
                  ))}
                </div>
              )}

              <div className={`p-[14px] rounded-[24px] text-center shadow-inner ${isConfirmed ? 'bg-[#26475C] text-white' : 'bg-[#FEF2F2] text-[#B91C1C]'}`}>
                <p className="text-[11px] font-medium uppercase opacity-70 mb-1">Saldo Final Pendiente</p>
                <p className="text-[20px] font-black leading-none">
                  {Math.max(0, saldoRestanteReferencia - (isConfirmed ? (lastSavedPago?.monto || 0) : monto))} Bs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones del Sistema - Fila Única 42px */}
        <div className="px-[20px] pb-[24px] pt-[8px] bg-white">
          {!isConfirmed ? (
            <button onClick={handleConfirmPayment} disabled={loading} className="w-full h-[42px] bg-[#26475C] text-white rounded-[16px] text-[14px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-[#26475C]/20">
              {loading ? 'Validando...' : (pagoToEdit ? 'Confirmar Corrección' : 'Registrar Abono')}
            </button>
          ) : (
            <div className="flex flex-row items-center gap-[10px]">
              <button onClick={handleShareImage} className="h-[42px] flex-1 flex items-center justify-center gap-2 bg-[#059669] text-white rounded-[16px] active:scale-95 transition-all shadow-lg shadow-[#059669]/20">
                <ICONS.Share className="w-4 h-4" /> <span className="text-[12px] font-bold uppercase">JPG</span>
              </button>
              <button onClick={() => receiptService.generatePDF(inscripcion, lastSavedPago!, totalAbonadoSinEste + Number(lastSavedPago!.monto)).save(receiptService.getSuggestedFileName(inscripcion, lastSavedPago!))} className="h-[42px] flex-1 flex items-center justify-center gap-2 bg-[#1E293B] text-white rounded-[16px] active:scale-95 transition-all shadow-lg shadow-[#1E293B]/20">
                <ICONS.Download className="w-4 h-4" /> <span className="text-[12px] font-bold uppercase">PDF</span>
              </button>
              <button onClick={onSuccess} className="h-[42px] flex-1 bg-[#26475C] text-white rounded-[16px] text-[12px] font-bold uppercase active:scale-95 transition-all shadow-lg shadow-[#26475C]/20">Listo</button>
            </div>
          )}
          {isConfirmed && (
            <div className="mt-4 text-center">
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-[0.2em]">IDENTIDAD EZ • CAN APP 2.0</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
