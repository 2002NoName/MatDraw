// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormulaDialog, LatexInput } from './FormulaDialog';

vi.mock('mathlive', () => {
  class MathfieldElement extends HTMLElement {
    value = '';
    mathVirtualKeyboardPolicy = 'auto';
  }
  customElements.define('math-field', MathfieldElement);
  return { MathfieldElement };
});

describe('formula virtual keyboard lifecycle', () => {
  let host: HTMLDivElement;
  let root: Root;
  const hide = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('mathVirtualKeyboard', { hide });
    hide.mockClear();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  function button(label: string) {
    const el = [...host.querySelectorAll('button')].find((b) =>
      b.textContent === label || b.getAttribute('aria-label') === label);
    if (!el) throw new Error(`Missing button: ${label}`);
    act(() => el.click());
  }

  it.each(['Zamknij', 'Anuluj', 'Zapisz', 'Escape', 'backdrop'])(
    'hides the keyboard when closing via %s', (action) => {
      const close = () => root.render(null);
      act(() => root.render(createElement(FormulaDialog, {
        initial: 'x^2', initialSize: 32, onClose: close, onSave: close,
      })));
      const mathfield = host.querySelector('math-field')!;
      const blur = vi.spyOn(mathfield as HTMLElement, 'blur');
      hide.mockClear();
      if (action === 'Escape') {
        act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
      } else if (action === 'backdrop') {
        act(() => { host.querySelector('.modal-backdrop')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
      } else {
        button(action);
      }
      expect(host.querySelector('[role="dialog"]')).toBeNull();
      expect(blur).toHaveBeenCalledOnce();
      expect(hide).toHaveBeenCalledWith({ animate: false });
      expect(mathfield.isConnected).toBe(false);
    },
  );

  it.each(['Pismo odręczne', 'LaTeX'])('hides the keyboard when switching to %s', (mode) => {
    act(() => root.render(createElement(LatexInput, { value: 'x', onChange: vi.fn() })));
    const mathfield = host.querySelector('math-field')!;
    const blur = vi.spyOn(mathfield as HTMLElement, 'blur');
    button(mode);
    expect(blur).toHaveBeenCalledOnce();
    expect(hide).toHaveBeenCalledWith({ animate: false });
    hide.mockClear();
    button('Edytor');
    expect(host.querySelector('math-field')).toBe(mathfield);
    expect(host.querySelector('.formula-mathfield')?.getAttribute('aria-hidden')).toBe('false');
    expect(hide).not.toHaveBeenCalled();
  });
});
