export const MACHINE_ANIMATION_CSS = `
@keyframes droneBob { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
@keyframes smokeRise { 0% { transform: translateY(0) scale(0.8); opacity: 0.45; } 100% { transform: translateY(-46px) scale(1.7); opacity: 0; } }
@keyframes snowFall { 0% { transform: translateY(-10%) translateX(0); opacity: 0; } 10% { opacity: 0.95; } 90% { opacity: 0.85; } 100% { transform: translateY(230%) translateX(var(--drift, 12px)); opacity: 0; } }
@keyframes particleFloat { 0% { transform: translate(0, 0); opacity: 0.9; } 100% { transform: translate(var(--px), var(--py)); opacity: 0; } }
@keyframes droneFly { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(var(--dx), var(--dy)) rotate(8deg); } }
@keyframes coreHubPulse { 0%, 100% { box-shadow: 0 0 18px var(--glow); } 50% { box-shadow: 0 0 32px var(--glow); } }
@keyframes rarityPulse { 0%, 100% { box-shadow: 0 0 14px -2px var(--rglow), 0 0 3px 0 var(--rglow) inset; } 50% { box-shadow: 0 0 30px 3px var(--rglow), 0 0 12px 1px var(--rglow) inset; } }
@keyframes rarityShine { 0% { transform: translateX(-130%) translateY(-130%) rotate(35deg); } 100% { transform: translateX(130%) translateY(130%) rotate(35deg); } }
@keyframes claimFloatUp {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  15% { transform: translate(-50%, -6px) scale(1.15); opacity: 1; }
  30% { transform: translate(-50%, -14px) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -68px) scale(1); opacity: 0; }
}
@keyframes claimBurstRing {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
}
`;

export const SNOWFLAKES = [
  { left: 4, size: 3, drift: 14, duration: 5.2, delay: 0 },
  { left: 12, size: 2, drift: -10, duration: 4.4, delay: 0.6 },
  { left: 20, size: 4, drift: 8, duration: 6.1, delay: 1.2 },
  { left: 29, size: 2, drift: -14, duration: 4.8, delay: 0.2 },
  { left: 37, size: 3, drift: 10, duration: 5.6, delay: 1.8 },
  { left: 45, size: 2, drift: -8, duration: 4.2, delay: 0.9 },
  { left: 53, size: 4, drift: 12, duration: 6.4, delay: 0.4 },
  { left: 61, size: 2, drift: -12, duration: 4.6, delay: 1.5 },
  { left: 69, size: 3, drift: 9, duration: 5.4, delay: 0.1 },
  { left: 77, size: 2, drift: -9, duration: 4.9, delay: 1.1 },
  { left: 85, size: 4, drift: 13, duration: 6.0, delay: 0.7 },
  { left: 93, size: 2, drift: -11, duration: 4.3, delay: 1.6 },
  { left: 8, size: 2, drift: 7, duration: 5.9, delay: 2.1 },
  { left: 58, size: 3, drift: -13, duration: 5.1, delay: 2.4 },
];
