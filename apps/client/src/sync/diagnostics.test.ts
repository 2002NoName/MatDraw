import { describe, expect, it } from 'vitest';
import { STUDENT_COLORS, TUTOR_COLORS, pickPeerColor } from '@matdraw/shared';
import { EventLog, maskIceServers, parseCandidate, ratePerSec, summarizeStats, formatBytes, iceUrlKind } from './diagnostics';

describe('parseCandidate', () => {
  it('rozpoznaje kandydatów host, srflx i relay', () => {
    expect(parseCandidate('candidate:1 1 udp 2122260223 192.168.1.5 54321 typ host generation 0')).toEqual({
      type: 'host',
      protocol: 'udp',
      address: '192.168.1.5',
      port: 54321,
    });
    expect(parseCandidate('candidate:2 1 UDP 1686052607 83.1.2.3 61000 typ srflx raddr 192.168.1.5 rport 54321')).toMatchObject({
      type: 'srflx',
      protocol: 'udp',
      relatedAddress: '192.168.1.5',
    });
    expect(parseCandidate('a=candidate:3 1 tcp 41885439 10.0.0.1 9 typ relay raddr 0.0.0.0 rport 0 tcptype passive')).toMatchObject({
      type: 'relay',
      protocol: 'tcp',
      tcpType: 'passive',
    });
  });

  it('zwraca null dla pustych i błędnych linii', () => {
    expect(parseCandidate('')).toBeNull();
    expect(parseCandidate(null)).toBeNull();
    expect(parseCandidate('candidate:1 1 udp')).toBeNull();
  });
});

describe('summarizeStats', () => {
  const reports = [
    { id: 'T1', type: 'transport', selectedCandidatePairId: 'P1', dtlsState: 'connected', iceState: 'connected', dtlsCipher: 'TLS_AES' },
    { id: 'P0', type: 'candidate-pair', state: 'failed', localCandidateId: 'L0', remoteCandidateId: 'R0' },
    {
      id: 'P1',
      type: 'candidate-pair',
      state: 'succeeded',
      nominated: true,
      localCandidateId: 'L1',
      remoteCandidateId: 'R1',
      currentRoundTripTime: 0.0425,
      availableOutgoingBitrate: 1_500_000,
      bytesSent: 1000,
      bytesReceived: 2000,
    },
    { id: 'L0', type: 'local-candidate', candidateType: 'host', protocol: 'udp', address: '192.168.1.5', port: 1 },
    { id: 'L1', type: 'local-candidate', candidateType: 'relay', protocol: 'udp', address: '5.6.7.8', port: 49152, relayProtocol: 'tls', url: 'turns:turn.example.org:5349' },
    { id: 'R1', type: 'remote-candidate', candidateType: 'srflx', protocol: 'udp', address: '9.9.9.9', port: 40000 },
    { id: 'D1', type: 'data-channel', label: 'matdraw', state: 'open', messagesSent: 5, messagesReceived: 7, bytesSent: 50, bytesReceived: 70 },
  ];

  it('wybiera parę z transportu i opisuje trasę przez TURN', () => {
    const s = summarizeStats(reports);
    expect(s.pair).toMatchObject({ state: 'succeeded', rttMs: 43, availableOutgoingKbps: 1500, bytesSent: 1000, bytesReceived: 2000 });
    expect(s.local).toMatchObject({ type: 'relay', relayProtocol: 'tls', url: 'turns:turn.example.org:5349' });
    expect(s.remote).toMatchObject({ type: 'srflx', address: '9.9.9.9', port: 40000 });
    expect(s.candidates.local).toEqual({ host: 1, relay: 1 });
    expect(s.candidates.remote).toEqual({ srflx: 1 });
    expect(s.dataChannel).toMatchObject({ label: 'matdraw', messagesReceived: 7 });
    expect(s.transport).toMatchObject({ dtlsState: 'connected', dtlsCipher: 'TLS_AES' });
  });

  it('bez transportu używa nominowanej pary; pusty raport daje wartości puste', () => {
    const s = summarizeStats(reports.filter((r) => r.type !== 'transport'));
    expect(s.local?.type).toBe('relay');
    const empty = summarizeStats([]);
    expect(empty.pair).toBeNull();
    expect(empty.local).toBeNull();
    expect(empty.transport).toBeNull();
  });
});

describe('pozostałe narzędzia diagnostyki', () => {
  it('maskuje hasła TURN i skraca nazwę użytkownika', () => {
    const m = maskIceServers([{ urls: 'stun:a' }, { urls: ['turn:b', 'turns:c'], username: '1700000000:user-id-123', credential: 'secret' }]);
    expect(m[0]).toEqual({ urls: ['stun:a'], username: undefined, hasCredential: false });
    expect(m[1]!.hasCredential).toBe(true);
    expect(m[1]!.username).toBe('1700000000:u…');
    expect(JSON.stringify(m)).not.toContain('secret');
  });

  it('rozpoznaje rodzaj adresu ICE', () => {
    expect(iceUrlKind('stun:stun.l.google.com:19302')).toBe('stun');
    expect(iceUrlKind('turns:turn.x:5349?transport=tcp')).toBe('turns');
    expect(iceUrlKind('http://x')).toBe('unknown');
  });

  it('dziennik zdarzeń trzyma tylko ostatnie wpisy', () => {
    const log = new EventLog(3);
    for (let i = 0; i < 5; i++) log.push('info', 'ws', `m${i}`, i);
    expect(log.entries().map((e) => e.message)).toEqual(['m2', 'm3', 'm4']);
    expect(log.total).toBe(5);
  });

  it('liczy przepływność i formatuje bajty', () => {
    expect(ratePerSec(1000, 3000, 2000)).toBe(1000);
    expect(ratePerSec(undefined, 3000, 1000)).toBeNull();
    expect(ratePerSec(5000, 10, 1000)).toBeNull();
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
});

describe('kolory kursorów', () => {
  it('korepetytorka różowa, uczeń niebieski, kolejni uczniowie inne kolory', () => {
    expect(pickPeerColor('TUTOR', [])).toBe('#e64980');
    expect(pickPeerColor('STUDENT', [])).toBe('#1c7ed6');
    expect(TUTOR_COLORS[0]).toBe('#e64980');
    expect(STUDENT_COLORS[0]).toBe('#1c7ed6');
    const second = pickPeerColor('STUDENT', ['#e64980', '#1c7ed6']);
    expect(second).not.toBe('#1c7ed6');
    expect(TUTOR_COLORS).not.toContain(second);
  });

  it('gdy pula roli wyczerpana – bierze wolny kolor z drugiej puli', () => {
    expect(pickPeerColor('TUTOR', TUTOR_COLORS)).toBe(STUDENT_COLORS[0]);
    const all = [...TUTOR_COLORS, ...STUDENT_COLORS];
    expect(all).toContain(pickPeerColor('STUDENT', all));
  });
});
