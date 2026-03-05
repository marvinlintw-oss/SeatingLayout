// src/components/Sidebar/PersonnelPanel.tsx
import React, { useState } from 'react';
import { Plus, Table, Printer } from 'lucide-react';
import { AutoArrange } from './AutoArrange';
import { ManualAssign } from './ManualAssign';
import { ExcelBatchModal } from '../Modals/ExcelBatchModal';
import { SpreadsheetModal } from '../Modals/SpreadsheetModal'; 
import { ReportModal } from '../Modals/ReportModal';           

export const PersonnelPanel: React.FC = () => {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-top-2 duration-300 bg-white relative">
      
      {/* 頂部：總名單管理 */}
      <div className="p-4 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">總名單管理</h3>
            <button 
                onClick={() => setIsExcelModalOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
              >
                <Plus size={12}/> 快速貼上名單
            </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setIsSpreadsheetOpen(true)} 
            className="bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs flex justify-center items-center gap-1 shadow-sm transition font-bold"
          >
            <Table size={14}/> 試算表編輯
          </button>
          <button 
            onClick={() => setIsReportOpen(true)} 
            className="bg-amber-500 hover:bg-amber-600 text-white py-2 rounded text-xs flex justify-center items-center gap-1 shadow-sm transition font-bold"
          >
            <Printer size={14}/> 報表匯出
          </button>
        </div>
      </div>

      {/* 模組：自動排位 */}
      <AutoArrange />

      {/* 模組：拖曳名單與狀態 */}
      <ManualAssign />

      {/* 彈出視窗 */}
      <ExcelBatchModal isOpen={isExcelModalOpen} onClose={() => setIsExcelModalOpen(false)} />
      <SpreadsheetModal isOpen={isSpreadsheetOpen} onClose={() => setIsSpreadsheetOpen(false)} />
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </div>
  );
};