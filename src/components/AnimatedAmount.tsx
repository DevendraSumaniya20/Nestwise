import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, type TextStyle } from 'react-native';
import { formatInr } from '../utils/money';

/** Counts from the previous value to the new one, so balance changes are easy to notice. */
export function AnimatedAmount({ value, style }: { value: number; style?: TextStyle | TextStyle[] }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const start = from.current;
    from.current = value;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled) return;
      if (reduce || start === value) return setShown(value);
      const t0 = Date.now();
      const tick = () => {
        const p = Math.min(1, (Date.now() - t0) / 650);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(start + (value - start) * eased));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <Text style={style} accessibilityLabel={formatInr(value)}>
      {formatInr(shown)}
    </Text>
  );
}
