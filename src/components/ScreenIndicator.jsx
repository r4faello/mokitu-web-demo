export default function ScreenIndicator({ colors }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 20,
        background: colors.screenBadgeBg,
        fontSize: 11,
        fontWeight: 600,
        color: colors.textMuted,
        letterSpacing: 0.3
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.sage}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
      <span>Seeing your screen</span>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colors.sage,
          animation: 'softPulse 3s ease-in-out infinite'
        }}
      ></div>
    </div>
  );
}
