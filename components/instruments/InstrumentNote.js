'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBenchHintShowing } from '@/lib/experiment/benchHintState';

// An instrument panel's description of the device, as a popover beside the
// panel rather than text inside it: it opens the first time that
// instrument is placed, the "?" in the panel header reopens it, and it
// takes no layout height either way — the panel is the same size open or
// closed. Dismissal is remembered per instrument
// (praxis:instrument-<id>-seen), not per experiment: a stopwatch is the
// same stopwatch on every bench.
//
// The note describes the device, never how to use it for an experiment —
// method lives in the guide (content/guide/measurement.js).
//
// Positioned `fixed` and portaled to <body>, like PendulumLens, so the
// bench column's scrolling and the workspace's overflow:clip can't cut it
// off.

const GAP = 12; // panel edge to popover edge; the tail sits in it
const MARGIN = 8; // from the viewport's edges
const TAIL_INSET = 16; // the tail stays this far from the popover's corners
const SIDES = ['right', 'left', 'below', 'above']; // beside first, then above/below

// The automatic first-use open waits while a bench's how-to strip is up
// (two first-use explanations shouldn't compete for a phone's screen) and
// fires the moment it's dismissed, if this instrument is still placed and
// its note still unseen. "Seen" is only ever set by dismissing a note that
// actually showed. The "?" opens it at any time.
export function useInstrumentNote(id) {
  const storageKey = `praxis:instrument-${id}-seen`;
  const [seen, setSeen] = useState(null); // null until localStorage is read
  const [shown, setShown] = useState(false);
  const autoOpened = useRef(false);
  const benchHintUp = useBenchHintShowing();
  const panelRef = useRef(null);
  const anchorRef = useRef(null);

  useEffect(() => {
    let s = false;
    try {
      s = localStorage.getItem(storageKey) === '1';
    } catch {}
    setSeen(s);
  }, [storageKey]);

  useEffect(() => {
    if (seen !== false || benchHintUp || autoOpened.current) return;
    autoOpened.current = true;
    setShown(true);
  }, [seen, benchHintUp]);

  const show = useCallback(() => {
    autoOpened.current = true; // opened by hand: nothing left to open automatically
    setShown(true);
  }, []);
  const dismiss = useCallback(() => {
    setShown(false);
    setSeen(true);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
  }, [storageKey]);

  return { shown, show, dismiss, panelRef, anchorRef };
}

// The header's "?" — always there, so opening the note never shifts the
// header, and the tail points at it.
export function InstrumentNoteButton({ note, name }) {
  return (
    <button
      ref={note.anchorRef}
      type="button"
      className="instrument-note-reopen"
      aria-label={`About the ${name}`}
      aria-expanded={!!note.shown}
      title={`About the ${name}`}
      onClick={note.shown ? note.dismiss : note.show}
    >
      ?
    </button>
  );
}

// The bench's apparatus region, which the note must not cover: the nearest
// .bench-pinned sharing an ancestor with the panel (not one containing it).
function apparatusEl(panel) {
  for (let el = panel.parentElement; el; el = el.parentElement) {
    const pin = el.querySelector('.bench-pinned');
    if (pin) return pin.contains(panel) ? null : pin;
  }
  return null;
}

function scrollParent(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
}

// How far `scroller` can still scroll down.
function scrollRoom(scroller) {
  if (scroller === window) return document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
  return scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
}

// Where the (sticky) apparatus would sit after scrolling `scroller` down by
// `delta`: it rides up with the content until it reaches its sticky offset.
function apparatusAfter(pin, scroller, delta) {
  const r = pin.getBoundingClientRect();
  if (!delta) return r;
  const stick = (scroller === window ? 0 : scroller.getBoundingClientRect().top) + (parseFloat(getComputedStyle(pin).top) || 0);
  const top = Math.min(r.top, Math.max(stick, r.top - delta));
  return { left: r.left, right: r.right, top, bottom: top + r.height };
}

