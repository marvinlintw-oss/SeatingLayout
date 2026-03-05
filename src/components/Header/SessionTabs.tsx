// src/components/Header/SessionTabs.tsx
import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Plus, X } from 'lucide-react';

export const SessionTabs: React.FC = () => {
  const { sessions, activeSessionId, setActiveSession, addSession, removeSession } = useProjectStore();

  const handleAdd = () => {
    const newName = `場次 ${sessions.length + 1}`;
    addSession(newName);
  };

  return (
    <div className="h-10 bg-slate-200 border-b border-slate-300 flex items-end px-2 gap-1 overflow-x-auto shrink-0 custom-scrollbar">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        return (
          <div
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className={`group relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer transition-colors border border-b-0
              ${isActive
                ? 'bg-white text-blue-700 border-slate-300 shadow-sm z-10'
                : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'
              }`}
            style={isActive ? { marginBottom: '-1px', paddingBottom: '9px' } : {}}
          >
            <span>{session.name}</span>
            {sessions.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`確定要刪除場次「${session.name}」嗎？`)) {
                    removeSession(session.id);
                  }
                }}
                className={`p-0.5 rounded-full hover:bg-slate-200 ${isActive ? 'text-slate-400 hover:text-red-500' : 'text-transparent group-hover:text-slate-500'} transition-colors`}
                title="刪除場次"
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
      
      <button
        onClick={handleAdd}
        className="flex items-center gap-1 px-3 py-1.5 mb-1 ml-1 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"
      >
        <Plus size={16} /> 新增場次
      </button>
    </div>
  );
};