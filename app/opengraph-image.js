import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Praxis — Physics Lab, Simulated.';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: '#060A0F',
          backgroundImage:
            'linear-gradient(rgba(78,197,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(78,197,255,.07) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      >
        <div
          style={{
            fontSize: 30,
            letterSpacing: '0.24em',
            color: '#4EC5FF',
            marginBottom: 34,
          }}
        >
          PRAXIS
        </div>
        <div style={{ fontSize: 104, color: '#E6EDF3', lineHeight: 1.05 }}>
          Physics Lab,
        </div>
        <div style={{ fontSize: 104, color: '#4EC5FF', lineHeight: 1.05 }}>
          Simulated.
        </div>
        <div style={{ fontSize: 30, color: '#7A8B9C', marginTop: 40 }}>
          Free interactive physics for students
        </div>
      </div>
    ),
    size
  );
}
