// src/components/Modals/ReportModal.tsx
import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { personnel, sessions, activeSessionId, projectName } = useProjectStore();
  
  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const seats = activeSession?.venue.seats || [];

  // 整理資料：只列出「當前場次」已入座的座位
  const assignedSeats = seats
    .filter(seat => seat.assignedPersonId)
    .map(seat => {
      const person = personnel.find(p => p.id === seat.assignedPersonId);
      return {
        seatLabel: seat.label,
        personName: person?.name || '未知',
        personTitle: person?.title || '',
        personOrg: person?.organization || '',
        category: person?.category || '',
      };
    })
    // 優先使用數字排序，若為純文字則使用字母排序
    .sort((a, b) => {
        const numA = parseInt(a.seatLabel);
        const numB = parseInt(b.seatLabel);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.seatLabel.localeCompare(b.seatLabel);
    });

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 overflow-auto py-10 print:p-0 print:bg-white print:static">
      <div className="bg-white w-[800px] min-h-[500px] rounded-xl shadow-2xl flex flex-col print:shadow-none print:w-full">
        
        {/* Header (螢幕顯示，列印時隱藏) */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl print:hidden">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Printer size={20} className="text-amber-500" /> 座位分配清單匯出
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-amber-600 shadow-sm transition"
            >
               列印 / 另存 PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20}/></button>
          </div>
        </div>

        {/* 報表內容 (列印範圍) */}
        <div className="p-8 print:p-0">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{projectName}</h1>
            <h2 className="text-lg font-bold text-slate-600 mb-2">【 {activeSession?.name} 】座位安排表</h2>
            <p className="text-xs text-slate-400">製表時間：{new Date().toLocaleString()}</p>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-slate-300 print:bg-slate-100">
                <th className="py-2 px-3 text-left w-20">座位</th>
                <th className="py-2 px-3 text-left w-1/4">姓名</th>
                <th className="py-2 px-3 text-left w-1/4">職稱</th>
                <th className="py-2 px-3 text-left">單位</th>
                <th className="py-2 px-3 text-left w-24">類別</th>
              </tr>
            </thead>
            <tbody>
              {assignedSeats.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 print:border-slate-300">
                  <td className="py-2 px-3 font-mono font-bold text-blue-800">{item.seatLabel}</td>
                  <td className="py-2 px-3 font-bold text-base tracking-wide">{item.personName}</td>
                  <td className="py-2 px-3 text-slate-600">{item.personTitle}</td>
                  <td className="py-2 px-3 text-slate-600">{item.personOrg}</td>
                  <td className="py-2 px-3">
                    <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-500">
                      {item.category}
                    </span>
                  </td>
                </tr>
              ))}
              {assignedSeats.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">本場次目前尚無人員入座</td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 hidden print:block">
             本報表由 Seat-System v4.0 自動產生
          </div>
        </div>
      </div>
    </div>
  );
};