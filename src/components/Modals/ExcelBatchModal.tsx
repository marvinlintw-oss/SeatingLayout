// src/components/Modals/ExcelBatchModal.tsx
import React, { useState } from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { X, Upload } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelBatchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [pastedText, setPastedText] = useState('');
  const { addNewPerson } = usePersonnelStore();
  
  if (!isOpen) return null;

  const handleImport = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.split('\n').filter(line => line.trim());
    let importCount = 0;

    lines.forEach((line, index) => {
      // 略過表頭
      if (index === 0 && (line.includes('姓名') || line.includes('name'))) return; 
      
      const cols = line.split('\t').map(c => c.trim());
      if (cols.length >= 1 && cols[0]) {
        const name = cols[0];
        const title = cols[1] || '';
        const org = cols[2] || '';
        const category = cols[3] || '一般貴賓';
        const rankScore = parseInt(cols[4], 10) || 50;
        
        addNewPerson(name, title, org, category, rankScore);
        importCount++;
      }
    });

    alert(`成功匯入 ${importCount} 筆名單！`);
    setPastedText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Upload size={20} className="text-blue-600"/> 從 Excel 快速貼上名單
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
            <X size={20}/>
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-sm text-slate-500 mb-2">請從 Excel 複製包含以下欄位的資料，並直接貼上到下方文字框：</p>
          <div className="flex gap-2 mb-4 text-xs font-mono bg-slate-100 p-2 rounded text-slate-600 overflow-x-auto">
            <span className="bg-white px-2 py-1 rounded border border-slate-200 shrink-0">1. 姓名 (必填)</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200 shrink-0">2. 職稱</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200 shrink-0">3. 單位</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200 shrink-0">4. 類別</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200 shrink-0">5. 優先權重 (0-100)</span>
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="在此貼上 Excel 資料 (Ctrl+V)..."
            className="w-full h-64 border border-slate-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 whitespace-pre transition custom-scrollbar"
          ></textarea>
        </div>
        
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">取消</button>
          <button onClick={handleImport} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition shadow-sm">開始匯入</button>
        </div>
        
      </div>
    </div>
  );
};