// src/components/Sidebar/VenueEditPanel.tsx
import React, { useRef, useState } from 'react';
import { useVenueStore } from '../../store/useVenueStore';
import { useProjectStore } from '../../store/useProjectStore';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { FileDown, Upload, Hash, Star, LayoutTemplate, Layers } from 'lucide-react';
import { exportVenueLocal, importVenueLocal } from '../../utils/venueIO';
import { RankSequence } from './RankSequence';

export const VenueEditPanel: React.FC = () => {
  const { 
    selectedSeatIds,
    autoNumberSeats, startNumberSequence, stopNumberSequence, isNumbering,
    autoPrioritySeats, setSeatZone
    // 【修復】移除了 startRankSequence, stopRankSequence, isSequencing，消除黃線警告
  } = useVenueStore();
  
  const { activeSessionId, sessions, categories } = useProjectStore();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const seats = activeSession?.venue.seats || [];
  const backgroundImage = activeSession?.venue.backgroundImage || null;
  
  const venueInputRef = useRef<HTMLInputElement>(null);

  const [numMode, setNumMode] = useState<'center' | 'top-left' | 'distance'>('center');
  const [numFormat, setNumFormat] = useState<'row-col' | 'sequence'>('row-col');
  const [priMode, setPriMode] = useState<'center' | 'top-left' | 'distance'>('center');

  const handleImportVenue = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (window.confirm('匯入新場地圖將會清空「當前場次」的所有座位與排位，確定嗎？')) {
      try {
        const config = await importVenueLocal(file);
        const state = useProjectStore.getState();
        useProjectStore.setState({
          sessions: state.sessions.map(s => 
            s.id === activeSessionId 
              ? { ...s, venue: { ...s.venue, seats: config.seats.map(seat => ({ ...seat, assignedPersonId: null })), backgroundImage: config.backgroundImage } }
              : s
          )
        });
        usePersonnelStore.getState().syncSeatingStatus();
      } catch (err: any) { alert(err.message); }
    }
    if (venueInputRef.current) venueInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-50 flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
      
      {/* 1. 場地匯入匯出 */}
      <div className="bg-white p-3 rounded shadow-sm border border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1"><LayoutTemplate size={14}/> 場地檔案備份 (.seatvenue)</h3>
        <div className="flex gap-2">
          <button onClick={() => exportVenueLocal(seats, backgroundImage, activeSession?.name || '場次')} className="flex-1 bg-slate-700 text-white text-xs py-2 rounded hover:bg-slate-600 flex items-center justify-center gap-1 font-bold shadow-sm transition">
            <FileDown size={14}/> 匯出本場次
          </button>
          <button onClick={() => venueInputRef.current?.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2 rounded hover:bg-slate-50 flex items-center justify-center gap-1 font-bold shadow-sm transition">
            <Upload size={14}/> 載入至本場次
          </button>
          <input type="file" ref={venueInputRef} onChange={handleImportVenue} className="hidden" accept=".seatvenue,.json" />
        </div>
      </div>

      {/* 2. 座位編號 */}
      <div className="bg-white p-3 rounded shadow-sm border border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1"><Hash size={14}/> 座位編號設定</h3>
        <div className="flex gap-2 mb-2 text-xs">
           <select className="flex-1 border p-1 rounded outline-none bg-slate-50" value={numMode} onChange={(e: any) => setNumMode(e.target.value)}>
               <option value="center">前/中優先</option>
               <option value="top-left">左上優先</option>
               <option value="distance">距離優先</option>
           </select>
           <select className="flex-1 border p-1 rounded outline-none bg-slate-50" value={numFormat} onChange={(e: any) => setNumFormat(e.target.value)}>
               <option value="row-col">行列式 (Row-Col)</option>
               <option value="sequence">單一流水號</option>
           </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => autoNumberSeats(numMode, numFormat)} className="bg-slate-100 text-slate-700 border border-slate-300 text-xs py-2 rounded hover:bg-slate-200 transition font-bold shadow-sm">自動重新編號</button>
            <button onClick={() => isNumbering ? stopNumberSequence() : startNumberSequence(1)} className={`text-xs py-2 rounded transition font-bold shadow-sm border ${isNumbering ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-100'}`}>
                {isNumbering ? '🛑 停止編號' : '👆 依序點選編號'}
            </button>
        </div>
      </div>

      {/* 3. 座位優先度 */}
      <div className="bg-white p-3 rounded shadow-sm border border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1"><Star size={14}/> 優先度 (Rank) 設定</h3>
        <div className="flex gap-2 mb-2 text-xs">
           <select className="flex-1 border p-1 rounded outline-none bg-slate-50" value={priMode} onChange={(e: any) => setPriMode(e.target.value)}>
               <option value="center">前/中優先</option>
               <option value="top-left">左上優先</option>
               <option value="distance">距離優先</option>
           </select>
           <button onClick={() => autoPrioritySeats(priMode)} className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs py-2 rounded hover:bg-amber-100 transition font-bold shadow-sm">自動計算優先度</button>
        </div>
        <div className="flex"><div className="w-full"><RankSequence /></div></div>
      </div>

      {/* 4. 區塊配置 */}
      <div className="bg-white p-3 rounded shadow-sm border border-slate-200">
        <div className="flex justify-between items-end mb-2">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1"><Layers size={14}/> 分派座位屬性區塊</h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">已選 {selectedSeatIds.length} 個</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
             <button onClick={() => setSeatZone(selectedSeatIds, '')} disabled={selectedSeatIds.length === 0} className="flex items-center text-left border rounded p-1.5 text-xs hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 transition">
                 <span className="w-3 h-3 rounded-full bg-slate-300 mr-2 shrink-0 border border-slate-400"></span>
                 <span className="truncate flex-1">清除區塊</span>
                 <span className="text-slate-400 text-[10px] ml-1">{seats.filter(s => !s.zoneCategory && s.type === 'seat').length}</span>
             </button>
             {categories.map((cat: any) => {
                 const count = seats.filter(s => s.zoneCategory === cat.label).length;
                 return (
                     <button key={cat.id} onClick={() => setSeatZone(selectedSeatIds, cat.label)} disabled={selectedSeatIds.length === 0} className="flex items-center text-left border rounded p-1.5 text-xs bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition" title={cat.label}>
                         <span className="w-3 h-3 rounded-full mr-2 shrink-0 border border-slate-200 shadow-sm" style={{backgroundColor: cat.color}}></span>
                         <span className="truncate flex-1">{cat.label}</span>
                         <span className="font-mono text-[10px] text-slate-400 ml-1 bg-slate-100 px-1 rounded">{count}</span>
                     </button>
                 );
             })}
        </div>
      </div>
    </div>
  );
};