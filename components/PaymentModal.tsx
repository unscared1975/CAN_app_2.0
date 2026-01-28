
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

  const renderTicketContent = (forExport = false) => {
    // Helper para condicionar clases responsivas: Si es para exportar, IGNORAR clases md: (usar siempre estilo móvil)
    const tlx = (mobileClass: string, desktopClass: string = '') => {
      return forExport ? mobileClass : `${mobileClass} ${desktopClass}`;
    };

    return (
      <>
        <div className={tlx(`h-[75px] flex flex-col items-center justify-center px-4 relative transition-all ${isConfirmed ? 'bg-[#0D9488]' : 'bg-[#26475C]'}`, `md:h-[100px]`)}>
          <img src="https://i.ibb.co/4ZZDcntJ/CAN-30-X30-Circulo.png" alt="Logo" className={tlx("w-[32px] h-[32px] mb-1 transition-all", "md:w-[42px] md:h-[42px]")} />
          <h2 className={tlx("text-[9px] font-black text-white uppercase tracking-[0.1em] leading-none text-center", "md:text-[11px]")}>CENTRO DE NIVELACIÓN CAN</h2>
          <p className={tlx("text-[8px] font-black text-white/40 uppercase tracking-widest mt-0.5", "md:text-[10px] md:mt-1")}>
            {pagoToEdit && !isConfirmed ? 'EDITAR PAGO' : isConfirmed ? 'RECIBO OFICIAL' : 'REGISTRAR PAGO'}
          </p>
          {!isConfirmed && (
            <button onClick={onClose} className="absolute top-3 right-3 md:top-4 md:right-4 text-white/40"><ICONS.Plus className={tlx("w-5 h-5 rotate-45", "md:w-6 md:h-6")} /></button>
          )}
        </div>

        <div className={tlx("px-5 py-3 space-y-2", "md:px-[20px] md:py-[16px] md:space-y-[8px]")}>
          <div className={tlx("text-center mb-1", "md:mb-2")}>
            {isConfirmed && (
              <p className={tlx("text-base font-bold text-[#10B981] uppercase tracking-tighter mb-1 animate-in zoom-in", "md:text-[18px] md:mb-2")}>★ PAGO EXITOSO ★</p>
            )}
            {/* Nombre en una sola línea para el ticket visual y exportado */}
            <h4 className={tlx("text-[14px] font-semibold text-[#1B3A4B] uppercase px-2 leading-snug truncate pb-1", "md:text-[16px] md:px-4")}>
              {inscripcion.alumno?.nombre} {inscripcion.alumno?.apellido}
            </h4>
          </div>

          <div className={tlx("grid grid-cols-2 gap-2", "md:gap-[10px]")}>
            <div className={tlx("bg-[#F8FAFC] rounded-[16px] border border-[#F1F5F9] flex flex-col justify-center items-center text-center gap-0.5 py-3 px-2 h-full", "md:rounded-[20px]")}>
              <p className={tlx("text-[9px] font-medium text-[#4B5563] uppercase", "md:text-[11px]")}>Costo Módulo</p>
              <p className={tlx("text-sm font-bold text-[#26475C] leading-none", "md:text-[18px]")}>{inscripcion.costoAcordado} Bs.</p>
            </div>
            <div className={tlx(`rounded-[16px] border flex flex-col justify-center items-center text-center gap-0.5 py-3 px-2 h-full ${isConfirmed ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-[#F0F9FF] border-[#E0F2FE]'}`, "md:rounded-[20px]")}>
              <p className={tlx(`text-[9px] font-medium uppercase ${isConfirmed ? 'text-[#059669]' : 'text-[#26475C]'}`, "md:text-[11px]")}>
                {pagoToEdit && !isConfirmed ? 'CORREGIR' : 'ABONO'}
              </p>
              <div className={tlx("text-base font-bold flex items-center justify-center gap-2 leading-none", "md:text-[18px]")}>
                {!isConfirmed && (
                  <button onClick={() => setMonto(prev => Math.max(0, prev - 50))} className={tlx("w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200 text-xs", "md:w-6 md:h-6")}>-</button>
                )}
                {isConfirmed ? (lastSavedPago?.monto) : (
                  <input type="number" value={monto} onChange={e => setMonto(parseFloat(e.target.value) || 0)} className={tlx("bg-transparent w-[60px] text-center outline-none border-b border-[#26475C]/20", "md:w-[70px]")} />
                )}
                {!isConfirmed && (
                  <button onClick={() => setMonto(prev => prev + 50)} className={tlx("w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200 text-xs", "md:w-6 md:h-6")}>+</button>
                )}
                <span className={isConfirmed ? 'text-[#047857]' : 'text-[#26475C]'}>Bs.</span>
              </div>
            </div>
          </div>

          <div className={tlx("grid grid-cols-2 gap-2 py-2 border-y border-[#F1F5F9] mt-1", "md:gap-[10px] md:py-[10px] md:mt-2")}>
            <div className={tlx("bg-[#F8FAFC] rounded-[16px] border border-[#F1F5F9] flex flex-col justify-center items-center text-center gap-0.5 py-3 px-1 h-full", "md:rounded-[20px]")}>
              <label className={tlx("text-[9px] font-medium text-[#4B5563] uppercase block", "md:text-[11px]")}>F. Transacción</label>
              <div className={tlx("text-xs font-bold text-[#26475C]", "md:text-[13px]")}>
                {isConfirmed ? dbService.formatDateDisplay(fecha) : (
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={tlx("bg-transparent px-1 rounded-md outline-none text-[10px] w-full text-center", "md:px-2 md:text-[11px]")} />
                )}
              </div>
            </div>
            <div className={tlx("bg-[#F8FAFC] rounded-[16px] border border-[#F1F5F9] flex flex-col justify-center items-center text-center gap-0.5 py-3 px-1 h-full", "md:rounded-[20px]")}>
              <label className={tlx("text-[9px] font-medium text-[#4B5563] uppercase block", "md:text-[11px]")}>Inicio Inscripción</label>
              <div className={tlx("text-xs font-bold text-[#26475C]", "md:text-[13px]")}>{dbService.formatDateDisplay(inscripcion.fechaInscripcion)}</div>
            </div>
          </div>

          <div className={tlx("space-y-2", "md:space-y-[8px]")}>
            <div className={tlx(`px-3 py-3 rounded-[16px] flex flex-col justify-center items-start text-left gap-0.5 ${isConfirmed ? 'bg-white border border-[#F1F5F9]' : 'bg-[#F8FAFC]'}`, "md:p-[12px] md:rounded-[20px]")}>
              <label className={tlx("text-[9px] font-medium text-[#4B5563] uppercase block", "md:text-[11px]")}>Concepto</label>
              {isConfirmed ? (
                <p className={tlx("text-xs font-bold text-[#1B3A4B] leading-snug break-words w-full", "md:text-[13px]")}>{concepto}</p>
              ) : (
                <input value={concepto} onChange={e => setConcepto(e.target.value)} className={tlx("bg-transparent w-full text-xs font-bold text-[#1B3A4B] outline-none text-left", "md:text-[13px]")} placeholder="..." />
              )}
            </div>

            <div className={tlx(`px-3 py-3 rounded-[16px] flex flex-col justify-center items-start text-left gap-0.5 min-h-[60px] ${isConfirmed ? 'bg-[#FFF7ED] border border-[#FED7AA]' : 'bg-[#F8FAFC]'}`, "md:p-[12px] md:rounded-[20px]")}>
              <label className={tlx("text-[9px] font-medium text-[#4B5563] uppercase block", "md:text-[11px]")}>Nota:</label>
              {isConfirmed ? (
                <p className={tlx("text-[10px] font-bold italic text-red-600 leading-snug animate-in fade-in break-words pb-1 w-full", "md:text-[11px]")}>{nota}</p>
              ) : (
                <textarea
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  className={tlx("bg-transparent w-full text-[10px] font-bold text-red-600 outline-none resize-none h-[34px] text-left", "md:text-[11px] md:h-[44px]")}
                  placeholder="Notas (máx 2 líneas)"
                />
              )}
            </div>

            {!isConfirmed && (
              <div className={tlx("flex gap-1", "md:gap-[8px]")}>
                {(['QR', 'Efectivo', 'Transferencia'] as PaymentMethod[]).map(m => (
                  <button key={m} onClick={() => setMetodo(m)} className={tlx(`flex-1 py-1.5 rounded-[10px] text-[9px] font-bold uppercase transition-all ${metodo === m ? 'bg-[#26475C] text-white shadow-md' : 'bg-[#F1F5F9] text-[#94A3B8]'}`, "md:py-[10px] md:rounded-[14px] md:text-[11px]")}>{m}</button>
                ))}
              </div>
            )}

            <div className={tlx(`py-2 px-3 rounded-[16px] text-center shadow-inner flex flex-col justify-center items-center ${isConfirmed ? 'bg-[#26475C] text-white' : 'bg-[#FEF2F2] text-[#B91C1C]'}`, "md:p-[14px] md:rounded-[24px]")}>
              <p className={tlx("text-[9px] font-medium uppercase opacity-70 mb-0.5", "md:text-[11px] md:mb-1")}>Saldo Final Pendiente</p>
              <p className={tlx("text-lg font-black leading-none", "md:text-[20px]")}>
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
  };

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
            <button onClick={() => {
              if (!lastSavedPago) return alert("Faltan datos del pago");
              try {
                const total = totalAbonadoSinEste + Number(lastSavedPago.monto);
                const doc = receiptService.generatePDF(inscripcion, lastSavedPago, total);
                doc.save(receiptService.getSuggestedFileName(inscripcion, lastSavedPago));
              } catch (err) {
                console.error("Error PDF:", err);
                alert("Error al generar PDF. Intente nuevamente.");
              }
            }} className="h-[38px] md:h-[42px] flex-1 flex items-center justify-center gap-2 bg-[#1E293B] text-white rounded-[12px] md:rounded-[16px] active:scale-95 transition-all shadow-lg shadow-[#1E293B]/20 hover:bg-[#0f172a]">
              <ICONS.Download className="w-4 h-4" /> <span className="text-[10px] md:text-[12px] font-bold uppercase">PDF</span>
            </button>
            <button onClick={onSuccess} className="h-[38px] md:h-[42px] flex-1 bg-white text-[#26475C] rounded-[12px] md:rounded-[16px] text-[10px] md:text-[12px] font-bold uppercase active:scale-95 transition-all shadow-lg hover:bg-slate-50 border border-slate-200">Listo</button>
          </div>
        </div>
      )}

      {/* 3. VISTA OCULTA PARA EXPORTACIÓN (Hidden Export Container) */}
      {/* Estilo fijo para generar la imagen: Marco Verde Azulado Centrado con Tarjeta Blanca */}
      <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
        <div ref={exportRef} className="bg-[#59A9B9] p-8 w-[390px] flex flex-col items-center justify-center">
          <div className="bg-white w-full rounded-[32px] overflow-hidden shadow-2xl scale-100">
            {renderTicketContent(true)}
          </div>
        </div>
      </div>

    </div>
  );
};
