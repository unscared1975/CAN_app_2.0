
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
  initialEditMode?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ inscripcion, onClose, onSuccess, pagoToEdit, initialEditMode = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null); // Referencia dedicada para la generación de imagen

  const totalAbonadoSinEste = useMemo(() => {
    const total = dbService.getTotalAbonado(inscripcion.id);
    return pagoToEdit ? (total - Number(pagoToEdit.monto)) : total;
  }, [inscripcion.id, pagoToEdit]);

  const saldoRestanteReferencia = useMemo(() => inscripcion.costoAcordado - totalAbonadoSinEste, [inscripcion.costoAcordado, totalAbonadoSinEste]);

  const [monto, setMonto] = useState<number>(pagoToEdit ? Number(pagoToEdit.monto) : saldoRestanteReferencia);
  const [metodo, setMetodo] = useState<PaymentMethod>(pagoToEdit?.metodo || 'QR');
  const [fecha, setFecha] = useState(pagoToEdit?.fecha || new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState(pagoToEdit?.concepto || '');
  const [nota, setNota] = useState(pagoToEdit?.nota || 'Solo tiene derecho a una falta o una licencia');

  const [lastSavedPago, setLastSavedPago] = useState<Pago | null>(pagoToEdit || null);
  const [loading, setLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false); // Initialize safely

  // Force strict mode sync on mount/change
  useEffect(() => {
    if (pagoToEdit) {
      // If we have a payment, we are confirmed (View Ticket) UNLESS explicit edit mode is requested
      setIsConfirmed(!initialEditMode);
    } else {
      // No payment = New Payment = Not Confirmed
      setIsConfirmed(false);
    }
  }, [pagoToEdit, initialEditMode]);

  // Memoria de Concepto Específica por Alumno (Solo si no estamos editando)
  useEffect(() => {
    if (!pagoToEdit && inscripcion.alumnoId) {
      const memo = dbService.getLastConcept(inscripcion.alumnoId);
      if (memo) {
        setConcepto(memo);
      } else {
        const hStr = inscripcion.horario ? `${inscripcion.horario.horaInicio} a ${inscripcion.horario.horaFin}` : '';

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
    // Usamos la referencia oculta para garantizar el diseño "Teal Frame" sin afectar la UI visible
    if (!exportRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
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

  const renderTicketContent = (forExport = false) => (
    <>
      <div className={`h-[75px] md:h-[100px] flex flex-col items-center justify-center px-4 relative transition-all ${isConfirmed ? 'bg-[#0D9488]' : 'bg-[#26475C]'}`}>
        <img src="https://i.ibb.co/4ZZDcntJ/CAN-30-X30-Circulo.png" alt="Logo" className="w-[32px] h-[32px] md:w-[42px] md:h-[42px] mb-1 transition-all" />
        <h2 className="text-[9px] md:text-[11px] font-black text-white uppercase tracking-[0.1em] leading-none text-center">CENTRO DE NIVELACIÓN CAN</h2>
        <p className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mt-0.5 md:mt-1">
          {pagoToEdit && !isConfirmed ? 'EDITAR PAGO' : isConfirmed ? 'RECIBO OFICIAL' : 'REGISTRAR PAGO'}
        </p>
        {!isConfirmed && (
          <button onClick={onClose} className="absolute top-3 right-3 md:top-4 md:right-4 text-white/40"><ICONS.Plus className="w-5 h-5 md:w-6 md:h-6 rotate-45" /></button>
        )}
      </div>

      <div className="px-5 py-3 md:px-[20px] md:py-[16px] space-y-2 md:space-y-[8px]">
        <div className="text-center mb-1 md:mb-2">
          {isConfirmed && (
            <p className="text-base md:text-[18px] font-bold text-[#10B981] uppercase tracking-tighter mb-1 md:mb-2 animate-in zoom-in">★ PAGO EXITOSO ★</p>
          )}
          {/* Nombre en una sola línea para el ticket visual y exportado */}
          <h4 className="text-[14px] md:text-[16px] font-semibold text-[#1B3A4B] uppercase px-2 md:px-4 leading-snug truncate pb-1">
            {inscripcion.alumno?.nombre} {inscripcion.alumno?.apellido}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-[10px]">
          <div className="p-2 md:p-[12px] bg-[#F8FAFC] rounded-[16px] md:rounded-[20px] border border-[#F1F5F9] text-center flex flex-col justify-center">
            <p className="text-[9px] md:text-[11px] font-medium text-[#4B5563] uppercase mb-0.5">Costo Módulo</p>
            <p className="text-sm md:text-[18px] font-bold text-[#26475C] leading-none">{inscripcion.costoAcordado} Bs.</p>
          </div>
          <div className={`p-2 md:p-[12px] rounded-[16px] md:rounded-[20px] border text-center flex flex-col justify-center ${isConfirmed ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-[#F0F9FF] border-[#E0F2FE]'}`}>
            <p className={`text-[9px] md:text-[11px] font-medium uppercase mb-0.5 ${isConfirmed ? 'text-[#059669]' : 'text-[#26475C]'}`}>
              {pagoToEdit && !isConfirmed ? 'CORREGIR' : 'ABONO'}
            </p>
            <div className="text-base md:text-[18px] font-bold flex items-center justify-center gap-2 leading-none">
              {!isConfirmed && (
                <button onClick={() => setMonto(prev => Math.max(0, prev - 50))} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200 text-xs">-</button>
              )}
              {isConfirmed ? (lastSavedPago?.monto) : (
                <input type="number" value={monto} onChange={e => setMonto(parseFloat(e.target.value) || 0)} className="bg-transparent w-[60px] md:w-[70px] text-center outline-none border-b border-[#26475C]/20" />
              )}
              {!isConfirmed && (
                <button onClick={() => setMonto(prev => prev + 50)} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200 text-xs">+</button>
              )}
              <span className={isConfirmed ? 'text-[#047857]' : 'text-[#26475C]'}>Bs.</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-[10px] py-2 md:py-[10px] border-y border-[#F1F5F9] mt-1 md:mt-2">
          <div className="text-center bg-[#F8FAFC] rounded-[16px] md:rounded-[20px] p-2 md:p-[12px] border border-[#F1F5F9] flex flex-col justify-center">
            <label className="text-[9px] md:text-[11px] font-medium text-[#4B5563] uppercase block mb-0.5">F. Transacción</label>
            <div className="text-xs md:text-[13px] font-bold text-[#26475C]">
              {isConfirmed ? dbService.formatDateDisplay(fecha) : (
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="bg-transparent px-1 md:px-2 rounded-md outline-none text-[10px] md:text-[11px] w-full text-center" />
              )}
            </div>
          </div>
          <div className="text-center bg-[#F8FAFC] rounded-[16px] md:rounded-[20px] p-2 md:p-[12px] border border-[#F1F5F9] flex flex-col justify-center">
            <label className="text-[9px] md:text-[11px] font-medium text-[#4B5563] uppercase block mb-0.5">Inicio Inscripción</label>
            <div className="text-xs md:text-[13px] font-bold text-[#26475C]">{dbService.formatDateDisplay(inscripcion.fechaInscripcion)}</div>
          </div>
        </div>

        <div className="space-y-2 md:space-y-[8px]">
          <div className={`px-3 py-2 md:p-[12px] rounded-[16px] md:rounded-[20px] flex flex-col justify-center items-center text-center ${isConfirmed ? 'bg-white border border-[#F1F5F9]' : 'bg-[#F8FAFC]'}`}>
            <label className="text-[9px] md:text-[11px] font-medium text-[#4B5563] uppercase block mb-0.5">Concepto</label>
            {isConfirmed ? (
              <p className="text-xs md:text-[13px] font-bold text-[#1B3A4B] leading-snug break-words">{concepto}</p>
            ) : (
              <input value={concepto} onChange={e => setConcepto(e.target.value)} className="bg-transparent w-full text-xs md:text-[13px] font-bold text-[#1B3A4B] outline-none text-center" placeholder="..." />
            )}
          </div>

          <div className={`px-3 py-2 md:p-[12px] rounded-[16px] md:rounded-[20px] flex flex-col justify-center items-center text-center min-h-[50px] ${isConfirmed ? 'bg-[#FFF7ED] border border-[#FED7AA]' : 'bg-[#F8FAFC]'}`}>
            <label className="text-[9px] md:text-[11px] font-medium text-[#4B5563] uppercase block mb-0.5">Nota:</label>
            {isConfirmed ? (
              <p className="text-[10px] md:text-[11px] font-bold italic text-red-600 leading-snug animate-in fade-in break-words pb-1">{nota}</p>
            ) : (
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                className="bg-transparent w-full text-[10px] md:text-[11px] font-bold text-red-600 outline-none resize-none h-[34px] md:h-[44px] text-center"
                placeholder="Notas (máx 2 líneas)"
              />
            )}
          </div>

          {!isConfirmed && (
            <div className="flex gap-1 md:gap-[8px]">
              {(['QR', 'Efectivo', 'Transferencia'] as PaymentMethod[]).map(m => (
                <button key={m} onClick={() => setMetodo(m)} className={`flex-1 py-1.5 md:py-[10px] rounded-[10px] md:rounded-[14px] text-[9px] md:text-[11px] font-bold uppercase transition-all ${metodo === m ? 'bg-[#26475C] text-white shadow-md' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>{m}</button>
              ))}
            </div>
          )}

          <div className={`py-2 px-3 md:p-[14px] rounded-[16px] md:rounded-[24px] text-center shadow-inner flex flex-col justify-center items-center ${isConfirmed ? 'bg-[#26475C] text-white' : 'bg-[#FEF2F2] text-[#B91C1C]'}`}>
            <p className="text-[9px] md:text-[11px] font-medium uppercase opacity-70 mb-0.5 md:mb-1">Saldo Final Pendiente</p>
            <p className="text-lg md:text-[20px] font-black leading-none">
              {Math.max(0, saldoRestanteReferencia - (isConfirmed ? (lastSavedPago?.monto || 0) : monto))} Bs.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding solo para el ticket final (visual o exportado) */}
      {isConfirmed && (
        <div className="bg-[#1B3A4B] p-2 text-center">
          <p className="text-[8px] font-bold text-white/50 uppercase tracking-[0.2em]">CAN APP 2.0</p>
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 bg-[#1B3A4B]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-2 md:p-4">

      {/* 1. VISTA DE REGISTRO (Screen Input) */}
      {!isConfirmed && (
        // Ancho completo disponible hasta un máximo razonable para escritorio
        <div className="bg-white w-full max-w-lg md:max-w-xl rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          {renderTicketContent()}
          {/* Botones integrados */}
          <div className="px-5 pb-5 pt-1 md:px-[20px] md:pb-[24px] md:pt-[8px] bg-white">
            <button onClick={handleConfirmPayment} disabled={loading} className="w-full h-[38px] md:h-[42px] bg-[#26475C] text-white rounded-[12px] md:rounded-[16px] text-xs md:text-[14px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-[#26475C]/20">
              {loading ? 'Validando...' : (pagoToEdit ? 'Confirmar Corrección' : 'Registrar Abono')}
            </button>
          </div>
        </div>
      )}

      {/* 2. VISTA DE ÉXITO (Screen Success) */}
      {isConfirmed && (
        // Ancho completo disponible, botones visibles sin scroll
        <div className="bg-white w-full max-w-lg md:max-w-xl rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          {renderTicketContent()}

          {/* Botones en una sola fila */}
          <div className="px-5 pb-5 pt-1 md:px-[20px] md:pb-[24px] md:pt-[8px] bg-white flex flex-row items-center gap-[10px]">
            <button onClick={handleShareImage} className="h-[38px] md:h-[42px] flex-1 flex items-center justify-center gap-2 bg-[#059669] text-white rounded-[12px] md:rounded-[16px] active:scale-95 transition-all shadow-lg shadow-[#059669]/20 hover:bg-[#047857]">
              <ICONS.Share className="w-4 h-4" /> <span className="text-[10px] md:text-[12px] font-bold uppercase">JPG</span>
            </button>
            <button onClick={() => receiptService.generatePDF(inscripcion, lastSavedPago!, totalAbonadoSinEste + Number(lastSavedPago!.monto)).save(receiptService.getSuggestedFileName(inscripcion, lastSavedPago!))} className="h-[38px] md:h-[42px] flex-1 flex items-center justify-center gap-2 bg-[#1E293B] text-white rounded-[12px] md:rounded-[16px] active:scale-95 transition-all shadow-lg shadow-[#1E293B]/20 hover:bg-[#0f172a]">
              <ICONS.Download className="w-4 h-4" /> <span className="text-[10px] md:text-[12px] font-bold uppercase">PDF</span>
            </button>
            <button onClick={onSuccess} className="h-[38px] md:h-[42px] flex-1 bg-white text-[#26475C] rounded-[12px] md:rounded-[16px] text-[10px] md:text-[12px] font-bold uppercase active:scale-95 transition-all shadow-lg hover:bg-slate-50 border border-slate-200">Listo</button>
          </div>
        </div>
      )}

      {/* 3. VISTA OCULTA PARA EXPORTACIÓN (Hidden Export Container) */}
      {/* Estilo fijo para generar la imagen: Marco Verde Azulado Centrado con Tarjeta Blanca */}
      <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
        <div ref={exportRef} className="bg-[#59A9B9] p-8 w-[420px] flex flex-col items-center justify-center">
          <div className="bg-white w-full rounded-[32px] overflow-hidden shadow-2xl scale-100">
            {renderTicketContent(true)}
          </div>
        </div>
      </div>

    </div>
  );
};
