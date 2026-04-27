import { useState, useCallback, useEffect } from 'react';
import ScenarioSelector from './components/ScenarioSelector.jsx';
import DemoView from './components/DemoView.jsx';
import InitialSplash from './components/InitialSplash.jsx';
import MobileGate from './components/MobileGate.jsx';

const MOBILE_BREAKPOINT = 760;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window === 'undefined' ? false : window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function App() {
  const [scenario, setScenario] = useState(null);
  const [splashDone, setSplashDone] = useState(false);
  // null = unknown (still checking), true = healthy, false = no API key on server
  const [serverHealthy, setServerHealthy] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setServerHealthy(!!data?.hasKey);
      })
      .catch(() => {
        // Don't block the demo on a flaky health endpoint
        if (!cancelled) setServerHealthy(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onPick = useCallback((id) => setScenario(id), []);
  const onSwitch = useCallback((id) => setScenario(id), []);
  const onExit = useCallback(() => setScenario(null), []);

  if (isMobile) return <MobileGate />;

  // Hold everything behind the splash so entrance animations don't burn behind it
  // and so we have time for the health probe to land.
  if (!splashDone || serverHealthy === null) {
    return <InitialSplash onDone={() => setSplashDone(true)} />;
  }

  if (serverHealthy === false) return <ServerSetup />;
  if (!scenario) return <ScenarioSelector onPick={onPick} />;
  return <DemoView scenario={scenario} onSwitch={onSwitch} onExit={onExit} />;
}

function ServerSetup() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 32,
        background:
          'radial-gradient(circle at 50% 30%, #FFF8F0 0%, #FFE9D8 100%)'
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
          marginBottom: 28,
          animation: 'splashBreathe 2.6s ease-in-out infinite'
        }}
      >
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="10" r="1.4" fill="#fff" />
          <circle cx="15" cy="10" r="1.4" fill="#fff" />
        </svg>
      </div>
      <h1
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 28,
          color: 'var(--charcoal)',
          margin: '0 0 12px'
        }}
      >
        Mokitu is being set up
      </h1>
      <p style={{ color: 'var(--warm-gray)', fontSize: 15, lineHeight: 1.6, maxWidth: 380, margin: 0 }}>
        Please check back in a moment.
      </p>
    </div>
  );
}
