'use client';

import { useEffect, useRef } from 'react';
import { buildEdges, nearestEdge, nodePx } from '@/lib/circuits/grid';
import { drawGrid, drawComponent, TRACE, DANGER } from '@/lib/circuits/scene';

const FILL = 0.82; // fraction of the binding dimension the grid should occupy
const SNAP_PX = 26; // max distance from an edge for it to count as "near" while armed
const GRAB_PAD_PX = 16; // touch-friendly hit margin around a placed component
const CLICK_MOVE_CANCEL_PX = 6;
const HOLD_DELAY_MS = 420; // press-and-hold threshold to remove a switch (a plain tap toggles it)
const HOLD_MOVE_CANCEL_PX = 6;

// Canvas + pointer mechanics for the circuit board, mirroring
// PendulumCanvas.js's conventions: refs (not state) for drag/gesture
// targets, a rAF loop paused off-screen via IntersectionObserver, resize
// via ResizeObserver, pointer events throughout. Unlike the pendulum's
// swing, nothing here is gated behind prefers-reduced-motion — a live
// meter reading and the placement ghost are the experiment's content and
// direct manipulation, not decorative animation (see CLAUDE.md's carve-out
// for measurement-driven experiments).
//
// `placed`/`armed`/`voltages`/`floatingNodes` are plain props, synced into
// refs on every change so the draw loop and pointer handlers (which run
// inside one long-lived effect) always see the latest values without
// re-binding.
export default function CircuitCanvas({ rows, cols, placed, armed, voltages, floatingNodes, onPlace, onRemove, onToggleSwitch }) {
  const canvasRef = useRef(null);
  const placedRef = useRef(placed);
  const armedRef = useRef(armed);
  const voltagesRef = useRef(voltages);
  const floatingNodesRef = useRef(floatingNodes);

  useEffect(() => {
    placedRef.current = placed;
  }, [placed]);
  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);
  useEffect(() => {
    voltagesRef.current = voltages;
  }, [voltages]);
  useEffect(() => {
    floatingNodesRef.current = floatingNodes;
  }, [floatingNodes]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext('2d');
    const edges = buildEdges(rows, cols);
    const edgeByKey = new Map(edges.map((e) => [e.key, e]));

    let W = 0,
      H = 0,
      dpr = 1,
      cellPx = 1,
      originX = 0,
      originY = 0,
      visibleOnScreen = true,
      raf = 0;

    let ghostEdge = null;
    let wasGhostEdge = null;
    let downPx = { x: 0, y: 0 };
    let pendingSwitch = null; // placed component while its hold-to-remove timer is armed
    let holdStartPx = { x: 0, y: 0 };
    let holdTimer = null;

    function resize() {
      const r = cvs.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(r.width * dpr);
      cvs.height = Math.round(r.height * dpr);
      W = r.width;
      H = r.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cellByWidth = (W * FILL) / Math.max(1, cols - 1);
      const cellByHeight = (H * FILL) / Math.max(1, rows - 1);
      cellPx = Math.min(cellByWidth, cellByHeight);
      originX = (W - cellPx * (cols - 1)) / 2;
      originY = (H - cellPx * (rows - 1)) / 2;
    }

    function toLocal(clientX, clientY) {
      const r = cvs.getBoundingClientRect();
      return { x: clientX - r.left - originX, y: clientY - r.top - originY };
    }

    function project(nodeStr) {
      const [row, col] = nodeStr.split(',').map(Number);
      const p = nodePx(row, col, cellPx);
      return { x: p.x + originX, y: p.y + originY };
    }

    function isOccupied(key) {
      return placedRef.current.some((c) => c.edgeKey === key);
    }

    function hitPlaced(lx, ly) {
      let best = null;
      let bestDist = Infinity;
      for (const comp of placedRef.current) {
        const e = edgeByKey.get(comp.edgeKey);
        if (!e) continue;
        const ax = e.ca * cellPx,
          ay = e.ra * cellPx,
          bx = e.cb * cellPx,
          by = e.rb * cellPx;
        const dx = bx - ax,
          dy = by - ay;
        const len2 = dx * dx + dy * dy;
        let t = len2 === 0 ? 0 : ((lx - ax) * dx + (ly - ay) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const cx = ax + t * dx,
          cy = ay + t * dy;
        const dist = Math.hypot(lx - cx, ly - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = comp;
        }
      }
      return best && bestDist <= GRAB_PAD_PX ? best : null;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      drawGrid(ctx, { originX, originY, cellPx, rows, cols });

      for (const comp of placedRef.current) {
        const p1 = project(comp.a);
        const p2 = project(comp.b);
        let reading;
        let floating = false;
        if (comp.type === 'voltmeter' || comp.type === 'ammeter') {
          // A node held up only by GMIN (no real path to any source) gives
          // the solver a numerically well-defined but physically arbitrary
          // voltage — see floatingNodes in model.mjs. Showing that as a
          // confident number would be a lie a real meter wouldn't tell.
          const fn = floatingNodesRef.current;
          floating = (fn && fn.has(comp.a)) || (fn && fn.has(comp.b));
          if (!floating) {
            const va = voltagesRef.current.get(comp.a) ?? 0;
            const vb = voltagesRef.current.get(comp.b) ?? 0;
            reading = comp.type === 'ammeter' ? (va - vb) / comp.shuntOhms : va - vb;
          }
        }
        drawComponent(ctx, p1, p2, comp, { color: TRACE, alpha: 1, reading, floating });
      }

      const armedItem = armedRef.current;
      if (armedItem && ghostEdge) {
        const occupied = isOccupied(ghostEdge.key);
        const p1 = project(ghostEdge.a);
        const p2 = project(ghostEdge.b);
        drawComponent(
          ctx,
          p1,
          p2,
          { type: armedItem.type, value: armedItem.value, label: armedItem.label, closed: true },
          { color: occupied ? DANGER : TRACE, alpha: occupied ? 0.55 : 0.6 }
        );
      }
    }

    function loop() {
      if (visibleOnScreen) draw();
      raf = requestAnimationFrame(loop);
    }

    function clearHoldTimer() {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    }

    function onDown(e) {
      const { x, y } = toLocal(e.clientX, e.clientY);
      downPx = { x, y };

      if (armedRef.current) {
        wasGhostEdge = ghostEdge;
        ghostEdge = nearestEdge(edges, cellPx, x, y, SNAP_PX);
        cvs.setPointerCapture(e.pointerId);
        return;
      }

      const hit = hitPlaced(x, y);
      if (hit && hit.type === 'switch') {
        pendingSwitch = hit;
        holdStartPx = { x, y };
        clearHoldTimer();
        holdTimer = setTimeout(() => {
          onRemove(hit.instanceId);
          pendingSwitch = null;
        }, HOLD_DELAY_MS);
      }
    }

    function onMove(e) {
      const { x, y } = toLocal(e.clientX, e.clientY);
      if (armedRef.current) {
        ghostEdge = nearestEdge(edges, cellPx, x, y, SNAP_PX);
        return;
      }
      if (pendingSwitch) {
        const dist = Math.hypot(x - holdStartPx.x, y - holdStartPx.y);
        if (dist > HOLD_MOVE_CANCEL_PX) {
          clearHoldTimer();
          pendingSwitch = null;
        }
      }
    }

    function onUp(e) {
      const { x, y } = toLocal(e.clientX, e.clientY);

      if (armedRef.current) {
        const edge = nearestEdge(edges, cellPx, x, y, SNAP_PX);
        ghostEdge = edge;
        const occupied = edge && isOccupied(edge.key);
        if (edge && !occupied && wasGhostEdge && wasGhostEdge.key === edge.key) {
          onPlace(edge);
          ghostEdge = null;
        }
        wasGhostEdge = null;
        if (cvs.hasPointerCapture(e.pointerId)) cvs.releasePointerCapture(e.pointerId);
        return;
      }

      clearHoldTimer();
      if (pendingSwitch) {
        const dist = Math.hypot(x - holdStartPx.x, y - holdStartPx.y);
        if (dist <= HOLD_MOVE_CANCEL_PX) onToggleSwitch(pendingSwitch.instanceId);
        pendingSwitch = null;
        return;
      }

      const dist = Math.hypot(x - downPx.x, y - downPx.y);
      if (dist <= CLICK_MOVE_CANCEL_PX) {
        const hit = hitPlaced(x, y);
        if (hit && hit.type !== 'switch') onRemove(hit.instanceId);
      }
    }

    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointercancel', onUp);

    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(resize);
      ro.observe(cvs);
    } else {
      window.addEventListener('resize', resize);
    }

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (en) => {
          visibleOnScreen = en[0].isIntersecting;
        },
        { threshold: 0.05 }
      );
      io.observe(cvs);
    }

    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      clearHoldTimer();
      cancelAnimationFrame(raf);
      cvs.removeEventListener('pointerdown', onDown);
      cvs.removeEventListener('pointermove', onMove);
      cvs.removeEventListener('pointerup', onUp);
      cvs.removeEventListener('pointercancel', onUp);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
    };
  }, [rows, cols, onPlace, onRemove, onToggleSwitch]);

  return (
    <canvas
      id="circuit-canvas"
      ref={canvasRef}
      className={armed ? 'arming' : ''}
      aria-label="Interactive circuit board. Tap an inventory card to arm a component, move over the grid to preview it on the nearest edge, and tap again to place it. Tap a placed component to remove it and return it to stock; tap a placed switch to toggle it, or press and hold it to remove it."
    />
  );
}
