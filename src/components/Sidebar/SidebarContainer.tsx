// src/components/Sidebar/SidebarContainer.tsx
import React from 'react';
import { PersonnelPanel } from './PersonnelPanel';
import { VenueEditPanel } from './VenueEditPanel';
import { exportCanvas } from '../../utils/canvasExport';
import { useVenueStore } from '../../store/useVenueStore';
import { Users, Map, Image as ImageIcon, FileCode2, FileText } from 'lucide-react';

export const SidebarContainer: React.FC = () => {
  // 【修復】廢除本地 useState，直接以大水庫的 isEditMode 作為單一真相來源 (SSOT)
  const isEditMode = useVenueStore(state => state.isEditMode);

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shadow-lg z-10 shrink-0">
      
      {/* 頂部頁籤 */}
      <div className="flex bg-slate-800 text-slate-300 shrink-0">
        <button
          onClick={() => useVenueStore.setState({ isEditMode: false })}
          className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 transition-colors ${!isEditMode ? 'bg-white text-blue-600' : 'hover:bg-slate-700 hover:text-white'}`}
        >
          <Users size={16} /> 人員排位
        </button>
        <button
          onClick={() => useVenueStore.setState({ isEditMode: true })}
          className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 transition-colors ${isEditMode ? 'bg-white text-blue-600' : 'hover:bg-slate-700 hover:text-white'}`}
        >
          <Map size={16} /> 場地編輯
        </button>
      </div>

      {/* 內容區塊 (滾動區) */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
         {!isEditMode ? <PersonnelPanel /> : <VenueEditPanel />}
      </div>

      {/* 底部畫布匯出工具列 */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2 shrink-0">
        <button 
           onClick={() => exportCanvas('png')} 
           className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-300 text-slate-600 py-1.5 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition text-xs font-bold shadow-sm"
           title="匯出為高畫質 PNG 圖片"
        >
            <ImageIcon size={14}/> PNG
        </button>
        <button 
           onClick={() => exportCanvas('svg')} 
           className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-300 text-slate-600 py-1.5 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition text-xs font-bold shadow-sm"
           title="匯出為可編輯 SVG 向量檔"
        >
            <FileCode2 size={14}/> SVG
        </button>
        <button 
           onClick={() => exportCanvas('pdf')} 
           className="flex-1 flex items-center justify-center gap-1 bg-red-50 border border-red-200 text-red-600 py-1.5 rounded hover:bg-red-100 transition text-xs font-bold shadow-sm"
           title="匯出為可列印 PDF 檔案"
        >
            <FileText size={14}/> PDF
        </button>
      </div>
      
    </div>
  );
};