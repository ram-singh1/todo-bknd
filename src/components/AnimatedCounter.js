import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

/**
 * Number that counts up from the last rendered value to the incoming value.
 * Cheap: runs on JS with requestAnimationFrame. Used for the Home stat cards
 * so numbers tick instead of popping in.
 */
export default function AnimatedCounter({ value = 0, duration = 700, style, suffix = '' }) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = previousRef.current;
    const to = value;
    if (from === to) return;

    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <Text style={style}>{display}{suffix}</Text>;
}
