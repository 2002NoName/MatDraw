import type { Role } from './api.js';

/**
 * Protokół WebSocket serwera sygnalizacyjnego (/ws).
 * Serwer pośredniczy wyłącznie w zestawianiu połączeń WebRTC (offer/answer/ICE),
 * przechowuje stan tablicy (trwały zapis) i przekazuje aktualizacje dokumentu
 * tylko tym uczestnikom, do których nie udało się zestawić połączenia P2P (fallback).
 */

export interface PeerInfo {
  /** Identyfikator połączenia (unikalny dla każdej karty/urządzenia). */
  peerId: string;
  userId: string;
  name: string;
  role: Role;
  canEdit: boolean;
  color: string;
}

export type SignalPayload =
  | { kind: 'description'; description: { type: 'offer' | 'answer' | 'pranswer' | 'rollback'; sdp?: string } }
  | { kind: 'candidate'; candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null } | null };

export type ClientToServer =
  | { type: 'join'; boardId: string; token: string }
  | { type: 'signal'; to: string; payload: SignalPayload }
  /** Aktualizacja Yjs (base64). `relayTo` – peerId, do których serwer ma ją przekazać (brak P2P). */
  | { type: 'doc-update'; update: string; relayTo?: string[] }
  /** Dane efemeryczne (kursor, rysowana kreska) dla uczestników bez połączenia P2P. */
  | { type: 'ephemeral'; to: string[]; data: string }
  | { type: 'ping' };

export type ServerToClient =
  | { type: 'joined'; selfId: string; self: PeerInfo; peers: PeerInfo[]; state: string }
  | { type: 'peer-joined'; peer: PeerInfo }
  | { type: 'peer-left'; peerId: string }
  | { type: 'peer-updated'; peer: PeerInfo }
  | { type: 'signal'; from: string; payload: SignalPayload }
  | { type: 'doc-update'; from: string; update: string }
  | { type: 'ephemeral'; from: string; data: string }
  | { type: 'kicked'; reason: string }
  | { type: 'board-deleted' }
  | { type: 'error'; message: string }
  | { type: 'pong' };

/** Wiadomości JSON przesyłane kanałem danych WebRTC (efemeryczne – nie są zapisywane). */
export type PeerEphemeral =
  | { t: 'hello'; userId: string; name: string }
  /** Pozycja kursora w układzie tablicy; `p` – rodzaj wskaźnika (mysz/trackpad, pióro, dotyk). */
  | { t: 'cursor'; x: number; y: number; p?: 'mouse' | 'pen' | 'touch' }
  | { t: 'cursor-hide' }
  | {
      t: 'live-stroke';
      id: string;
      points: number[];
      color: string;
      size: number;
      tool: 'pen' | 'highlighter';
    }
  | { t: 'live-stroke-end'; id: string };

/** Kolory korepetytorek – odcienie różu/fioletu (pierwszy: różowy). */
export const TUTOR_COLORS = ['#e64980', '#be4bdb', '#c2255c'];
/** Kolory uczniów – pierwszy niebieski, kolejne łatwo odróżnialne (bez różu zarezerwowanego dla korepetytorek). */
export const STUDENT_COLORS = ['#1c7ed6', '#2f9e44', '#f76707', '#7048e8', '#0c8599', '#e8590c', '#5c940d', '#1864ab'];
/** Wszystkie kolory uczestników (kursory, obramowania). */
export const PEER_COLORS = [...TUTOR_COLORS, ...STUDENT_COLORS];

/**
 * Kolor dla nowego uczestnika pokoju: korepetytorka – różowy, uczeń – niebieski;
 * gdy kolor jest już zajęty w pokoju, następny wolny z puli roli, potem z puli ogólnej.
 */
export function pickPeerColor(role: Role, used: Iterable<string>): string {
  const taken = new Set(used);
  const own = role === 'TUTOR' ? TUTOR_COLORS : STUDENT_COLORS;
  const other = role === 'TUTOR' ? STUDENT_COLORS : TUTOR_COLORS;
  return own.find((c) => !taken.has(c)) ?? other.find((c) => !taken.has(c)) ?? own[taken.size % own.length]!;
}
