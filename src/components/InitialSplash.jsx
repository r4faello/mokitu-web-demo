import { useEffect, useState } from 'react';

export default function InitialSplash({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 900);
    const t2 = setTimeout(() => onDone?.(), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background:
          'radial-gradient(circle at 50% 50%, #FFF8F0 0%, #FFE9D8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        zIndex: 100,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: fading ? 'none' : 'auto'
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          background: 'linear-gradient(135deg, oklch(0.82 0.12 30), oklch(0.72 0.14 30))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'splashBreathe 2.2s ease-in-out infinite'
        }}
      >
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="10" r="1.4" fill="#fff" />
          <circle cx="15" cy="10" r="1.4" fill="#fff" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 1,
          color: 'var(--charcoal)'
        }}
      >
        Mokitu
      </div>
    </div>
  );
}
