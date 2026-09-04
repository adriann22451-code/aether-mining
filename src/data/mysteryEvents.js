// Pool of possible "Mysterious Site" events. Each time a mystery site spawns,
// one of these is picked at random (weighted) so the surge feels different
// every time instead of always being the same 5x/10min buff.
export const MYSTERY_EVENTS = [
  { id: "surge", label: "Hashrate Surge", multiplier: 5, durationMin: 10, weight: 40 },
  { id: "spike", label: "Quantum Spike", multiplier: 8, durationMin: 5, weight: 25 },
  { id: "overclock", label: "Mega Overclock", multiplier: 15, durationMin: 2, weight: 10 },
  { id: "steady", label: "Steady Current", multiplier: 2.5, durationMin: 25, weight: 25 },
];

export function pickMysteryEvent() {
  const totalWeight = MYSTERY_EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of MYSTERY_EVENTS) {
    if (roll < event.weight) return event;
    roll -= event.weight;
  }
  return MYSTERY_EVENTS[0];
}
