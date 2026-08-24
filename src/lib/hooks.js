import { useState, useEffect, useRef } from "react";

export function useTween(target, ms = 800) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  useEffect(() => {
    const from = displayRef.current;
    const delta = target - from;
    if (Math.abs(delta) < 0.0001) return;
    let raf;
    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / ms);
      const eased = 1 - Math.pow(1 - t, 2);
      const val = from + delta * eased;
      displayRef.current = val;
      setDisplay(val);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return display;
}
