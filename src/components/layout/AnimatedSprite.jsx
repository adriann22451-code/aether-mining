import { useEffect, useRef, useState } from "react";

/**
 * Render animasi dari satu spritesheet (grid frame + durasi per-frame).
 * Menjaga aspect ratio frame & scaling tajam (pixel-art) tanpa perlu
 * mengukur ukuran container lewat JS — murni pakai persentase CSS.
 *
 * frames: array of [x, y, durationMs] — posisi top-left tiap frame di sheet.
 * frameWidth/frameHeight: ukuran satu frame (px, sesuai sheet asli).
 * sheetWidth/sheetHeight: ukuran total spritesheet (px).
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
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const rafRef = useRef();
  const startRef = useRef(null);

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

  const [fx, fy] = frames[frameIndex];
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
