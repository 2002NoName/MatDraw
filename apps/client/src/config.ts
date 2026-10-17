/** Adres WebSocket serwera – aplikacja webowa działa zawsze pod tym samym adresem co API. */
export function wsUrl(): string {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}
