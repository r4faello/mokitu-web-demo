export default function MessageBubble({ msg, colors, radius, isNew }) {
  const isMokitu = msg.role === 'mokitu';
  const isError = msg.error === true;
  const errorBg = '#F7E3DD';
  const errorText = '#7A4A42';

  const bubbleBg = isError
    ? errorBg
    : isMokitu
    ? `linear-gradient(135deg, ${colors.mokituBubbleFrom}, ${colors.mokituBubbleTo})`
    : `linear-gradient(135deg, ${colors.userBubbleFrom}, ${colors.userBubbleTo})`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMokitu ? 'flex-start' : 'flex-end',
        animation: isNew ? 'bubbleSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none'
      }}
    >
      {isMokitu && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.textMuted,
            marginBottom: 4,
            marginLeft: 4,
            fontFamily: "'Quicksand', sans-serif",
            letterSpacing: 0.3
          }}
        >
          Mokitu
        </span>
      )}
      <div
        style={{
          padding: '12px 16px',
          maxWidth: '88%',
          borderRadius: isMokitu
            ? `${radius}px ${radius}px ${radius}px 4px`
            : `${radius}px ${radius}px 4px ${radius}px`,
          background: bubbleBg,
          color: isError ? errorText : colors.text,
          fontSize: 14,
          lineHeight: 1.6,
          fontWeight: 400,
          fontFamily: "'Nunito', sans-serif",
          fontStyle: isError ? 'italic' : 'normal',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          boxShadow: '0 1px 2px rgba(61, 48, 40, 0.04)'
        }}
      >
        {msg.voice ? <span style={{ fontStyle: 'italic', opacity: 0.85 }}>{msg.text}</span> : msg.text}
        {msg.streaming && msg.text && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: '1em',
              marginLeft: 2,
              background: colors.accentDark,
              verticalAlign: 'text-bottom',
              animation: 'streamCaret 0.9s ease-in-out infinite'
            }}
          />
        )}
      </div>
    </div>
  );
}
