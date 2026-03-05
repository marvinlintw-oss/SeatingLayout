// src/store/useVenueStore.ts
import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import type { Seat, Session } from '../types';

export const VIRTUAL_WIDTH = 3200;
export const VIRTUAL_HEIGHT = 2400;

type SortMode = 'center' | 'top-left' | 'distance';
type NumberFormat = 'row-col' | 'sequence';

// 輔助函式：取得並更新當前場次
const getActiveSession = () => {
  const state = useProjectStore.getState();
  return state.sessions.find(s => s.id === state.activeSessionId);
};

const updateActiveSession = (updater: (session: Session) => Session) => {
  const state = useProjectStore.getState();
  useProjectStore.setState({
    sessions: state.sessions.map(s => s.id === state.activeSessionId ? updater(s) : s)
  });
};

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// 【演算法：包含尊右原則懲罰值】
const sortSeatsByMode = (seatsToSort: Seat[], mode: SortMode, stageX: number, stageY: number) => {
  if (!seatsToSort || seatsToSort.length === 0) return [];
  const rows: Seat[][] = [];
  const sortedByY = [...seatsToSort].sort((a,b) => a.y - b.y);
  let currentRow: Seat[] = [];
  let lastY = sortedByY[0]?.y ?? 0;

  sortedByY.forEach(s => {
      if (Math.abs(s.y - lastY) > 20 && currentRow.length > 0) {
          rows.push(currentRow); currentRow = [];
      }
      currentRow.push(s); lastY = s.y;
  });
  if (currentRow.length > 0) rows.push(currentRow);

  rows.forEach(row => {
      row.sort((a, b) => {
          if (mode === 'top-left') return a.x - b.x;
          
          const aCenterX = a.x + (a.width || 100) / 2;
          const bCenterX = b.x + (b.width || 100) / 2;
          
          // 尊右原則：左側給予距離懲罰
          const penaltyA = aCenterX < stageX ? 0.1 : 0;
          const penaltyB = bCenterX < stageX ? 0.1 : 0;

          if (mode === 'center') {
              return (Math.abs(aCenterX - stageX) + penaltyA) - (Math.abs(bCenterX - stageX) + penaltyB);
          }
          if (mode === 'distance') {
              return (Math.hypot(aCenterX - stageX, a.y - stageY) + penaltyA) - (Math.hypot(bCenterX - stageX, b.y - stageY) + penaltyB);
          }
          return 0;
      });
  });
  return rows;
};

// 此 Store 僅保留 UI 暫存狀態，實際 seats 存於 ProjectStore
interface VenueUIState {
  isEditMode: boolean;          
  selectedSeatIds: string[];    
  clipboard: Seat[];            
  history: Seat[][]; // 針對當前場次的復原歷史

  rankSequenceCounter: number;  
  isSequencing: boolean;
  numberSequenceCounter: number;
  isNumbering: boolean;

  // Actions
  setEditMode: (enabled: boolean) => void;
  setSelection: (ids: string[]) => void;
  addToSelection: (ids: string[]) => void;
  clearSelection: () => void;
  copySelection: () => void;
  pasteSelection: (cursorX?: number, cursorY?: number) => void;
  deleteSelectedSeats: () => void;
  
  setStageScale: (scale: number) => void;
  setStagePosition: (pos: { x: number; y: number }) => void;
  setBackgroundImage: (url: string | null) => void;

  addSeat: (x: number, y: number, type?: 'seat'|'photo') => void;
  addSeatBatch: (startX: number, startY: number, rows: number, cols: number) => void;
  updateSeatPosition: (id: string, x: number, y: number) => void; 
  moveSeatsBatch: (ids: string[], deltaX: number, deltaY: number) => void;
  updateSeatProperties: (id: string, label?: string, rankWeight?: number) => void;
  setSeatZone: (ids: string[], categoryLabel: string) => void;
  updateSeatAssignment: (seatId: string, personId: string | null) => void;
  unassignSeat: (seatId: string) => void;
  
  startRankSequence: (startNum: number) => void;
  stopRankSequence: () => void;
  applyRankToSeat: (seatId: string) => void; 
  autoPrioritySeats: (mode: SortMode) => void; 

  startNumberSequence: (startNum: number) => void;
  stopNumberSequence: () => void;
  applyNumberToSeat: (seatId: string) => void;
  autoNumberSeats: (mode: SortMode, format: NumberFormat) => void;

  toggleMainStage: () => void;
  saveHistory: () => void;
  undo: () => void;
  clearHistory: () => void; // 切換場次時呼叫
}

