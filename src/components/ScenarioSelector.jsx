import { useState, useRef, useEffect } from 'react';
import { SCENARIOS } from '../scenarios.js';

const BOKEH = [
  { left: '8%', top: '12%', size: 280, color: 'rgba(255, 176, 136, 0.22)', dx: '40px', dy: '-50px', dur: 18 },
  { left: '78%', top: '20%', size: 220, color: 'rgba(184, 201, 163, 0.18)', dx: '-60px', dy: '40px', dur: 22 },
  { left: '15%', top: '70%', size: 200, color: 'rgba(255, 213, 204, 0.25)', dx: '50px', dy: '30px', dur: 26 },
  { left: '70%', top: '78%', size: 260, color: 'rgba(255, 176, 136, 0.18)', dx: '-30px', dy: '-60px', dur: 20 },
  { left: '50%', top: '40%', size: 160, color: 'rgba(184, 201, 163, 0.14)', dx: '60px', dy: '-30px', dur: 28 }
];

export default function ScenarioSelector({ onPick }) {
  const [pickedId, setPickedId] = useState(null);
  const [pageOut, setPageOut] = useState(false);
  const timersRef = useRef([]);

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    },
    []
  );

  function handlePick(id) {
    if (pickedId) return;
    setPickedId(id);
    // Let the card scale/lift, then fade page out, then commit
    timersRef.current.push(setTimeout(() => setPageOut(true), 90));
    timersRef.current.push(setTimeout(() => onPick(id), 480));
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, #FFF8F0, #FFE9D8, #FFF1E1, #FFEDE0)',
        backgroundSize: '300% 300%',
        animation: 'gradientDrift 22s ease-in-out infinite',
        opacity: pageOut ? 0 : 1,
        transition: 'opacity 0.45s ease'
      }}
    >
      {/* Bokeh */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {BOKEH.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.left,
              top: b.top,
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
              filter: 'blur(20px)',
              animation: `bokehDrift ${b.dur}s ${i * 0.7}s ease-in-out infinite`,
              '--dx': b.dx,
              '--dy': b.dy
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1100,
          width: '100%',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 18px',
            borderRadius: 24,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(14px)',
            boxShadow: 'var(--shadow-soft)',
            marginBottom: 28,
            animation: 'slideUpFade 0.6s 0.05s both ease-out'
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, oklch(0.82 0.12 30), oklch(0.72 0.14 30))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="10" r="1.2" fill="#fff" />
              <circle cx="15" cy="10" r="1.2" fill="#fff" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--charcoal)',
              letterSpacing: 0.6
            }}
          >
            Mokitu · AI Learning Companion
          </span>
        </div>

        <h1
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: 'clamp(48px, 7vw, 80px)',
            fontWeight: 700,
            color: 'var(--charcoal)',
            margin: '0 0 14px',
            lineHeight: 1.05,
            letterSpacing: -0.5,
            animation: 'heroFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both'
          }}
        >
          Mokitu
        </h1>

        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: 'clamp(20px, 2.5vw, 26px)',
            fontWeight: 500,
            background: 'linear-gradient(135deg, oklch(0.72 0.14 30), oklch(0.82 0.12 30))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 22px',
            letterSpacing: 0.2,
            animation: 'slideUpFade 0.7s 0.3s both ease-out'
          }}
        >
          Your AI Learning Companion
        </p>

        <p
          style={{
            fontSize: 17,
            color: 'var(--warm-gray)',
            lineHeight: 1.6,
            maxWidth: 640,
            margin: '0 auto 56px',
            fontWeight: 500,
            animation: 'slideUpFade 0.7s 0.6s both ease-out'
          }}
        >
          Pick a scenario to experience Mokitu — a private tutor that watches your screen and
          answers your questions in real time, by voice or text.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28,
            marginBottom: 56
          }}
        >
          {SCENARIOS.map((s, i) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              index={i}
              picked={pickedId === s.id}
              dimmed={pickedId && pickedId !== s.id}
              onPick={() => handlePick(s.id)}
            />
          ))}
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'var(--warm-gray)',
            opacity: 0.75,
            letterSpacing: 0.4,
            animation: 'slideUpFade 0.6s 0.95s both ease-out'
          }}
        >
          Proof of concept demo — Red Bull Basement 2026
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, index, picked, dimmed, onPick }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        textAlign: 'left',
        padding: 0,
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(14px)',
        border: hover
          ? '1px solid rgba(255, 176, 136, 0.55)'
          : '1px solid rgba(255, 255, 255, 0.85)',
        borderRadius: 20,
        boxShadow: hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        cursor: 'pointer',
        overflow: 'hidden',
        animation: `cardLift 0.55s ${0.7 + index * 0.08}s both cubic-bezier(0.16, 1, 0.3, 1)`,
        transition:
          'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, opacity 0.3s ease, border-color 0.18s ease',
        transform: picked
          ? 'scale(1.08)'
          : pressed
          ? 'scale(0.97)'
          : hover
          ? 'translateY(-6px)'
          : 'translateY(0)',
        opacity: dimmed ? 0.3 : 1,
        zIndex: picked ? 2 : 1
      }}
    >
      <div
        style={{
          height: 150,
          background: scenario.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <span
          style={{
            fontSize: 68,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))',
            transition: 'transform 0.35s ease',
            transform: hover ? 'scale(1.08)' : 'scale(1)'
          }}
        >
          {scenario.emoji}
        </span>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.28), transparent 60%)',
            pointerEvents: 'none'
          }}
        />
      </div>
      <div style={{ padding: '22px 22px 24px' }}>
        <div
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--warm-gray)',
            textTransform: 'uppercase',
            letterSpacing: 1.4,
            marginBottom: 6
          }}
        >
          {scenario.subtitle}
        </div>
        <div
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--charcoal)',
            marginBottom: 10
          }}
        >
          {scenario.title}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--warm-gray)',
            fontWeight: 500
          }}
        >
          {scenario.description}
        </div>
        <div
          style={{
            marginTop: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: "'Quicksand', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: 'oklch(0.62 0.16 30)',
            transition: 'gap 0.2s ease',
            ...(hover && { gap: 10 })
          }}
        >
          Open scenario
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.25s ease',
              transform: hover ? 'translateX(4px)' : 'translateX(0)'
            }}
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export { SCENARIOS };
