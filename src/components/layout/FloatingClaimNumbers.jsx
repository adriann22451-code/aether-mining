import { formatCore } from "../../lib/format";

// Renders the stack of "+X AETHER" texts (and a quick burst ring) that pop
// out of the claim button and float upward. `items` is a list of
// { id, amount, drift } — App.jsx owns the list and removes each entry once
// its animation has had time to finish.
export function FloatingClaimNumbers({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute left-1/2 top-0"
          style={{ animation: "claimBurstRing 0.5s ease-out forwards" }}
        >
          <div
            className="w-10 h-10 rounded-full border-2"
            style={{ borderColor: "rgba(255,224,130,0.9)", transform: "translate(-50%, -50%)" }}
          />
        </div>
      ))}
      {items.map((item) => (
        <div
          key={`${item.id}-label`}
          className="absolute left-1/2 top-0 whitespace-nowrap font-extrabold text-[15px]"
          style={{
            left: `calc(50% + ${item.drift}px)`,
            color: "#fff4cc",
            textShadow: "0 0 10px rgba(251,191,36,0.9), 0 1px 2px rgba(0,0,0,0.6)",
            animation: "claimFloatUp 1.1s ease-out forwards",
          }}
        >
          +{formatCore(item.amount)}
        </div>
      ))}
    </div>
  );
}