export const useVenueStore = create<VenueUIState>((set, get) => ({
  isEditMode: false,
  selectedSeatIds: [],
  clipboard: [],
  history: [],
  
  rankSequenceCounter: 1,
  isSequencing: false,
  numberSequenceCounter: 1,
  isNumbering: false,

  setEditMode: (enabled) => set({ isEditMode: enabled, selectedSeatIds: [], isSequencing: false, isNumbering: false }),
  setSelection: (ids) => set({ selectedSeatIds: ids }),
  addToSelection: (ids) => set((state) => ({ selectedSeatIds: [...new Set([...state.selectedSeatIds, ...ids])] })),
  clearSelection: () => set({ selectedSeatIds: [] }),

  saveHistory: () => {
     const active = getActiveSession();
     if (active) set(state => ({ history: [...state.history, deepClone(active.venue.seats)].slice(-20) }));
  },
  
  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prevSeats = history[history.length - 1];
    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: prevSeats } }));
    set({ history: history.slice(0, -1) });
  },
  
  clearHistory: () => set({ history: [] }),

  copySelection: () => {
    const active = getActiveSession();
    if (!active) return;
    const { selectedSeatIds } = get();
    const selected = active.venue.seats.filter(s => selectedSeatIds.includes(s.id));
    if (selected.length > 0) set({ clipboard: deepClone(selected) });
  },

  pasteSelection: (cursorX = 100, cursorY = 100) => {
    const active = getActiveSession();
    const { clipboard } = get();
    if (!active || clipboard.length === 0) return;
    get().saveHistory();

    const minX = Math.min(...clipboard.map(s => s.x));
    const minY = Math.min(...clipboard.map(s => s.y));

    const targetSeats = clipboard.map(seat => ({
      ...seat,
      id: `seat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x: (seat.x - minX) + cursorX, 
      y: (seat.y - minY) + cursorY,
      assignedPersonId: null, 
      isPinned: false
    }));

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: [...s.venue.seats, ...targetSeats] } }));
    set({ selectedSeatIds: targetSeats.map(s => s.id) });
  },

  deleteSelectedSeats: () => {
    const { selectedSeatIds } = get();
    if (selectedSeatIds.length === 0) return;
    get().saveHistory();
    updateActiveSession(s => ({
      ...s, venue: { ...s.venue, seats: s.venue.seats.filter(seat => !selectedSeatIds.includes(seat.id)) }
    }));
    set({ selectedSeatIds: [] });
  },

  setStageScale: (scale) => updateActiveSession(s => ({ ...s, venue: { ...s.venue, stageScale: scale } })),
  setStagePosition: (pos) => updateActiveSession(s => ({ ...s, venue: { ...s.venue, stagePosition: pos } })),
  setBackgroundImage: (url) => updateActiveSession(s => ({ ...s, venue: { ...s.venue, backgroundImage: url } })),

  addSeat: (x, y, type = 'seat') => {
     get().saveHistory();
     const active = getActiveSession();
     if (!active) return;
     const nextRank = active.venue.seats.filter(s => s.type !== 'shape').length + 1;
     const newSeat: Seat = {
        id: `seat-${Date.now()}`, x, y, label: `S-${nextRank}`, rankWeight: 50,
        isPinned: false, assignedPersonId: null, type, isVisible: true
     };
     updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: [...s.venue.seats, newSeat] } }));
  },

  addSeatBatch: (startX, startY, rows, cols) => {
    get().saveHistory();
    const active = getActiveSession();
    if (!active) return;
    const newSeats: Seat[] = [];
    let currentCount = active.venue.seats.filter(s => s.type !== 'shape').length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        currentCount++;
        newSeats.push({
          id: `seat-${Date.now()}-${r}-${c}`, 
          x: startX + c * 110, y: startY + r * 160,
          label: `S-${currentCount}`, rankWeight: 50,
          isPinned: false, assignedPersonId: null, type: 'seat', isVisible: true
        });
      }
    }
    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: [...s.venue.seats, ...newSeats] } }));
  },

  updateSeatPosition: (id, x, y) => updateActiveSession(s => ({
    ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => seat.id === id ? { ...seat, x, y } : seat) }
  })),

  moveSeatsBatch: (ids, deltaX, deltaY) => updateActiveSession(s => ({
    ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => ids.includes(seat.id) ? { ...seat, x: seat.x + deltaX, y: seat.y + deltaY } : seat) }
  })),

  updateSeatProperties: (id, label, rankWeight) => {
     get().saveHistory();
     updateActiveSession(s => ({
       ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => {
         if (seat.id !== id) return seat;
         return { ...seat, ...(label !== undefined && { label }), ...(rankWeight !== undefined && { rankWeight: Math.max(0, Math.min(100, rankWeight)) }) };
       })}
     }));
  },

  setSeatZone: (ids, categoryLabel) => {
    if (ids.length === 0) return;
    get().saveHistory();
    updateActiveSession(s => ({
       ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => ids.includes(seat.id) ? { ...seat, zoneCategory: categoryLabel } : seat) }
    }));
  },

  updateSeatAssignment: (sid, pid) => updateActiveSession(s => ({
    ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => seat.id === sid ? { ...seat, assignedPersonId: pid } : seat) }
  })),

  unassignSeat: (sid) => updateActiveSession(s => ({
    ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => seat.id === sid ? { ...seat, assignedPersonId: null } : seat) }
  })),

  toggleMainStage: () => {
    get().saveHistory();
    updateActiveSession(s => {
        const hasStage = s.venue.seats.some(seat => seat.type === 'shape' && seat.label === '主舞台');
        if (hasStage) {
            return { ...s, venue: { ...s.venue, seats: s.venue.seats.filter(seat => !(seat.type === 'shape' && seat.label === '主舞台')) } };
        }
        return { ...s, venue: { ...s.venue, seats: [...s.venue.seats, {
            id: `stage-${Date.now()}`, x: VIRTUAL_WIDTH / 2 - 300, y: 50, 
            label: '主舞台', rankWeight: 0, isPinned: false, assignedPersonId: null, 
            type: 'shape', width: 600, height: 150, shapeType: 'rect', isVisible: true
        }]}};
    });
  },

  startRankSequence: (startNum) => set({ isSequencing: true, isNumbering: false, rankSequenceCounter: startNum }),
  stopRankSequence: () => set({ isSequencing: false }),
  applyRankToSeat: (seatId) => {
    const { isSequencing, rankSequenceCounter } = get();
    if (!isSequencing) return;
    get().saveHistory();
    const validRank = Math.max(0, Math.min(100, rankSequenceCounter));
    updateActiveSession(s => ({
      ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => seat.id === seatId ? { ...seat, rankWeight: validRank } : seat) }
    }));
    set({ rankSequenceCounter: rankSequenceCounter + 1 });
  },

  autoPrioritySeats: (mode) => {
    get().saveHistory();
    const active = getActiveSession();
    if (!active) return;
    const validSeats = active.venue.seats.filter(s => s.type !== 'shape');
    if (validSeats.length === 0) return;

    const stage = active.venue.seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : VIRTUAL_WIDTH / 2;
    const stageY = stage ? stage.y + (stage.height || 150) / 2 : 50;

    const groupedRows = sortSeatsByMode(validSeats, mode, stageX, stageY);
    const flatSortedIds = groupedRows.flat().map(s => s.id);
    
    updateActiveSession(s => ({
      ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => {
        if (seat.type === 'shape') return seat;
        const index = flatSortedIds.indexOf(seat.id);
        if (index === -1) return seat;
        return { ...seat, rankWeight: index + 1 };
      })}
    }));
  },

  startNumberSequence: (startNum) => set({ isNumbering: true, isSequencing: false, numberSequenceCounter: startNum }),
  stopNumberSequence: () => set({ isNumbering: false }),
  applyNumberToSeat: (seatId) => {
    const { isNumbering, numberSequenceCounter } = get();
    if (!isNumbering) return;
    get().saveHistory();
    updateActiveSession(s => ({
      ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => seat.id === seatId ? { ...seat, label: String(numberSequenceCounter) } : seat) }
    }));
    set({ numberSequenceCounter: numberSequenceCounter + 1 });
  },

  autoNumberSeats: (mode, format) => {
    get().saveHistory();
    const active = getActiveSession();
    if (!active) return;
    const validSeats = active.venue.seats.filter(s => s.type !== 'shape');
    if (validSeats.length === 0) return;

    const stage = active.venue.seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : VIRTUAL_WIDTH / 2;
    const stageY = stage ? stage.y + (stage.height || 150) / 2 : 50;

    const groupedRows = sortSeatsByMode(validSeats, mode, stageX, stageY);
    const newSeats = [...active.venue.seats];
    let globalSeq = 1;

    groupedRows.forEach((row, rowIdx) => {
        const rowStr = String(rowIdx + 1).padStart(2, '0');
        row.forEach((seat, colIdx) => {
            const colStr = String(colIdx + 1).padStart(2, '0');
            const newLabel = format === 'row-col' ? `${rowStr}-${colStr}` : String(globalSeq++);
            const sIndex = newSeats.findIndex(s => s.id === seat.id);
            if(sIndex !== -1) newSeats[sIndex] = { ...newSeats[sIndex], label: newLabel };
        });
    });

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
  }
}));