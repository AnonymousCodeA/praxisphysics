'use client';

import { useEffect, useRef, useState } from 'react';

export default function CoachMark({
  active,
  text,
  target,
  placement = 'bottom',
  nextLabel = 'NEXT',
  onNext,
  canAdvance = true,
}) {
  const markRef = useRef(null);
  const [style, setStyle] = useState({ display: 'none' });

  useEffect(() => {
    if (!active) {
      setStyle({ display: 'none' });
      return;
    }
    function update() {
      if (!target) {
        setStyle({ display: 'none' });
        return;
      }
      const el = typeof target === 'function' ? target() : target;
      if (!el || !el.getBoundingClientRect) {
        setStyle({ display: 'none' });
        return;
      }
      const rect = el.getBoundingClientRect();
      let top = 0;
      let left = 0;
      if (placement === 'bottom') {
        top = rect.bottom + 12;
        left = rect.left + rect.width / 2;
      } else if (placement === 'top') {
        top = rect.top - 12;
        left = rect.left + rect.width / 2;
      } else if (placement === 'right') {
        top = rect.top + rect.height / 2;
        left = rect.right + 12;
      } else if (placement === 'left') {
        top = rect.top + rect.height / 2;
        left = rect.left - 12;
      }
      setStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: placement === 'bottom' || placement === 'top' ? 'translateX(-50%)' : placement === 'right' || placement === 'left' ? 'translateY(-50%)' : 'translate(-50%, -50%)',
        zIndex: 90,
        display: 'block',
      });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, target, placement]);

  if (!active) return null;

  return (
    <div ref={markRef} className="coach-mark" style={style} role="dialog" aria-live="polite">
      <div className="coach-mark-body">
        <p>{text}</p>
        <div className="coach-mark-actions">
          {canAdvance && onNext && (
            <button type="button" className="btn btn-fill" onClick={onNext}>
              {nextLabel}
            </button>
          )}
          {!canAdvance && (
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Complete the step to continue</span>
          )}
        </div>
      </div>
      <div className={`coach-mark-arrow coach-mark-arrow-${placement}`} />
    </div>
  );
}
