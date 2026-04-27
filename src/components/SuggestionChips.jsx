export default function SuggestionChips({ suggestions, onPick, colors }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '0 4px',
        marginTop: -4
      }}
    >
      {suggestions.map((s, i) => (
        <button
          key={s}
          onClick={() => onPick?.(s)}
          style={{
            padding: '6px 12px',
            borderRadius: 18,
            border: '1px solid rgba(255, 176, 136, 0.45)',
            background: colors.peachLight,
            color: colors.text,
            fontFamily: "'Nunito', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
            animation: `chipPop 0.35s ${i * 0.06}s both ease-out`,
            boxShadow: '0 1px 4px rgba(255, 140, 90, 0.12)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FFD2B8';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 140, 90, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.peachLight;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(255, 140, 90, 0.12)';
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
