
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Inscripcion, Pago } from '../types';
import { dbService } from './db';

const cleanFileName = (text: string) => {
  if (!text) return 'Sin_Nombre';
  return text.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, "");
};

export const receiptService = {
  getSuggestedFileName: (inscripcion: Inscripcion, pago: Pago) => {
    const alumnoNombre = cleanFileName(`${inscripcion.alumno?.nombre || 'Alumno'}_${inscripcion.alumno?.apellido || ''}`);
    const nroRecibo = pago?.reciboNum || '000';
    return `Recibo_${nroRecibo}_${alumnoNombre}.pdf`;
  },

  generatePDF: (inscripcion: Inscripcion, pago: Pago, totalAbonado: number) => {
    // Instantiate jsPDF with compression enabled
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const primaryColor = [38, 71, 92] as [number, number, number]; // #26475C
    const lightGray = [248, 250, 252] as [number, number, number];

    // --- 1. Encabezado Compacto (35mm) ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');

    try {
      const logoLeftUrl = 'https://i.ibb.co/NghBQCRx/LOGO-CAN-Sin-texto-1200-X1200.png';
      doc.addImage(logoLeftUrl, 'PNG', 10, 2.5, 30, 30);
    } catch (e) { console.warn("Error logo izquierdo:", e); }

    try {
      const logoRightUrl = 'https://i.ibb.co/FkkZ8p5t/LOGO-CAN-1200-X1200-Circulo.png';
      doc.addImage(logoRightUrl, 'PNG', 170, 2.5, 30, 30);
    } catch (e) { console.warn("Error logo derecho:", e); }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CENTRO DE NIVELACIÓN CAN', 105, 18, { align: 'center' }); // Changed SEVILLA to CAN to match ticket

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(16);
    doc.text('RECIBO DE PAGO', 105, 45, { align: 'center' });

    // --- 2. Metadatos del Recibo ---
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Recibo No: ${pago?.reciboNum || 'S/N'}`, 15, 55);
    doc.setFont('helvetica', 'normal');
    const fechaEmisionFormatted = dbService.formatDateDisplay(pago?.fecha || new Date().toISOString());
    doc.text(`Fecha Emisión: ${fechaEmisionFormatted}`, 15, 60);

    // --- 3. Sección INFORMACIÓN ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, 68, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL ALUMNO', 20, 72.5);

    doc.setFontSize(9);
    let y = 82;
    const fields = [
      { label: 'Nombre del Alumno:', value: `${inscripcion.alumno?.nombre || 'S/N'} ${inscripcion.alumno?.apellido || ''}` },
      { label: 'Tutor Responsable:', value: `${inscripcion.alumno?.tutorNombre || 'S/N'}` },
      { label: 'Módulo Académico:', value: `${inscripcion.modulo?.nombre || 'S/M'}` },
      { label: 'Inicio de Módulo:', value: dbService.formatDateDisplay(inscripcion.fechaInscripcion || new Date().toISOString()) }
    ];

    fields.forEach(field => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(field.label, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(field.value, 55, y);
      y += 7;
    });

    // --- 4. Tabla de Movimientos ---
    const costoTotal = inscripcion.costoAcordado || 0;
    const saldoPendiente = Math.max(0, costoTotal - totalAbonado);

    // Use standard functional call for autoTable
    autoTable(doc, {
      startY: 115,
      head: [['Descripción del Movimiento', 'Monto']],
      body: [
        ['Costo del Módulo', `${costoTotal} Bs.`],
        [{ content: `CONCEPTO: ${pago?.concepto || 'Pago de mensualidad'}`, styles: { fontStyle: 'italic', fontSize: 8, textColor: [100, 100, 100] as [number, number, number] } }, ''],
        ['Monto de esta Transacción', `${pago?.monto || 0} Bs.`],
        ['Total Abonado a la Fecha', `${totalAbonado} Bs.`],
        [{ content: 'SALDO PENDIENTE', styles: { fontStyle: 'bold' } }, { content: `${saldoPendiente} Bs.`, styles: { fontStyle: 'bold', textColor: [200, 0, 0] as [number, number, number] } }],
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 40, halign: 'right' }
      }
    });

    // --- 5. Nota Final ---
    // Access lastAutoTable from doc instance (it's attached by the plugin)
    const finalTableY = (doc as any).lastAutoTable?.finalY || 180;
    const notaY = finalTableY + 10;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, notaY, 180, 12, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const notaTexto = paymentNote(pago?.nota);
    doc.text(notaTexto, 20, notaY + 7, { maxWidth: 170 });

    const footerY = 280;
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 275, 195, 275);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Dirección: Condominio Sevilla Las Terrazas 1 C. Santa Ana Este Nro. 14`, 105, footerY, { align: 'center' });
    doc.text('Santa Cruz – Bolivia', 105, footerY + 4, { align: 'center' });

    return doc;
  },

  shareWhatsApp: (inscripcion: Inscripcion, pago: Pago, totalAbonado: number) => {
    const costoTotal = inscripcion.costoAcordado || 0;
    const saldoPendiente = Math.max(0, costoTotal - totalAbonado);
    const telefono = (inscripcion.alumno?.tutorTelefono || '').replace(/\D/g, '');
    const mensaje = `*RECIBO CAN*%0A*Nro:* ${pago?.reciboNum || 'S/N'}%0A*Alumno:* ${inscripcion.alumno?.nombre || ''} ${inscripcion.alumno?.apellido || ''}%0A*Monto:* ${pago?.monto || 0} Bs.%0A*Saldo Pendiente:* ${saldoPendiente} Bs.%0A¡Muchas gracias por su confianza! 📚🎓`;
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  }
};

// Helper simple para la nota si viene vacía
function paymentNote(nota?: string) {
  return nota || 'Solo tiene opción a una falta y a una licencia, tomar en cuenta eso por favor.';
}
