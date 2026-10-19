// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { DialogProvider } from '../components/dialogs';
import { BoardModel } from './model';
import { Whiteboard, type EphemeralChannel } from './Whiteboard';

vi.mock('mathlive', () => ({ MathfieldElement: class {} }));

describe('Whiteboard pointer input', () => {
  let host: HTMLDivElement;
  let surface: HTMLDivElement;
  let root: Root;
  let model: BoardModel;
  let doc: Y.Doc;
  let channel: EphemeralChannel;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    sessionStorage.clear();
    doc = new Y.Doc();
    model = new BoardModel(doc);
    channel = { send: vi.fn(), subscribe: () => () => {} };
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => {
      root.render(createElement(DialogProvider, null,
        createElement(Whiteboard, { model, userId: 'test', readOnly: false, channel, peers: [] })));
    });
    surface = host.querySelector<HTMLDivElement>('.board-surface')!;
    surface.setPointerCapture = vi.fn();
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    model.destroy();
    doc.destroy();
    vi.unstubAllGlobals();
  });

  function pointer(type: string, pointerId: number, pointerType: string, x = 10, y = 10) {
    const event = Object.assign(new MouseEvent(type, {
      bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y,
    }), { pointerId, pointerType, pressure: type === 'pointerup' ? 0 : 0.7 });
    act(() => { surface.dispatchEvent(event); });
    return event;
  }

  function stroke(pointerId: number, pointerType = 'pen', x = 10) {
    pointer('pointerdown', pointerId, pointerType, x);
    pointer('pointermove', pointerId, pointerType, x + 5, 20);
    pointer('pointerup', pointerId, pointerType, x + 5, 20);
  }

  const transform = () => surface.querySelector('.ink-layer > g')!.getAttribute('transform');

  it('commits every rapid pen stroke, including reuse of the same pointer ID', () => {
    for (let i = 0; i < 'Janeczek'.length; i++) stroke(1, 'pen', 10 + i * 10);

    const strokes = model.list();
    expect(strokes).toHaveLength(8);
    expect(new Set(strokes.map((s) => s.id)).size).toBe(8);
    for (const [i, s] of strokes.entries()) {
      expect(s.type).toBe('stroke');
      if (s.type !== 'stroke') throw new Error('Expected stroke');
      expect(s.points).toEqual([10 + i * 10, 10, 0.7, 15 + i * 10, 20, 0.7]);
    }
    expect(channel.send).toHaveBeenCalledWith(expect.objectContaining({ t: 'live-stroke-end' }));
  });

  it('prevents native Safari touch gestures only on the board surface', () => {
    for (const type of ['touchstart', 'touchmove']) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      surface.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      const outside = new Event(type, { bubbles: true, cancelable: true });
      host.dispatchEvent(outside);
      expect(outside.defaultPrevented).toBe(false);
    }
    expect(pointer('pointerdown', 1, 'pen').defaultPrevented).toBe(true);
    pointer('pointerup', 1, 'pen');
  });

  it('removes native touch listeners on unmount', () => {
    act(() => root.unmount());
    const event = new Event('touchstart', { cancelable: true });
    surface.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('lets the pen take over a finger pan without waiting for the finger to lift', () => {
    stroke(1);
    pointer('pointerdown', 2, 'touch');
    stroke(1);
    pointer('pointermove', 2, 'touch', 100, 100);
    stroke(1, 'pen', 30);
    pointer('pointerup', 2, 'touch');
    expect(model.list()).toHaveLength(3);
    expect(transform()).toBe('translate(0 0) scale(1)');
  });

  it('ignores two palm contacts while the pen is writing', () => {
    pointer('pointerdown', 1, 'pen');
    pointer('pointerdown', 2, 'touch');
    pointer('pointerdown', 3, 'touch', 40, 40);
    pointer('pointermove', 1, 'pen', 20, 30);
    pointer('pointerup', 2, 'touch');
    pointer('pointerup', 3, 'touch');
    pointer('pointerup', 1, 'pen', 20, 30);
    expect(model.list()).toHaveLength(1);
    const s = model.list()[0]!;
    expect(s.type === 'stroke' && s.points).toEqual([10, 10, 0.7, 20, 30, 0.7]);
  });

  it('lets the pen take over an active pinch', () => {
    pointer('pointerdown', 2, 'touch');
    pointer('pointerdown', 3, 'touch', 40, 40);
    stroke(1);
    expect(model.list()).toHaveLength(1);
  });

  it('does not leave the board blocked after capture loss or pointer cancellation', () => {
    for (const type of ['lostpointercapture', 'pointercancel']) {
      pointer('pointerdown', 1, 'pen');
      pointer('pointermove', 1, 'pen', 20, 20);
      pointer(type, 1, 'pen', 20, 20);
      stroke(1, 'pen', 30);
    }
    expect(model.list()).toHaveLength(4);
  });

  it('still supports mouse drawing and finger drawing without pen-only mode', () => {
    stroke(1, 'mouse');
    stroke(2, 'touch', 30);
    expect(model.list()).toHaveLength(2);
  });

  it('still pans and pinches with new touches after lifting the pen', () => {
    stroke(1);
    pointer('pointerdown', 2, 'touch');
    pointer('pointermove', 2, 'touch', 20, 20);
    pointer('pointerup', 2, 'touch', 20, 20);
    expect(transform()).toBe('translate(10 10) scale(1)');
    pointer('pointerdown', 3, 'touch', 0, 0);
    pointer('pointerdown', 4, 'touch', 10, 0);
    pointer('pointermove', 4, 'touch', 20, 0);
    pointer('pointerup', 3, 'touch', 0, 0);
    pointer('pointerup', 4, 'touch', 20, 0);
    expect(transform()).toBe('translate(20 20) scale(2)');
    expect(model.list()).toHaveLength(1);
  });
});
