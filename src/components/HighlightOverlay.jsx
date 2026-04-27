import { useEffect, useState, useRef } from 'react';
import { ELEMENT_MAPS } from '../elementMaps.js';

const FADE_IN_MS = 300;
const LIFETIME_MS = 4000;

// Renders a list of fading peach rectangles over the screenshot. Coordinates
// in `keys` are looked up in ELEMENT_MAPS[scenario] (percentages).
//
// Each new key passed in spawns a fresh highlight with a 4-second lifetime.
// Keys that re-appear before expiry are refreshed (lifetime extended).
export default function HighlightOverlay({ scenario, keys, imgRect }) {
  const [active, setActive] = useState([]); // [{id, key, x, y, w, h, expiresAt}]
  const idRef = useRef(0);

  useEffect(() => {
    if (!keys || keys.length === 0) return;
    const map = ELEMENT_MAPS[scenario];
    if (!map) return;

    setActive((prev) => {
      const now = Date.now();
      let next = prev;
      for (const key of keys) {
        const coords = map[key];
        if (!coords) continue;
        const existingIdx = next.findIndex((h) => h.key === key && h.expiresAt > now);
        if (existingIdx >= 0) {
          // Replace with a NEW object so the Highlight child re-runs its effect
          // and reschedules its fade-out timer to the extended expiry.
          next = next.slice();
          next[existingIdx] = { ...next[existingIdx], expiresAt: now + LIFETIME_MS };
          continue;
        }
        next = next.concat({
          id: ++idRef.current,
          key,
          ...coords,
          createdAt: now,
          expiresAt: now + LIFETIME_MS
        });
      }
      return next;
    });
  }, [keys, scenario]);

  // Garbage-collect expired highlights
  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setActive((prev) => {
        const filtered = prev.filter((h) => h.expiresAt > now);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 250);
    return () => clearInterval(id);
  }, [active.length]);

  if (!imgRect || active.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: imgRect.left,
        top: imgRect.top,
        width: imgRect.width,
        height: imgRect.height,
        pointerEvents: 'none',
        zIndex: 4
      }}
    >
      {active.map((h) => (
        <Highlight key={h.id} h={h} />
      ))}
    </div>
  );
}

function Highlight({ h }) {
  const [opacity, setOpacity] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => setOpacity(1), 10);
    // Fade out at the very end
    const fadeOutAt = h.expiresAt - Date.now() - FADE_IN_MS;
    const t2 = setTimeout(() => setFadingOut(true), Math.max(0, fadeOutAt));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [h.expiresAt]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${h.x}%`,
        top: `${h.y}%`,
        width: `${h.w}%`,
        height: `${h.h}%`,
        background: 'rgba(255, 176, 136, 0.25)',
        border: '2px solid #FFB088',
        borderRadius: 8,
        boxShadow: '0 0 0 2px rgba(255, 176, 136, 0.25), 0 4px 18px rgba(255, 140, 90, 0.25)',
        opacity: fadingOut ? 0 : opacity,
        transition: `opacity ${FADE_IN_MS}ms ease`,
        animation: fadingOut ? 'none' : 'highlightPulse 1.5s ease-in-out infinite'
      }}
    />
  );
}
