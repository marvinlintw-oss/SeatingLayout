// src/components/Modals/GridGenerateModal.tsx
import React, { useState } from 'react';

interface GridGenerateModalProps {
  onClose: () => void;
  onConfirm: (rows: number, cols: number) => void;
}

export const GridGenerateModal: React.FC<GridGenerateModalProps> = ({ onClose, onConfirm }) => {
  const [batchRows, setBatchRows] = useState(3);
  const [batchCols, setBatchCols] = useState(5);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-80">
        <h3 className="text-lg font-bold mb-4 text-slate-800">矩陣生成座位</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 block mb-1">排數 (1-20)</label>
            <input type="number" min="1" max="20" value={batchRows} onChange={(e) => setBatchRows(Number(e.target.value))} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"/>
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">列數 (1-30)</label>
            <input type="number" min="1" max="30" value={batchCols} onChange={(e) => setBatchCols(Number(e.target.value))} className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"/>
          </div>
          <div className="flex gap-2 pt-4">
              <button onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition">取消</button>
              <button onClick={() => onConfirm(batchRows, batchCols)} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition">準備放置</button>
          </div>
        </div>
      </div>
    </div>
  );
};