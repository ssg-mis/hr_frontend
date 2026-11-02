import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Printable A4 sheet of canteen QR badges (3 x 4 per page) with dashed cut lines.
// employees: [{ employeeCode, employeeName, designation, department, qrPayload }]
export const generateCanteenQrPdf = async (employees, fileName = 'Canteen_QR_Codes.pdf') => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const cols = 3;
  const rows = 4;
  const cardW = (pageW - margin * 2) / cols;
  const cardH = (pageH - margin * 2) / rows;
  const qrSize = 40;

  const fitText = (text, maxWidth) => {
    let t = String(text || '');
    if (doc.getTextWidth(t) <= maxWidth) return t;
    while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
  };

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const slot = i % (cols * rows);
    if (i > 0 && slot === 0) doc.addPage();

    const x = margin + (slot % cols) * cardW;
    const y = margin + Math.floor(slot / cols) * cardH;
    const cx = x + cardW / 2;
    const textW = cardW - 8;

    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.rect(x, y, cardW, cardH);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(79, 70, 229);
    doc.text('CANTEEN QR', cx, y + 7, { align: 'center' });

    // Shrink long names to fit on one line before falling back to truncation
    let nameSize = 10.5;
    doc.setFontSize(nameSize);
    while (nameSize > 7 && doc.getTextWidth(String(emp.employeeName || '')) > textW) {
      nameSize -= 0.5;
      doc.setFontSize(nameSize);
    }
    doc.setTextColor(30, 41, 59);
    doc.text(fitText(emp.employeeName, textW), cx, y + 13, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const sub = [emp.designation, emp.department].filter(Boolean).join(' · ');
    if (sub) doc.text(fitText(sub, textW), cx, y + 17.5, { align: 'center' });

    const png = await QRCode.toDataURL(emp.qrPayload, { width: 400, margin: 1, errorCorrectionLevel: 'M' });
    doc.addImage(png, 'PNG', cx - qrSize / 2, y + 20, qrSize, qrSize);

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229);
    doc.text(`ID: ${emp.employeeCode}`, cx, y + 20 + qrSize + 6, { align: 'center' });
  }

  doc.save(fileName);
};
