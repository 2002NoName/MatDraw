import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type {
  BoardBackground,
  BoardElement,
  FormulaElement,
  ImageElement,
  PeerEphemeral,
  PeerInfo,
  PlotElement,
  SolidElement,
  StrokeElement,
  StrokeTool,
  TextElement,
} from '@matdraw/shared';
import { newId, type BoardModel } from './model';
import { elementBounds, hitTest, normRect, rectContains, rectInside, scaleElement, translateElement, unionRects, type Rect, type Size } from './geometry';
import { HtmlElementView, StrokeView, SvgElementView } from './render';
import { DEFAULT_ROT_X, DEFAULT_ROT_Y, clampTilt } from './solids';
import { OptionsBar, ToolRail, type Tool, type ToolOptions } from './Toolbar';
import { Icon, IconButton } from '../components/icons';
import { useDialogs } from '../components/dialogs';
import { FormulaDialog, TextDialog } from '../dialogs/FormulaDialog';
import { PlotDialog, type PlotParams } from '../dialogs/PlotDialog';
import { RecognizeDialog } from '../dialogs/RecognizeDialog';
import { TrainingDialog } from '../dialogs/TrainingDialog';
import { recognize, type RecognitionResult } from '../recognition/recognizer';
import { allTemplates } from '../recognition/userTemplates';
import { placeSize, prepareImage } from './images';
import { FormulaLibrary } from '../cke/FormulaLibrary';
import type { CkeFormula } from '../cke/formulas';

export interface EphemeralChannel {
  send(msg: PeerEphemeral): void;
  subscribe(fn: (from: PeerInfo, msg: PeerEphemeral) => void): () => void;
}

interface View {
  scale: number;
  ox: number;
  oy: number;
}

type Pt2 = { x: number; y: number };

type Gesture =
  | { kind: 'draw'; pointerId: number; pointerType: string; id: string; tool: StrokeTool; points: number[]; lastSent: number }
  | { kind: 'erase'; pointerId: number }
  | { kind: 'pan'; pointerId: number; start: Pt2; view: View }
  | { kind: 'create'; pointerId: number; start: Pt2; target: 'shape' | 'solid' | 'plot' | 'recognize' }
  | { kind: 'move'; pointerId: number; start: Pt2; originals: BoardElement[]; moved: boolean }
  | { kind: 'resize'; pointerId: number; box: Rect; originals: BoardElement[] }
  | { kind: 'rotate'; pointerId: number; start: Pt2; original: SolidElement }
  | { kind: 'band'; pointerId: number; start: Pt2; additive: boolean }
  | { kind: 'pinch'; d0: number; mid0: Pt2; view: View };

type Dialog =
  | { kind: 'formula'; x: number; y: number; editId?: string; latex: string; size: number }
  | { kind: 'text'; x: number; y: number; editId?: string; text: string; size: number }
  | { kind: 'plot'; rect: Rect; editId?: string; params: PlotParams }
  | { kind: 'recognize'; result: RecognitionResult; strokeIds: string[]; rect: Rect; fontSize: number }
  | { kind: 'training' };

interface RemoteCursor {
  x: number;
  y: number;
  name: string;
  color: string;
  /** Czas ostatniego ruchu (ms). */
  t: number;
  /** Brak ruchu od CURSOR_IDLE_MS – kursor wygaszony. */
  idle?: boolean;
}

/** Po tylu ms bez ruchu kursor uczestnika znika (pozostaje ostatnia pozycja do tego czasu). */
export const CURSOR_IDLE_MS = 5000;
const CURSOR_FADE_MS = 400;

interface RemoteStroke {
  points: number[];
  color: string;
  size: number;
  tool: StrokeTool;
  t: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
const r2 = (v: number) => Math.round(v * 100) / 100;
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

function backgroundStyle(bg: BoardBackground, v: View): CSSProperties {
  const step = 40 * v.scale;
  if (bg === 'blank' || step < 8) return {};
  const pos = `${v.ox}px ${v.oy}px`;
  const size = `${step}px ${step}px`;
  switch (bg) {
    case 'grid':
      return {
        backgroundImage: 'linear-gradient(#e7ebef 1px, transparent 1px), linear-gradient(90deg, #e7ebef 1px, transparent 1px)',
        backgroundSize: size,
        backgroundPosition: pos,
      };
    case 'lines':
      return { backgroundImage: 'linear-gradient(#dbe4ee 1px, transparent 1px)', backgroundSize: size, backgroundPosition: pos };
    case 'dots':
      return { backgroundImage: 'radial-gradient(circle, #c4cad0 1.3px, transparent 1.6px)', backgroundSize: size, backgroundPosition: `${v.ox - step / 2}px ${v.oy - step / 2}px` };
  }
}

function recolor(el: BoardElement, color: string): BoardElement {
  switch (el.type) {
    case 'stroke':
    case 'formula':
    case 'text':
    case 'plot':
      return { ...el, color };
    case 'shape':
      return { ...el, stroke: color, fill: el.fill ? `${color}26` : null };
    case 'solid':
      return { ...el, stroke: color };
    case 'image':
      return el;
  }
}

export function Whiteboard({
  model,
  userId,
  readOnly,
  channel,
  peers,
}: {
  model: BoardModel;
  userId: string;
  readOnly: boolean;
  channel: EphemeralChannel;
  peers: PeerInfo[];
}) {
  const dialogs = useDialogs();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setViewState] = useState<View>({ scale: 1, ox: 0, oy: 0 });
  const viewRef = useRef(view);
  const setView = useCallback((v: View) => {
    viewRef.current = v;
    setViewState(v);
  }, []);

