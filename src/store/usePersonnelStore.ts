// src/store/usePersonnelStore.ts
import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import type { Person, Session, Seat } from '../types';

interface PersonnelState {
  addNewPerson: (name: string, title: string, org: string, category: string, rankScore: number) => void;
  updatePersonnelList: (list: Person[]) => void;
  removePerson: (id: string) => void;
  autoArrangeByCategory: () => void; 
  autoArrangeByImportance: () => void; // 【新增】依重要度
  autoArrangeByPosition: () => void;   // 【新增】依位置
  resetSeating: () => void;
  syncSeatingStatus: () => void;
}

const updateActiveSession = (updater: (session: Session) => Session) => {
  const state = useProjectStore.getState();
  useProjectStore.setState({
    sessions: state.sessions.map(s => s.id === state.activeSessionId ? updater(s) : s)
  });
};

export const usePersonnelStore = create<PersonnelState>((_set, get) => ({

  addNewPerson: (name, title, org, category, rankScore) => {
    const state = useProjectStore.getState();
    const safeRank = Math.max(0, Math.min(100, rankScore));
    const allSessionIds = state.sessions.map(s => s.id);
    
    useProjectStore.setState({
      personnel: [
          { 
            id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
            name: name.trim(), title: title.trim(), organization: org.trim(), 
            rankScore: safeRank, category: category.trim(), isSeated: false,
            attendingSessionIds: allSessionIds
          },
          ...state.personnel
      ]
    });
  },

  updatePersonnelList: (newList) => {
    const state = useProjectStore.getState();
    const personMap = new Map(newList.map(p => [p.id, p]));

    const updatedSessions = state.sessions.map(session => {
      let hasChanges = false;
      const newSeats = session.venue.seats.map(seat => {
        if (seat.assignedPersonId) {
          const person = personMap.get(seat.assignedPersonId);
          const isAttending = person?.attendingSessionIds ? person.attendingSessionIds.includes(session.id) : true;
          if (!person || !isAttending) {
            hasChanges = true;
            return { ...seat, assignedPersonId: null };
          }
        }
        return seat;
      });
      return hasChanges ? { ...session, venue: { ...session.venue, seats: newSeats } } : session;
    });

    useProjectStore.setState({ personnel: newList, sessions: updatedSessions });
    get().syncSeatingStatus();
  },

  removePerson: (id) => {
    const state = useProjectStore.getState();
    const newList = state.personnel.filter(p => p.id !== id);
    get().updatePersonnelList(newList); 
  },

  // 1. 依區塊排位
  autoArrangeByCategory: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const validSeats = activeSession.venue.seats.filter(s => !s.isPinned && s.type !== 'shape' && s.isVisible !== false);
    const stage = activeSession.venue.seats.find(s => s.type === 'shape' && s.label === '主舞台');
    const stageX = stage ? stage.x + (stage.width || 600) / 2 : 1600;

    const sortSeatsFn = (a: any, b: any) => {
        const weightA = a.rankWeight ?? 9999;
        const weightB = b.rankWeight ?? 9999;
        if (weightA !== weightB) return weightA - weightB;
        return Math.abs((a.x + (a.width || 100) / 2) - stageX) - Math.abs((b.x + (b.width || 100) / 2) - stageX);
    };

    const availableSeats = [...validSeats].sort(sortSeatsFn);
    const attendingPeople = projectState.personnel.filter(p => p.attendingSessionIds ? p.attendingSessionIds.includes(projectState.activeSessionId) : true);
    const sortedPeople = [...attendingPeople].sort((a, b) => b.rankScore - a.rankScore);
    
    const unassignedPeople: Person[] = [];
    let newSeats: Seat[] = activeSession.venue.seats.map(s => ({ ...s, assignedPersonId: null as string | null }));

    for (const person of sortedPeople) {
        const matchIndex = availableSeats.findIndex(s => s.zoneCategory && (s.zoneCategory || '').trim() === (person.category || '').trim());
        if (matchIndex !== -1) {
            newSeats[newSeats.findIndex(ns => ns.id === availableSeats[matchIndex].id)].assignedPersonId = person.id;
            availableSeats.splice(matchIndex, 1); 
        } else {
            unassignedPeople.push(person);
        }
    }

    availableSeats.sort((a, b) => (a.zoneCategory ? 1 : 0) - (b.zoneCategory ? 1 : 0) || sortSeatsFn(a, b));
    for (const person of unassignedPeople) {
        if (availableSeats.length > 0) newSeats[newSeats.findIndex(ns => ns.id === availableSeats.shift()!.id)].assignedPersonId = person.id;
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  // 2. 依重要度排位 (純看優先度序列，不理會區塊)
  autoArrangeByImportance: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const validSeats = activeSession.venue.seats.filter(s => !s.isPinned && s.type !== 'shape' && s.isVisible !== false);
    
    // 座位：優先依照 rankWeight 排序，其次依 Y 軸(前排)
    const availableSeats = [...validSeats].sort((a, b) => {
        const weightA = a.rankWeight ?? 9999;
        const weightB = b.rankWeight ?? 9999;
        if (weightA !== weightB) return weightA - weightB;
        return a.y - b.y;
    });

    const attendingPeople = projectState.personnel.filter(p => p.attendingSessionIds ? p.attendingSessionIds.includes(projectState.activeSessionId) : true);
    const sortedPeople = [...attendingPeople].sort((a, b) => b.rankScore - a.rankScore);
    
    let newSeats: Seat[] = activeSession.venue.seats.map(s => ({ ...s, assignedPersonId: null as string | null }));
    for (const person of sortedPeople) {
        if (availableSeats.length > 0) newSeats[newSeats.findIndex(ns => ns.id === availableSeats.shift()!.id)].assignedPersonId = person.id;
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  // 3. 依位置排位 (純看空間座標，由前到後、由左到右)
  autoArrangeByPosition: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;

    const validSeats = activeSession.venue.seats.filter(s => !s.isPinned && s.type !== 'shape' && s.isVisible !== false);
    
    // 座位：純粹依照空間座標排序 (Y軸優先，X軸其次)
    const availableSeats = [...validSeats].sort((a, b) => {
        if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
        return a.x - b.x;
    });

    const attendingPeople = projectState.personnel.filter(p => p.attendingSessionIds ? p.attendingSessionIds.includes(projectState.activeSessionId) : true);
    const sortedPeople = [...attendingPeople].sort((a, b) => b.rankScore - a.rankScore);
    
    let newSeats: Seat[] = activeSession.venue.seats.map(s => ({ ...s, assignedPersonId: null as string | null }));
    for (const person of sortedPeople) {
        if (availableSeats.length > 0) newSeats[newSeats.findIndex(ns => ns.id === availableSeats.shift()!.id)].assignedPersonId = person.id;
    }

    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: newSeats } }));
    get().syncSeatingStatus();
  },

  resetSeating: () => {
    updateActiveSession(s => ({ ...s, venue: { ...s.venue, seats: s.venue.seats.map(seat => ({ ...seat, assignedPersonId: null as string | null })) } }));
    get().syncSeatingStatus();
  },

  syncSeatingStatus: () => {
    const projectState = useProjectStore.getState();
    const activeSession = projectState.sessions.find(s => s.id === projectState.activeSessionId);
    if (!activeSession) return;
    const seatedPersonIds = new Set(activeSession.venue.seats.filter(s => s.assignedPersonId !== null).map(s => s.assignedPersonId));
    useProjectStore.setState({
      personnel: projectState.personnel.map(p => ({ ...p, isSeated: seatedPersonIds.has(p.id) }))
    });
  }
}));