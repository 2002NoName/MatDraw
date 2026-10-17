import type { DevRealtimeTotals, DevRoomStats } from '@matdraw/shared';

export interface RealtimeSnapshot {
  totals: DevRealtimeTotals;
  rooms: Omit<DevRoomStats, 'title'>[];
}

/** Powiadomienia z warstwy REST do aktywnych połączeń WebSocket (wyrzucenie, zmiana uprawnień...). */
export interface BoardHub {
  kickUser(boardId: string, userId: string, reason: string): void;
  boardDeleted(boardId: string): void;
  memberUpdated(boardId: string, userId: string, canEdit: boolean): void;
  /** Migawka stanu serwera sygnalizacyjnego dla panelu developera. */
  realtimeStats(): RealtimeSnapshot;
}

const emptyTotals: DevRealtimeTotals = {
  connectionsOpened: 0,
  connectionsOpen: 0,
  joins: 0,
  msgsIn: 0,
  msgsOut: 0,
  bytesIn: 0,
  bytesOut: 0,
  signalsRelayed: 0,
  docUpdates: 0,
  docUpdatesRelayed: 0,
  ephemeralRelayed: 0,
};

export const noopHub: BoardHub = {
  kickUser() {},
  boardDeleted() {},
  memberUpdated() {},
  realtimeStats: () => ({ totals: { ...emptyTotals }, rooms: [] }),
};
