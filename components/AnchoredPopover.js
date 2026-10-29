'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// A popover placed beside a box with a tail pointing at an anchor — the one
// positioning implementation, shared by the instrument notes
// (instruments/InstrumentNote.js: box = the instrument's panel, anchor = its
// "?") and the bench walkthrough's coach marks (PendulumWalkthrough.js).
// Positioned `fixed` and portaled to <body>, like PendulumLens, so the bench
// column's scrolling and the workspace's overflow:clip can't cut it off. It
// takes no layout height wherever it opens.
//
// `box` is what the popover sits beside; `anchor` is what its tail points
// at, and defaults to the box. Each is a ref or a function, read fresh at
// every layout; a function may return an element or, for something drawn
// on a canvas rather than in the DOM, a viewport point {x, y} — the caller
// converts canvas coordinates with the scene's own transform (see
// worldToClient in PendulumCanvas.js). A target inside the bench's
// apparatus passes the apparatus (.bench-pinned) itself as the box, so the
// popover lands outside it and the tail reaches in.
//
// Rules: a side with room (beside first, then below/above), scrolling the
// box into view if it must; never over the apparatus (.bench-pinned) and
// never off screen. `onDismiss`, if given, is called on Escape or a press
// anywhere outside the popover and its anchor; without it the popover stays
// until its owner closes it (a coach mark waits for the student to act on
// the bench).

const GAP = 12; // box edge to popover edge; the tail sits in it
const MARGIN = 8; // from the viewport's edges
const TAIL_INSET = 16; // the tail stays this far from the popover's corners
const SIDES = ['right', 'left', 'below', 'above']; // beside first, then above/below

const resolve = (x) => (typeof x === 'function' ? x() : x?.current) ?? null;
const isEl = (x) => !!x && typeof x.getBoundingClientRect === 'function';

