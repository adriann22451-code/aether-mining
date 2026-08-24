import {
  Package,
} from "lucide-react";

export const INBOX_TEMPLATE = [
  {
    id: "starter_kit",
    title: "Starter Mining Kit",
    desc: "Welcome to Aether Mining! Here's some AETHER and a basic rig to get your first mining operation running.",
    icon: Package,
    iconColor: "#38bdf8",
    aether: 500,
    partIds: ["gpu_0", "rack_0", "cooling_0", "battery_0", "processor_0", "drone_0"],
  },
];