const overlaps = (r, b) => r.left < b.right && r.left + r.w > b.left && r.top < b.bottom && r.top + r.h > b.top;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function InstrumentNotePopover({ note, name, children }) {
  const popRef = useRef(null);
  const sideRef = useRef(null); // chosen once per open; re-chosen on resize
  const [place, setPlace] = useState(null);
  const { shown, dismiss, panelRef, anchorRef } = note;

  useLayoutEffect(() => {
    if (!shown) {
      sideRef.current = null;
      setPlace(null);
      return undefined;
    }
    let raf = 0;
    let scrolled = false;

    function layout() {
      raf = 0;
      const panel = panelRef.current;
      const pop = popRef.current;
      if (!panel || !pop) return;
      const p = panel.getBoundingClientRect();
      const a = (anchorRef.current || panel).getBoundingClientRect();
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const head = document.querySelector('header');
      const minTop = (head ? Math.max(0, head.getBoundingClientRect().bottom) : 0) + MARGIN;
      const maxBottom = vh - MARGIN;
      const pin = apparatusEl(panel);
      const scroller = scrollParent(panel);
      const ax = (a.left + a.right) / 2;

      // Where the popover goes for a given side, were the panel scrolled up
      // by `delta`. Slid along the panel's edge to stay on screen, but
      // never so far the tail stops pointing at the "?".
      function rectFor(side, delta = 0) {
        const ay = (a.top + a.bottom) / 2 - delta;
        if (side === 'right' || side === 'left') {
          let top = clamp(ay - 28, minTop, maxBottom - h);
          top = clamp(top, ay - h + TAIL_INSET, ay - TAIL_INSET);
          const left = side === 'right' ? p.right + GAP : p.left - GAP - w;
          return { side, left, top, w, h, tail: ay - top };
        }
        let left = clamp(ax - w + 28, MARGIN, vw - MARGIN - w);
        left = clamp(left, ax - w + TAIL_INSET, ax - TAIL_INSET);
        const top = side === 'below' ? p.bottom - delta + GAP : p.top - delta - GAP - h;
        return { side, left, top, w, h, tail: ax - left };
      }
      const onScreen = (r) => r.left >= MARGIN && r.left + w <= vw - MARGIN && r.top >= minTop && r.top + h <= maxBottom;
      // A placement works after a scroll of `delta` if it's on screen, clear
      // of the apparatus, the scroll is possible, and it doesn't slide the
      // panel itself under the (sticky) apparatus.
      function works(side, delta) {
        const r = rectFor(side, delta);
        const av = pin && apparatusAfter(pin, scroller, delta);
        if (!onScreen(r) || (av && overlaps(r, av))) return false;
        if (!delta) return true;
        return delta <= scrollRoom(scroller) && !(av && p.top - delta < av.bottom);
      }
      // The scroll (down, in px) a side needs before it can fit at all.
      function deltaFor(side) {
        const ay = (a.top + a.bottom) / 2;
        if (side === 'right' || side === 'left') return Math.max(0, Math.ceil(ay - (maxBottom - TAIL_INSET)));
        if (side === 'below') return Math.max(0, Math.ceil(p.bottom + GAP + h - maxBottom));
        return 0;
      }

      if (!sideRef.current) {
        // Whatever fits as things sit; failing that (the panel just placed
        // near the bottom of the screen), whichever needs the least scroll,
        // then scroll exactly that much. The scroll re-runs layout.
        let pick = SIDES.find((s) => works(s, 0));
        let delta = 0;
        if (!pick) {
          const options = SIDES.map((s) => ({ s, d: deltaFor(s) })).filter((o) => o.d > 0 && works(o.s, o.d));
          options.sort((x, y) => x.d - y.d);
          // Nothing works even with a scroll: below, clear of the apparatus
          // above the panel, as far on screen as the page allows.
          const best = options[0] || { s: 'below', d: Math.min(deltaFor('below'), Math.max(0, scrollRoom(scroller))) };
          pick = best.s;
          delta = best.d;
        }
        sideRef.current = pick;
        if (delta > 0 && !scrolled) {
          scrolled = true;
          scroller.scrollBy({ top: delta, behavior: 'instant' });
          layout(); // an instant scroll is synchronous: lay out from the new position
          return;
        }
      }
      const avoid = pin && pin.getBoundingClientRect();
      const r = rectFor(sideRef.current);
      // Once open, it follows the panel; if the panel scrolls under the
      // apparatus or off screen, the note goes with it rather than
      // floating over whatever is now there.
      const hidden = (avoid && overlaps(r, avoid)) || r.top + h < minTop || r.top > vh;
      setPlace({ side: r.side, left: r.left, top: r.top, tail: r.tail, hidden });
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(layout);
    };
    const onResize = () => {
      sideRef.current = null;
      schedule();
    };

    layout();
    window.addEventListener('scroll', schedule, true); // capture: the bench column scrolls too
    window.addEventListener('resize', onResize);
    let ro = null;
    if ('ResizeObserver' in window && panelRef.current) {
      ro = new ResizeObserver(schedule);
      ro.observe(panelRef.current);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
    };
  }, [shown, panelRef, anchorRef]);

  // GOT IT, Escape, or a press anywhere outside (the "?" toggles itself).
  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss();
    };
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      dismiss();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [shown, dismiss, anchorRef]);

  if (!shown) return null;
  return createPortal(
    <div
      ref={popRef}
      className="instrument-popover"
      role="dialog"
      aria-label={`About the ${name}`}
      data-side={place?.side}
      style={{
        left: place?.left ?? 0,
        top: place?.top ?? 0,
        visibility: place && !place.hidden ? 'visible' : 'hidden',
        '--tail': `${place?.tail ?? 0}px`,
      }}
    >
      <p className="instrument-note">{children}</p>
      <button type="button" onClick={dismiss}>
        GOT IT
      </button>
    </div>,
    document.body
  );
}
