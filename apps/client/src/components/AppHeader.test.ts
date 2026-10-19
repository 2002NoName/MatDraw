// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('../api/auth', () => ({
  useAuth: () => ({ user: { name: 'Test User', displayName: 'Test', role: 'student' }, signOut }),
}));

describe('AppHeader', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    signOut.mockClear();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => root.render(createElement(MemoryRouter, null, createElement(AppHeader))));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it('shows menu links without a duplicate user profile or user name', () => {
    expect(host.querySelector('.topbar-user')).toBeNull();
    expect(host.textContent).not.toContain('Test');
    expect([...host.querySelectorAll('nav a')].map((a) => a.textContent))
      .toEqual(['Tablice', 'Wzory', 'Diagnostyka', 'Konto']);
    expect(host.querySelector('nav a[href="/"]')?.getAttribute('aria-current')).toBe('page');
    expect(host.querySelectorAll('a[href="/konto"]')).toHaveLength(1);
  });

  it('still opens the mobile menu and closes it after navigation', () => {
    const toggle = host.querySelector<HTMLButtonElement>('.mobile-menu-toggle')!;
    act(() => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('nav')?.classList.contains('mobile-open')).toBe(true);
    act(() => host.querySelector<HTMLAnchorElement>('nav a[href="/konto"]')!.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('nav a[href="/konto"]')?.getAttribute('aria-current')).toBe('page');
  });

  it('still signs out', () => {
    act(() => host.querySelector<HTMLButtonElement>('.signout-button')!.click());
    expect(signOut).toHaveBeenCalledOnce();
  });
});
