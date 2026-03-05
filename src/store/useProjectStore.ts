// src/store/useProjectStore.ts (完整覆蓋)
import { create } from 'zustand';
import type { Project, Session, Person, Category } from '../types';

const defaultSession: Session = {
  id: `session-${Date.now()}`,
  name: '主場次 (開幕式)',
  venue: { seats: [], backgroundImage: null, stageScale: 0.4, stagePosition: { x: 0, y: 50 } }
};

interface ProjectState extends Project {
  setProjectName: (name: string) => void;
  setActiveSession: (sessionId: string) => void;
  addSession: (name: string) => void;
  removeSession: (sessionId: string) => void;
  
  // 【新增】雲端存取專用 Actions
  setFileId: (id: string | undefined) => void;
  loadProjectData: (data: Project) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  version: '4.0',
  timestamp: new Date().toISOString(),
  projectName: '未命名活動專案',
  fileId: undefined, // 預設沒有綁定雲端檔案
  
  personnel: [],
  categories: [],
  sessions: [defaultSession],
  activeSessionId: defaultSession.id,

  setProjectName: (name) => set({ projectName: name }),
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  addSession: (name) => set((state) => {
    const newSessionId = `session-${Date.now()}`;
    const newSession = { 
      id: newSessionId, name, 
      venue: { seats: [], backgroundImage: null, stageScale: 0.4, stagePosition: { x: 0, y: 50 } } 
    };
    // 【修復】讓現有名單中的所有人，預設也參加這個新場次
    const updatedPersonnel = state.personnel.map(p => ({
      ...p,
      attendingSessionIds: p.attendingSessionIds ? [...p.attendingSessionIds, newSessionId] : [newSessionId]
    }));
    return { sessions: [...state.sessions, newSession], personnel: updatedPersonnel };
  }),

  removeSession: (sessionId) => set((state) => {
    if (state.sessions.length <= 1) return state;
    const newSessions = state.sessions.filter(s => s.id !== sessionId);
    const newActiveId = state.activeSessionId === sessionId ? newSessions[0].id : state.activeSessionId;
    // 【修復】清理人員身上的廢棄場次 ID
    const updatedPersonnel = state.personnel.map(p => ({
      ...p,
      attendingSessionIds: p.attendingSessionIds?.filter(id => id !== sessionId)
    }));
    return { sessions: newSessions, activeSessionId: newActiveId, personnel: updatedPersonnel };
  }),

  // 【新增】記錄當前綁定的 Google Drive 檔案 ID
  setFileId: (id) => set({ fileId: id }),
  
  // 【新增】將雲端抓下來的整包資料灌入系統
  loadProjectData: (data) => set({
    version: data.version || '4.0',
    timestamp: data.timestamp,
    projectName: data.projectName || '未命名活動專案',
    fileId: data.fileId,
    personnel: data.personnel || [],
    categories: data.categories || [],
    sessions: data.sessions && data.sessions.length > 0 ? data.sessions : [defaultSession],
    activeSessionId: data.activeSessionId || (data.sessions?.[0]?.id ?? defaultSession.id),
  }),
}));