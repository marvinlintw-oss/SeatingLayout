// src/components/Sidebar/RankSequence.tsx
import React from 'react';
import { useVenueStore } from '../../store/useVenueStore';

export const RankSequence: React.FC = () => {
  const { isSequencing, startRankSequence, stopRankSequence } = useVenueStore();

  return (
    <button 
      onClick={() => isSequencing ? stopRankSequence() : startRankSequence(1)} 
      className={`text-xs py-2 rounded transition shadow-sm font-bold border ${isSequencing ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-100'}`}
    >
      {isSequencing ? '🛑 停止排序' : '👆 依序點選排序'}
    </button>
  );
};