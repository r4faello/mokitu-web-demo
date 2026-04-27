export default function PulseRing({ active, color }) {
  const ringStyle = {
    position: 'absolute',
    inset: -8,
    borderRadius: '50%',
    border: `2px solid ${color}`,
    opacity: active ? 1 : 0,
    animation: active ? 'pulseRing 2s ease-out infinite' : 'none'
  };
  const ringStyle2 = { ...ringStyle, animationDelay: '0.6s' };
  return (
    <>
      <div style={ringStyle}></div>
      <div style={ringStyle2}></div>
    </>
  );
}
