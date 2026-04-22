import { create } from 'zustand';
import type { TwinPair, UserProfile, ActiveTimer, TrackedEvent, PairMember, PumpingSession } from '../types';

interface AppState {
  // Auth
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  setUser: (user: AppState['user']) => void;
  setProfile: (profile: UserProfile | null) => void;

  // Twin pair
  activePair: TwinPair | null;
  pairMembers: PairMember[];
  setActivePair: (pair: TwinPair | null) => void;
  setPairMembers: (members: PairMember[]) => void;

  // Timers
  activeTimers: ActiveTimer[];
  setActiveTimers: (timers: ActiveTimer[]) => void;
  addTimer: (timer: ActiveTimer) => void;
  removeTimer: (timerId: string) => void;
  updateTimer: (timerId: string, updates: Partial<ActiveTimer>) => void;

  // Events
  recentEvents: TrackedEvent[];
  setRecentEvents: (events: TrackedEvent[]) => void;
  addEvent: (event: TrackedEvent) => void;
  removeEvent: (eventId: string) => void;

  // Pumping
  pumpingSessions: PumpingSession[];
  setPumpingSessions: (sessions: PumpingSession[]) => void;
  addPumpingSession: (session: PumpingSession) => void;
  removePumpingSession: (sessionId: string) => void;
  updatePumpingSession: (sessionId: string, updates: Partial<PumpingSession>) => void;

  // UI
  undoEvent: TrackedEvent | null;
  setUndoEvent: (event: TrackedEvent | null) => void;

  // Sync errors
  syncError: string | null;
  setSyncError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  // Twin pair
  activePair: null,
  pairMembers: [],
  setActivePair: (activePair) => set({ activePair }),
  setPairMembers: (pairMembers) => set({ pairMembers }),

  // Timers
  activeTimers: [],
  setActiveTimers: (activeTimers) => set({ activeTimers }),
  addTimer: (timer) =>
    set((state) => ({ activeTimers: [...state.activeTimers, timer] })),
  removeTimer: (timerId) =>
    set((state) => ({
      activeTimers: state.activeTimers.filter((t) => t.id !== timerId),
    })),
  updateTimer: (timerId, updates) =>
    set((state) => ({
      activeTimers: state.activeTimers.map((t) =>
        t.id === timerId ? { ...t, ...updates } : t
      ),
    })),

  // Events
  recentEvents: [],
  setRecentEvents: (recentEvents) => set({ recentEvents }),
  addEvent: (event) =>
    set((state) => ({ recentEvents: [event, ...state.recentEvents] })),
  removeEvent: (eventId) =>
    set((state) => ({
      recentEvents: state.recentEvents.filter((e) => e.id !== eventId),
    })),

  // Pumping
  pumpingSessions: [],
  setPumpingSessions: (pumpingSessions) => set({ pumpingSessions }),
  addPumpingSession: (session) =>
    set((state) => ({ pumpingSessions: [session, ...state.pumpingSessions] })),
  removePumpingSession: (sessionId) =>
    set((state) => ({
      pumpingSessions: state.pumpingSessions.filter((s) => s.id !== sessionId),
    })),
  updatePumpingSession: (sessionId, updates) =>
    set((state) => ({
      pumpingSessions: state.pumpingSessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    })),

  // UI
  undoEvent: null,
  setUndoEvent: (undoEvent) => set({ undoEvent }),

  // Sync errors
  syncError: null,
  setSyncError: (syncError) => set({ syncError }),
}));
