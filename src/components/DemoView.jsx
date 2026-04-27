import { useState, useCallback, useEffect, useRef } from 'react';
import MokituSidebar from './MokituSidebar.jsx';
import HighlightOverlay from './HighlightOverlay.jsx';
import { SCENARIOS, SCENARIO_BY_ID } from '../scenarios.js';

export default function DemoView({ scenario, onSwitch, onExit }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [highlightKeys, setHighlightKeys] = useState([]);
  const [imgRect, setImgRect] = useState(null);

  const containerRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    setImgFailed(false);
    setImgLoaded(false);
    setHighlightKeys([]);
  }, [scenario]);

  useEffect(() => {
    function recalc() {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container) return setImgRect(null);
      const cRect = container.getBoundingClientRect();
      if (!img || !img.naturalWidth) {
        setImgRect({ left: 0, top: 0, width: cRect.width, height: cRect.height });
        return;
      }
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.min(cRect.width / iw, cRect.height / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      setImgRect({
        left: (cRect.width - dw) / 2,
        top: (cRect.height - dh) / 2,
        width: dw,
        height: dh
      });
    }
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [scenario, imgFailed, imgLoaded]);

  const handleImgLoad = useCallback(() => {
    setImgLoaded(true);
  }, []);

  const handleSwitch = useCallback(
    (id) => {
      if (id !== scenario) onSwitch(id);
    },
    [scenario, onSwitch]
  );

  const label = SCENARIO_BY_ID[scenario]?.title || scenario;

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        background: 'var(--cream)',
        overflow: 'hidden'
      }}
    >
      {/* Left column: window chrome + tab bar + screenshot */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cream)',
          minWidth: 0
        }}
      >
        {/* Window chrome (mac-style) */}
        <div
          style={{
            flex: '0 0 auto',
            height: 28,
            background: 'var(--charcoal-deep)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 8,
            borderBottom: '1px solid rgba(0,0,0,0.4)'
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#FF5F57' }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#FEBC2E' }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#28C840' }} />
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255, 248, 240, 0.55)',
              letterSpacing: 0.3
            }}
          >
            {label} workspace
          </span>
          <div style={{ flex: 1 }} />
        </div>

        {/* Tab bar */}
        <div
          style={{
            flex: '0 0 auto',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255, 248, 240, 0.96)',
            borderBottom: '1px solid rgba(61, 48, 40, 0.08)'
          }}
        >
          <button
            onClick={onExit}
            title="Back to scenarios"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid rgba(61, 48, 40, 0.1)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--charcoal)',
              padding: 0,
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(61,48,40,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div style={{ width: 1, height: 20, background: 'rgba(61, 48, 40, 0.12)' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {SCENARIOS.map((s) => {
              const selected = s.id === scenario;
              return (
                <PillTab
                  key={s.id}
                  label={s.title}
                  selected={selected}
                  onClick={() => handleSwitch(s.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Screenshot area — letterboxed contain */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            background: 'var(--cream)',
            overflow: 'hidden',
            minHeight: 0
          }}
        >
          {!imgFailed ? (
            <>
              {!imgLoaded && <SkeletonLoader />}
              <img
                ref={imgRef}
                src={`/screenshots/${scenario}.png`}
                alt={`${label} workspace`}
                onLoad={handleImgLoad}
                onError={() => setImgFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  opacity: imgLoaded ? 1 : 0,
                  transition: 'opacity 0.5s ease'
                }}
              />
            </>
          ) : (
            <FallbackDesktop scenario={scenario} />
          )}

          <HighlightOverlay scenario={scenario} keys={highlightKeys} imgRect={imgRect} />

          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 14,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(61, 48, 40, 0.5)',
              color: 'rgba(255, 248, 240, 0.85)',
              fontSize: 10,
              letterSpacing: 0.4,
              backdropFilter: 'blur(6px)',
              zIndex: 5,
              pointerEvents: 'none'
            }}
          >
            Proof of concept — Red Bull Basement 2026
          </div>
        </div>
      </div>

      {/* Right: Mokitu sidebar — fixed width range for stable layout */}
      <div
        style={{
          flex: '0 0 auto',
          width: 'clamp(320px, 30%, 380px)',
          height: '100%',
          display: 'flex',
          minHeight: 0
        }}
      >
        <MokituSidebar key={scenario} scenario={scenario} onHighlightUpdate={setHighlightKeys} />
      </div>
    </div>
  );
}

function PillTab({ label, selected, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 14px',
        borderRadius: 18,
        border: selected ? 'none' : '1px solid rgba(61, 48, 40, 0.12)',
        cursor: selected ? 'default' : 'pointer',
        fontFamily: "'Quicksand', sans-serif",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.3,
        background: selected
          ? 'linear-gradient(135deg, oklch(0.82 0.12 30), oklch(0.72 0.14 30))'
          : hover
          ? 'rgba(255, 176, 136, 0.12)'
          : 'transparent',
        color: selected ? '#fff' : 'var(--charcoal)',
        boxShadow: selected ? '0 4px 12px rgba(255, 140, 90, 0.32)' : 'none',
        transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        transform: hover && !selected ? 'translateY(-1px)' : 'translateY(0)'
      }}
    >
      {label}
    </button>
  );
}

function SkeletonLoader() {
  const blockStyle = {
    background:
      'linear-gradient(90deg, rgba(255, 235, 220, 0.6) 0%, rgba(255, 220, 200, 0.85) 50%, rgba(255, 235, 220, 0.6) 100%)',
    backgroundSize: '800px 100%',
    animation: 'skeletonShimmer 1.4s linear infinite',
    borderRadius: 8
  };
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 20
      }}
    >
      <div style={{ ...blockStyle, height: 28 }} />
      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
        <div style={{ ...blockStyle, width: 60 }} />
        <div style={{ ...blockStyle, flex: 1 }} />
        <div style={{ ...blockStyle, width: 200 }} />
      </div>
      <div style={{ ...blockStyle, height: 32 }} />
    </div>
  );
}

function FallbackDesktop({ scenario }) {
  const titles = {
    photoshop: 'Adobe Photoshop — Untitled-1.psd',
    math: 'Notebook — Calculus.txt',
    excel: 'Microsoft Excel — Inventory.xlsx'
  };
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #2a2018 0%, #1a1410 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: '#d4c4b4',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div
        style={{
          flex: 1,
          margin: 24,
          marginBottom: 60,
          background: '#f5f0eb',
          borderRadius: 8,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '8px 14px',
            background: 'linear-gradient(180deg, #e8e0d6 0%, #d8cec0 100%)',
            color: '#3d3028',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f56' }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#ffbd2e' }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#27c93f' }} />
          <span style={{ marginLeft: 12 }}>{titles[scenario]}</span>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9b8a78',
            fontSize: 14,
            padding: 32,
            textAlign: 'center',
            lineHeight: 1.6
          }}
        >
          Drop a real screenshot at{' '}
          <code style={{ background: '#e8e0d6', padding: '2px 6px', borderRadius: 4, margin: '0 4px' }}>
            public/screenshots/{scenario}.png
          </code>{' '}
          to replace this placeholder.
          <br />
          The AI still works — it just won't see anything specific.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 44,
          background: 'rgba(20, 16, 14, 0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: i === 1 ? 'rgba(255,176,136,0.6)' : 'rgba(255,255,255,0.08)'
            }}
          />
        ))}
      </div>
    </div>
  );
}