// The bench's apparatus region, which the popover must not cover: the
// nearest .bench-pinned sharing an ancestor with the box (not one
// containing it, nor the box itself).
function apparatusEl(box) {
  for (let el = box.parentElement; el; el = el.parentElement) {
    const pin = el.querySelector('.bench-pinned');
    if (pin) return pin.contains(box) ? null : pin;
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

export default function AnchoredPopover({ open, box, anchor, onDismiss, label, className = '', children }) {
  const popRef = useRef(null);
  const sideRef = useRef(null); // chosen once per open; re-chosen on resize
  const [place, setPlace] = useState(null);
  // Latest targets and dismiss handler, read at layout time: callers pass
  // fresh functions every render, which mustn't restart the layout effect.
  const targets = useRef({ box, anchor, onDismiss });
  targets.current = { box, anchor, onDismiss };

  useLayoutEffect(() => {
    if (!open) {
      sideRef.current = null;
      setPlace(null);
      return undefined;
    }
    let raf = 0;
    let scrolled = false; // the side search's one scroll
    let broughtIntoView = false; // the box's one scroll into view, before that

    function layout() {
      raf = 0;
      const boxEl = resolve(targets.current.box);
      const pop = popRef.current;
      if (!isEl(boxEl) || !pop) return;
      const p = boxEl.getBoundingClientRect();
      // A box in a pane that isn't displayed (a phone tab not yet switched
      // to): wait — the ResizeObserver fires once it has a size.
      if (!p.width && !p.height) {
        setPlace((prev) => (prev ? { ...prev, hidden: true } : null));
        return;
      }
      const at = resolve(targets.current.anchor);
      const a = isEl(at)
        ? at.getBoundingClientRect()
        : at && Number.isFinite(at.x)
          ? { left: at.x, right: at.x, top: at.y, bottom: at.y }
          : p;
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const head = document.querySelector('header');
      const minTop = (head ? Math.max(0, head.getBoundingClientRect().bottom) : 0) + MARGIN;
      const maxBottom = vh - MARGIN;
      const pin = apparatusEl(boxEl);
      const scroller = scrollParent(boxEl);
      const ax = (a.left + a.right) / 2;

      // A box wholly off screen (the table, far down the bench column) is
      // brought into view first; the side search below then fine-tunes.
      if (!sideRef.current && !broughtIntoView && (p.bottom < minTop || p.top > maxBottom)) {
        broughtIntoView = true;
        boxEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        layout();
        return;
      }

      // Where the box would sit after scrolling down by `delta`. A sticky
      // box (the apparatus itself, as a coach mark's box) stops riding up
      // once it pins, so scrolling past that buys no more room.
      const sticky = getComputedStyle(boxEl).position === 'sticky';
      function boxAt(delta) {
        if (!delta) return p;
        if (sticky) return apparatusAfter(boxEl, scroller, delta);
        return { left: p.left, right: p.right, top: p.top - delta, bottom: p.bottom - delta };
      }
      // Where the popover goes for a given side, were the page scrolled by
      // `delta`. Slid along the box's edge to stay on screen, but never so
      // far the tail stops pointing at the anchor (which moves with the box).
      function rectFor(side, delta = 0) {
        const b = boxAt(delta);
        const shift = p.top - b.top;
        const ay = (a.top + a.bottom) / 2 - shift;
        if (side === 'right' || side === 'left') {
          let top = clamp(ay - 28, minTop, maxBottom - h);
          top = clamp(top, ay - h + TAIL_INSET, ay - TAIL_INSET);
          const left = side === 'right' ? p.right + GAP : p.left - GAP - w;
          return { side, left, top, w, h, tail: ay - top };
        }
        let left = clamp(ax - w + 28, MARGIN, vw - MARGIN - w);
        left = clamp(left, ax - w + TAIL_INSET, ax - TAIL_INSET);
        const top = side === 'below' ? b.bottom + GAP : b.top - GAP - h;
        return { side, left, top, w, h, tail: ax - left };
      }
      const onScreen = (r) => r.left >= MARGIN && r.left + w <= vw - MARGIN && r.top >= minTop && r.top + h <= maxBottom;
      // A placement works after a scroll of `delta` if it's on screen, clear
      // of the apparatus, the scroll is possible, and it doesn't slide the
      // box itself under the (sticky) apparatus.
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
        // Whatever fits as things sit; failing that (the box just placed
        // near the bottom of the screen), whichever needs the least scroll,
        // then scroll exactly that much. The scroll re-runs layout.
        let pick = SIDES.find((s) => works(s, 0));
        let delta = 0;
        if (!pick) {
          const options = SIDES.map((s) => ({ s, d: deltaFor(s) })).filter((o) => o.d > 0 && works(o.s, o.d));
          options.sort((x, y) => x.d - y.d);
          // Nothing works even with a scroll: below, clear of the apparatus
          // above the box, as far on screen as the page allows.
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
      // Once open, it follows the box; if the box scrolls under the
      // apparatus or off screen, the popover goes with it rather than
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
    const boxEl = resolve(targets.current.box);
    if ('ResizeObserver' in window && isEl(boxEl)) {
      ro = new ResizeObserver(schedule);
      ro.observe(boxEl);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
    };
  }, [open]);

  // Escape, or a press anywhere outside it and its anchor — only for a
  // popover that has an `onDismiss`.
  const dismissible = !!onDismiss;
  useEffect(() => {
    if (!open || !dismissible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') targets.current.onDismiss?.();
    };
    const onDown = (e) => {
      const at = resolve(targets.current.anchor);
      if (popRef.current?.contains(e.target) || (isEl(at) && at.contains(e.target))) return;
      targets.current.onDismiss?.();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open, dismissible]);

  if (!open) return null;
  return createPortal(
    <div
      ref={popRef}
      className={`anchored-popover ${className}`}
      role="dialog"
      aria-label={label}
      data-side={place?.side}
      style={{
        left: place?.left ?? 0,
        top: place?.top ?? 0,
        visibility: place && !place.hidden ? 'visible' : 'hidden',
        '--tail': `${place?.tail ?? 0}px`,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
