import ExcelJS from 'exceljs';

const pad = (n) => String(n).padStart(2, '0');

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const currentMonthStr = () => todayStr().slice(0, 7);
export const monthStartStr = () => `${currentMonthStr()}-01`;

export const formatMoney = (v) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// "2026-09-05" -> "05/09/2026"
export const formatDate = (v) => {
  if (!v) return '—';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : String(v);
};

export const formatMinutes = (mins) => {
  const m = Number(mins || 0);
  if (!m) return '0h';
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
};

export const formatMonthLabel = (month) => {
  const [y, m] = String(month).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
const THIN = { style: 'thin', color: { argb: 'FFD1D5DB' } };

/**
 * Download an .xlsx with one or more sheets.
 * sheets: [{ name, title?, columns: [{ header, key, width?, numFmt? }], rows, cellStyle?(key, value, row) => partial style }]
 */
export const downloadExcel = async (fileName, sheets) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR FMS';

  sheets.forEach(({ name, title, columns, rows, cellStyle }) => {
    const ws = wb.addWorksheet(name.slice(0, 31));
    let headerRowIdx = 1;
    if (title) {
      ws.addRow([title]).font = { bold: true, size: 13 };
      ws.mergeCells(1, 1, 1, Math.max(columns.length, 1));
      ws.addRow([]);
      headerRowIdx = 3;
    }
    const header = ws.addRow(columns.map((c) => c.header));
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
    });

    rows.forEach((row) => {
      const r = ws.addRow(columns.map((c) => row[c.key] ?? ''));
      r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const col = columns[colNumber - 1];
        cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
        if (col?.numFmt) cell.numFmt = col.numFmt;
        const extra = cellStyle?.(col?.key, cell.value, row);
        if (extra) Object.assign(cell, extra);
      });
    });

    columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width || 14; });
    ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];
    ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: columns.length } };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildQuery = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  return q.toString();
};
