'use client';

import { useEffect, useState } from 'react';
import { quantize } from '@/lib/instruments/reading';
import { sessionUniform } from '@/lib/instruments/rng';

const RESOLUTION_DEG = 1;
const OFFSET_RANGE_DEG = 1; // fixed session zero error

// Reads the bob's live angular position, whether held or swinging.
export default function Protractor({ trueValueRad }) {
  const [offsetDeg, setOffsetDeg] = useState(null);

  useEffect(() => {
    setOffsetDeg(sessionUniform('protractor-zero-offset-deg', -OFFSET_RANGE_DEG, OFFSET_RANGE_DEG));
  }, []);

  const ready = offsetDeg !== null;
  const trueDeg = (trueValueRad * 180) / Math.PI;
  const readingDeg = ready ? quantize(trueDeg + offsetDeg, RESOLUTION_DEG) : null;

  return (
    <div className="instrument">
      <div className="instrument-head">
        <b>PROTRACTOR</b>
        <span className="instrument-res">{RESOLUTION_DEG}°</span>
      </div>
      <div className="instrument-read">
        {ready ? readingDeg.toFixed(0) : '—'}
        <span className="unit">°</span>
      </div>
      <p className="instrument-note">Reads the bob&apos;s current angle, held or swinging.</p>
    </div>
  );
}
