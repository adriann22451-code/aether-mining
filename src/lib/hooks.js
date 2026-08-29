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

// Computes the largest box of a given aspect ratio (ratioW:ratioH) that fits
// entirely inside its parent's available space — like CSS `object-fit: contain`,
// but for a regular (non-replaced) element, and correct in BOTH orientations
// (landscape ratio inside a tall container, portrait ratio inside a wide one).
// Plain CSS `aspect-ratio` + `max-width/max-height` cannot do this reliably:
// once one axis gets clamped, the other keeps its original size instead of
// shrinking to match, breaking the ratio. Measuring with ResizeObserver avoids that.
export function useContainSize(ratioW, ratioH) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = ratioW / ratioH;

    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const containerRatio = cw / ch;
      const [w, h] = containerRatio > target ? [ch * target, ch] : [cw, cw / target];
      setSize({ width: Math.floor(w), height: Math.floor(h) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratioW, ratioH]);

  return [ref, size];
}
