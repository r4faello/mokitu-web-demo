export default function MobileGate() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
        background:
          'radial-gradient(circle at 50% 30%, #FFF8F0 0%, #FFE9D8 100%)'
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: 'linear-gradient(135deg, oklch(0.82 0.12 30), oklch(0.72 0.14 30))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          boxShadow: '0 12px 40px rgba(255,140,90,0.25)'
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="10" r="1.2" fill="#fff" />
          <circle cx="15" cy="10" r="1.2" fill="#fff" />
        </svg>
      </div>
      <h1
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 26,
          margin: '0 0 12px',
          color: 'var(--charcoal)'
        }}
      >
        Mokitu is designed for desktop
      </h1>
      <p
        style={{
          maxWidth: 360,
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--warm-gray)',
          margin: 0
        }}
      >
        For the best experience, please open this on a laptop with a microphone.
      </p>
      <div
        style={{
          marginTop: 32,
          fontSize: 11,
          color: 'var(--warm-gray)',
          opacity: 0.7,
          letterSpacing: 0.4
        }}
      >
        Proof of concept — Red Bull Basement 2026
      </div>
    </div>
  );
}
