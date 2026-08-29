'use client';

import { useEffect, useState } from 'react';
import { quantize } from '@/lib/instruments/reading';
import { sessionUniform } from '@/lib/instruments/rng';

const RESOLUTION_MM = 1;
const OFFSET_RANGE_MM = 1.5; // fixed session zero error

// Reads a length to the end of the string, not the bob's centre — the
// difference from the bob radius is a deliberate, unstated systematic.
export default function Ruler({ trueValueM }) {
  const [offsetMm, setOffsetMm] = useState(null);

  useEffect(() => {
    setOffsetMm(sessionUniform('ruler-zero-offset-mm', -OFFSET_RANGE_MM, OFFSET_RANGE_MM));
  }, []);

  const ready = offsetMm !== null;
  const readingMm = ready ? quantize(trueValueM * 1000 + offsetMm, RESOLUTION_MM) : null;

  return (
    <div className="instrument">
      <div className="instrument-head">
        <b>RULER</b>
        <span className="instrument-res">{RESOLUTION_MM}mm</span>
      </div>
      <div className="instrument-read">
        {ready ? readingMm.toFixed(0) : '—'}
        <span className="unit">mm</span>
      </div>
      <p className="instrument-note">Measured to the end of the string, not the bob&apos;s centre.</p>
    </div>
  );
}
