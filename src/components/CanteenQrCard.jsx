import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode } from 'lucide-react';
import api from '../lib/api';

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Signed canteen QR (drawn locally - the payload never goes to an external QR service).
// Without employeeCode it loads the logged-in employee's own QR; with it, the QR for that employee (HR/HOD/Admin).
const CanteenQrCard = ({ employeeCode, subtitle, size = 144, showActions = true, className = '' }) => {
  const [info, setInfo] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    setQrDataUrl('');
    const url = employeeCode ? `/canteen/qr?employeeCode=${encodeURIComponent(employeeCode)}` : '/canteen/my-qr';
    api.get(url)
      .then(async (res) => {
        const data = res?.data;
        if (!data?.qrPayload) throw new Error('QR not available');
        const png = await QRCode.toDataURL(data.qrPayload, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
        if (!cancelled) { setInfo(data); setQrDataUrl(png); }
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load canteen QR'); });
    return () => { cancelled = true; };
  }, [employeeCode]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Canteen_QR_${info.employeeCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Canteen QR - ${escapeHtml(info.employeeName)}</title>
      <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; }
        h2 { margin: 0 0 6px; color: #1e293b; }
        p { margin: 0 0 14px; color: #64748b; font-size: 14px; font-weight: bold; }
        img { width: 220px; height: 220px; }
        .code { font-family: monospace; font-size: 18px; color: #4f46e5; margin-top: 8px; font-weight: bold; }
      </style></head>
      <body><div class="card">
        <h2>${escapeHtml(info.employeeName)}</h2>
        <p>${escapeHtml(subtitle || 'Canteen QR')}</p>
        <img src="${qrDataUrl}" />
        <div class="code">ID: ${escapeHtml(info.employeeCode)}</div>
      </div>
      <script>window.onload = function () { window.print(); setTimeout(function () { window.close(); }, 500); };</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-white p-3 border border-gray-200 rounded-2xl shadow-sm flex items-center justify-center" style={{ minWidth: size + 24, minHeight: size + 24 }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Canteen QR Code" style={{ width: size, height: size }} className="object-contain" />
        ) : error ? (
          <p className="text-xs text-red-500 max-w-[160px] text-center">{error}</p>
        ) : (
          <QrCode className="w-8 h-8 text-gray-300 animate-pulse" />
        )}
      </div>
      {info?.employeeCode && (
        <p className="text-xs text-gray-500 mt-2">
          Employee ID: <span className="font-mono font-bold text-gray-800">{info.employeeCode}</span>
        </p>
      )}
      {showActions && qrDataUrl && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <Download size={14} /> Download
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Badge
          </button>
        </div>
      )}
    </div>
  );
};

export default CanteenQrCard;
