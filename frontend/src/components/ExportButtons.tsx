import React from 'react';
import { Download } from 'lucide-react';
import { exportToJSON, exportToCSV, exportToExcel } from '../utils/exportUtils';

interface ExportButtonsProps {
  data: any[];
  filename: string;
}

export function ExportButtons({ data, filename }: ExportButtonsProps) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
        <Download size={14} /> Exporter:
      </span>
      <button 
        onClick={() => exportToJSON(data, filename)}
        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}
      >
        JSON
      </button>
      <button 
        onClick={() => exportToCSV(data, filename)}
        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.2)' }}
      >
        CSV
      </button>
      <button 
        onClick={() => exportToExcel(data, filename)}
        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.2)' }}
      >
        Excel
      </button>
    </div>
  );
}
