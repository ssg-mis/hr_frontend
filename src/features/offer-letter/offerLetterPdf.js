import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// A row is a safe page break if it is (almost) blank.
const isBlankRow = (ctx, y, width) => {
  const { data } = ctx.getImageData(0, y, width, 1);
  for (let i = 0; i < data.length; i += 16) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) return false;
  }
  return true;
};

/**
 * Renders a DOM node (A4-width letter) into a multi-page A4 PDF.
 * Page breaks are moved up to the nearest blank pixel row so text lines are never cut.
 * Returns a Blob.
 */
export const renderLetterToPdf = async (node) => {
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const pxPerMm = canvas.width / pageW;
  const topMarginMm = 12; // pages after the first start with a small top margin
  const fullPagePx = Math.floor(pageH * pxPerMm);

  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    const offsetMm = page === 0 ? 0 : topMarginMm;
    const usablePx = fullPagePx - Math.floor(offsetMm * pxPerMm);
    let end = Math.min(y + usablePx, canvas.height);
    if (end < canvas.height) {
      const limit = Math.max(y + Math.floor(usablePx * 0.6), end - 400);
      let cut = end;
      while (cut > limit && !isBlankRow(ctx, cut, canvas.width)) cut -= 2;
      if (cut > limit) end = cut;
    }
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = end - y;
    slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, end - y, 0, 0, canvas.width, end - y);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, offsetMm, pageW, (end - y) / pxPerMm);
    y = end;
    page += 1;
  }
  return pdf.output('blob');
};
