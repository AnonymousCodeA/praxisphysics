'use client';

import { drawComponent } from '@/lib/circuits/scene';
import { useEffect, useRef } from 'react';

const SYMBOL_TYPE_SAMPLE = {
  battery: 'battery',
  resistor: 'resistor',
  capacitor: 'capacitor',
  switch: 'switch',
  wire: 'wire',
  voltmeter: 'voltmeter',
  ammeter: 'ammeter',
};

function CardSymbol({ type }) {
  const ref = useRef(null);
  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 64;
    const h = 34;
    cvs.width = w * dpr;
    cvs.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawComponent(
      ctx,
      { x: 6, y: h / 2 },
      { x: w - 6, y: h / 2 },
      { type: SYMBOL_TYPE_SAMPLE[type] || type, label: '', closed: true },
      { color: '#4EC5FF' }
    );
  }, [type]);
  return <canvas ref={ref} className="circuit-card-symbol" aria-hidden="true" />;
}

// Row of cards, one per inventory item from the problem definition — tap to
// arm it for placement (see CircuitBench). A card at zero stock is disabled
// rather than removed, so the student can still see what the problem
// originally provided.
export default function CircuitInventory({ items, remaining, armedId, onArm }) {
  return (
    <div className="circuit-inventory">
      {items.map((item) => {
        const count = remaining[item.id] ?? 0;
        const disabled = count <= 0;
        return (
          <button
            key={item.id}
            type="button"
            className={`circuit-card${armedId === item.id ? ' armed' : ''}`}
            disabled={disabled}
            aria-pressed={armedId === item.id}
            onClick={() => onArm(item.id)}
          >
            <CardSymbol type={item.type} />
            <span className="circuit-card-label">{item.label}</span>
            <span className="circuit-card-count">×{count}</span>
          </button>
        );
      })}
    </div>
  );
}
