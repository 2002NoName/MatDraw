import { prepare, type Pt, type Template } from './pdollar';
import { builtInTemplates } from './glyphs';

const STORAGE_KEY = 'matdraw.recognition.userTemplates.v1';

export interface UserSample {
  symbol: string;
  strokes: Pt[][];
}

export function loadUserSamples(): UserSample[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserSample[]) : [];
  } catch {
    return [];
  }
}

export function saveUserSamples(samples: UserSample[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
}

export function addUserSample(sample: UserSample) {
  saveUserSamples([...loadUserSamples(), sample]);
}

export function clearUserSamples() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Wzorce wbudowane + wzorce nauczone przez użytkownika na tym urządzeniu. */
export function allTemplates(): Template[] {
  const user = loadUserSamples().map<Template>((s) => ({ symbol: s.symbol, points: prepare(s.strokes), user: true }));
  return [...builtInTemplates(), ...user];
}
