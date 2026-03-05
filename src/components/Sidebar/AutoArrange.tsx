// src/components/Sidebar/AutoArrange.tsx
import React from 'react';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { Crown, LayoutGrid, Layers, RotateCcw } from 'lucide-react';

export const AutoArrange: React.FC = () => {
  const { 
    autoArrangeByImportance, 
    autoArrangeByPosition, 
    autoArrangeByCategory, 
    resetSeating 
  } = usePersonnelStore();

  return (
    <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0">
      <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">自動排位功能 (套用當前場次)</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button 
          onClick={autoArrangeByImportance} 
          className="bg-indigo-50 text-indigo-700 text-[11px] py-2 rounded hover:bg-indigo-100 transition flex flex-col items-center justify-center gap-1 font-bold border border-indigo-200 shadow-sm"
        >
          <Crown size={16} /> 依重要度
        </button>
        <button 
          onClick={autoArrangeByPosition} 
          className="bg-blue-50 text-blue-700 text-[11px] py-2 rounded hover:bg-blue-100 transition flex flex-col items-center justify-center gap-1 font-bold border border-blue-200 shadow-sm"
        >
          <LayoutGrid size={16} /> 依位置
        </button>
        <button 
          onClick={autoArrangeByCategory} 
          className="bg-fuchsia-50 text-fuchsia-700 text-[11px] py-2 rounded hover:bg-fuchsia-100 transition flex flex-col items-center justify-center gap-1 font-bold border border-fuchsia-200 shadow-sm"
        >
          <Layers size={16} /> 依區塊
        </button>
      </div>
      <button 
        onClick={() => { if(window.confirm('確定要清空當前場次的所有座位安排嗎？')) resetSeating(); }} 
        className="w-full text-xs text-slate-500 py-1.5 border border-slate-300 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition flex justify-center items-center gap-1 mt-2"
      >
        <RotateCcw size={12}/> 重置當前場次排位
      </button>
    </div>
  );
};