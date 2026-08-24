import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import MiningDashboard from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <TonConnectUIProvider manifestUrl="https://aether-mining.vercel.app/tonconnect-manifest.json">
    <MiningDashboard />
  </TonConnectUIProvider>
);
