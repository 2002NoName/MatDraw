import { randomInt } from 'node:crypto';
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@matdraw/shared';

/** Generuje kryptograficznie losowy kod zaproszenia (31^8 ≈ 8,5·10¹¹ kombinacji). */
export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++) out += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  return out;
}