  const [elements, setElements] = useState<BoardElement[]>(() => model.list());
  const [background, setBackground] = useState<BoardBackground>(() => model.background);
  const [, bumpUndo] = useReducer((x: number) => x + 1, 0);
  const [toolState, setTool] = useState<Tool>('pen');
  const tool: Tool = readOnly ? 'pan' : toolState;
  const [opts, setOptsState] = useState<ToolOptions>(() => {
    const saved = localStorage.getItem('matdraw.toolOptions');
    const defaults: ToolOptions = { color: '#212529', penSize: 2.5, highlighterSize: 16, shape: 'rect', solid: 'cube', fill: false, penOnly: false };
    try {
      return saved ? { ...defaults, ...(JSON.parse(saved) as Partial<ToolOptions>) } : defaults;
    } catch {
      return defaults;
    }
  });
  const setOpts = useCallback((o: Partial<ToolOptions>) => {
    setOptsState((prev) => {
      const next = { ...prev, ...o };
      localStorage.setItem('matdraw.toolOptions', JSON.stringify(next));
      return next;
    });
  }, []);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, BoardElement> | null>(null);
  const [live, setLive] = useState<{ points: number[]; tool: StrokeTool; color: string; size: number } | null>(null);
  const [draft, setDraft] = useState<{ rect: Rect; raw: { x: number; y: number; w: number; h: number }; target: string } | null>(null);
  const [band, setBand] = useState<Rect | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [remoteStrokes, setRemoteStrokes] = useState<Record<string, RemoteStroke>>({});
  const [eraserPos, setEraserPos] = useState<Pt2 | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showNotice = useCallback((text: string) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const sizes = useRef(new Map<string, Size>());
  const [, bumpSizes] = useReducer((x: number) => x + 1, 0);
  const sizeLookup = useCallback((id: string) => sizes.current.get(id), []);
  const onSize = useCallback((id: string, w: number, h: number) => {
    const prev = sizes.current.get(id);
    if (!prev || Math.abs(prev.w - w) > 0.5 || Math.abs(prev.h - h) > 0.5) {
      sizes.current.set(id, { w, h });
      bumpSizes();
    }
  }, []);

  const gesture = useRef<Gesture | null>(null);
  const touches = useRef(new Map<number, Pt2>());
  const lastTap = useRef<{ id: string; t: number } | null>(null);
  const lastCursorSent = useRef(0);
  const spaceDown = useRef(false);

  // --- Subskrypcja dokumentu ---
  useEffect(() => {
    const onElements = () => setElements(model.list());
    const onMeta = () => setBackground(model.background);
    model.elements.observe(onElements);
    model.meta.observe(onMeta);
    const um = model.undoManager;
    um.on('stack-item-added', bumpUndo);
    um.on('stack-item-popped', bumpUndo);
    um.on('stack-cleared', bumpUndo);
    onElements();
    onMeta();
    return () => {
      model.elements.unobserve(onElements);
      model.meta.unobserve(onMeta);
      um.off('stack-item-added', bumpUndo);
      um.off('stack-item-popped', bumpUndo);
      um.off('stack-cleared', bumpUndo);
    };
  }, [model]);

  // Usuń z zaznaczenia elementy skasowane (np. przez drugą osobę).
  useEffect(() => {
    setSelection((sel) => {
      if (![...sel].some((id) => !model.elements.has(id))) return sel;
      return new Set([...sel].filter((id) => model.elements.has(id)));
    });
  }, [elements, model]);

  // --- Dane efemeryczne od innych uczestników ---
  useEffect(
    () =>
      channel.subscribe((from, msg) => {
        const now = Date.now();
        switch (msg.t) {
          case 'cursor':
            setCursors((c) => ({ ...c, [from.peerId]: { x: msg.x, y: msg.y, name: from.name, color: from.color, t: now, idle: false } }));
            break;
          case 'cursor-hide':
            setCursors((c) => {
              const n = { ...c };
              delete n[from.peerId];
              return n;
            });
            break;
          case 'live-stroke':
            setRemoteStrokes((s) => ({ ...s, [msg.id]: { points: msg.points, color: msg.color, size: msg.size, tool: msg.tool, t: now } }));
            break;
          case 'live-stroke-end':
            setRemoteStrokes((s) => {
              const n = { ...s };
              delete n[msg.id];
              return n;
            });
            break;
        }
      }),
    [channel],
  );

  // Sprzątanie nieaktualnych kursorów i kresek (np. po zerwaniu połączenia).
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setCursors((c) => {
        let changed = false;
        const n: Record<string, RemoteCursor> = {};
        for (const [k, v] of Object.entries(c)) {
          const age = now - v.t;
          if (age > CURSOR_IDLE_MS + CURSOR_FADE_MS) {
            changed = true;
            continue;
          }
          if (age > CURSOR_IDLE_MS && !v.idle) {
            changed = true;
            n[k] = { ...v, idle: true };
          } else n[k] = v;
        }
        return changed ? n : c;
      });
      setRemoteStrokes((s) => {
        const stale = Object.entries(s).filter(([, v]) => now - v.t > 4000);
        if (!stale.length) return s;
        const n = { ...s };
        for (const [k] of stale) delete n[k];
        return n;
      });
    }, 250);
    return () => clearInterval(t);
  }, []);

  // Wycentruj widok na zawartości przy pierwszym renderze.
  const fitAll = useCallback(() => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const all = unionRects(model.list().map((e) => elementBounds(e, sizeLookup)));
    if (!all || all.w === 0) {
      setView({ scale: 1, ox: box.width * 0.1, oy: box.height * 0.1 });
      return;
    }
    const pad = 60;
    const scale = clampScale(Math.min(1.5, (box.width - pad * 2) / all.w, (box.height - pad * 2) / all.h));
    setView({ scale, ox: (box.width - all.w * scale) / 2 - all.x * scale, oy: (box.height - all.h * scale) / 2 - all.y * scale });
  }, [model, setView, sizeLookup]);

  useEffect(() => {
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Widok: przeliczenia ---
  const screenPoint = (e: { clientX: number; clientY: number }): Pt2 => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (p: Pt2, v = viewRef.current): Pt2 => ({ x: (p.x - v.ox) / v.scale, y: (p.y - v.oy) / v.scale });

  const zoomAt = useCallback(
    (sx: number, sy: number, nextScale: number) => {
      const v = viewRef.current;
      const s = clampScale(nextScale);
      const wx = (sx - v.ox) / v.scale;
      const wy = (sy - v.oy) / v.scale;
      setView({ scale: s, ox: sx - wx * s, oy: sy - wy * s });
    },
    [setView],
  );

  const zoomCenter = (factor: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    zoomAt(r.width / 2, r.height / 2, viewRef.current.scale * factor);
  };

  // Kółko myszy / gładzik: przewijanie, Ctrl/⌘ + kółko (oraz gest szczypania na gładziku) – powiększanie.
  useEffect(() => {
    const node = containerRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = screenPoint(e);
      if (e.ctrlKey || e.metaKey) {
        zoomAt(p.x, p.y, viewRef.current.scale * Math.exp(-e.deltaY * 0.01));
      } else {
        const v = viewRef.current;
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
        setView({ ...v, ox: v.ox - dx, oy: v.oy - dy });
      }
    };
    // Safari (macOS) – gesty gładzika.
    let gestureStart = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureStart = viewRef.current.scale;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale: number; clientX: number; clientY: number };
      const p = screenPoint(ge);
      zoomAt(p.x, p.y, gestureStart * ge.scale);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('gesturestart', onGestureStart);
    node.addEventListener('gesturechange', onGestureChange);
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('gesturestart', onGestureStart);
      node.removeEventListener('gesturechange', onGestureChange);
    };
  }, [zoomAt, setView]);

  // --- Elementy z nałożonym podglądem przeciągania ---
  const displayed = useMemo(() => (overrides ? elements.map((e) => overrides.get(e.id) ?? e) : elements), [elements, overrides]);
  const byId = useMemo(() => new Map(displayed.map((e) => [e.id, e])), [displayed]);

  const selectedEls = useMemo(() => [...selection].map((id) => byId.get(id)).filter((e): e is BoardElement => !!e), [selection, byId]);
  const selBounds = unionRects(selectedEls.map((e) => elementBounds(e, sizeLookup)));
  const singleSolid = selectedEls.length === 1 && selectedEls[0]!.type === 'solid' ? (selectedEls[0] as SolidElement) : null;

  const topHit = (p: Pt2): BoardElement | null => {
    const tol = 6 / viewRef.current.scale;
    for (let i = displayed.length - 1; i >= 0; i--) {
      const el = displayed[i]!;
      if (hitTest(el, p.x, p.y, tol, sizeLookup)) return el;
    }
    return null;
  };

  // --- Akcje ---
  const commitStroke = (g: Extract<Gesture, { kind: 'draw' }>) => {
    if (g.points.length >= 3) {
      const el: StrokeElement = {
        id: g.id,
        type: 'stroke',
        tool: g.tool,
        points: g.points,
        color: opts.color,
        size: g.tool === 'highlighter' ? opts.highlighterSize : opts.penSize,
        z: model.nextZ(),
        author: userId,
        createdAt: Date.now(),
      };
      model.add(el);
    }
    channel.send({ t: 'live-stroke-end', id: g.id });
    setLive(null);
  };

  const sendLive = (g: Extract<Gesture, { kind: 'draw' }>, force = false) => {
    const now = performance.now();
    if (!force && now - g.lastSent < 40) return;
    g.lastSent = now;
    channel.send({
      t: 'live-stroke',
      id: g.id,
      points: g.points.map((v, i) => (i % 3 === 2 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10)),
      color: opts.color,
      size: g.tool === 'highlighter' ? opts.highlighterSize : opts.penSize,
      tool: g.tool,
    });
  };

  const eraseAt = (p: Pt2) => {
    const tol = 10 / viewRef.current.scale;
    const hits: string[] = [];
    for (const el of model.list()) if (hitTest(el, p.x, p.y, tol, sizeLookup)) hits.push(el.id);
    if (hits.length) model.remove(hits);
  };

  const openEdit = (el: BoardElement) => {
    if (readOnly) return;
    if (el.type === 'formula') setDialog({ kind: 'formula', x: el.x, y: el.y, editId: el.id, latex: el.latex, size: el.fontSize });
    else if (el.type === 'text') setDialog({ kind: 'text', x: el.x, y: el.y, editId: el.id, text: el.text, size: el.fontSize });
    else if (el.type === 'plot')
      setDialog({ kind: 'plot', rect: normRect(el.x, el.y, el.w, el.h), editId: el.id, params: { expr: el.expr, xMin: el.xMin, xMax: el.xMax, yMin: el.yMin, yMax: el.yMax } });
  };

  const deleteSelection = () => {
    if (!selection.size) return;
    model.stopCapturing();
    model.remove(selection);
    setSelection(new Set());
  };

  const duplicateSelection = () => {
    if (!selectedEls.length) return;
    let z = model.nextZ();
    const copies = selectedEls.map((e) => ({ ...translateElement(e, 24, 24), id: newId(), z: z++, author: userId, createdAt: Date.now() }));
    model.stopCapturing();
    model.transact(() => copies.forEach((c) => model.elements.set(c.id, c)));
    setSelection(new Set(copies.map((c) => c.id)));
  };

  const applyColor = (c: string) => {
    setOpts({ color: c });
    if (tool === 'select' && selectedEls.length) {
      model.stopCapturing();
      model.replaceMany(selectedEls.map((e) => recolor(e, c)));
    }
  };

  const runRecognition = (rect: Rect) => {
    const strokes = model
      .list()
      .filter((e): e is StrokeElement => e.type === 'stroke' && e.tool === 'pen')
      .filter((e) => {
        const b = elementBounds(e);
        return rectContains(rect, b.x + b.w / 2, b.y + b.h / 2);
      })
      .sort((a, b) => a.createdAt - b.createdAt || a.z - b.z);
    if (!strokes.length) return;
    const pts = strokes.map((s) => {
      const out: Pt2[] = [];
      for (let i = 0; i < s.points.length; i += 3) out.push({ x: s.points[i]!, y: s.points[i + 1]! });
      return out;
    });
    const result = recognize(pts, allTemplates());
    const b = unionRects(strokes.map((s) => elementBounds(s)))!;
    const fontSize = Math.round(Math.min(96, Math.max(18, b.h * 0.55)));
    setDialog({ kind: 'recognize', result, strokeIds: strokes.map((s) => s.id), rect: b, fontSize });
  };

  // --- Obsługa wskaźnika (mysz, dotyk, rysik) ---
  const abortGesture = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.kind === 'draw') {
      channel.send({ t: 'live-stroke-end', id: g.id });
      setLive(null);
    }
    setDraft(null);
    setBand(null);
    setOverrides(null);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return;
    const sp = screenPoint(e);
    if (e.pointerType === 'pen' && !opts.penOnly && !sessionStorage.getItem('matdraw.penSeen')) {
      // Wykryto rysik – włącz odrzucanie dłoni (można wyłączyć w pasku narzędzi).
      sessionStorage.setItem('matdraw.penSeen', '1');
      setOpts({ penOnly: true });
    }
    if (e.pointerType === 'touch') {
      touches.current.set(e.pointerId, sp);
      if (touches.current.size === 2) {
        abortGesture();
        const [a, b] = [...touches.current.values()] as [Pt2, Pt2];
        gesture.current = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: viewRef.current };
        return;
      }
      if (touches.current.size > 2) return;
    }
    if (gesture.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const w = toWorld(sp);
    const penOnlyTouch = e.pointerType === 'touch' && opts.penOnly;
    const effective: Tool = e.button === 1 || spaceDown.current || penOnlyTouch ? 'pan' : tool;

    switch (effective) {
      case 'pan':
        gesture.current = { kind: 'pan', pointerId: e.pointerId, start: sp, view: viewRef.current };
        break;
      case 'pen':
      case 'highlighter': {
        model.stopCapturing();
        const pressure = e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5;
        const g: Gesture = { kind: 'draw', pointerId: e.pointerId, pointerType: e.pointerType, id: newId(), tool: effective, points: [r2(w.x), r2(w.y), pressure], lastSent: 0 };
        gesture.current = g;
        setLive({ points: g.points, tool: effective, color: opts.color, size: effective === 'highlighter' ? opts.highlighterSize : opts.penSize });
        break;
      }
      case 'eraser':
        model.stopCapturing();
        gesture.current = { kind: 'erase', pointerId: e.pointerId };
        eraseAt(w);
        setEraserPos(w);
        break;
      case 'shape':
      case 'solid':
      case 'plot':
      case 'recognize':
        gesture.current = { kind: 'create', pointerId: e.pointerId, start: w, target: effective };
        break;
      case 'formula':
        setDialog({ kind: 'formula', x: w.x, y: w.y, latex: '', size: 32 });
        break;
      case 'text':
        setDialog({ kind: 'text', x: w.x, y: w.y, text: '', size: 24 });
        break;
      case 'select': {
        const handleR = 14 / viewRef.current.scale;
        if (selBounds) {
          if (Math.hypot(w.x - (selBounds.x + selBounds.w), w.y - (selBounds.y + selBounds.h)) <= handleR) {
            model.stopCapturing();
            gesture.current = { kind: 'resize', pointerId: e.pointerId, box: selBounds, originals: selectedEls };
            break;
          }
          if (singleSolid && Math.hypot(w.x - (selBounds.x + selBounds.w), w.y - selBounds.y) <= handleR) {
            model.stopCapturing();
            gesture.current = { kind: 'rotate', pointerId: e.pointerId, start: sp, original: singleSolid };
            break;
          }
        }
        const hit = topHit(w);
        if (hit) {
          const now = Date.now();
          if (lastTap.current && lastTap.current.id === hit.id && now - lastTap.current.t < 400) {
            lastTap.current = null;
            openEdit(hit);
            break;
          }
          lastTap.current = { id: hit.id, t: now };
          let sel = selection;
          if (!selection.has(hit.id)) {
            sel = e.shiftKey ? new Set([...selection, hit.id]) : new Set([hit.id]);
            setSelection(sel);
          }
          model.stopCapturing();
          gesture.current = {
            kind: 'move',
            pointerId: e.pointerId,
            start: w,
            originals: [...sel].map((id) => model.get(id)).filter((x): x is BoardElement => !!x),
            moved: false,
          };
        } else {
          if (!e.shiftKey) setSelection(new Set());
          gesture.current = { kind: 'band', pointerId: e.pointerId, start: w, additive: e.shiftKey };
        }
        break;
      }
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const sp = screenPoint(e);
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId)) touches.current.set(e.pointerId, sp);
    const w = toWorld(sp);

    // Dotyk: kursor tylko przy rysowaniu jednym palcem (nie przy przesuwaniu/powiększaniu).
    const showCursor = e.pointerType !== 'touch' || (touches.current.size <= 1 && gesture.current !== null && gesture.current.kind !== 'pinch' && gesture.current.kind !== 'pan');
    if (showCursor) {
      const now = performance.now();
      if (now - lastCursorSent.current > 40) {
        lastCursorSent.current = now;
        const p = e.pointerType === 'pen' || e.pointerType === 'touch' ? e.pointerType : 'mouse';
        channel.send({ t: 'cursor', x: Math.round(w.x), y: Math.round(w.y), p });
      }
    }
    if (tool === 'eraser' && e.pointerType !== 'touch') setEraserPos(w);

    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      if (touches.current.size < 2) return;
      const [a, b] = [...touches.current.values()] as [Pt2, Pt2];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = clampScale(g.view.scale * (d / g.d0));
      const wm = toWorld(g.mid0, g.view);
      setView({ scale: s, ox: mid.x - wm.x * s, oy: mid.y - wm.y * s });
      return;
    }
    if ('pointerId' in g && g.pointerId !== e.pointerId) return;

    switch (g.kind) {
      case 'pan':
        setView({ ...g.view, ox: g.view.ox + sp.x - g.start.x, oy: g.view.oy + sp.y - g.start.y });
        break;
      case 'draw': {
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
        const list = events.length ? events : [e.nativeEvent];
        for (const ev of list) {
          const p = toWorld(screenPoint(ev));
          const n = g.points.length;
          const dx = p.x - g.points[n - 3]!;
          const dy = p.y - g.points[n - 2]!;
          if (dx * dx + dy * dy < 0.25 / (viewRef.current.scale * viewRef.current.scale)) continue;
          const pressure = g.pointerType === 'pen' ? ev.pressure || 0.5 : 0.5;
          g.points.push(r2(p.x), r2(p.y), Math.round(pressure * 1000) / 1000);
        }
        setLive((l) => (l ? { ...l, points: g.points.slice() } : l));
        sendLive(g);
        break;
      }
      case 'erase':
        eraseAt(w);
        break;
      case 'create': {
        const raw = { x: g.start.x, y: g.start.y, w: w.x - g.start.x, h: w.y - g.start.y };
        let rect = normRect(raw.x, raw.y, raw.w, raw.h);
        if (e.shiftKey && g.target !== 'recognize' && g.target !== 'plot') {
          const s = Math.max(rect.w, rect.h);
          rect = normRect(raw.x, raw.y, Math.sign(raw.w || 1) * s, Math.sign(raw.h || 1) * s);
          raw.w = Math.sign(raw.w || 1) * s;
          raw.h = Math.sign(raw.h || 1) * s;
        }
        setDraft({ rect, raw, target: g.target });
        break;
      }
      case 'move': {
        const dx = w.x - g.start.x;
        const dy = w.y - g.start.y;
        if (!g.moved && Math.hypot(dx, dy) * viewRef.current.scale < 3) return;
        g.moved = true;
        setOverrides(new Map(g.originals.map((o) => [o.id, translateElement(o, dx, dy)])));
        break;
      }
      case 'resize': {
        const minSize = 10 / viewRef.current.scale;
        let sx = Math.max(minSize, w.x - g.box.x) / (g.box.w || 1);
        let sy = Math.max(minSize, w.y - g.box.y) / (g.box.h || 1);
        const keepRatio = e.shiftKey || g.originals.some((o) => o.type === 'formula' || o.type === 'text' || o.type === 'image');
        if (keepRatio) sx = sy = Math.max(sx, sy);
        setOverrides(new Map(g.originals.map((o) => [o.id, scaleElement(o, g.box.x, g.box.y, sx, sy)])));
        break;
      }
      case 'rotate': {
        const dx = sp.x - g.start.x;
        const dy = sp.y - g.start.y;
        setOverrides(new Map([[g.original.id, { ...g.original, rotY: g.original.rotY + dx * 0.01, rotX: clampTilt(g.original.rotX + dy * 0.01) }]]));
        break;
      }
      case 'band':
        setBand(normRect(g.start.x, g.start.y, w.x - g.start.x, w.y - g.start.y));
        break;
    }
  };

  const finishGesture = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (e.pointerType === 'touch') touches.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      if (touches.current.size < 2) gesture.current = null;
      return;
    }
    if (g.pointerId !== e.pointerId) return;
    gesture.current = null;
    const scale = viewRef.current.scale;

    switch (g.kind) {
      case 'draw':
        if (cancelled && g.pointerType === 'touch') {
          channel.send({ t: 'live-stroke-end', id: g.id });
          setLive(null);
        } else {
          commitStroke(g);
        }
        break;
      case 'erase':
        break;
      case 'create': {
        setDraft(null);
        if (cancelled) break;
        const end = toWorld(screenPoint(e));
        let raw = draft?.raw ?? { x: g.start.x, y: g.start.y, w: end.x - g.start.x, h: end.y - g.start.y };
        const tiny = Math.hypot(raw.w, raw.h) * scale < 8;
        if (g.target === 'recognize') {
          if (!tiny) runRecognition(normRect(raw.x, raw.y, raw.w, raw.h));
          break;
        }
        if (tiny) {
          const dw = g.target === 'plot' ? 360 : opts.shape === 'axes' && g.target === 'shape' ? 260 : 140;
          const dh = g.target === 'plot' ? 260 : opts.shape === 'line' || opts.shape === 'arrow' ? 0 : opts.shape === 'axes' ? 220 : 140;
          raw = { x: g.start.x - dw / 2, y: g.start.y - dh / 2, w: dw, h: g.target === 'shape' && (opts.shape === 'line' || opts.shape === 'arrow') ? 0 : dh };
        }
        const base = { id: newId(), z: model.nextZ(), author: userId, createdAt: Date.now() };
        model.stopCapturing();
        if (g.target === 'shape') {
          const isLine = opts.shape === 'line' || opts.shape === 'arrow';
          const r = isLine ? raw : normRect(raw.x, raw.y, raw.w, raw.h);
          model.add({ ...base, type: 'shape', kind: opts.shape, ...r, stroke: opts.color, fill: opts.fill && !isLine ? `${opts.color}26` : null, strokeWidth: 2.5 });
        } else if (g.target === 'solid') {
          const r = normRect(raw.x, raw.y, raw.w, raw.h);
          model.add({ ...base, type: 'solid', kind: opts.solid, ...r, rotX: DEFAULT_ROT_X, rotY: DEFAULT_ROT_Y, stroke: opts.color, strokeWidth: 2, showHidden: true });
          setTool('select');
          setSelection(new Set([base.id]));
        } else {
          setDialog({ kind: 'plot', rect: normRect(raw.x, raw.y, raw.w, raw.h), params: { expr: '', xMin: -5, xMax: 5, yMin: -5, yMax: 5 } });
        }
        break;
      }
      case 'move':
      case 'resize':
      case 'rotate':
        if (overrides && !cancelled) model.replaceMany([...overrides.values()]);
        setOverrides(null);
        break;
      case 'band': {
        setBand(null);
        if (!band || cancelled) break;
        const picked = displayed.filter((el) => {
          if (rectInside(elementBounds(el, sizeLookup), band)) return true;
          if (el.type === 'stroke') {
            for (let i = 0; i < el.points.length; i += 3) if (rectContains(band, el.points[i]!, el.points[i + 1]!)) return true;
          }
          return false;
        });
        setSelection(new Set([...(g.additive ? selection : []), ...picked.map((p) => p.id)]));
        break;
      }
    }
  };

  // --- Obrazy i wzory CKE ---
  /** Punkt świata pod wskazanym miejscem ekranu (lub środek widoku). */
  const worldAt = (at?: { clientX: number; clientY: number }): Pt2 => {
    const r = containerRef.current!.getBoundingClientRect();
    return toWorld(at ? { x: at.clientX - r.left, y: at.clientY - r.top } : { x: r.width / 2, y: r.height / 2 });
  };

  const addImage = (src: string, w: number, h: number, center: Pt2, title?: string) => {
    const el: ImageElement = { id: newId(), type: 'image', src, x: center.x - w / 2, y: center.y - h / 2, w, h, z: model.nextZ(), author: userId, createdAt: Date.now() };
    if (title) el.title = title;
    model.stopCapturing();
    model.add(el);
    setTool('select');
    setSelection(new Set([el.id]));
  };

  const insertImageFiles = async (files: Iterable<File>, at?: { clientX: number; clientY: number }) => {
    if (readOnly) return;
    let center = worldAt(at);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const img = await prepareImage(file);
        const box = containerRef.current!.getBoundingClientRect();
        const s = viewRef.current.scale;
        const { w, h } = placeSize(img.width, img.height, box.width / s, box.height / s);
        addImage(img.src, w, h, center, file.name || undefined);
        center = { x: center.x + 24 / s, y: center.y + 24 / s };
      } catch (err) {
        showNotice((err as Error).message);
      }
    }
  };

  const insertCke = async (f: CkeFormula, at?: { clientX: number; clientY: number }) => {
    if (readOnly) return;
    const center = worldAt(at);
    try {
      const { formulaCardSvg, svgToDataUrl } = await import('../cke/texToSvg');
      const card = formulaCardSvg(f.title, f.latex);
      addImage(svgToDataUrl(card.svg), card.width, card.height, center, f.title);
    } catch (err) {
      showNotice(`Nie udało się wstawić wzoru: ${(err as Error).message}`);
    }
  };

  // Wklejanie obrazów ze schowka (Ctrl/⌘+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (readOnly || dialog || isTyping(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      e.preventDefault();
      void insertImageFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  // --- Klawiatura ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isTyping(e.target)) spaceDown.current = e.type === 'keydown';
      if (e.type !== 'keydown' || dialog || isTyping(e.target) || readOnly || document.querySelector('.modal-backdrop')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) model.redo();
        else model.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        model.redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelection();
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setTool('select');
        setSelection(new Set(model.list().map((x) => x.id)));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelection();
      } else if (e.key === 'Escape') {
        abortGesture();
        setSelection(new Set());
      } else if (!mod && !e.altKey) {
        const map: Record<string, Tool> = { v: 'select', h: 'pan', p: 'pen', e: 'eraser', t: 'text' };
        const t = map[e.key.toLowerCase()];
        if (t) setTool(t);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  });

  // --- Zapisy z okien dialogowych ---
  const saveFormula = (latex: string, size: number) => {
    if (dialog?.kind !== 'formula') return;
    model.stopCapturing();
    if (dialog.editId) model.update(dialog.editId, { latex, fontSize: size } as Partial<FormulaElement>);
    else model.add({ id: newId(), type: 'formula', latex, x: dialog.x, y: dialog.y, fontSize: size, color: opts.color, z: model.nextZ(), author: userId, createdAt: Date.now() });
    setDialog(null);
  };
  const saveText = (text: string, size: number) => {
    if (dialog?.kind !== 'text') return;
    model.stopCapturing();
    if (dialog.editId) model.update(dialog.editId, { text, fontSize: size } as Partial<TextElement>);
    else model.add({ id: newId(), type: 'text', text, x: dialog.x, y: dialog.y, fontSize: size, color: opts.color, z: model.nextZ(), author: userId, createdAt: Date.now() });
    setDialog(null);
  };
  const savePlot = (p: PlotParams) => {
    if (dialog?.kind !== 'plot') return;
    model.stopCapturing();
    if (dialog.editId) model.update(dialog.editId, p as Partial<PlotElement>);
    else model.add({ id: newId(), type: 'plot', ...p, ...dialog.rect, color: opts.color === '#212529' ? '#1c7ed6' : opts.color, z: model.nextZ(), author: userId, createdAt: Date.now() });
    setDialog(null);
  };
  const insertRecognized = (latex: string, removeStrokes: boolean) => {
    if (dialog?.kind !== 'recognize') return;
    const d = dialog;
    model.stopCapturing();
    model.transact(() => {
      if (removeStrokes) for (const id of d.strokeIds) model.elements.delete(id);
      const id = newId();
      model.elements.set(id, { id, type: 'formula', latex, x: d.rect.x, y: d.rect.y, fontSize: d.fontSize, color: opts.color, z: model.nextZ(), author: userId, createdAt: Date.now() });
    });
    setDialog(null);
  };

  // --- Render ---
  const present = new Set(peers.map((p) => p.peerId));
  const transform = `translate(${view.ox} ${view.oy}) scale(${view.scale})`;
  const htmlEls = displayed.filter((e): e is FormulaElement | TextElement => e.type === 'formula' || e.type === 'text');
  const svgEls = displayed.filter((e) => e.type !== 'formula' && e.type !== 'text');
  const hs = 1 / view.scale;
  const cursorClass = `cursor-${tool}`;
  const editable = selectedEls.length === 1 && ['formula', 'text', 'plot'].includes(selectedEls[0]!.type);

  return (
    <div className="whiteboard">
      <div
        ref={containerRef}
        className={`board-surface ${cursorClass}`}
        style={backgroundStyle(background, view)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishGesture(e, false)}
        onPointerCancel={(e) => finishGesture(e, true)}
        onPointerLeave={(e) => {
          // Mysz: kursor znika od razu po opuszczeniu tablicy; pióro/dotyk: zostaje ostatnia pozycja (znika po 5 s).
          if (e.pointerType === 'mouse') channel.send({ t: 'cursor-hide' });
          setEraserPos(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragOver={(e) => {
          if (!readOnly && e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          if (readOnly || !e.dataTransfer.files.length) return;
          e.preventDefault();
          void insertImageFiles([...e.dataTransfer.files], { clientX: e.clientX, clientY: e.clientY });
        }}
      >
        <div className="html-layer" style={{ transform: `translate(${view.ox}px, ${view.oy}px) scale(${view.scale})` }}>
          {htmlEls.map((el) => (
            <HtmlElementView key={el.id} el={el} onSize={onSize} />
          ))}
        </div>
        <svg className="ink-layer">
          <g transform={transform}>
            {svgEls.map((el) => (
              <SvgElementView key={el.id} el={el} />
            ))}
            {Object.entries(remoteStrokes).map(([id, s]) => (
              <StrokeView key={id} el={{ ...s, complete: false }} />
            ))}
            {live && <StrokeView el={{ ...live, complete: false }} />}
            {draft && draft.target !== 'recognize' && (
              <rect x={draft.rect.x} y={draft.rect.y} width={draft.rect.w} height={draft.rect.h} fill="rgba(28,126,214,0.06)" stroke="#1c7ed6" strokeWidth={hs} strokeDasharray={`${4 * hs} ${4 * hs}`} />
            )}
            {draft && draft.target === 'shape' && (
              <SvgElementView
                el={{ id: '__draft', type: 'shape', kind: opts.shape, ...(opts.shape === 'line' || opts.shape === 'arrow' ? draft.raw : draft.rect), stroke: opts.color, fill: opts.fill ? `${opts.color}26` : null, strokeWidth: 2.5, z: 0, author: '', createdAt: 0 }}
              />
            )}
            {draft && draft.target === 'solid' && (
              <SvgElementView el={{ id: '__draft', type: 'solid', kind: opts.solid, ...draft.rect, rotX: DEFAULT_ROT_X, rotY: DEFAULT_ROT_Y, stroke: opts.color, strokeWidth: 2, showHidden: true, z: 0, author: '', createdAt: 0 }} />
            )}
            {draft && draft.target === 'recognize' && (
              <rect x={draft.rect.x} y={draft.rect.y} width={draft.rect.w} height={draft.rect.h} fill="rgba(174,62,201,0.07)" stroke="#ae3ec9" strokeWidth={1.5 * hs} strokeDasharray={`${6 * hs} ${4 * hs}`} />
            )}
            {band && <rect x={band.x} y={band.y} width={band.w} height={band.h} fill="rgba(28,126,214,0.08)" stroke="#1c7ed6" strokeWidth={hs} />}
            {tool === 'select' && selBounds && (
              <g>
                {selectedEls.length > 1 &&
                  selectedEls.map((el) => {
                    const b = elementBounds(el, sizeLookup);
                    return <rect key={el.id} x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#74c0fc" strokeWidth={hs} />;
                  })}
                <rect
                  x={selBounds.x - 4 * hs}
                  y={selBounds.y - 4 * hs}
                  width={selBounds.w + 8 * hs}
                  height={selBounds.h + 8 * hs}
                  fill="none"
                  stroke="#1c7ed6"
                  strokeWidth={1.5 * hs}
                  strokeDasharray={`${5 * hs} ${4 * hs}`}
                />
                <circle cx={selBounds.x + selBounds.w} cy={selBounds.y + selBounds.h} r={7 * hs} fill="#fff" stroke="#1c7ed6" strokeWidth={2 * hs} />
                {singleSolid && (
                  <g>
                    <circle cx={selBounds.x + selBounds.w} cy={selBounds.y} r={9 * hs} fill="#1c7ed6" />
                    <text x={selBounds.x + selBounds.w} y={selBounds.y + 4 * hs} fontSize={12 * hs} textAnchor="middle" fill="#fff">
                      ⟳
                    </text>
                  </g>
                )}
              </g>
            )}
            {tool === 'eraser' && eraserPos && <circle cx={eraserPos.x} cy={eraserPos.y} r={10 * hs} fill="rgba(0,0,0,0.04)" stroke="#868e96" strokeWidth={hs} />}
          </g>
        </svg>
        {Object.entries(cursors)
          .filter(([id]) => present.has(id))
          .map(([id, c]) => (
            <div
              key={id}
              className={`remote-cursor${c.idle ? ' idle' : ''}`}
              data-peer={id}
              style={{ transform: `translate(${c.x * view.scale + view.ox}px, ${c.y * view.scale + view.oy}px)`, color: c.color }}
            >
              <svg width={20} height={22} viewBox="0 0 20 22" aria-hidden="true">
                <path d="M2 1.5 L2 18.5 L6.6 14.2 L9.6 20.6 L12.6 19.2 L9.7 12.9 L16 12.9 Z" fill="currentColor" stroke="#000" strokeWidth={1.4} strokeLinejoin="round" />
              </svg>
              <span className="remote-cursor-label" style={{ background: c.color }}>
                {c.name}
              </span>
            </div>
          ))}
      </div>

      <ToolRail
        tool={tool}
        readOnly={readOnly}
        setTool={(t) => {
          setTool(t);
          if (t !== 'select') setSelection(new Set());
        }}
        onImage={() => fileInputRef.current?.click()}
        libraryOpen={libraryOpen}
        onLibrary={() => setLibraryOpen((o) => !o)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          void insertImageFiles(files);
        }}
      />
      {libraryOpen && <FormulaLibrary onInsert={readOnly ? undefined : (f, at) => void insertCke(f, at)} onClose={() => setLibraryOpen(false)} />}
      {notice && (
        <div className="toasts">
          <div className="toast">{notice}</div>
        </div>
      )}
      <OptionsBar
        tool={tool}
        opts={opts}
        setOpts={setOpts}
        onColor={applyColor}
        background={background}
        setBackground={(b) => model.setBackground(b)}
        canUndo={model.undoManager.undoStack.length > 0}
        canRedo={model.undoManager.redoStack.length > 0}
        onUndo={() => model.undo()}
        onRedo={() => model.redo()}
        onTrain={() => setDialog({ kind: 'training' })}
        onClear={async () => {
          const ok = await dialogs.confirm({
            title: 'Wyczyść tablicę',
            message: 'Wyczyścić całą tablicę u wszystkich uczestników? Operację można cofnąć (Ctrl+Z).',
            confirmLabel: 'Wyczyść',
            danger: true,
          });
          if (ok) {
            model.stopCapturing();
            model.clear();
          }
        }}
        readOnly={readOnly}
      />

      {tool === 'select' && selectedEls.length > 0 && !readOnly && (
        <div className="selection-bar" onPointerDown={(e) => e.stopPropagation()}>
          {editable && <IconButton icon="edit" label="Edytuj" onClick={() => openEdit(selectedEls[0]!)} />}
          {singleSolid && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={singleSolid.showHidden}
                onChange={(e) => {
                  model.stopCapturing();
                  model.update(singleSolid.id, { showHidden: e.target.checked } as Partial<SolidElement>);
                }}
              />
              krawędzie niewidoczne
            </label>
          )}
          <IconButton icon="front" label="Na wierzch" onClick={() => model.bringToFront(selectedEls.map((e) => e.id))} />
          <IconButton icon="copy" label="Duplikuj (Ctrl+D)" onClick={duplicateSelection} />
          <IconButton icon="trash" label="Usuń (Delete)" onClick={deleteSelection} />
        </div>
      )}

      <div className="zoom-bar" onPointerDown={(e) => e.stopPropagation()}>
        <IconButton icon="zoomOut" label="Pomniejsz" onClick={() => zoomCenter(1 / 1.25)} />
        <button type="button" className="zoom-label" title="100%" onClick={() => zoomCenter(1 / viewRef.current.scale)}>
          {Math.round(view.scale * 100)}%
        </button>
        <IconButton icon="zoomIn" label="Powiększ" onClick={() => zoomCenter(1.25)} />
        <IconButton icon="fit" label="Pokaż całą tablicę" onClick={fitAll} />
      </div>

      {readOnly && (
        <div className="readonly-badge">
          <Icon name="hand" size={16} /> Tylko podgląd
        </div>
      )}

      {dialog?.kind === 'formula' && <FormulaDialog initial={dialog.latex} initialSize={dialog.size} onSave={saveFormula} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'text' && <TextDialog initial={dialog.text} initialSize={dialog.size} onSave={saveText} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'plot' && <PlotDialog initial={dialog.params} onSave={savePlot} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'recognize' && (
        <RecognizeDialog result={dialog.result} onInsert={insertRecognized} onTrain={() => setDialog({ kind: 'training' })} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'training' && <TrainingDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
