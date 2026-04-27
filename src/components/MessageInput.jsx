import { useState } from 'react';

export default function MessageInput({ colors, onSubmit, disabled }) {
  const [value, setValue] = useState('');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
  }

  const sendDisabled = disabled || !value.trim();

  return (
    <div style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
        placeholder={disabled ? 'Mokitu is thinking…' : 'Ask Mokitu anything…'}
        style={{
          flex: 1,
          padding: '11px 14px',
          fontSize: 13,
          fontFamily: "'Nunito', sans-serif",
          color: colors.text,
          background: colors.inputBg,
          border: `1px solid ${focused ? 'rgba(255, 176, 136, 0.65)' : 'rgba(61,48,40,0.1)'}`,
          borderRadius: 14,
          outline: 'none',
          opacity: disabled ? 0.55 : 1,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxShadow: focused ? '0 0 0 3px rgba(255, 176, 136, 0.18)' : 'none'
        }}
      />
      <button
        onClick={submit}
        disabled={sendDisabled}
        title="Send"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: 'none',
          cursor: sendDisabled ? 'default' : 'pointer',
          background: sendDisabled
            ? 'rgba(61,48,40,0.12)'
            : `linear-gradient(135deg, ${colors.accent}, ${colors.pink})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.15s, background 0.15s, transform 0.18s ease',
          opacity: sendDisabled ? 0.45 : 1,
          boxShadow: sendDisabled ? 'none' : '0 4px 10px rgba(255, 140, 90, 0.28)',
          transform: hovered && !sendDisabled ? 'scale(1.06)' : 'scale(1)'
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            display: 'block',
            transition: 'transform 0.2s ease',
            transform: hovered && !sendDisabled ? 'rotate(15deg)' : 'rotate(0deg)'
          }}
        >
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke={sendDisabled ? colors.textMuted : '#fff'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
