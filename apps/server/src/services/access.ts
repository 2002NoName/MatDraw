import type { Store, UserRecord, BoardRecord } from '../store/types.js';

export interface BoardAccess {
  board: BoardRecord;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
}

/**
 * Reguły dostępu:
 *  - korepetytorka (TUTOR): pełny dostęp do wszystkich tablic (podgląd, edycja, zarządzanie),
 *  - uczeń (STUDENT): tylko tablice, których jest członkiem; edycja zależy od flagi canEdit.
 */
export async function resolveBoardAccess(store: Store, user: UserRecord, boardId: string): Promise<BoardAccess | null> {
  const board = await store.findBoard(boardId);
  if (!board) return null;
  if (user.role === 'TUTOR') return { board, canView: true, canEdit: true, canManage: true };
  const member = await store.findMember(boardId, user.id);
  if (!member) return { board, canView: false, canEdit: false, canManage: false };
  return { board, canView: true, canEdit: member.canEdit, canManage: false };
}
