import { useEffect, useRef, useState } from "react";

/**
 * Render animasi dari satu spritesheet (grid frame + durasi per-frame).
 *
 * frames: array of [x, y, durationMs] — posisi top-left tiap frame di sheet.
 * frameWidth/frameHeight: ukuran satu frame (px, sesuai sheet asli).
 * sheetWidth/sheetHeight: ukuran total spritesheet (px).
 * fill: jika true, sprite mengisi penuh container (crop, seperti object-fit:
 *   cover) memakai ResizeObserver — dipakai saat container BUKAN 16:9 (mis.
 *   layar HP portrait penuh). Jika false (default), sprite menjaga aspect
 *   ratio aslinya via CSS aspect-ratio + persentase (contain, tanpa JS).
 */
export default function AnimatedSprite({
  src,
  frames,
  frameWidth,
  frameHeight,
  sheetWidth,
  sheetHeight,
  className = "",
  style = {},
  fill = false,
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const rafRef = useRef();
  const startRef = useRef(null);
  const wrapRef = useRef(null);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });

  const totalDuration = frames.reduce((sum, f) => sum + f[2], 0);

  useEffect(() => {
    startRef.current = null;
    const tick = (now) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) % totalDuration;
      let acc = 0;
      let idx = frames.length - 1;
      for (let i = 0; i < frames.length; i++) {
        acc += frames[i][2];
        if (elapsed < acc) {
          idx = i;
          break;
        }
      }
      setFrameIndex(idx);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, totalDuration]);

  useEffect(() => {
    if (!fill) return;
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => setBoxSize({ width: el.clientWidth, height: el.clientHeight });
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const [fx, fy] = frames[frameIndex];

  if (fill) {
    // "cover" mode: scale the sheet in real px so one frame always fills the
    // box (cropping overflow) and stays centered, instead of shrinking to
    // fit inside letterboxed bars.
    const scale = boxSize.width && boxSize.height
      ? Math.max(boxSize.width / frameWidth, boxSize.height / frameHeight)
      : 0;
    const dispFrameW = frameWidth * scale;
    const dispFrameH = frameHeight * scale;
    const offsetX = (boxSize.width - dispFrameW) / 2 - fx * scale;
    const offsetY = (boxSize.height - dispFrameH) / 2 - fy * scale;
    return (
      <div ref={wrapRef} className={className} style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", ...style }}>
        {scale > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${src})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${sheetWidth * scale}px ${sheetHeight * scale}px`,
              backgroundPosition: `${offsetX}px ${offsetY}px`,
              imageRendering: "pixelated",
            }}
          />
        )}
      </div>
    );
  }

  const bgW = (sheetWidth / frameWidth) * 100;
  const bgH = (sheetHeight / frameHeight) * 100;
  const posX = (fx / (sheetWidth - frameWidth)) * 100;
  const posY = (fy / (sheetHeight - frameHeight)) * 100;

  return (
    <div
      className={className}
      style={{
        aspectRatio: `${frameWidth} / ${frameHeight}`,
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${bgW}% ${bgH}%`,
        backgroundPosition: `${posX}% ${posY}%`,
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
