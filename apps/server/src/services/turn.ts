import { createHmac } from 'node:crypto';
import type { IceConfigResponse } from '@matdraw/shared';
import type { AppConfig } from '../config.js';

/**
 * Buduje listę serwerów ICE dla klienta.
 * Przy ustawionym TURN_SECRET generuje krótkotrwałe poświadczenia zgodne z mechanizmem
 * "TURN REST API" (coturn: use-auth-secret / static-auth-secret):
 *   username = "<unixExpiry>:<userId>", credential = base64(HMAC-SHA1(secret, username)).
 */
export function buildIceConfig(config: AppConfig, userId: string, now = Date.now()): IceConfigResponse {
  const iceServers: IceConfigResponse['iceServers'] = [];
  if (config.stunUrls.length) iceServers.push({ urls: config.stunUrls });

  if (config.turnUrls.length) {
    if (config.turnSecret) {
      const expiry = Math.floor(now / 1000) + config.turnTtl;
      const username = `${expiry}:${userId}`;
      const credential = createHmac('sha1', config.turnSecret).update(username).digest('base64');
      iceServers.push({ urls: config.turnUrls, username, credential });
    } else if (config.turnUsername && config.turnCredential) {
      iceServers.push({ urls: config.turnUrls, username: config.turnUsername, credential: config.turnCredential });
    }
  }
  return { iceServers, ttl: config.turnTtl };
}
