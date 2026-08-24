import {
  Archive,
  FlaskConical,
  Hammer,
  Home,
  Package,
  ShoppingCart,
  User,
} from "lucide-react";
import MENU_HOME_IMG from "../../assets/images/menu-home.png";

export function BottomNav({ screen, setScreen }) {
  const navItems = [
    { icon: Home, image: MENU_HOME_IMG, label: "Dashboard", key: "dashboard" },
    { icon: Package, label: "Shop", key: "shop" },
    { icon: Hammer, label: "Site", key: "site" },
    { icon: Archive, label: "Bag", key: "inventory" },
    { icon: FlaskConical, label: "Craft", key: "craft" },
    { icon: ShoppingCart, label: "Market", key: "market" },
    { icon: User, label: "Profile", key: "profile" },
  ];
  return (
    <div className="shrink-0 relative bg-[#0a0a16]/95 backdrop-blur-md border-t border-white/10 px-1.5 pt-2 pb-1.5 flex items-stretch gap-1">
      {navItems.map((item) => {
        const isActive = screen === item.key;
        return (
          <button
            type="button"
            key={item.key}
            onClick={() => setScreen(item.key)}
            className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 ${
              isActive ? "bg-cyan-400/10 border border-cyan-400/25" : "border border-transparent"
            }`}
          >
            {isActive && (
              <span className="absolute -top-2 w-5 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_6px_2px_rgba(34,211,238,0.55)]" />
            )}
            {item.image ? (
              <img
                src={item.image}
                alt={item.label}
                className={`w-[18px] h-[18px] rounded-[4px] object-cover transition ${
                  isActive ? "opacity-100 drop-shadow-[0_0_4px_rgba(34,211,238,0.55)]" : "opacity-60"
                }`}
              />
            ) : (
              <item.icon
                size={18}
                className={isActive ? "text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.55)]" : "text-slate-500"}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
            )}
            <span
              className={`font-bold tracking-wide text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${
                isActive ? "text-cyan-300" : "text-slate-500"
              }`}
              style={{ fontSize: 8, lineHeight: 1.1 }}
            >
              {item.label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
