
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Inscripcion, Asistencia, Pago, Alumno } from '../types';
import { dbService } from './db';

const cleanFileName = (text: string) => {
  if (!text) return 'Sin_Nombre';
  return text.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, "");
};

export const reportService = {
  getSuggestedFileName: (inscripcion: Inscripcion) => {
    const alumnoNombre = cleanFileName(`${inscripcion.alumno?.nombre || 'Alumno'}_${inscripcion.alumno?.apellido || ''}`);
    const moduloNombre = cleanFileName(inscripcion.modulo?.nombre || 'Modulo');
    return `Asistencias_${alumnoNombre}_${moduloNombre}.pdf`;
  },

  generateProgressReport: (inscripcion: Inscripcion, historial: Asistencia[]) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [38, 71, 92]; // #26475C (Azul Primario)
    const steelBluePale = [241, 245, 249]; // Gris acero muy tenue/pálido para armonizar

    // --- Encabezado ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');

    try {
      doc.addImage('https://i.ibb.co/Tx5HVnZ9/LOGO-CAN-Sin-texto-30-X30.png', 'PNG', 10, 2.5, 30, 30);
      doc.addImage('https://i.ibb.co/4ZZDcntJ/CAN-30-X30-Circulo.png', 'PNG', 170, 2.5, 30, 30);
    } catch (e) { }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('REGISTRO DE ASISTENCIA', 105, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Generado el: ${dbService.formatDateDisplay(new Date().toISOString())}`, 105, 30, { align: 'center' });

    // --- Bloque DATOS DEL ALUMNO ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL ALUMNO', 15, 50);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 52, 60, 52);

    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Alumno:', 15, 62);
    doc.text('Módulo:', 15, 70);
    doc.text('Horario:', 15, 78);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${inscripcion.alumno?.nombre || ''} ${inscripcion.alumno?.apellido || ''}`, 40, 62);
    doc.text(`${inscripcion.modulo?.nombre || 'S/M'}`, 40, 70);
    doc.text(`${inscripcion.horario?.horaInicio || '--'} - ${inscripcion.horario?.horaFin || '--'}`, 40, 78);

    // --- Bloque RESUMEN DE CLASES (Refinado y perfectamente alineado) ---
    const totalClases = (inscripcion.modulo?.totalClases || 0);
    const restantes = (inscripcion.saldoClases || 0);
    const consumidas = Math.max(0, totalClases - restantes);

    doc.setFillColor(steelBluePale[0], steelBluePale[1], steelBluePale[2]);
    doc.roundedRect(140, 55, 55, 28, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RESUMEN DE CLASES', 167.5, 61, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Clases:', 145, 68);
    doc.text('Consumidas:', 145, 73);
    doc.setFont('helvetica', 'bold');
    doc.text('RESTANTES:', 145, 78);

    // Alineación derecha de valores
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${totalClases}`, 190, 68, { align: 'right' });
    doc.text(`${consumidas}`, 190, 73, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12); // Aumentado para resaltar
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${restantes}`, 190, 78, { align: 'right' });

    // --- Tabla de Asistencias (Ultra Compacta) ---
    const historialOrdenado = [...historial].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    (doc as any).autoTable({
      startY: 90,
      head: [['Fecha', 'Estado', 'Observaciones de Avance']],
      body: historialOrdenado.map(a => [
        dbService.formatDateDisplay(a.fecha),
        a.estado === 'P' ? 'PRESENTE' : a.estado === 'F' ? 'FALTA' : 'LICENCIA',
        a.observacion || ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontStyle: 'bold', fontSize: 10, halign: 'center', textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.5, minCellHeight: 5, textColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 'auto' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.raw[1] === 'FALTA') {
          data.cell.styles.textColor = [220, 38, 38]; // Rojo
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    return doc;
  },

  generateCashReport: (pagosGrouped: { alumno: Alumno, pagos: Pago[] }[], total: number) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [38, 71, 92];

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');

    try {
      doc.addImage('https://i.ibb.co/Tx5HVnZ9/LOGO-CAN-Sin-texto-30-X30.png', 'PNG', 10, 2.5, 30, 30);
      doc.addImage('https://i.ibb.co/4ZZDcntJ/CAN-30-X30-Circulo.png', 'PNG', 170, 2.5, 30, 30);
    } catch (e) { }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('REPORTE CIERRE DE CAJA', 105, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Fecha: ${dbService.formatDateDisplay(new Date().toISOString())}`, 105, 30, { align: 'center' });

    let currentY = 45;

    pagosGrouped.forEach((group) => {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`ALUMNO: ${group.alumno.nombre} ${group.alumno.apellido}`, 15, currentY);
      currentY += 5;
      doc.setDrawColor(220, 220, 220);
      doc.line(15, currentY, 195, currentY);
      currentY += 5;

      (doc as any).autoTable({
        startY: currentY,
        head: [['Recibo', 'Fecha', 'Concepto', 'Método', 'Monto']],
        body: group.pagos.map(p => [
          p.reciboNum,
          dbService.formatDateDisplay(p.fecha),
          p.concepto,
          p.metodo,
          `${p.monto} Bs.`
        ]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`TOTAL RECAUDADO: ${total} Bs.`, 195, currentY + 10, { align: 'right' });

    return doc;
  },

  shareModuleCompletionReport: (inscripcion: Inscripcion) => {
    const telefono = (inscripcion.alumno?.tutorTelefono || '').replace(/\D/g, '');
    const mensaje = `¡Felicidades! *${inscripcion.alumno?.nombre}* ha completado el módulo *${inscripcion.modulo?.nombre}*. 🎓✨%0A%0AGracias por confiar en nosotros. Quedamos atentos para la siguiente etapa.`;
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  },

  generateFinancialReport: (datos: { fecha: string, tutor: string, metodo: string, alumno: string, monto: number }[], tituloRango: string, totalGeneral: number) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [38, 71, 92];

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');

    try {
      doc.addImage('https://i.ibb.co/Tx5HVnZ9/LOGO-CAN-Sin-texto-30-X30.png', 'PNG', 10, 2.5, 30, 30);
      doc.addImage('https://i.ibb.co/4ZZDcntJ/CAN-30-X30-Circulo.png', 'PNG', 170, 2.5, 30, 30);
    } catch (e) { }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('EXTRACTO DE MOVIMIENTOS', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(tituloRango.toUpperCase(), 105, 28, { align: 'center' });

    // Table
    (doc as any).autoTable({
      startY: 45,
      head: [['FECHA', 'TUTOR', 'MÉTODO', 'ALUMNO', 'MONTO']],
      body: datos.map(d => [
        dbService.formatDateDisplay(d.fecha),
        d.tutor,
        d.metodo,
        d.alumno,
        `${d.monto} Bs.`
      ]),
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL INGRESOS: ${totalGeneral} Bs.`, 195, finalY, { align: 'right' });

    return doc;
  },

  generateExpenditureReport: (datos: { fecha: string, categoria: string, descripcion: string, monto: number }[], tituloRango: string, totalGeneral: number) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [220, 38, 38]; // Rojo para Egresos

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');

    try {
      doc.addImage('https://i.ibb.co/Tx5HVnZ9/LOGO-CAN-Sin-texto-30-X30.png', 'PNG', 10, 2.5, 30, 30);
      doc.addImage('https://i.ibb.co/4ZZDcntJ/CAN-30-X30-Circulo.png', 'PNG', 170, 2.5, 30, 30);
    } catch (e) { }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('REPORTE DE EGRESOS', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(tituloRango.toUpperCase(), 105, 28, { align: 'center' });

    // Table
    (doc as any).autoTable({
      startY: 45,
      head: [['FECHA', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO']],
      body: datos.map(d => [
        dbService.formatDateDisplay(d.fecha),
        d.categoria.toUpperCase(),
        d.descripcion,
        `- ${d.monto} Bs.`
      ]),
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
      },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [254, 242, 242] }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL EGRESOS: ${totalGeneral} Bs.`, 195, finalY, { align: 'right' });

    return doc;
  }
};
