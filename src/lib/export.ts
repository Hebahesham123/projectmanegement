'use client';

import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportCsv<T extends Record<string, unknown>>(rows: T[], filename: string) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportPdf<T extends Record<string, unknown>>(
  rows: T[],
  columns: { header: string; key: keyof T }[],
  filename: string,
  title?: string
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 16);
  }
  autoTable(doc, {
    startY: title ? 22 : 14,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => String(r[c.key] ?? ''))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [52, 120, 246] },
  });
  doc.save(`${filename}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
